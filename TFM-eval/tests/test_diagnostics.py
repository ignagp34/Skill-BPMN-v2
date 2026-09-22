"""Tests for the Level-1a diagnostics taxonomy harvester."""

from __future__ import annotations

from bpmn_eval.semantic.diagnostics import (
    code_histogram,
    count_by_severity,
    extract_diagnostics,
    unique_codes,
)


def test_prefers_unified_diagnostics_stream():
    result = {
        "diagnostics": [
            {"code": "AP-7", "severity": "error"},
            {"code": "IMPLICIT_END_EVENT", "severity": "warning"},
        ],
        # These must be ignored when ``diagnostics`` is present.
        "semanticErrors": [{"code": "SHOULD_NOT_APPEAR"}],
    }
    diags = extract_diagnostics(result)
    assert [d.code for d in diags] == ["AP-7", "IMPLICIT_END_EVENT"]
    assert count_by_severity(diags) == (1, 1)


def test_falls_back_to_typed_lists():
    result = {
        "semanticErrors": [{"code": "AP-7"}],
        "semanticWarnings": [{"code": "IMPLICIT_END_EVENT", "severity": "warning"}],
    }
    diags = extract_diagnostics(result)
    assert {d.code for d in diags} == {"AP-7", "IMPLICIT_END_EVENT"}
    errors, warnings = count_by_severity(diags)
    assert errors == 1  # AP-7 defaults to error
    assert warnings == 1


def test_empty_inputs():
    assert extract_diagnostics(None) == []
    assert extract_diagnostics({}) == []
    assert extract_diagnostics({"diagnostics": []}) == []


def test_unique_and_histogram():
    diags = extract_diagnostics(
        {
            "diagnostics": [
                {"code": "A", "severity": "error"},
                {"code": "A", "severity": "error"},
                {"code": "B", "severity": "warning"},
            ]
        }
    )
    assert unique_codes(diags) == ["A", "B"]
    assert code_histogram(diags) == {"A": 2, "B": 1}
