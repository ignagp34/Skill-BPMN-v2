"""Tests for M4 — Decision Completeness (redefined)."""

from __future__ import annotations

from bpmn_eval.metrics.decision_completeness import DecisionCompletenessMetric


def test_all_branches_labelled_scores_one(labelled_branches_model):
    metric = DecisionCompletenessMetric()
    result = metric.evaluate(labelled_branches_model)
    assert result.score == 1.0
    assert result.passed is True
    assert result.details["diverging_exclusive_gateways"] == 1
    assert result.details["total_branches"] == 2
    assert result.details["labelled_branches"] == 2
    assert result.details["unlabelled"] == []


def test_partial_labels_scores_fraction(unlabelled_branches_model):
    metric = DecisionCompletenessMetric()
    result = metric.evaluate(unlabelled_branches_model)
    assert result.score == 0.5
    assert result.passed is False
    assert result.details["total_branches"] == 2
    assert result.details["labelled_branches"] == 1
    assert result.details["unlabelled"][0]["gateway_id"] == "GW_1"
    assert result.details["unlabelled"][0]["unlabelled_branches"] == 1


def test_no_diverging_gateway_is_vacuously_complete(valid_model):
    """A model with no diverging XOR gateway scores 1.0."""
    metric = DecisionCompletenessMetric()
    result = metric.evaluate(valid_model)
    assert result.score == 1.0
    assert result.passed is True
    assert result.details["total_branches"] == 0


def test_unlabelled_branches_fixture_via_good_gateway(good_gateway_model):
    """good_gateway.bpmn has a diverging XOR with no branch labels → 0.0."""
    metric = DecisionCompletenessMetric()
    result = metric.evaluate(good_gateway_model)
    assert result.score == 0.0
    assert result.passed is False
