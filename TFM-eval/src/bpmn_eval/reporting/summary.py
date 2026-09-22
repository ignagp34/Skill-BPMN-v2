"""Human-readable summary table for stdout."""

from __future__ import annotations

from bpmn_eval.models import AggregateComparison, CaseComparison


def format_summary(
    cases: list[CaseComparison],
    aggregates: list[AggregateComparison],
) -> str:
    """Return a formatted text summary of all evaluation results."""
    lines: list[str] = []

    if not cases:
        return "No cases evaluated.\n"

    # Determine metric names
    metric_names = list(cases[0].zero_shot.results.keys())

    # --- Per-case table ---
    lines.append("=" * 80)
    lines.append("  PER-CASE RESULTS")
    lines.append("=" * 80)

    # Header
    col_w = 14
    header = f"{'Case':<16} {'Method':<12}"
    for m in metric_names:
        # Abbreviate long metric names
        abbr = m[:col_w]
        header += f" {abbr:>{col_w}}"
    lines.append(header)
    lines.append("-" * len(header))

    for case in cases:
        for evaluation in (case.zero_shot, case.dsl):
            row = f"{case.case_id:<16} {evaluation.method.value:<12}"
            for m in metric_names:
                result = evaluation.results.get(m)
                val = f"{result.score:.3f}" if result is not None else "  N/A"
                row += f" {val:>{col_w}}"
            lines.append(row)

    # --- Aggregate table ---
    lines.append("")
    lines.append("=" * 80)
    lines.append("  AGGREGATE (mean +/- std)")
    lines.append("=" * 80)

    agg_header = f"{'Metric':<30} {'Zero-shot':>16} {'DSL':>16} {'N':>5}"
    lines.append(agg_header)
    lines.append("-" * len(agg_header))

    for agg in aggregates:
        zs = f"{agg.zero_shot_mean:.3f} +/- {agg.zero_shot_std:.3f}"
        dsl = f"{agg.dsl_mean:.3f} +/- {agg.dsl_std:.3f}"
        lines.append(f"{agg.metric_name:<30} {zs:>16} {dsl:>16} {agg.n_cases:>5}")

    lines.append("")
    return "\n".join(lines)


def print_summary(
    cases: list[CaseComparison],
    aggregates: list[AggregateComparison],
) -> None:
    """Print the summary to stdout."""
    print(format_summary(cases, aggregates))
