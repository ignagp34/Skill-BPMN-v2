"""Tests for the comparison / aggregation module."""

from __future__ import annotations

import pytest

from bpmn_eval.comparison import aggregate_results
from bpmn_eval.models import (
    CaseComparison,
    FileEvaluation,
    GenerationMethod,
    MetricResult,
)


def _make_case(case_id: str, zs_score: float, dsl_score: float) -> CaseComparison:
    """Helper to create a minimal CaseComparison for testing."""
    return CaseComparison(
        case_id=case_id,
        zero_shot=FileEvaluation(
            source_path="zs.bpmn",
            method=GenerationMethod.ZERO_SHOT,
            case_id=case_id,
            results={
                "test_metric": MetricResult(
                    metric_name="test_metric",
                    passed=zs_score == 1.0,
                    score=zs_score,
                ),
            },
        ),
        dsl=FileEvaluation(
            source_path="dsl.bpmn",
            method=GenerationMethod.DSL,
            case_id=case_id,
            results={
                "test_metric": MetricResult(
                    metric_name="test_metric",
                    passed=dsl_score == 1.0,
                    score=dsl_score,
                ),
            },
        ),
    )


def test_aggregate_single_case():
    cases = [_make_case("c1", 0.8, 1.0)]
    aggs = aggregate_results(cases)
    assert len(aggs) == 1
    assert aggs[0].metric_name == "test_metric"
    assert aggs[0].zero_shot_mean == 0.8
    assert aggs[0].dsl_mean == 1.0
    assert aggs[0].n_cases == 1


def test_aggregate_multiple_cases():
    cases = [
        _make_case("c1", 0.6, 0.9),
        _make_case("c2", 0.8, 1.0),
    ]
    aggs = aggregate_results(cases)
    assert len(aggs) == 1
    agg = aggs[0]
    assert agg.zero_shot_mean == pytest.approx(0.7)
    assert agg.dsl_mean == pytest.approx(0.95)
    assert agg.n_cases == 2
    # std should be > 0 with 2 different values
    assert agg.zero_shot_std > 0


def test_aggregate_empty():
    assert aggregate_results([]) == []
