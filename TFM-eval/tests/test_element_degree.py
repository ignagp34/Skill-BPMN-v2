"""Tests for M3 — Element Degree Rules."""

from __future__ import annotations

from bpmn_eval.metrics.element_degree import ElementDegreeMetric


def test_valid_degrees(valid_model):
    metric = ElementDegreeMetric()
    result = metric.evaluate(valid_model)
    assert result.score == 1.0
    assert result.passed is True
    assert result.details["violations"] == []


def test_gateway_degrees(bad_gateway_model):
    """Gateway model should have valid gateway degrees (diverge/converge)."""
    metric = ElementDegreeMetric()
    result = metric.evaluate(bad_gateway_model)
    # The gateway degrees themselves are correct (1->2, 2->1)
    # All tasks have in=1 out=1, start in=0 out=1, end in=1 out=0
    assert result.score == 1.0


def test_orphan_has_degree_violation(orphan_model):
    """The orphan task has in=0, out=0 which violates task(1,1)."""
    metric = ElementDegreeMetric()
    result = metric.evaluate(orphan_model)
    assert result.score < 1.0
    violations = result.details["violations"]
    orphan_ids = [v["element_id"] for v in violations]
    assert "Task_Orphan" in orphan_ids
