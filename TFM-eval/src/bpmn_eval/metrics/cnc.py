"""M9 — Coefficient of Network Complexity: CNC = TNSF / TNN.

Higher CNC = denser control flow, often a sign of LLM over-structuring.
Descriptive metric — score is always 1.0, raw value lives in details.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from bpmn_eval.metrics._graph import (
    EVENT_TYPES,
    GATEWAY_TYPES,
    TASK_TYPES,
    local_name,
)
from bpmn_eval.models import BpmnModel, MetricResult
from bpmn_eval.parsing.namespaces import BPMN_NS, detect_bpmn_namespace

_FLOW_NODE_TYPES: frozenset[str] = TASK_TYPES | EVENT_TYPES | GATEWAY_TYPES


@dataclass
class CncMetric:
    """Coefficient of Network Complexity: arcs per node."""

    name: str = "cnc"
    description: str = (
        "Coefficient of Network Complexity (TNSF / TNN) — "
        "density of control flow"
    )

    def evaluate(self, model: BpmnModel) -> MetricResult:
        ns = detect_bpmn_namespace(model.root) or BPMN_NS

        tnn = 0
        tnsf = 0
        for proc in model.processes:
            tnsf += len(proc.findall(f"{{{ns}}}sequenceFlow"))
            for child in proc:
                if local_name(child.tag) in _FLOW_NODE_TYPES:
                    tnn += 1

        cnc = (tnsf / tnn) if tnn > 0 else 0.0

        details: dict[str, Any] = {
            "tnn": tnn,
            "tnsf": tnsf,
            "cnc": cnc,
        }

        return MetricResult(
            metric_name=self.name,
            passed=None,
            score=1.0,
            details=details,
        )
