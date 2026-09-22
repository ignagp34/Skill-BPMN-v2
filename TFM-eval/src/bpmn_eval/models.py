"""Core data models for the BPMN evaluation pipeline."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from lxml import etree


class GenerationMethod(Enum):
    """How the BPMN diagram was generated."""

    ZERO_SHOT = "zero_shot"
    ZERO_SHOT_XML = "zero_shot_xml"
    DSL = "dsl"


@dataclass(frozen=True)
class BpmnModel:
    """Internal representation of a parsed BPMN file.

    Frozen to prevent metrics from accidentally mutating shared state.
    """

    source_path: str
    method: GenerationMethod
    tree: etree._ElementTree
    root: etree._Element
    processes: list[etree._Element]
    elements: dict[str, etree._Element]  # id → element
    sequence_flows: list[etree._Element]


@dataclass(frozen=True)
class MetricResult:
    """Result from a single metric evaluation on a single file."""

    metric_name: str
    passed: bool | None  # True/False for binary; None for ratio-only metrics
    score: float  # 0.0–1.0 normalized
    details: dict[str, Any] = field(default_factory=dict)


@dataclass
class FileEvaluation:
    """All metric results for a single .bpmn file."""

    source_path: str
    method: GenerationMethod
    case_id: str
    results: dict[str, MetricResult] = field(default_factory=dict)


@dataclass
class CaseComparison:
    """Side-by-side comparison of zero-shot vs DSL for one test case."""

    case_id: str
    zero_shot: FileEvaluation
    dsl: FileEvaluation


@dataclass(frozen=True)
class AggregateComparison:
    """Summary statistics for one metric across all test cases."""

    metric_name: str
    zero_shot_mean: float
    zero_shot_std: float
    dsl_mean: float
    dsl_std: float
    n_cases: int
