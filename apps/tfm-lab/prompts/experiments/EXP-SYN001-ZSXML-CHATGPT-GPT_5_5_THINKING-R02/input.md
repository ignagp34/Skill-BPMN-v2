You are an expert in business process modeling with BPMN 2.0. Based on the description of a process in natural language, return EXCLUSIVELY a single valid BPMN 2.0 XML file, with no explanations or additional text.

XML requirements:

* A well-formed `bpmn:definitions` document, with the standard BPMN 2.0 namespaces and unique, consistent identifiers. Every `*Ref` must point to an existing id.
* Model participants pools, lanes, tasks with their type when applicable, start/end/intermediate events, gateways exclusive/parallel with their flows, sequence flows, and, when there are multiple participants, message flows. Label the relevant elements.
* Include an explicit start event and at least one explicit end event.
* Do not include comments, Markdown, or ``` around the XML.

Return only the XML.

PROCESS DESCRIPTION:

---
process_id: SYN001
process_source: synthetic
difficulty: easy
expected_features:
  - sequential_flow
  - single_pool
  - tasks
  - start_end_events
---

# SYN001 - University enrollment certificate

Use the BPMN Sketch Miner DSL to model the following process.
Return only the DSL output. Do not include explanations, markdown fences, or comments outside the DSL.

Process description:
At a university registrar office, a student requests an enrollment certificate. The registrar clerk receives the request, looks up the student's record, generates the certificate, checks the document for completeness, sends the certificate to the student by email, and closes the request.


Return only the BPMN 2.0 XML.
