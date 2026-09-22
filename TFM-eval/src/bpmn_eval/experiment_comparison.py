"""Flatten and aggregate per-experiment evaluations.

The zero-shot-vs-DSL ``comparison.py`` aggregates two fixed methods per case.
Experiments are a different unit (one DSL run, many provenance axes), so this
module provides a flat per-experiment record plus mean/std aggregation grouped
by an arbitrary axis (process, difficulty, model, provider, system-/process-
prompt version).
"""

from __future__ import annotations

import statistics
from collections import Counter
from dataclasses import dataclass
from typing import Any

from bpmn_eval.experiments import ExperimentEvaluation
from bpmn_eval.parsing.counts import COUNT_FIELDS
from bpmn_eval.semantic.diagnostics import count_by_severity, unique_codes

# Score columns surfaced in the CSV (M1, M2, M3, M4-redefined, M5, M8).  The
# descriptive metrics (size/CFC/CNC/cyclicity) pin score=1.0 — degenerate as
# score columns — so only their raw values are surfaced (see DESCRIPTOR_FIELDS).
SCORE_COLUMNS: tuple[str, ...] = (
    "xml_validity",
    "structural_connectedness",
    "element_degree",
    "decision_completeness",
    "label_completeness",
    "gateway_matching",
)

# The discriminating metrics that enter the composite "scored" mean (plan §5.2).
# M1 xml_validity is constant 1.0 over all compiled diagrams → reported as a
# sanity check only, OUT of the mean.
MEAN_METRICS: tuple[str, ...] = (
    "structural_connectedness",
    "element_degree",
    "decision_completeness",
    "label_completeness",
    "gateway_matching",
)

# Back-compat alias: the score columns shown in the stdout summary table.
SCORED_METRICS: tuple[str, ...] = SCORE_COLUMNS

SUCCESS_STATUSES = frozenset({"success", "success_with_warnings"})
# Statuses whose DSL parsed + passed semantic validation (render may have failed).
SEMANTIC_OK_STATUSES = frozenset({"success", "success_with_warnings", "render_error"})

# Descriptive values surfaced as flat columns: (column, metric_name, detail_key).
DESCRIPTOR_FIELDS: tuple[tuple[str, str, str], ...] = (
    ("tnn", "size", "tnn"),
    ("tnsf", "size", "tnsf"),
    ("cfc_total", "control_flow_complexity", "cfc_total"),
    ("cnc_value", "cnc", "cnc"),
    ("has_cycle", "cyclicity", "has_cycle"),
)


def is_success(evaluation: ExperimentEvaluation) -> bool:
    """Legacy 'compiled' flag (status-based): success or success_with_warnings."""
    return evaluation.status in SUCCESS_STATUSES


def is_semantic_success(evaluation: ExperimentEvaluation) -> bool:
    """The model's robustness: DSL parsed ∧ passed semantic validation (§5.1).

    Prefers the explicit metadata flags; falls back to the status for older runs.
    """
    if evaluation.axes.representation == "zero_shot_xml":
        if (
            evaluation.bpmn_xml_valid is not None
            and evaluation.bpmn_import_valid is not None
        ):
            return bool(
                evaluation.bpmn_xml_valid and evaluation.bpmn_import_valid
            )
        return False
    if evaluation.parser_valid is not None and evaluation.semantic_valid is not None:
        return bool(evaluation.parser_valid and evaluation.semantic_valid)
    return evaluation.status in SEMANTIC_OK_STATUSES


def is_render_success(evaluation: ExperimentEvaluation) -> bool:
    """The renderer's robustness: bpmn-auto-layout drew the diagram (§5.1)."""
    if evaluation.render_valid is not None:
        return bool(evaluation.render_valid)
    return evaluation.status in SUCCESS_STATUSES


def _score(evaluation: ExperimentEvaluation, metric: str) -> float | None:
    result = evaluation.file_eval.results.get(metric)
    return None if result is None else result.score


def _detail(evaluation: ExperimentEvaluation, metric: str, key: str) -> Any:
    result = evaluation.file_eval.results.get(metric)
    if result is None:
        return None
    return result.details.get(key)


def scored_mean(evaluation: ExperimentEvaluation) -> float | None:
    """Composite mean over the discriminating metrics (None if none present)."""
    values = [
        score
        for metric in MEAN_METRICS
        if (score := _score(evaluation, metric)) is not None
    ]
    return statistics.mean(values) if values else None


