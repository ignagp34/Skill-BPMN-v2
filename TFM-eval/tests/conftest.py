"""Shared test fixtures."""

from __future__ import annotations

from pathlib import Path

import pytest

from bpmn_eval.models import GenerationMethod
from bpmn_eval.parsing.xml_parser import parse_bpmn

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture
def fixtures_dir() -> Path:
    return FIXTURES


@pytest.fixture
def schema_path() -> Path:
    return Path(__file__).parents[1] / "schemas" / "BPMN20.xsd"


@pytest.fixture
def valid_simple_path() -> Path:
    return FIXTURES / "valid_simple.bpmn"


@pytest.fixture
def valid_model(valid_simple_path: Path):
    return parse_bpmn(valid_simple_path, GenerationMethod.ZERO_SHOT)


@pytest.fixture
def orphan_model():
    return parse_bpmn(FIXTURES / "orphan_node.bpmn", GenerationMethod.ZERO_SHOT)


@pytest.fixture
def bad_gateway_model():
    return parse_bpmn(FIXTURES / "bad_gateway.bpmn", GenerationMethod.ZERO_SHOT)


@pytest.fixture
def good_gateway_model():
    return parse_bpmn(FIXTURES / "good_gateway.bpmn", GenerationMethod.ZERO_SHOT)


@pytest.fixture
def labelled_branches_model():
    return parse_bpmn(FIXTURES / "labelled_branches.bpmn", GenerationMethod.ZERO_SHOT)


@pytest.fixture
def unlabelled_branches_model():
    return parse_bpmn(FIXTURES / "unlabelled_branches.bpmn", GenerationMethod.ZERO_SHOT)


@pytest.fixture
def missing_labels_model():
    return parse_bpmn(FIXTURES / "missing_labels.bpmn", GenerationMethod.ZERO_SHOT)


@pytest.fixture
def cfc_sample_model():
    return parse_bpmn(FIXTURES / "cfc_sample.bpmn", GenerationMethod.ZERO_SHOT)


@pytest.fixture
def matched_gateways_model():
    return parse_bpmn(FIXTURES / "matched_gateways.bpmn", GenerationMethod.ZERO_SHOT)


@pytest.fixture
def unmatched_split_model():
    return parse_bpmn(FIXTURES / "unmatched_split.bpmn", GenerationMethod.ZERO_SHOT)


@pytest.fixture
def cyclic_model():
    return parse_bpmn(FIXTURES / "cyclic_process.bpmn", GenerationMethod.ZERO_SHOT)
