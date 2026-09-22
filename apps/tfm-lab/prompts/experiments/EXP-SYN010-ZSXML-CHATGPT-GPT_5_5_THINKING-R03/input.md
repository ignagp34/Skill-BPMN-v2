You are an expert in business process modeling with BPMN 2.0. Based on the description of a process in natural language, return EXCLUSIVELY a single valid BPMN 2.0 XML file, with no explanations or additional text.

XML requirements:

* A well-formed `bpmn:definitions` document, with the standard BPMN 2.0 namespaces and unique, consistent identifiers. Every `*Ref` must point to an existing id.
* Model participants pools, lanes, tasks with their type when applicable, start/end/intermediate events, gateways exclusive/parallel with their flows, sequence flows, and, when there are multiple participants, message flows. Label the relevant elements.
* Include an explicit start event and at least one explicit end event.
* Do not include comments, Markdown, or ``` around the XML.

Return only the XML.

PROCESS DESCRIPTION:

---
process_id: SYN010
process_source: synthetic
difficulty: medium
expected_features:
  - multiple_pools
  - message_flow
  - send_receive
  - xor_gateway
---

# SYN010 - Supplier and buyer purchase confirmation

Use the BPMN Sketch Miner DSL to model the following process.
Return only the DSL output. Do not include explanations, markdown fences, or comments outside the DSL.

Process description:
A buyer sends a purchase order to a supplier. The supplier receives the order and checks stock availability. If all requested items are available, the supplier sends an order confirmation to the buyer, the buyer receives the confirmation, and the order is accepted. If some items are unavailable, the supplier sends a revised offer with available quantities and dates. The buyer reviews the revised offer and decides whether to accept it. If the buyer accepts, the buyer sends acceptance to the supplier, the supplier receives it, and sends the final confirmation. If the buyer rejects the revised offer, the buyer sends a rejection message and the supplier closes the order request. The process ends when the order is confirmed or rejected.


Return only the BPMN 2.0 XML.