def flat_record(evaluation: ExperimentEvaluation) -> dict[str, Any]:
    """One flat, JSON/CSV-friendly row per experiment."""
    axes = evaluation.axes
    record: dict[str, Any] = {
        "experiment_id": axes.experiment_id,
        "process_id": axes.process_id,
        "representation": axes.representation,
        "difficulty": axes.difficulty,
        "system_prompt_version": axes.system_prompt_version,
        "process_prompt_version": axes.process_prompt_version,
        "provider": axes.provider,
        "model_label": axes.model_label,
        "run": axes.run,
        "status": evaluation.status,
        "source": evaluation.source,
        "semantic_success": int(is_semantic_success(evaluation)),
        "render_success": int(is_render_success(evaluation)),
        "bpmn_xml_valid": (
            ""
            if evaluation.bpmn_xml_valid is None
            else int(evaluation.bpmn_xml_valid)
        ),
        "bpmn_import_valid": (
            ""
            if evaluation.bpmn_import_valid is None
            else int(evaluation.bpmn_import_valid)
        ),
        "input_system_tokens": (
            ""
            if evaluation.input_system_tokens is None
            else evaluation.input_system_tokens
        ),
        "input_process_tokens": (
            ""
            if evaluation.input_process_tokens is None
            else evaluation.input_process_tokens
        ),
        "input_tokens": (
            "" if evaluation.input_tokens is None else evaluation.input_tokens
        ),
        "output_tokens": (
            "" if evaluation.output_tokens is None else evaluation.output_tokens
        ),
        "total_tokens": (
            "" if evaluation.total_tokens is None else evaluation.total_tokens
        ),
        "token_source": evaluation.token_source,
        "elapsed_seconds": (
            ""
            if evaluation.elapsed_seconds is None
            else evaluation.elapsed_seconds
        ),
        "iterations": (
            "" if evaluation.iterations is None else evaluation.iterations
        ),
        "postprocessing": ";".join(evaluation.postprocessing),
    }

    for metric in SCORE_COLUMNS:
        score = _score(evaluation, metric)
        record[metric] = "" if score is None else round(score, 6)

    mean = scored_mean(evaluation)
    record["scored_mean"] = "" if mean is None else round(mean, 6)

    # Level-0 feature coverage (blank when no expectedFeatures were declared).
    coverage = evaluation.feature_coverage
    record["feature_coverage"] = "" if coverage is None else round(coverage.score, 6)
    record["missing_features"] = "" if coverage is None else ";".join(coverage.missing)

    # Parser element counts (blank when the run produced no model).
    for column in COUNT_FIELDS:
        record[column] = evaluation.counts.get(column, "")

    # Descriptive metric values.
    for column, metric, key in DESCRIPTOR_FIELDS:
        value = _detail(evaluation, metric, key)
        if value is None:
            record[column] = ""
        elif isinstance(value, bool):
            record[column] = int(value)
        else:
            record[column] = value

    # Level-1a diagnostics.
    n_errors, n_warnings = count_by_severity(evaluation.diagnostics)
    record["n_errors"] = n_errors
    record["n_warnings"] = n_warnings
    record["diagnostic_codes"] = ";".join(unique_codes(evaluation.diagnostics))

    return record


def record_fieldnames() -> list[str]:
    """Column order for the flat CSV."""
    return [
        "experiment_id",
        "process_id",
        "representation",
        "difficulty",
        "system_prompt_version",
        "process_prompt_version",
        "provider",
        "model_label",
        "run",
        "status",
        "source",
        "semantic_success",
        "render_success",
        "bpmn_xml_valid",
        "bpmn_import_valid",
        "input_system_tokens",
        "input_process_tokens",
        "input_tokens",
        "output_tokens",
        "total_tokens",
        "token_source",
        "elapsed_seconds",
        "iterations",
        "postprocessing",
        *SCORE_COLUMNS,
        "scored_mean",
        "feature_coverage",
        "missing_features",
        *COUNT_FIELDS,
        *(column for column, _metric, _key in DESCRIPTOR_FIELDS),
        "n_errors",
        "n_warnings",
        "diagnostic_codes",
    ]


