"""Shared graph helpers for metrics that walk the process control-flow graph.

Kept module-private (leading underscore) — these helpers are an implementation
detail shared between the size/CFC/gateway-matching/cyclicity metrics.
"""

from __future__ import annotations

from collections import deque

from lxml import etree

# Task-like activity element types (all satisfy the "task" in-degree/out-degree rule).
TASK_TYPES: frozenset[str] = frozenset({
    "task", "userTask", "serviceTask", "sendTask", "receiveTask",
    "manualTask", "businessRuleTask", "scriptTask",
    "subProcess", "callActivity",
})

# Event element types appearing in flow.
EVENT_TYPES: frozenset[str] = frozenset({
    "startEvent", "endEvent",
    "intermediateThrowEvent", "intermediateCatchEvent",
    "boundaryEvent",
})

# Gateway element types.
GATEWAY_TYPES: frozenset[str] = frozenset({
    "exclusiveGateway", "parallelGateway", "inclusiveGateway",
    "eventBasedGateway", "complexGateway",
})

# Union of all flow-node types (participate in sequence flows).
FLOW_NODE_TYPES: frozenset[str] = TASK_TYPES | EVENT_TYPES | GATEWAY_TYPES


def local_name(tag: object) -> str | None:
    """Strip the namespace prefix from a Clark-notation tag.

    Returns None for non-element nodes (comments, PIs) whose tag is a callable.
    """
    if not isinstance(tag, str):
        return None
    if "}" in tag:
        return tag.split("}", 1)[1]
    return tag


def build_adjacency(
    process: etree._Element,
    ns: str,
) -> tuple[dict[str, list[str]], dict[str, list[str]]]:
    """Build (successors, predecessors) adjacency lists for a process.

    Keys are flow-node IDs declared as direct children of the process.
    Values are lists of target/source IDs (duplicates preserved to reflect
    parallel sequenceFlows between the same pair).
    """
    flow_node_ids: set[str] = set()
    for child in process:
        if local_name(child.tag) in FLOW_NODE_TYPES:
            nid = child.get("id")
            if nid is not None:
                flow_node_ids.add(nid)

    successors: dict[str, list[str]] = {nid: [] for nid in flow_node_ids}
    predecessors: dict[str, list[str]] = {nid: [] for nid in flow_node_ids}

    for sf in process.findall(f"{{{ns}}}sequenceFlow"):
        src = sf.get("sourceRef")
        tgt = sf.get("targetRef")
        if src is not None and tgt is not None:
            if src in successors and tgt in flow_node_ids:
                successors[src].append(tgt)
            if tgt in predecessors and src in flow_node_ids:
                predecessors[tgt].append(src)

    return successors, predecessors


def forward_reachable(
    start: str,
    successors: dict[str, list[str]],
) -> set[str]:
    """Return all nodes reachable from ``start`` via forward BFS (excluding start)."""
    reached: set[str] = set()
    queue: deque[str] = deque(successors.get(start, []))
    while queue:
        current = queue.popleft()
        if current in reached:
            continue
        reached.add(current)
        for nxt in successors.get(current, []):
            if nxt not in reached:
                queue.append(nxt)
    return reached
