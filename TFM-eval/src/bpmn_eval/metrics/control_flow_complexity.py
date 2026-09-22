"""M7 — Control-Flow Complexity (CFC): Cardoso's complexity metric.

Contribution per diverging gateway:
    * XOR-split (exclusiveGateway, eventBasedGateway) → n (fan-out)
    * OR-split  (inclusiveGateway, complexGateway)    → 2^n - 1
    * AND-split (parallelGateway)                     → 1

CFC is summed across all diverging gateways in the model.  It is a pragmatic
indicator of model complexity: an LLM that hallucinates branching produces an
absurdly high CFC.  Reported as a descriptive metric (score=1.0, passed=None);
the raw value lives in ``details``.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from bpmn_eval.metrics._graph import build_adjacency, local_name
from bpmn_eval.models import BpmnModel, MetricResult
from bpmn_eval.parsing.namespaces import BPMN_NS, detect_bpmn_namespace

_XOR_LIKE: frozenset[str] = frozenset({"exclusiveGateway", "eventBasedGateway"})
_OR_LIKE: frozenset[str] = frozenset({"inclusiveGateway", "complexGateway"})
_AND_LIKE: frozenset[str] = frozenset({"parallelGateway"})


def _contribution(gateway_type: str, fan_out: int) -> int:
    if gateway_type in _XOR_LIKE:
        return fan_out
    if gateway_type in _OR_LIKE:
        result: int = (2**fan_out) - 1
        return result
    if gateway_type in _AND_LIKE:
        return 1
    return fan_out  # Defensive fallback: treat unknown gateway as XOR-like.


@dataclass
class ControlFlowComplexityMetric:
    """Cardoso's Control-Flow Complexity summed over diverging gateways."""

    name: str = "control_flow_complexity"
    description: str = (
        "Cardoso's CFC: sum of branching complexity over all "
        "diverging gateways (XOR=n, OR=2^n-1, AND=1)"
    )

    def evaluate(self, model: BpmnModel) -> MetricResult:
        ns = detect_bpmn_namespace(model.root) or BPMN_NS
        contributions: list[dict[str, Any]] = []
        cfc_total = 0
        split_count = 0

        for proc in model.processes:
            successors, _ = build_adjacency(proc, ns)

            for child in proc:
                local = local_name(child.tag)
                cid = child.get("id")
                if local is None or cid is None:
                    continue
                fan_out = len(successors.get(cid, []))
                if fan_out < 2:
                    continue
                if (
                    local not in _XOR_LIKE
                    and local not in _OR_LIKE
                    and local not in _AND_LIKE
                ):
                    continue

                split_count += 1
                contribution = _contribution(local, fan_out)
                cfc_total += contribution
                contributions.append({
                    "gateway_id": cid,
                    "type": local,
                    "outgoing": fan_out,
                    "contribution": contribution,
                })

        details: dict[str, Any] = {
            "cfc_total": cfc_total,
            "split_count": split_count,
            "contributions": contributions,
        }

        return MetricResult(
            metric_name=self.name,
            passed=None,
            score=1.0,
            details=details,
        )
