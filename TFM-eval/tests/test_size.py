"""Tests for M6 — Size (TNN + TNSF)."""

from __future__ import annotations

from bpmn_eval.metrics.size import SizeMetric


def test_size_on_valid_simple(valid_model):
    result = SizeMetric().evaluate(valid_model)
    # valid_simple.bpmn: 1 startEvent + 1 task + 1 endEvent = 3 nodes, 2 flows.
    assert result.passed is None
    assert result.score == 1.0
    assert result.details["tnn"] == 3
    assert result.details["tnsf"] == 2
    assert result.details["tasks"] == 1
    assert result.details["events"] == 2
    assert result.details["gateways"] == 0


def test_size_on_good_gateway(good_gateway_model):
    result = SizeMetric().evaluate(good_gateway_model)
    # good_gateway.bpmn: 1 start, 1 end, 2 tasks, 2 gateways, 6 flows.
    assert result.details["tnn"] == 6
    assert result.details["tnsf"] == 6
    assert result.details["tasks"] == 2
    assert result.details["events"] == 2
    assert result.details["gateways"] == 2


def test_size_details_structure(cfc_sample_model):
    result = SizeMetric().evaluate(cfc_sample_model)
    assert "tnn_by_subtype" in result.details
    assert "tnsf_per_process" in result.details
    # cfc_sample has 1 start + 2 ends + 4 tasks + 2 gateways = 9 nodes
    assert result.details["tnn"] == 9
