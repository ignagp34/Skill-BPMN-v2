"""Authoritative raw BPMN-XML validation used by the ingestion harness."""

from __future__ import annotations

from pathlib import Path

from bpmn_eval.metrics.xml_validity import XmlValidityMetric
from bpmn_eval.models import GenerationMethod
from bpmn_eval.parsing.xml_parser import BpmnParseError, parse_bpmn


def validate_raw_bpmn(xml_path: Path, schema_path: Path) -> dict[str, object]:
    """Return the M1 result for the untouched model-authored BPMN file."""
    try:
        model = parse_bpmn(xml_path, GenerationMethod.ZERO_SHOT_XML)
    except BpmnParseError as exc:
        return {
            "valid": False,
            "score": 0.0,
            "well_formed": False,
            "errors": [str(exc)],
        }

    result = XmlValidityMetric(schema_path=str(schema_path)).evaluate(model)
    errors = result.details.get("validation_errors", [])
    return {
        "valid": result.score == 1.0,
        "score": result.score,
        "well_formed": True,
        "errors": errors if isinstance(errors, list) else [],
    }
