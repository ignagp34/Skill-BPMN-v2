"""M3 — Element Degree Rules: verify in-degree / out-degree constraints."""

from __future__ import annotations

from dataclasses import dataclass

from bpmn_eval.models import BpmnModel, MetricResult
from bpmn_eval.parsing.namespaces import BPMN_NS, detect_bpmn_namespace

# Expected (in-degree, out-degree) constraints per element type.
# Tuples are (min_in, max_in, min_out, max_out).  None = unbounded.
_DEGREE_RULES: dict[str, tuple[int, int | None, int, int | None]] = {
    "startEvent":              (0, 0, 1, 1),
    "endEvent":                (1, None, 0, 0),
    "task":                    (1, 1, 1, 1),
    "userTask":                (1, 1, 1, 1),
    "serviceTask":             (1, 1, 1, 1),
    "sendTask":                (1, 1, 1, 1),
    "receiveTask":             (1, 1, 1, 1),
    "manualTask":              (1, 1, 1, 1),
    "businessRuleTask":        (1, 1, 1, 1),
    "scriptTask":              (1, 1, 1, 1),
    "subProcess":              (1, 1, 1, 1),
    "callActivity":            (1, 1, 1, 1),
}

# Gateways are checked dynamically based on their actual direction.
_GATEWAY_TYPES = frozenset({
    "exclusiveGateway", "parallelGateway", "inclusiveGateway",
    "eventBasedGateway", "complexGateway",
})


def _local_name(tag: object) -> str | None:
    """Return the local name, or None for non-element nodes (comments, PIs)."""
    if not isinstance(tag, str):
        return None
    if "}" in tag:
        return tag.split("}", 1)[1]
    return tag


def _check_bounds(
    value: int,
    lo: int,
    hi: int | None,
) -> bool:
    if value < lo:
        return False
    if hi is not None and value > hi:
        return False
    return True


@dataclass
class ElementDegreeMetric:
    """Verifies that every flow node satisfies its in/out-degree constraints."""

    name: str = "element_degree"
    description: str = (
        "Mathematical verification of input/output degree "
        "per element type"
    )

    def evaluate(self, model: BpmnModel) -> MetricResult:
        ns = detect_bpmn_namespace(model.root) or BPMN_NS
        violations: list[dict[str, object]] = []
        total_checked = 0
        compliant = 0

        for proc in model.processes:
            # Build in-degree and out-degree maps
            in_degree: dict[str, int] = {}
            out_degree: dict[str, int] = {}

            for child in proc:
                cid = child.get("id")
                if cid is not None:
                    in_degree.setdefault(cid, 0)
                    out_degree.setdefault(cid, 0)

            for sf in proc.findall(f"{{{ns}}}sequenceFlow"):
                src = sf.get("sourceRef")
                tgt = sf.get("targetRef")
                if src is not None:
                    out_degree[src] = out_degree.get(src, 0) + 1
                if tgt is not None:
                    in_degree[tgt] = in_degree.get(tgt, 0) + 1

            # Check each element
            for child in proc:
                local = _local_name(child.tag)
                cid = child.get("id")
                if cid is None:
                    continue

                ind = in_degree.get(cid, 0)
                outd = out_degree.get(cid, 0)

                if local in _DEGREE_RULES:
                    total_checked += 1
                    min_in, max_in, min_out, max_out = _DEGREE_RULES[local]
                    ok = _check_bounds(ind, min_in, max_in) and _check_bounds(
                        outd, min_out, max_out
                    )
                    if ok:
                        compliant += 1
                    else:
                        violations.append({
                            "element_id": cid,
                            "type": local,
                            "in_degree": ind,
                            "out_degree": outd,
                            "expected": (
                                f"in=[{min_in},{max_in}]"
                                f" out=[{min_out},{max_out}]"
                            ),
                        })

                elif local in _GATEWAY_TYPES:
                    total_checked += 1
                    # Infer direction from topology
                    if outd >= 2:
                        # Diverging: in=1, out>=2
                        ok = (ind == 1)
                    elif ind >= 2:
                        # Converging: in>=2, out=1
                        ok = (outd == 1)
                    else:
                        # Single in, single out is unusual but not invalid
                        ok = (ind >= 1 and outd >= 1)

                    if ok:
                        compliant += 1
                    else:
                        violations.append({
                            "element_id": cid,
                            "type": local,
                            "in_degree": ind,
                            "out_degree": outd,
                            "note": "gateway degree mismatch",
                        })

        score = compliant / total_checked if total_checked > 0 else 0.0

        return MetricResult(
            metric_name=self.name,
            passed=len(violations) == 0,
            score=score,
            details={
                "total_checked": total_checked,
                "compliant": compliant,
                "violations": violations,
            },
        )
