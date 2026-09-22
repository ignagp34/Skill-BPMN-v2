"""Tests for parser element counts."""

from __future__ import annotations

from bpmn_eval.parsing.counts import COUNT_FIELDS, COUNT_KEYS, count_elements


def test_counts_have_all_keys(valid_model):
    counts = count_elements(valid_model)
    assert set(counts) == set(COUNT_KEYS)
    assert all(field in counts for field in COUNT_FIELDS)
    assert counts["tasks"] >= 1


def test_counts_on_labelled_branches(labelled_branches_model):
    counts = count_elements(labelled_branches_model)
    # GW_1 (diverging) + GW_2 (merge) are both exclusive gateways.
    assert counts["gateways_xor"] == 2
    assert counts["gateways"] == 2
    assert counts["gateways_and"] == 0
    assert counts["sequenceFlows"] == 6
    assert counts["tasks"] == 2
    assert counts["startEvents"] == 1
    assert counts["endEvents"] == 1
