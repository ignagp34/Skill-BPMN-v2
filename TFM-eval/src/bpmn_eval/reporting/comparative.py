"""Representation-aware DSL vs direct-XML comparative reports."""

from __future__ import annotations

import csv
import statistics
from html import escape
from pathlib import Path
from typing import Any

from bpmn_eval.experiment_comparison import (
    DESCRIPTOR_FIELDS,
    SCORE_COLUMNS,
    is_render_success,
    is_semantic_success,
    scored_mean,
)
from bpmn_eval.experiments import ExperimentEvaluation

REPRESENTATIONS = ("dsl", "zero_shot_xml")

COMPARATIVE_FIELDS = (
    "group",
    "representation",
    "n",
    "semantic_success_rate",
    "render_success_rate",
    "bpmn_import_valid_rate",
    *SCORE_COLUMNS,
    "scored_mean",
    "scored_mean_penalized",
    "feature_coverage",
    "tnn",
    "tnsf",
    "cfc_total",
    "cnc_value",
    "cycle_rate",
    "input_system_tokens",
    "input_process_tokens",
    "input_tokens",
    "output_tokens",
    "total_tokens",
    "token_source",
    "elapsed_seconds",
    "iterations",
)


def _mean(values: list[float]) -> float | str:
    return round(statistics.mean(values), 6) if values else ""


def _penalized_scored(evaluation: ExperimentEvaluation) -> float:
    """``scored_mean`` with failures counted as 0.

    A run that did not reach semantic success (invalid BPMN-XML / DSL, or no
    score) contributes 0 instead of being excluded. This removes the
    survivorship bias by which an approach that fails on hard processes keeps an
    inflated quality mean computed only over the cases it managed to produce.
    """
    value = scored_mean(evaluation)
    if is_semantic_success(evaluation) and value is not None:
        return value
    return 0.0


def _metric_score(evaluation: ExperimentEvaluation, name: str) -> float | None:
    result = evaluation.file_eval.results.get(name)
    return result.score if result is not None else None


def _metric_detail(
    evaluation: ExperimentEvaluation,
    name: str,
    key: str,
) -> Any:
    result = evaluation.file_eval.results.get(name)
    return None if result is None else result.details.get(key)


def comparative_rows(
    evaluations: list[ExperimentEvaluation],
    group_field: str | tuple[str, ...],
) -> list[dict[str, Any]]:
    fields = (group_field,) if isinstance(group_field, str) else tuple(group_field)
    groups: dict[tuple[str, str], list[ExperimentEvaluation]] = {}
    for evaluation in evaluations:
        representation = evaluation.axes.representation
        if representation not in REPRESENTATIONS:
            continue
        group = " / ".join(str(getattr(evaluation.axes, field)) for field in fields)
        groups.setdefault((group, representation), []).append(evaluation)

    rows: list[dict[str, Any]] = []
    for (group, representation), members in sorted(groups.items()):
        row: dict[str, Any] = {
            "group": group,
            "representation": representation,
            "n": len(members),
            "semantic_success_rate": _mean(
                [float(is_semantic_success(member)) for member in members]
            ),
            "render_success_rate": _mean(
                [float(is_render_success(member)) for member in members]
            ),
            "bpmn_import_valid_rate": _mean(
                [
                    float(member.bpmn_import_valid)
                    for member in members
                    if member.bpmn_import_valid is not None
                ]
            ),
        }
        for metric in SCORE_COLUMNS:
            row[metric] = _mean(
                [
                    score
                    for member in members
                    if (score := _metric_score(member, metric)) is not None
                ]
            )
        row["scored_mean"] = _mean(
            [
                value
                for member in members
                if (value := scored_mean(member)) is not None
            ]
        )
        row["scored_mean_penalized"] = _mean(
            [_penalized_scored(member) for member in members]
        )
        row["feature_coverage"] = _mean(
            [
                member.feature_coverage.score
                for member in members
                if member.feature_coverage is not None
            ]
        )
        descriptor_map = {
            column: (metric, key)
            for column, metric, key in DESCRIPTOR_FIELDS
        }
        for column in ("tnn", "tnsf", "cfc_total", "cnc_value"):
            metric, key = descriptor_map[column]
            row[column] = _mean(
                [
                    float(value)
                    for member in members
                    if isinstance(
                        value := _metric_detail(member, metric, key),
                        (int, float),
                    )
                ]
            )
        row["cycle_rate"] = _mean(
            [
                float(value)
                for member in members
                if isinstance(
                    value := _metric_detail(member, "cyclicity", "has_cycle"),
                    bool,
                )
            ]
        )
        for column, attribute in (
            ("input_system_tokens", "input_system_tokens"),
            ("input_process_tokens", "input_process_tokens"),
            ("input_tokens", "input_tokens"),
            ("output_tokens", "output_tokens"),
            ("total_tokens", "total_tokens"),
            ("elapsed_seconds", "elapsed_seconds"),
            ("iterations", "iterations"),
        ):
            row[column] = _mean(
                [
                    float(value)
                    for member in members
                    if (value := getattr(member, attribute)) is not None
                ]
            )
        token_sources = sorted(
            {
                member.token_source
                for member in members
                if member.token_source
            }
        )
        row["token_source"] = ";".join(token_sources)
        rows.append(row)
    return rows


