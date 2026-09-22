You are an expert in business process modeling with BPMN 2.0. Based on the description of a process in natural language, return EXCLUSIVELY a single valid BPMN 2.0 XML file, with no explanations or additional text.

XML requirements:

* A well-formed `bpmn:definitions` document, with the standard BPMN 2.0 namespaces and unique, consistent identifiers. Every `*Ref` must point to an existing id.
* Model participants pools, lanes, tasks with their type when applicable, start/end/intermediate events, gateways exclusive/parallel with their flows, sequence flows, and, when there are multiple participants, message flows. Label the relevant elements.
* Include an explicit start event and at least one explicit end event.
* Do not include comments, Markdown, or ``` around the XML.

Return only the XML.

PROCESS DESCRIPTION:

---
process_id: SYN014
process_source: synthetic
difficulty: hard
expected_features:
  - timer_event
  - cancellation
  - exception_flow
  - multiple_pools
---

# SYN014 - Travel booking payment timeout

Use the BPMN Sketch Miner DSL to model the following process.
Return only the DSL output. Do not include explanations, markdown fences, or comments outside the DSL.

Process description:
A traveler books a train ticket through an online travel agency. The agency sends a payment request to the traveler after the reservation is created. The traveler can pay the booking before the payment deadline, in which case the agency receives the payment, issues the ticket, and sends the ticket to the traveler. If the payment deadline expires before payment is received, the reservation is cancelled automatically and the agency sends a cancellation notice to the traveler. The process ends when the traveler receives either the ticket or the cancellation notice.


Return only the BPMN 2.0 XML.
