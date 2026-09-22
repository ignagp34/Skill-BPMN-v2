You are an expert in business process modeling with BPMN 2.0. Based on the description of a process in natural language, return EXCLUSIVELY a single valid BPMN 2.0 XML file, with no explanations or additional text.

XML requirements:

* A well-formed `bpmn:definitions` document, with the standard BPMN 2.0 namespaces and unique, consistent identifiers. Every `*Ref` must point to an existing id.
* Model participants pools, lanes, tasks with their type when applicable, start/end/intermediate events, gateways exclusive/parallel with their flows, sequence flows, and, when there are multiple participants, message flows. Label the relevant elements.
* Include an explicit start event and at least one explicit end event.
* Do not include comments, Markdown, or ``` around the XML.

Return only the XML.

PROCESS DESCRIPTION:

---
process_id: SYN012
process_source: synthetic
difficulty: medium
expected_features:
  - data_objects
  - data_store
  - annotations
  - xor_gateway
---

# SYN012 - Hospital billing adjustment

Use the BPMN Sketch Miner DSL to model the following process.
Return only the DSL output. Do not include explanations, markdown fences, or comments outside the DSL.

Process description:
In a hospital billing office, a patient disputes a charge on an invoice. A billing specialist receives the dispute letter, opens the patient account in the billing system, and reviews the invoice, the treatment record, and the insurance response. Add a note that adjustments require documented justification. If the charge is confirmed as correct, the specialist sends an explanation letter and closes the dispute. If the charge is incorrect, the specialist prepares an adjustment form, updates the billing system, issues a corrected invoice, and sends the corrected invoice to the patient. The process ends after the patient has been informed.


Return only the BPMN 2.0 XML.
