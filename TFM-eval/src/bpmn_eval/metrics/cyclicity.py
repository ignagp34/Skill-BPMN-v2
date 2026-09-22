"""M10 — Cyclicity: detect cycles in the per-process control-flow graph.

Uses Tarjan's strongly-connected-components algorithm (iterative, O(V+E)).
Any SCC with more than one node, or any self-loop, is reported as a cycle.
Descriptive metric — score=1.0, passed=None; raw flags live in details.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from bpmn_eval.metrics._graph import build_adjacency
from bpmn_eval.models import BpmnModel, MetricResult
from bpmn_eval.parsing.namespaces import BPMN_NS, detect_bpmn_namespace


def _strongly_connected_components(
    successors: dict[str, list[str]],
) -> list[list[str]]:
    """Iterative Tarjan SCC.  Returns components in reverse topological order."""
    index_counter = [0]
    index: dict[str, int] = {}
    lowlink: dict[str, int] = {}
    on_stack: dict[str, bool] = {}
    stack: list[str] = []
    result: list[list[str]] = []

    def _iter_scc(start: str) -> None:
        # Work stack holds (node, successor_iterator)
        work: list[tuple[str, list[str], int]] = []
        index[start] = index_counter[0]
        lowlink[start] = index_counter[0]
        index_counter[0] += 1
        stack.append(start)
        on_stack[start] = True
        work.append((start, list(successors.get(start, [])), 0))

        while work:
            node, succs, i = work[-1]
            if i < len(succs):
                work[-1] = (node, succs, i + 1)
                nxt = succs[i]
                if nxt not in index:
                    index[nxt] = index_counter[0]
                    lowlink[nxt] = index_counter[0]
                    index_counter[0] += 1
                    stack.append(nxt)
                    on_stack[nxt] = True
                    work.append((nxt, list(successors.get(nxt, [])), 0))
                elif on_stack.get(nxt):
                    lowlink[node] = min(lowlink[node], index[nxt])
            else:
                # Finished visiting successors; pop component if root.
                if lowlink[node] == index[node]:
                    component: list[str] = []
                    while True:
                        top = stack.pop()
                        on_stack[top] = False
                        component.append(top)
                        if top == node:
                            break
                    result.append(component)
                work.pop()
                if work:
                    parent = work[-1][0]
                    lowlink[parent] = min(lowlink[parent], lowlink[node])

    for node in successors:
        if node not in index:
            _iter_scc(node)

    return result


@dataclass
class CyclicityMetric:
    """Detects cycles in the per-process control-flow graph."""

    name: str = "cyclicity"
    description: str = (
        "Presence of cycles in the control-flow graph "
        "(detects unintended LLM-generated loops)"
    )

    def evaluate(self, model: BpmnModel) -> MetricResult:
        ns = detect_bpmn_namespace(model.root) or BPMN_NS
        cycles: list[list[str]] = []

        for proc in model.processes:
            successors, _ = build_adjacency(proc, ns)
            sccs = _strongly_connected_components(successors)
            for comp in sccs:
                if len(comp) > 1:
                    cycles.append(sorted(comp))
                elif len(comp) == 1:
                    node = comp[0]
                    if node in successors.get(node, []):
                        cycles.append([node])

        details: dict[str, Any] = {
            "has_cycle": len(cycles) > 0,
            "cycle_count": len(cycles),
            "cycles": cycles,
        }

        return MetricResult(
            metric_name=self.name,
            passed=None,
            score=1.0,
            details=details,
        )
