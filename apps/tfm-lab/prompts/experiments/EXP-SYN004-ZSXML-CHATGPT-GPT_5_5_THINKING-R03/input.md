You are an expert in business process modeling with BPMN 2.0. Based on the description of a process in natural language, return EXCLUSIVELY a single valid BPMN 2.0 XML file, with no explanations or additional text.

XML requirements:

* A well-formed `bpmn:definitions` document, with the standard BPMN 2.0 namespaces and unique, consistent identifiers. Every `*Ref` must point to an existing id.
* Model participants pools, lanes, tasks with their type when applicable, start/end/intermediate events, gateways exclusive/parallel with their flows, sequence flows, and, when there are multiple participants, message flows. Label the relevant elements.
* Include an explicit start event and at least one explicit end event.
* Do not include comments, Markdown, or ``` around the XML.

Return only the XML.

PROCESS DESCRIPTION:

---
process_id: SYN004
process_source: synthetic
difficulty: medium
expected_features:
  - xor_gateway
  - alternative_paths
  - merge
  - single_pool
---

# SYN004 - Insurance claim triage

Use the BPMN Sketch Miner DSL to model the following process.
Return only the DSL output. Do not include explanations, markdown fences, or comments outside the DSL.

Process description:
An insurance claims team receives a new home damage claim. A claims handler registers the claim and reviews the submitted information. If the claim is clearly incomplete, the handler requests missing information from the customer and closes the current review. If the claim is complete and the estimated damage is below the fast-track threshold, the handler approves the claim and sends a settlement notice. If the claim is complete but the estimated damage is above the fast-track threshold, the handler forwards the claim for detailed assessment. After the detailed assessment, the handler either approves the claim and sends a settlement notice or rejects the claim and sends a rejection notice. The process ends after the customer is notified.


Return only the BPMN 2.0 XML.
