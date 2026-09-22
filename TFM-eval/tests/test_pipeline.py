"""Tests for the pipeline orchestrator."""

from __future__ import annotations

from pathlib import Path

from bpmn_eval.metrics.element_degree import ElementDegreeMetric
from bpmn_eval.metrics.label_completeness import LabelCompletenessMetric
from bpmn_eval.metrics.structural_connectedness import StructuralConnectednessMetric
from bpmn_eval.pipeline import evaluate_case


def test_evaluate_case_integration(fixtures_dir: Path):
    """End-to-end test using the case_integration fixture directory."""
    case_dir = fixtures_dir / "case_integration"
    # Use metrics that don't need an XSD schema
    metrics = [
        StructuralConnectednessMetric(),
        ElementDegreeMetric(),
        LabelCompletenessMetric(),
    ]
    comparison = evaluate_case(case_dir, metrics=metrics)

    assert comparison.case_id == "case_integration"
    assert comparison.zero_shot.method.value == "zero_shot"
    assert comparison.dsl.method.value == "dsl"

    # Both should be structurally connected
    assert comparison.zero_shot.results["structural_connectedness"].score == 1.0
    assert comparison.dsl.results["structural_connectedness"].score == 1.0

    # DSL version is fully labeled; zero-shot is missing one label
    assert comparison.dsl.results["label_completeness"].score == 1.0
    assert comparison.zero_shot.results["label_completeness"].score < 1.0