@dataclass(frozen=True)
class ExperimentGroupStats:
    """Mean/std summary for one group (e.g. model_label=OPUS_4_7)."""

    group_field: str
    group_value: str
    n: int
    n_success: int
    success_rate: float
    semantic_success_rate: float
    render_success_rate: float
    mean_scored: float
    mean_feature_coverage: float | None
    mean_scores: dict[str, float]
    std_scores: dict[str, float]
    mean_descriptors: dict[str, float]
    mean_counts: dict[str, float]


def _mean(values: list[float]) -> float:
    return statistics.mean(values) if values else 0.0


def _std(values: list[float]) -> float:
    return statistics.stdev(values) if len(values) > 1 else 0.0


def _rate(flags: list[bool]) -> float:
    return (sum(flags) / len(flags)) if flags else 0.0


def aggregate(
    evaluations: list[ExperimentEvaluation],
    group_field: str,
) -> list[ExperimentGroupStats]:
    """Group experiments by ``group_field`` (an ``ExperimentAxes`` attribute or
    ``"overall"``) and compute per-metric means and robustness rates.

    Scored-metric means include failed runs (score 0.0) so the failure penalty
    shows; descriptor / count means only include runs that produced a model.
    """
    groups: dict[str, list[ExperimentEvaluation]] = {}
    for evaluation in evaluations:
        key = "all" if group_field == "overall" else str(
            getattr(evaluation.axes, group_field)
        )
        groups.setdefault(key, []).append(evaluation)

    stats: list[ExperimentGroupStats] = []
    for value in sorted(groups):
        members = groups[value]
        successes = [member for member in members if is_success(member)]

        mean_scores: dict[str, float] = {}
        std_scores: dict[str, float] = {}
        for metric in SCORE_COLUMNS:
            scores = [
                score
                for member in members
                if (score := _score(member, metric)) is not None
            ]
            mean_scores[metric] = _mean(scores)
            std_scores[metric] = _std(scores)

        scored = [m for member in members if (m := scored_mean(member)) is not None]
        coverage = [
            member.feature_coverage.score
            for member in members
            if member.feature_coverage is not None
        ]

        mean_descriptors: dict[str, float] = {}
        for column, metric, key in DESCRIPTOR_FIELDS:
            raw = [_detail(member, metric, key) for member in successes]
            numeric = [float(v) for v in raw if isinstance(v, (int, float, bool))]
            mean_descriptors[column] = _mean(numeric)

        mean_counts: dict[str, float] = {}
        for column in COUNT_FIELDS:
            values = [
                float(member.counts[column])
                for member in successes
                if column in member.counts
            ]
            mean_counts[column] = _mean(values)

        stats.append(
            ExperimentGroupStats(
                group_field=group_field,
                group_value=value,
                n=len(members),
                n_success=len(successes),
                success_rate=_rate([is_success(m) for m in members]),
                semantic_success_rate=_rate(
                    [is_semantic_success(m) for m in members]
                ),
                render_success_rate=_rate([is_render_success(m) for m in members]),
                mean_scored=_mean(scored),
                mean_feature_coverage=_mean(coverage) if coverage else None,
                mean_scores=mean_scores,
                std_scores=std_scores,
                mean_descriptors=mean_descriptors,
                mean_counts=mean_counts,
            )
        )
    return stats


def aggregate_diagnostics(
    evaluations: list[ExperimentEvaluation],
    group_field: str,
) -> dict[str, dict[str, int]]:
    """Level-1a taxonomy: diagnostic code → occurrence count, per group.

    Counts every occurrence (not just unique codes) so a failure mode that
    fires repeatedly in one diagram is weighted accordingly.
    """
    groups: dict[str, Counter[str]] = {}
    for evaluation in evaluations:
        key = "all" if group_field == "overall" else str(
            getattr(evaluation.axes, group_field)
        )
        groups.setdefault(key, Counter()).update(
            d.code for d in evaluation.diagnostics
        )
    return {
        value: dict(sorted(counter.items(), key=lambda kv: (-kv[1], kv[0])))
        for value, counter in sorted(groups.items())
    }


def aggregate_all_groupings(
    evaluations: list[ExperimentEvaluation],
) -> dict[str, list[ExperimentGroupStats]]:
    """Aggregate across the standard set of axes for the JSON/stdout reports."""
    return {
        field: aggregate(evaluations, field)
        for field in (
            "overall",
            "representation",
            "process_id",
            "difficulty",
            "provider",
            "model_label",
            "system_prompt_version",
            "process_prompt_version",
        )
    }
