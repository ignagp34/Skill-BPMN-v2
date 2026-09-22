"""Tests for M10 — Cyclicity."""

from __future__ import annotations

from bpmn_eval.metrics.cyclicity import CyclicityMetric


def test_acyclic_model(valid_model):
    result = CyclicityMetric().evaluate(valid_model)
    assert result.passed is None
    assert result.score == 1.0
    assert result.details["has_cycle"] is False
    assert result.details["cycle_count"] == 0
    assert result.details["cycles"] == []


def test_cyclic_model(cyclic_model):
    """Task_A → Task_B → GW_loop → Task_A forms one cycle."""
    result = CyclicityMetric().evaluate(cyclic_model)
    assert result.details["has_cycle"] is True
    assert result.details["cycle_count"] == 1
    cycle_nodes = set(result.details["cycles"][0])
    assert cycle_nodes == {"Task_A", "Task_B", "GW_loop"}


def test_good_gateway_is_acyclic(good_gateway_model):
    result = CyclicityMetric().evaluate(good_gateway_model)
    assert result.details["has_cycle"] is False
