"""Tests for JSON and CSV reporters."""

from __future__ import annotations

import csv
import json
from pathlib import Path

import pytest

from bpmn_eval.comparison import aggregate_results
from bpmn_eval.models import (
    CaseComparison,
    FileEvaluation,
    GenerationMethod,
    MetricResult,
)
from bpmn_eval.reporting.csv_reporter import write_csv_report
from bpmn_eval.reporting.json_reporter import write_json_report
from bpmn_eval.reporting.summary import format_summary


@pytest.fixture
def sample_cases() -> list[CaseComparison]:
    def _eval(method, score):
        return FileEvaluation(
            source_path=f"{method.value}.bpmn",
            method=method,
            case_id="c1",
            results={
                "xml_validity": MetricResult("xml_validity", True, score),
            },
        )

    return [
        CaseComparison(
            case_id="c1",
            zero_shot=_eval(GenerationMethod.ZERO_SHOT, 0.5),
            dsl=_eval(GenerationMethod.DSL, 1.0),
        ),
    ]


def test_json_report(sample_cases, tmp_path: Path):
    aggs = aggregate_results(sample_cases)
    out = tmp_path / "report.json"
    write_json_report(sample_cases, aggs, out)

    data = json.loads(out.read_text())
    assert "cases" in data
    assert "aggregates" in data
    assert len(data["cases"]) == 1
    assert data["cases"][0]["case_id"] == "c1"
    assert data["cases"][0]["zero_shot"]["results"]["xml_validity"]["score"] == 0.5


def test_csv_report(sample_cases, tmp_path: Path):
    out = tmp_path / "report.csv"
    write_csv_report(sample_cases, out)

    with out.open(encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    assert len(rows) == 2  # one row per (case, method)
    assert rows[0]["case_id"] == "c1"
    assert rows[0]["method"] == "zero_shot"
    assert float(rows[0]["xml_validity"]) == 0.5
    assert rows[1]["method"] == "dsl"
    assert float(rows[1]["xml_validity"]) == 1.0


def test_summary_format(sample_cases):
    aggs = aggregate_results(sample_cases)
    text = format_summary(sample_cases, aggs)
    assert "PER-CASE RESULTS" in text
    assert "AGGREGATE" in text
    assert "c1" in text
