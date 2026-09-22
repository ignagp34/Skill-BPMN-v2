"""Tests for M7 — Control-Flow Complexity (CFC)."""

from __future__ import annotations

from bpmn_eval.metrics.control_flow_complexity import ControlFlowComplexityMetric


def test_cfc_on_valid_simple(valid_model):
    """No gateways → CFC = 0."""
    result = ControlFlowComplexityMetric().evaluate(valid_model)
    assert result.passed is None
    assert result.score == 1.0
    assert result.details["cfc_total"] == 0
    assert result.details["split_count"] == 0


def test_cfc_on_mixed_gateways(cfc_sample_model):
    """XOR fan-out=2 contributes 2; AND fan-out=3 contributes 1; total = 3."""
    result = ControlFlowComplexityMetric().evaluate(cfc_sample_model)
    assert result.details["cfc_total"] == 3
    assert result.details["split_count"] == 2

    types = {c["gateway_id"]: c for c in result.details["contributions"]}
    assert types["XOR_1"]["contribution"] == 2
    assert types["XOR_1"]["outgoing"] == 2
    assert types["AND_1"]["contribution"] == 1
    assert types["AND_1"]["outgoing"] == 3


def test_cfc_on_good_gateway(good_gateway_model):
    """One XOR split with fan-out=2 → cfc=2."""
    result = ControlFlowComplexityMetric().evaluate(good_gateway_model)
    assert result.details["cfc_total"] == 2
    assert result.details["split_count"] == 1
