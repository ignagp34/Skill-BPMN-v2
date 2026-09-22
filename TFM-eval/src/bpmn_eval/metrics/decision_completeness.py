"""M4 — Decision Completeness (redefined from "gateway executability").

Thesis decision: the original M4 required a
``default`` attribute plus a ``conditionExpression`` on every non-default branch.
Verified across the whole DSL corpus, **no** diagram emits either — the compiler
never produces them and the DSL has no default-branch syntax — so original M4
scored 0 whenever a gateway existed: it measured the *compiler*, not the model.

The DSL ``?`` labels *are* emitted as ``sequenceFlow/@name`` (``name="Yes"`` …),
so M4 is redefined to **decision completeness**: for every diverging exclusive
(XOR) gateway, what fraction of its outgoing branches carry a non-empty label?
This captures "does each decision spell out its exits?", discriminates (a
forgotten branch label lowers the score), is complementary to M5 (global label
coverage) and M8 (split/join pairing), and is computed purely from the model.
"""

from __future__ import annotations

from dataclasses import dataclass

from lxml import etree

from bpmn_eval.models import BpmnModel, MetricResult
from bpmn_eval.parsing.namespaces import BPMN_NS, detect_bpmn_namespace


def _local_name(tag: object) -> str | None:
    """Return the local name, or None for non-element nodes (comments, PIs)."""
    if not isinstance(tag, str):
        return None
    if "}" in tag:
        return tag.split("}", 1)[1]
    return tag


@dataclass
class DecisionCompletenessMetric:
    """Fraction of diverging-XOR outgoing branches that carry a label."""

    name: str = "decision_completeness"
    description: str = (
        "For each diverging exclusive gateway, the fraction of outgoing "
        "branches that carry a non-empty name (decision label)"
    )

    def evaluate(self, model: BpmnModel) -> MetricResult:
        ns = detect_bpmn_namespace(model.root) or BPMN_NS
        total_branches = 0
        labelled_branches = 0
        diverging_gateways = 0
        unlabelled: list[dict[str, object]] = []

        for proc in model.processes:
            # Index outgoing sequence flows by their source node.
            outgoing: dict[str, list[etree._Element]] = {}
            for sf in proc.findall(f"{{{ns}}}sequenceFlow"):
                src = sf.get("sourceRef")
                if src is not None:
                    outgoing.setdefault(src, []).append(sf)

            for child in proc:
                if _local_name(child.tag) != "exclusiveGateway":
                    continue
                gw_id = child.get("id")
                branches = outgoing.get(gw_id, []) if gw_id else []
                # Only diverging gateways model a decision (out-degree >= 2).
                if len(branches) < 2:
                    continue

                diverging_gateways += 1
                gw_unlabelled = 0
                for sf in branches:
                    total_branches += 1
                    if (sf.get("name") or "").strip():
                        labelled_branches += 1
                    else:
                        gw_unlabelled += 1
                if gw_unlabelled:
                    unlabelled.append(
                        {"gateway_id": gw_id, "unlabelled_branches": gw_unlabelled}
                    )

        # No diverging XOR → vacuously complete (score 1.0).
        score = 1.0 if total_branches == 0 else labelled_branches / total_branches

        return MetricResult(
            metric_name=self.name,
            passed=labelled_branches == total_branches,
            score=score,
            details={
                "diverging_exclusive_gateways": diverging_gateways,
                "total_branches": total_branches,
                "labelled_branches": labelled_branches,
                "unlabelled": unlabelled,
            },
        )
