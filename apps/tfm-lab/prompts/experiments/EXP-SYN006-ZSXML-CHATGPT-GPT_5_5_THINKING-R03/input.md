You are an expert in business process modeling with BPMN 2.0. Based on the description of a process in natural language, return EXCLUSIVELY a single valid BPMN 2.0 XML file, with no explanations or additional text.

XML requirements:

* A well-formed `bpmn:definitions` document, with the standard BPMN 2.0 namespaces and unique, consistent identifiers. Every `*Ref` must point to an existing id.
* Model participants pools, lanes, tasks with their type when applicable, start/end/intermediate events, gateways exclusive/parallel with their flows, sequence flows, and, when there are multiple participants, message flows. Label the relevant elements.
* Include an explicit start event and at least one explicit end event.
* Do not include comments, Markdown, or ``` around the XML.

Return only the XML.

PROCESS DESCRIPTION:

---
process_id: SYN006
process_source: synthetic
difficulty: medium
expected_features:
  - xor_gateway
  - alternative_paths
  - merge
  - single_pool
---

# SYN006 - Bank card application outcome

Use the BPMN Sketch Miner DSL to model the following process.
Return only the DSL output. Do not include explanations, markdown fences, or comments outside the DSL.

Process description:
At a retail bank, a customer applies for a new credit card. A banking officer receives the application and checks the provided information. If mandatory information is missing, the officer asks the customer to submit the missing information and stops the application for now. If the application is complete, the officer performs a credit check. When the credit result is approved, the officer creates the card account, orders the card, and sends an approval message to the customer. When the credit result is borderline, the officer sends the application to a supervisor for manual review. The supervisor either approves the application, leading to account creation, card ordering, and an approval message, or rejects the application and sends a rejection message. When the credit result is declined, the officer sends a rejection message immediately. The process ends after the customer is notified.


Return only the BPMN 2.0 XML.
