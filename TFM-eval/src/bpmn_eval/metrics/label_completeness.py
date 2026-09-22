"""M5 — Label Completeness: ratio of core elements with a descriptive name."""

from __future__ import annotations

from dataclasses import dataclass

from bpmn_eval.models import BpmnModel, MetricResult
from bpmn_eval.parsing.namespaces import BPMN_NS, detect_bpmn_namespace

# Core element types that should have meaningful labels.
_LABELABLE_TYPES = frozenset({
    # Tasks
    "task", "userTask", "serviceTask", "sendTask", "receiveTask",
    "manualTask", "businessRuleTask", "scriptTask",
    # Sub-processes
    "subProcess", "callActivity",
    # Events
    "startEvent", "endEvent",
    "intermediateThrowEvent", "intermediateCatchEvent",
    # Pools & Lanes
    "participant", "lane",
})


def _local_name(tag: object) -> str | None:
    """Return the local name, or None for non-element nodes (comments, PIs)."""
    if not isinstance(tag, str):
        return None
    if "}" in tag:
        return tag.split("}", 1)[1]
    return tag


@dataclass
class LabelCompletenessMetric:
    """Measures the ratio of core BPMN elements that have a non-empty name."""

    name: str = "label_completeness"
    description: str = (
        "Ratio of core elements (tasks, events, pools/lanes) "
        "with a non-empty name"
    )

    def evaluate(self, model: BpmnModel) -> MetricResult:
        ns = detect_bpmn_namespace(model.root) or BPMN_NS
        total = 0
        labeled = 0
        unlabeled_elements: list[dict[str, str]] = []

        # Check inside processes
        for proc in model.processes:
            for child in proc:
                local = _local_name(child.tag)
                if local not in _LABELABLE_TYPES:
                    continue
                total += 1
                name = (child.get("name") or "").strip()
                if name:
                    labeled += 1
                else:
                    unlabeled_elements.append({
                        "element_id": child.get("id", "?"),
                        "type": local,
                    })

        # Check collaboration-level participants and lanes
        for collab in model.root.findall(f"{{{ns}}}collaboration"):
            for participant in collab.findall(f"{{{ns}}}participant"):
                total += 1
                name = (participant.get("name") or "").strip()
                if name:
                    labeled += 1
                else:
                    unlabeled_elements.append({
                        "element_id": participant.get("id", "?"),
                        "type": "participant",
                    })

        # Lanes inside laneSets
        for proc in model.processes:
            for lane_set in proc.findall(f"{{{ns}}}laneSet"):
                for lane in lane_set.findall(f"{{{ns}}}lane"):
                    total += 1
                    name = (lane.get("name") or "").strip()
                    if name:
                        labeled += 1
                    else:
                        unlabeled_elements.append({
                            "element_id": lane.get("id", "?"),
                            "type": "lane",
                        })

        score = labeled / total if total > 0 else 0.0

        return MetricResult(
            metric_name=self.name,
            passed=None,  # Ratio metric, not binary
            score=score,
            details={
                "total_labelable": total,
                "labeled": labeled,
                "unlabeled_elements": unlabeled_elements,
            },
        )