def _write_csv(rows: list[dict[str, Any]], path: Path) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=COMPARATIVE_FIELDS)
        writer.writeheader()
        writer.writerows(rows)


def _write_svg(
    rows: list[dict[str, Any]],
    title: str,
    path: Path,
) -> None:
    groups = sorted({str(row["group"]) for row in rows})
    width = max(720, 120 + len(groups) * 110)
    height = 430
    chart_top = 70
    chart_height = 280
    colors = {"dsl": "#2563eb", "zero_shot_xml": "#f97316"}
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}">',
        '<rect width="100%" height="100%" fill="white"/>',
        (
            '<text x="30" y="34" font-family="sans-serif" font-size="20">'
            f"{escape(title)}</text>"
        ),
    ]
    for tick in range(6):
        value = tick / 5
        y = chart_top + chart_height - value * chart_height
        parts.append(
            f'<line x1="70" y1="{y:.1f}" x2="{width - 20}" y2="{y:.1f}" '
            'stroke="#e5e7eb"/>'
        )
        parts.append(
            f'<text x="35" y="{y + 4:.1f}" font-family="sans-serif" '
            f'font-size="11">{value:.1f}</text>'
        )
    lookup = {
        (str(row["group"]), str(row["representation"])): row
        for row in rows
    }
    for index, group in enumerate(groups):
        center = 105 + index * 110
        for offset, representation in ((-18, "dsl"), (18, "zero_shot_xml")):
            row = lookup.get((group, representation))
            raw = row.get("scored_mean", "") if row else ""
            value = float(raw) if isinstance(raw, (int, float)) else 0.0
            bar_height = value * chart_height
            y = chart_top + chart_height - bar_height
            parts.append(
                f'<rect x="{center + offset - 14}" y="{y:.1f}" width="28" '
                f'height="{bar_height:.1f}" fill="{colors[representation]}"/>'
            )
        parts.append(
            f'<text x="{center}" y="{chart_top + chart_height + 24}" '
            'font-family="sans-serif" font-size="10" text-anchor="middle">'
            f"{escape(group)}</text>"
        )
    parts.extend(
        [
            (
                f'<rect x="{width - 235}" y="18" width="12" height="12" '
                f'fill="{colors["dsl"]}"/>'
            ),
            (
                f'<text x="{width - 217}" y="29" font-family="sans-serif" '
                'font-size="12">DSL</text>'
            ),
            (
                f'<rect x="{width - 165}" y="18" width="12" height="12" '
                f'fill="{colors["zero_shot_xml"]}"/>'
            ),
            (
                f'<text x="{width - 147}" y="29" font-family="sans-serif" '
                'font-size="12">zero_shot_xml</text>'
            ),
            "</svg>",
        ]
    )
    path.write_text("\n".join(parts), encoding="utf-8")


def write_comparative_report(
    evaluations: list[ExperimentEvaluation],
    output_dir: Path,
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    figures = output_dir / "figures"
    figures.mkdir(parents=True, exist_ok=True)

    model_rows = comparative_rows(evaluations, "model_label")
    difficulty_rows = comparative_rows(evaluations, "difficulty")
    prompt_rows = comparative_rows(evaluations, "system_prompt_version")
    model_prompt_rows = comparative_rows(
        evaluations, ("model_label", "system_prompt_version")
    )
    _write_csv(model_rows, output_dir / "comparative_by_model.csv")
    _write_csv(difficulty_rows, output_dir / "comparative_by_difficulty.csv")
    _write_csv(prompt_rows, output_dir / "comparative_by_prompt_version.csv")
    _write_csv(model_prompt_rows, output_dir / "comparative_by_model_prompt.csv")
    _write_svg(
        model_rows,
        "Mean scored BPMN quality by model and representation",
        figures / "dsl_vs_zero_shot_by_model.svg",
    )
    _write_svg(
        difficulty_rows,
        "Mean scored BPMN quality by difficulty and representation",
        figures / "dsl_vs_zero_shot_by_difficulty.svg",
    )

    markdown = """# DSL vs zero-shot XML comparison

The CSV tables group the same raw-artifact M1-M10 metrics, validity, expected
feature coverage, token usage, elapsed time, and iterations by representation.
Token fields are offline `o200k_base` estimates, not billing measurements.
They exclude hidden reasoning/thinking tokens absent from saved web artifacts.

`scored_mean` averages quality over successful runs only; `scored_mean_penalized`
averages over all runs counting failures as 0, which removes the survivorship bias
when comparing approaches with different success rates. Always read the two
together with `semantic_success_rate`.

Grouping dimensions:

- `comparative_by_model.csv` - by model and representation.
- `comparative_by_difficulty.csv` - by difficulty and representation.
- `comparative_by_prompt_version.csv` - by system-prompt version (RQ5 ablation).
- `comparative_by_model_prompt.csv` - by model x system-prompt version. Filter to
  `SYSV31` for the main model comparison (RQ2); compare v3.1/v4/v5 within a model
  for RQ5.

Figures:

- `figures/dsl_vs_zero_shot_by_model.svg`
- `figures/dsl_vs_zero_shot_by_difficulty.svg`
"""
    (output_dir / "comparative_report.md").write_text(markdown, encoding="utf-8")
