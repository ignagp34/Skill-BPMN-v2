"""Tests for Level-0 expected-feature coverage."""

from __future__ import annotations

from bpmn_eval.parsing.counts import COUNT_KEYS
from bpmn_eval.semantic.feature_coverage import compute_feature_coverage


def _counts(**overrides: int) -> dict[str, int]:
    counts = dict.fromkeys(COUNT_KEYS, 0)
    counts.update(overrides)
    return counts


def test_all_features_captured():
    cov = compute_feature_coverage(
        ["xor_gateway", "message_flow", "multiple_pools"],
        _counts(gateways_xor=1, messageFlows=2, participants=2),
    )
    assert cov.score == 1.0
    assert set(cov.captured) == {"xor_gateway", "message_flow", "multiple_pools"}
    assert cov.missing == []
    assert cov.unmapped == []


def test_partial_coverage():
    cov = compute_feature_coverage(
        ["xor_gateway", "message_flow", "multiple_pools"],
        _counts(gateways_xor=1),
    )
    assert cov.score == 1 / 3
    assert cov.captured == ["xor_gateway"]
    assert set(cov.missing) == {"message_flow", "multiple_pools"}


def test_no_model_makes_everything_missing():
    cov = compute_feature_coverage(["xor_gateway"], {})
    assert cov.score == 0.0
    assert cov.captured == []
    assert cov.missing == ["xor_gateway"]


def test_unmapped_feature_excluded_from_denominator():
    cov = compute_feature_coverage(
        ["xor_gateway", "totally_unknown"], _counts(gateways_xor=1)
    )
    assert cov.unmapped == ["totally_unknown"]
    assert cov.score == 1.0  # only the mapped feature counts


def test_start_end_requires_both():
    captured = compute_feature_coverage(
        ["start_end_events"], _counts(startEvents=1, endEvents=1)
    )
    assert captured.score == 1.0
    missing = compute_feature_coverage(
        ["start_end_events"], _counts(startEvents=1)
    )
    assert missing.score == 0.0


def test_no_expected_features_is_vacuous():
    cov = compute_feature_coverage([], _counts())
    assert cov.score == 1.0
