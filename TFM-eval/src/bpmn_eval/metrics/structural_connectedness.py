"""M2 — Structural Connectedness: graph connectivity and referential integrity."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass

from bpmn_eval.models import BpmnModel, MetricResult
from bpmn_eval.parsing.namespaces import BPMN_NS, detect_bpmn_namespace

# Element local names that are *flow nodes* (participate in sequence flows).
_FLOW_NODE_TYPES = frozenset({
    "task", "userTask", "serviceTask", "sendTask", "receiveTask",
    "manualTask", "businessRuleTask", "scriptTask",
    "subProcess", "callActivity",
    "startEvent", "endEvent",
    "intermediateThrowEvent", "intermediateCatchEvent",
    "boundaryEvent",
    "exclusiveGateway", "parallelGateway", "inclusiveGateway",
    "eventBasedGateway", "complexGateway",
})


def _local_name(elem_tag: object) -> str | None:
    """Strip the namespace prefix from a Clark-notation tag.

    Returns None for non-element nodes (comments, PIs) whose tag is a callable.
    """
    if not isinstance(elem_tag, str):
        return None
    if "}" in elem_tag:
        return elem_tag.split("}", 1)[1]
    return elem_tag


@dataclass
class StructuralConnectednessMetric:
    """Checks that every flow node is reachable from a start event and that
    all ID references in sequence flows resolve to existing elements.
    """

    name: str = "structural_connectedness"
    description: str = (
        "Absence of isolated/orphan nodes and "
        "referential integrity of IDs"
    )

    def evaluate(self, model: BpmnModel) -> MetricResult:
        ns = detect_bpmn_namespace(model.root) or BPMN_NS
        broken_refs: list[str] = []
        orphan_nodes: list[str] = []

        # --- per-process analysis ---
        total_flow_nodes = 0
        total_reachable = 0

        for proc in model.processes:
            # Collect flow node IDs inside this process
            flow_node_ids: set[str] = set()
            for child in proc:
                local = _local_name(child.tag)
                if local in _FLOW_NODE_TYPES:
                    nid = child.get("id")
                    if nid is not None:
                        flow_node_ids.add(nid)

            if not flow_node_ids:
                continue

            # Build adjacency list from sequence flows
            adjacency: dict[str, list[str]] = {nid: [] for nid in flow_node_ids}
            for sf in proc.findall(f"{{{ns}}}sequenceFlow"):
                src = sf.get("sourceRef")
                tgt = sf.get("targetRef")
                # Check referential integrity
                if src is not None and src not in model.elements:
                    broken_refs.append(f"sourceRef={src} in flow {sf.get('id', '?')}")
                if tgt is not None and tgt not in model.elements:
                    broken_refs.append(f"targetRef={tgt} in flow {sf.get('id', '?')}")
                if src in adjacency and tgt in flow_node_ids:
                    adjacency[src].append(tgt)

            # BFS from every start event
            reachable: set[str] = set()
            for child in proc:
                if _local_name(child.tag) == "startEvent":
                    sid = child.get("id")
                    if sid and sid in flow_node_ids:
                        queue = deque([sid])
                        while queue:
                            current = queue.popleft()
                            if current in reachable:
                                continue
                            reachable.add(current)
                            for neighbour in adjacency.get(current, []):
                                if neighbour not in reachable:
                                    queue.append(neighbour)

            unreachable = flow_node_ids - reachable
            orphan_nodes.extend(sorted(unreachable))
            total_flow_nodes += len(flow_node_ids)
            total_reachable += len(reachable)

        if total_flow_nodes == 0:
            score = 0.0
        else:
            score = total_reachable / total_flow_nodes

        return MetricResult(
            metric_name=self.name,
            passed=score == 1.0 and len(broken_refs) == 0,
            score=score,
            details={
                "total_flow_nodes": total_flow_nodes,
                "reachable_nodes": total_reachable,
                "orphan_nodes": orphan_nodes,
                "broken_references": broken_refs,
            },
        )
