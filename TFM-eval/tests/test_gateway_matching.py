"""Tests for M8 — Gateway Matching."""

from __future__ import annotations

from bpmn_eval.metrics.gateway_matching import GatewayMatchingMetric


def test_no_splits_passes(valid_model):
    """No gateways → trivially matched (score=1.0)."""
    result = GatewayMatchingMetric().evaluate(valid_model)
    assert result.passed is True
    assert result.score == 1.0
    assert result.details["total_splits"] == 0
    assert result.details["matched"] == 0


def test_matched_parallel_split(matched_gateways_model):
    """AND split paired with AND join — matched."""
    result = GatewayMatchingMetric().evaluate(matched_gateways_model)
    assert result.passed is True
    assert result.score == 1.0
    assert result.details["total_splits"] == 1
    assert result.details["matched"] == 1
    pair = result.details["matched_pairs"][0]
    assert pair["split_id"] == "AND_split"
    assert pair["join_id"] == "AND_join"
    assert pair["type"] == "parallelGateway"


def test_matched_xor_split(good_gateway_model):
    """XOR split GW_1 paired with XOR join GW_2."""
    result = GatewayMatchingMetric().evaluate(good_gateway_model)
    assert result.passed is True
    assert result.details["matched"] == 1
    pair = result.details["matched_pairs"][0]
    assert pair["split_id"] == "GW_1"
    assert pair["join_id"] == "GW_2"


def test_unmatched_split_branches_to_different_ends(unmatched_split_model):
    """XOR split whose branches end at different end events — no common join."""
    result = GatewayMatchingMetric().evaluate(unmatched_split_model)
    assert result.passed is False
    assert result.score == 0.0
    assert result.details["total_splits"] == 1
    assert result.details["matched"] == 0
    unmatched = result.details["unmatched"][0]
    assert unmatched["split_id"] == "XOR_split"
    assert unmatched["issue"] == "no_common_join"
