"""Tests for the raw XML validation bridge used by Node ingestion."""

from __future__ import annotations

from pathlib import Path

from bpmn_eval.raw_validation import validate_raw_bpmn


def test_validate_raw_bpmn_uses_m1(
    fixtures_dir: Path,
    schema_path: Path,
) -> None:
    result = validate_raw_bpmn(fixtures_dir / "valid_simple.bpmn", schema_path)
    assert result["well_formed"] is True
    assert result["valid"] is True
    assert result["score"] == 1.0


def test_validate_raw_bpmn_rejects_malformed(
    fixtures_dir: Path,
    schema_path: Path,
) -> None:
    result = validate_raw_bpmn(fixtures_dir / "malformed.bpmn", schema_path)
    assert result["well_formed"] is False
    assert result["valid"] is False
    assert result["score"] == 0.0
