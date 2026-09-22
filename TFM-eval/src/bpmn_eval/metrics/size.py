"""M6 — Size: descriptive counters for Total Number of Nodes and Sequence Flows."""

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


@dataclass
class SizeMetric:
    """Counts TNN (tasks + events + gateways) and TNSF (sequence flows).

    Descriptive metric — returns ``passed=None`` and ``score=1.0``.  The raw
    counts live in ``details`` for research comparison.
    """

    name: str = "size"
    description: str = (
        "Total Number of Nodes (TNN) and Total Number of Sequence "
        "Flows (TNSF) — descriptive size counters"
    )

    def evaluate(self, model: BpmnModel) -> MetricResult:
        ns = detect_bpmn_namespace(model.root) or BPMN_NS

        tasks = 0
        events = 0
        gateways = 0
        tnn_by_subtype: dict[str, int] = {}
        tnsf_per_process: list[int] = []
        tnsf_total = 0

        for proc in model.processes:
            proc_tnsf = len(proc.findall(f"{{{ns}}}sequenceFlow"))
            tnsf_total += proc_tnsf
            tnsf_per_process.append(proc_tnsf)

            for child in proc:
                local = local_name(child.tag)
                if local is None:
                    continue
                if local in TASK_TYPES:
                    tasks += 1
                    tnn_by_subtype[local] = tnn_by_subtype.get(local, 0) + 1
                elif local in EVENT_TYPES:
                    events += 1
                    tnn_by_subtype[local] = tnn_by_subtype.get(local, 0) + 1
                elif local in GATEWAY_TYPES:
                    gateways += 1
                    tnn_by_subtype[local] = tnn_by_subtype.get(local, 0) + 1

        tnn = tasks + events + gateways

        details: dict[str, Any] = {
            "tnn": tnn,
            "tnsf": tnsf_total,
            "tasks": tasks,
            "events": events,
            "gateways": gateways,
            "tnn_by_subtype": tnn_by_subtype,
            "tnsf_per_process": tnsf_per_process,
        }

        return MetricResult(
            metric_name=self.name,
            passed=None,
            score=1.0,
            details=details,
        )
