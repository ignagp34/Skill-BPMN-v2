"""Human-readable stdout summary for per-experiment evaluation."""

from __future__ import annotations

from bpmn_eval.experiment_comparison import (
    SCORED_METRICS,
    aggregate,
    is_success,
)
from bpmn_eval.experiments import ExperimentEvaluation

_ABBR = {
    "xml_validity": "M1 valid",
    "structural_connectedness": "M2 conn",
    "element_degree": "M3 deg",
    "decision_completeness": "M4 decis",
    "label_completeness": "M5 label",
    "gateway_matching": "M8 gwmatch",
}


def format_experiment_summary(evaluations: list[ExperimentEvaluation]) -> str:
    if not evaluations:
        return "No experiments evaluated.\n"

    lines: list[str] = []
    total = len(evaluations)
    successes = sum(1 for ev in evaluations if is_success(ev))

    lines.append("=" * 100)
    lines.append(
        f"  EXPERIMENT EVALUATION - {total} experiment(s), "
        f"{successes} compiled ({successes / total:.0%})"
    )
    lines.append("=" * 100)

    # Mean scored metrics grouped by model_label (the headline comparison).
    header = (
        f"{'model_label':<26} {'n':>3} {'sem%':>5} {'rnd%':>5} "
        f"{'scored':>7} {'feat':>5}"
    )
    for metric in SCORED_METRICS:
        header += f" {_ABBR[metric]:>9}"
    lines.append(header)
    lines.append("-" * len(header))

    for stats in aggregate(evaluations, "model_label"):
        coverage = (
            f"{stats.mean_feature_coverage:>5.2f}"
            if stats.mean_feature_coverage is not None
            else f"{'--':>5}"
        )
        row = (
            f"{stats.group_value:<26} {stats.n:>3} "
            f"{stats.semantic_success_rate:>4.0%} {stats.render_success_rate:>4.0%} "
            f"{stats.mean_scored:>7.3f} {coverage}"
        )
        for metric in SCORED_METRICS:
            row += f" {stats.mean_scores[metric]:>9.3f}"
        lines.append(row)

    # Compile-status breakdown.
    lines.append("")
    lines.append("  Status breakdown:")
    by_status: dict[str, int] = {}
    for ev in evaluations:
        by_status[ev.status] = by_status.get(ev.status, 0) + 1
    for status in sorted(by_status):
        lines.append(f"    {status:<24} {by_status[status]:>3}")

    lines.append("")
    return "\n".join(lines)


def print_experiment_summary(evaluations: list[ExperimentEvaluation]) -> None:
    print(format_experiment_summary(evaluations))
