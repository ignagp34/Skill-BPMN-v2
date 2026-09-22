"""M8 — Gateway Matching: block-structure correctness of split/join gateways.

For each diverging gateway *s* (out-degree ≥ 2):
    1. Compute the forward-reachable set from each of *s*'s outgoing flows.
    2. Let ``common`` be the intersection of those sets — nodes every branch
       reaches before hitting an end event (end events have no successors, so
       they naturally drop out of the intersection unless a single branch ends).
    3. Among ``common`` nodes that are converging gateways (in-degree ≥ 2),
       pick the one with minimum BFS distance from *s* — the nearest join.
    4. Strict type matching: the nearest join's type must pair with *s*'s type:
         - exclusiveGateway  ↔ exclusiveGateway
         - parallelGateway   ↔ parallelGateway
         - inclusiveGateway  ↔ inclusiveGateway
         - eventBasedGateway → exclusiveGateway (event-based = XOR join)
         - complexGateway    → inclusiveGateway (complex = OR-style join)

Score = matched_splits / total_splits  (1.0 when there are no splits).
Passes iff every split is matched.
"""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from typing import Any

from bpmn_eval.metrics._graph import (
    GATEWAY_TYPES,
    build_adjacency,
    forward_reachable,
    local_name,
)
from bpmn_eval.models import BpmnModel, MetricResult
from bpmn_eval.parsing.namespaces import BPMN_NS, detect_bpmn_namespace

# Expected join type for each split type (strict matching).
_EXPECTED_JOIN_TYPE: dict[str, str] = {
    "exclusiveGateway": "exclusiveGateway",
    "parallelGateway": "parallelGateway",
    "inclusiveGateway": "inclusiveGateway",
    "eventBasedGateway": "exclusiveGateway",
    "complexGateway": "inclusiveGateway",
}


def _bfs_distance(
    start: str,
    target: str,
    successors: dict[str, list[str]],
) -> int | None:
    """Shortest-path hop count from ``start`` to ``target``, or None if unreachable."""
    if start == target:
        return 0
    visited: set[str] = {start}
    queue: deque[tuple[str, int]] = deque([(start, 0)])
    while queue:
        node, dist = queue.popleft()
        for nxt in successors.get(node, []):
            if nxt == target:
                return dist + 1
            if nxt not in visited:
                visited.add(nxt)
                queue.append((nxt, dist + 1))
    return None


@dataclass
class GatewayMatchingMetric:
    """Validates that every split gateway has a strictly type-matched join."""

    name: str = "gateway_matching"
    description: str = (
        "Every diverging gateway must have a strictly type-matched "
        "converging gateway where all its branches reconverge"
    )

    def evaluate(self, model: BpmnModel) -> MetricResult:
        ns = detect_bpmn_namespace(model.root) or BPMN_NS

        total_splits = 0
        matched = 0
        matched_pairs: list[dict[str, Any]] = []
        unmatched: list[dict[str, Any]] = []

        for proc in model.processes:
            successors, predecessors = build_adjacency(proc, ns)
            # Map id → local name for every child element of the process.
            type_by_id: dict[str, str] = {}
            for child in proc:
                local = local_name(child.tag)
                cid = child.get("id")
                if local is not None and cid is not None:
                    type_by_id[cid] = local

            for child in proc:
                local = local_name(child.tag)
                gw_id = child.get("id")
                if local not in GATEWAY_TYPES or gw_id is None:
                    continue
                out_flows = successors.get(gw_id, [])
                if len(out_flows) < 2:
                    continue

                total_splits += 1
                expected_join = _EXPECTED_JOIN_TYPE.get(local, local)

                # Intersection of forward-reachable sets from each branch.
                per_branch_sets: list[set[str]] = [
                    forward_reachable(branch_start, successors) | {branch_start}
                    for branch_start in out_flows
                ]
                common: set[str] = (
                    set.intersection(*per_branch_sets)
                    if per_branch_sets
                    else set()
                )
                common.discard(gw_id)

                # Candidate joins: common nodes that are converging gateways.
                candidates: list[tuple[int, str]] = []
                for node_id in common:
                    if len(predecessors.get(node_id, [])) < 2:
                        continue
                    if type_by_id.get(node_id) not in GATEWAY_TYPES:
                        continue
                    dist = _bfs_distance(gw_id, node_id, successors)
                    if dist is not None:
                        candidates.append((dist, node_id))

                if not candidates:
                    unmatched.append({
                        "split_id": gw_id,
                        "type": local,
                        "issue": "no_common_join",
                    })
                    continue

                candidates.sort()
                _, nearest_id = candidates[0]
                nearest_type = type_by_id.get(nearest_id, "?")

                if nearest_type != expected_join:
                    unmatched.append({
                        "split_id": gw_id,
                        "type": local,
                        "issue": "type_mismatch",
                        "nearest_join_id": nearest_id,
                        "nearest_join_type": nearest_type,
                        "expected_join_type": expected_join,
                    })
                    continue

                matched += 1
                matched_pairs.append({
                    "split_id": gw_id,
                    "join_id": nearest_id,
                    "type": local,
                })

        if total_splits == 0:
            score = 1.0
        else:
            score = matched / total_splits

        return MetricResult(
            metric_name=self.name,
            passed=len(unmatched) == 0,
            score=score,
            details={
                "total_splits": total_splits,
                "matched": matched,
                "matched_pairs": matched_pairs,
                "unmatched": unmatched,
            },
        )
