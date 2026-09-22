"""Tests for M9 — Coefficient of Network Complexity."""

from __future__ import annotations

from bpmn_eval.metrics.cnc import CncMetric


def test_cnc_on_valid_simple(valid_model):
    """TNN=3, TNSF=2 → CNC = 2/3."""
    result = CncMetric().evaluate(valid_model)
    assert result.passed is None
    assert result.score == 1.0
    assert result.details["tnn"] == 3
    assert result.details["tnsf"] == 2
    assert result.details["cnc"] == 2 / 3


def test_cnc_on_good_gateway(good_gateway_model):
    """TNN=6, TNSF=6 → CNC = 1.0."""
    result = CncMetric().evaluate(good_gateway_model)
    assert result.details["cnc"] == 1.0
