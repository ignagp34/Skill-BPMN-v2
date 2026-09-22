"""Tests for M2 — Structural Connectedness."""

from __future__ import annotations

from bpmn_eval.metrics.structural_connectedness import StructuralConnectednessMetric


def test_fully_connected(valid_model):
    metric = StructuralConnectednessMetric()
    result = metric.evaluate(valid_model)
    assert result.score == 1.0
    assert result.passed is True
    assert result.details["orphan_nodes"] == []


def test_orphan_detected(orphan_model):
    metric = StructuralConnectednessMetric()
    result = metric.evaluate(orphan_model)
    assert result.score < 1.0
    assert result.passed is False
    assert "Task_Orphan" in result.details["orphan_nodes"]


def test_broken_reference():
    """A sequence flow referencing a non-existent ID should be flagged."""

    from bpmn_eval.models import GenerationMethod
    from bpmn_eval.parsing.xml_parser import parse_bpmn

    # Build a BPMN with a dangling reference programmatically
    xml = b"""<?xml version="1.0" encoding="UTF-8"?>
    <definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
                 id="D1" targetNamespace="http://example.com">
      <process id="P1" isExecutable="true">
        <startEvent id="S1"><outgoing>F1</outgoing></startEvent>
        <endEvent id="E1"><incoming>F1</incoming></endEvent>
        <sequenceFlow id="F1" sourceRef="S1" targetRef="NONEXISTENT"/>
      </process>
    </definitions>"""

    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".bpmn", delete=False) as f:
        f.write(xml)
        f.flush()
        model = parse_bpmn(f.name, GenerationMethod.ZERO_SHOT)

    metric = StructuralConnectednessMetric()
    result = metric.evaluate(model)
    assert len(result.details["broken_references"]) > 0
