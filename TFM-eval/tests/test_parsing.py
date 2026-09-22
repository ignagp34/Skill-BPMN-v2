"""Tests for the BPMN XML parser."""

from __future__ import annotations

from pathlib import Path

import pytest

from bpmn_eval.models import GenerationMethod
from bpmn_eval.parsing.xml_parser import BpmnParseError, parse_bpmn


def test_parse_valid_file(valid_simple_path: Path):
    model = parse_bpmn(valid_simple_path, GenerationMethod.ZERO_SHOT)
    assert model.method == GenerationMethod.ZERO_SHOT
    assert len(model.processes) == 1
    assert "Start_1" in model.elements
    assert "Task_1" in model.elements
    assert "End_1" in model.elements
    assert len(model.sequence_flows) == 2


def test_parse_malformed_raises(fixtures_dir: Path):
    with pytest.raises(BpmnParseError):
        parse_bpmn(fixtures_dir / "malformed.bpmn", GenerationMethod.ZERO_SHOT)


def test_parse_nonexistent_file(tmp_path: Path):
    with pytest.raises(Exception):
        parse_bpmn(tmp_path / "nope.bpmn", GenerationMethod.DSL)


def test_elements_index_contains_all_ids(valid_model):
    # Every element with an id should be in the elements dict
    for elem in valid_model.root.iter():
        eid = elem.get("id")
        if eid is not None:
            assert eid in valid_model.elements
