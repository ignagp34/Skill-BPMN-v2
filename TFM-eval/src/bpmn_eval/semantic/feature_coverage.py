"""Level 0 — expected-feature coverage (plan §6.1).

Each synthetic process declares ``expectedFeatures`` in its ``run-info.json``.
Because the corpus is ours, we know which constructs each diagram *should*
contain.  This module crosses that declared list with deterministic detectors
over the parser counts (:func:`bpmn_eval.parsing.counts.count_elements`) to
produce, with zero human judgement, a coverage score = captured / expected plus
the captured / missing feature lists.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field

Detector = Callable[[dict[str, int]], bool]

# feature name (as declared in run-info.json) → detector over parser counts.
FEATURE_DETECTORS: dict[str, Detector] = {
    "sequential_flow": lambda c: c["sequenceFlows"] >= 1,
    "tasks": lambda c: c["tasks"] >= 1,
    "single_pool": lambda c: c["participants"] >= 1,
    "multiple_pools": lambda c: c["participants"] >= 2,
    "multiple_lanes": lambda c: c["lanes"] >= 2,
    "start_end_events": lambda c: c["startEvents"] >= 1 and c["endEvents"] >= 1,
    "xor_gateway": lambda c: c["gateways_xor"] >= 1,
    "alternative_paths": lambda c: c["gateways_xor"] >= 1,
    "merge": lambda c: c["gateways_xor"] >= 1,
    "parallel_gateway": lambda c: c["gateways_and"] >= 1,
    "fork_join": lambda c: c["gateways_and"] >= 1,
    "message_flow": lambda c: c["messageFlows"] >= 1,
    "send_receive": lambda c: c["messageFlows"] >= 1,
    "data_objects": lambda c: c["dataObjects"] >= 1,
    "data_store": lambda c: c["dataStores"] >= 1,
    "annotations": lambda c: c["textAnnotations"] >= 1,
    "timer_event": lambda c: c["timerEvents"] >= 1,
    "escalation": lambda c: c["escalationEvents"] >= 1,
    "exception_flow": lambda c: c["boundaryEvents"] >= 1 or c["errorEvents"] >= 1,
    "cancellation": lambda c: c["boundaryEvents"] >= 1,
    "timer_or_exception_event": lambda c: (
        c["timerEvents"] >= 1 or c["boundaryEvents"] >= 1 or c["errorEvents"] >= 1
    ),
}


@dataclass(frozen=True)
class FeatureCoverage:
    """Per-experiment Level-0 coverage result."""

    score: float
    expected: list[str] = field(default_factory=list)
    captured: list[str] = field(default_factory=list)
    missing: list[str] = field(default_factory=list)
    # Declared features with no detector (should be empty; flags table gaps).
    unmapped: list[str] = field(default_factory=list)


def compute_feature_coverage(
    expected_features: list[str],
    counts: dict[str, int],
) -> FeatureCoverage:
    """Score how many declared features the parsed model actually exhibits.

    ``counts`` empty (a run that produced no model) → every expected feature is
    missing and the score is 0.0.  No expected features → vacuously 1.0.
    Unmapped declared features are excluded from the denominator and reported
    separately so a table gap never silently penalises a model.
    """
    expected = list(expected_features)
    unmapped = [f for f in expected if f not in FEATURE_DETECTORS]
    mapped = [f for f in expected if f in FEATURE_DETECTORS]

    if not mapped:
        return FeatureCoverage(
            score=1.0 if not expected else 0.0,
            expected=expected,
            captured=[],
            missing=[],
            unmapped=unmapped,
        )

    if not counts:
        return FeatureCoverage(
            score=0.0,
            expected=expected,
            captured=[],
            missing=mapped,
            unmapped=unmapped,
        )

    captured = [f for f in mapped if FEATURE_DETECTORS[f](counts)]
    missing = [f for f in mapped if f not in captured]
    return FeatureCoverage(
        score=len(captured) / len(mapped),
        expected=expected,
        captured=captured,
        missing=missing,
        unmapped=unmapped,
    )
