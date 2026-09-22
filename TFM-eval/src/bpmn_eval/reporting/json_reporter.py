"""JSON reporter — full hierarchical output for reproducibility."""

from __future__ import annotations

import json
from dataclasses import asdict
from pathlib import Path

from bpmn_eval.models import AggregateComparison, CaseComparison, FileEvaluation


def _eval_dict(fe: FileEvaluation) -> dict[str, object]:
    """Convert a FileEvaluation to a JSON-serialisable dict."""
    return {
        "source_path": fe.source_path,
        "method": fe.method.value,
        "case_id": fe.case_id,
        "results": {
            name: asdict(result) for name, result in fe.results.items()
        },
    }


def _serialise_case(case: CaseComparison) -> dict[str, object]:
    """Convert a CaseComparison to a JSON-serialisable dict.

    We cannot use ``dataclasses.asdict`` directly because ``BpmnModel``
    contains lxml objects. Instead we serialise only the evaluation layer.
    """
    return {
        "case_id": case.case_id,
        "zero_shot": _eval_dict(case.zero_shot),
        "dsl": _eval_dict(case.dsl),
    }


def write_json_report(
    cases: list[CaseComparison],
    aggregates: list[AggregateComparison],
    output_path: Path,
) -> None:
    """Write the full evaluation results as a JSON file."""
    report = {
        "cases": [_serialise_case(c) for c in cases],
        "aggregates": [asdict(a) for a in aggregates],
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(report, indent=2, ensure_ascii=False))
