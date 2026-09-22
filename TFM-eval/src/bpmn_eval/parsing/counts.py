"""Element-type counts taken from a parsed :class:`BpmnModel`.

These counts are the **source of truth** for the descriptive node-type columns
(plan §5.3) and for Level-0 feature detection (plan §6.1).  They are computed by
re-parsing the BPMN / ``semanticXml`` here — **never** read from
``result.json.metrics``, which is all-zero on ``render_error`` cases even when a
valid semantic model exists.
"""

from __future__ import annotations

from bpmn_eval.metrics._graph import (
    EVENT_TYPES,
    GATEWAY_TYPES,
    TASK_TYPES,
    local_name,
)
from bpmn_eval.models import BpmnModel

# Gateway local name → its subtype count column.
_GATEWAY_COLUMNS: dict[str, str] = {
    "exclusiveGateway": "gateways_xor",
    "parallelGateway": "gateways_and",
    "inclusiveGateway": "gateways_or",
    "eventBasedGateway": "gateways_event",
    "complexGateway": "gateways_complex",
}

# Element local name → 1:1 count column.
_SIMPLE_COLUMNS: dict[str, str] = {
    "lane": "lanes",
    "participant": "participants",
    "sequenceFlow": "sequenceFlows",
    "messageFlow": "messageFlows",
    "dataObjectReference": "dataObjects",
    "dataStoreReference": "dataStores",
    "textAnnotation": "textAnnotations",
    "boundaryEvent": "boundaryEvents",
    "startEvent": "startEvents",
    "endEvent": "endEvents",
}

# Event-definition local name → count column (drives timer/escalation/... features).
_EVENT_DEFINITION_COLUMNS: dict[str, str] = {
    "timerEventDefinition": "timerEvents",
    "escalationEventDefinition": "escalationEvents",
    "errorEventDefinition": "errorEvents",
    "messageEventDefinition": "messageEvents",
    "signalEventDefinition": "signalEvents",
}

# Every count key produced by :func:`count_elements`, in a stable order.
COUNT_KEYS: tuple[str, ...] = (
    "tasks",
    "events",
    "gateways",
    "gateways_xor",
    "gateways_and",
    "gateways_or",
    "gateways_event",
    "gateways_complex",
    "lanes",
    "participants",
    "sequenceFlows",
    "messageFlows",
    "dataObjects",
    "dataStores",
    "textAnnotations",
    "startEvents",
    "endEvents",
    "boundaryEvents",
    "timerEvents",
    "escalationEvents",
    "errorEvents",
    "messageEvents",
    "signalEvents",
)

# The subset surfaced as descriptive columns in the experiment CSV (plan §5.3).
COUNT_FIELDS: tuple[str, ...] = (
    "tasks",
    "events",
    "gateways",
    "lanes",
    "participants",
    "sequenceFlows",
    "messageFlows",
    "dataObjects",
)


def count_elements(model: BpmnModel) -> dict[str, int]:
    """Tally BPMN element types across the whole document tree.

    Counts are taken over ``model.root.iter()`` so collaboration-level elements
    (participants, message flows) are included alongside process-level nodes.
    The DI section carries no BPMN model elements, so it never inflates a count.
    """
    counts: dict[str, int] = dict.fromkeys(COUNT_KEYS, 0)
    for elem in model.root.iter():
        name = local_name(elem.tag)
        if name is None:
            continue
        if name in TASK_TYPES:
            counts["tasks"] += 1
        if name in EVENT_TYPES:
            counts["events"] += 1
        if name in GATEWAY_TYPES:
            counts["gateways"] += 1
            counts[_GATEWAY_COLUMNS[name]] += 1
        simple = _SIMPLE_COLUMNS.get(name)
        if simple is not None:
            counts[simple] += 1
        event_def = _EVENT_DEFINITION_COLUMNS.get(name)
        if event_def is not None:
            counts[event_def] += 1
    return counts
