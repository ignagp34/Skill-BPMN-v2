"""Aggregate comparison statistics across all test cases."""

from __future__ import annotations

import statistics

from bpmn_eval.models import AggregateComparison, CaseComparison


def aggregate_results(
    cases: list[CaseComparison],
) -> list[AggregateComparison]:
    """Compute per-metric mean and standard deviation, grouped by method.

    Returns one ``AggregateComparison`` per metric that appears in the results.
    """
    if not cases:
        return []

    # Collect all metric names from the first case
    metric_names: list[str] = []
    first = cases[0]
    # Use zero_shot to discover metric names (both sides have the same set)
    for name in first.zero_shot.results:
        metric_names.append(name)

    aggregates: list[AggregateComparison] = []

    for metric_name in metric_names:
        zs_scores: list[float] = []
        dsl_scores: list[float] = []

        for case in cases:
            zs_result = case.zero_shot.results.get(metric_name)
            dsl_result = case.dsl.results.get(metric_name)
            if zs_result is not None:
                zs_scores.append(zs_result.score)
            if dsl_result is not None:
                dsl_scores.append(dsl_result.score)

        n = len(cases)

        aggregates.append(AggregateComparison(
            metric_name=metric_name,
            zero_shot_mean=statistics.mean(zs_scores) if zs_scores else 0.0,
            zero_shot_std=statistics.stdev(zs_scores) if len(zs_scores) > 1 else 0.0,
            dsl_mean=statistics.mean(dsl_scores) if dsl_scores else 0.0,
            dsl_std=statistics.stdev(dsl_scores) if len(dsl_scores) > 1 else 0.0,
            n_cases=n,
        ))

    return aggregates
