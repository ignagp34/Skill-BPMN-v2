You are an expert in business process modeling with BPMN 2.0. Based on the description of a process in natural language, return EXCLUSIVELY a single valid BPMN 2.0 XML file, with no explanations or additional text.

XML requirements:

* A well-formed `bpmn:definitions` document, with the standard BPMN 2.0 namespaces and unique, consistent identifiers. Every `*Ref` must point to an existing id.
* Model participants pools, lanes, tasks with their type when applicable, start/end/intermediate events, gateways exclusive/parallel with their flows, sequence flows, and, when there are multiple participants, message flows. Label the relevant elements.
* Include an explicit start event and at least one explicit end event.
* Do not include comments, Markdown, or ``` around the XML.

Return only the XML.

PROCESS DESCRIPTION:

---
process_id: SYN007
process_source: synthetic
difficulty: medium
expected_features:
  - parallel_gateway
  - fork_join
  - single_pool
  - tasks
---

# SYN007 - Employee onboarding setup

Use the BPMN Sketch Miner DSL to model the following process.
Return only the DSL output. Do not include explanations, markdown fences, or comments outside the DSL.

Process description:
An HR operations team prepares onboarding for a new employee. The team receives the signed contract and records the start date. Then three activities can happen in parallel: create the employee profile in the HR system, prepare the laptop, and assign mandatory training. After all three are finished, the onboarding coordinator sends the welcome package to the employee and marks the onboarding setup as complete.


Return only the BPMN 2.0 XML.
