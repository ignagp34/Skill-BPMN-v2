You are an expert in business process modeling with BPMN 2.0. Based on the description of a process in natural language, return EXCLUSIVELY a single valid BPMN 2.0 XML file, with no explanations or additional text.

XML requirements:

* A well-formed `bpmn:definitions` document, with the standard BPMN 2.0 namespaces and unique, consistent identifiers. Every `*Ref` must point to an existing id.
* Model participants pools, lanes, tasks with their type when applicable, start/end/intermediate events, gateways exclusive/parallel with their flows, sequence flows, and, when there are multiple participants, message flows. Label the relevant elements.
* Include an explicit start event and at least one explicit end event.
* Do not include comments, Markdown, or ``` around the XML.

Return only the XML.

PROCESS DESCRIPTION:

---
process_id: SYN003
process_source: synthetic
difficulty: easy
expected_features:
  - sequential_flow
  - single_pool
  - tasks
  - start_end_events
---

# SYN003 - Outpatient appointment check-in

Use the BPMN Sketch Miner DSL to model the following process.
Return only the DSL output. Do not include explanations, markdown fences, or comments outside the DSL.

Process description:
At a medical clinic, a patient arrives for a scheduled outpatient appointment. The reception clerk greets the patient, confirms the appointment, updates the patient's arrival in the system, prints the visit label, directs the patient to the waiting area, and completes the check-in.


Return only the BPMN 2.0 XML.
