"""BPMN evaluation metrics.

``ALL_METRICS`` is the canonical registry of metric *classes*.  The pipeline
instantiates them (possibly with configuration) before calling ``.evaluate()``.
"""

from bpmn_eval.metrics.cnc import CncMetric
from bpmn_eval.metrics.control_flow_complexity import ControlFlowComplexityMetric
from bpmn_eval.metrics.cyclicity import CyclicityMetric
from bpmn_eval.metrics.decision_completeness import DecisionCompletenessMetric
from bpmn_eval.metrics.element_degree import ElementDegreeMetric
from bpmn_eval.metrics.gateway_matching import GatewayMatchingMetric
from bpmn_eval.metrics.label_completeness import LabelCompletenessMetric
from bpmn_eval.metrics.size import SizeMetric
from bpmn_eval.metrics.structural_connectedness import StructuralConnectednessMetric
from bpmn_eval.metrics.xml_validity import XmlValidityMetric

ALL_METRICS: list[type] = [
    XmlValidityMetric,
    StructuralConnectednessMetric,
    ElementDegreeMetric,
    DecisionCompletenessMetric,
    LabelCompletenessMetric,
    SizeMetric,
    ControlFlowComplexityMetric,
    GatewayMatchingMetric,
    CncMetric,
    CyclicityMetric,
]

__all__ = [
    "ALL_METRICS",
    "CncMetric",
    "ControlFlowComplexityMetric",
    "CyclicityMetric",
    "DecisionCompletenessMetric",
    "ElementDegreeMetric",
    "GatewayMatchingMetric",
    "LabelCompletenessMetric",
    "SizeMetric",
    "StructuralConnectednessMetric",
    "XmlValidityMetric",
]
