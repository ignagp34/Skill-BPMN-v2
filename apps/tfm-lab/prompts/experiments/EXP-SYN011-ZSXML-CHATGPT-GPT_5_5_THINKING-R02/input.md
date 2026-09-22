You are an expert in business process modeling with BPMN 2.0. Based on the description of a process in natural language, return EXCLUSIVELY a single valid BPMN 2.0 XML file, with no explanations or additional text.

XML requirements:

* A well-formed `bpmn:definitions` document, with the standard BPMN 2.0 namespaces and unique, consistent identifiers. Every `*Ref` must point to an existing id.
* Model participants pools, lanes, tasks with their type when applicable, start/end/intermediate events, gateways exclusive/parallel with their flows, sequence flows, and, when there are multiple participants, message flows. Label the relevant elements.
* Include an explicit start event and at least one explicit end event.
* Do not include comments, Markdown, or ``` around the XML.

Return only the XML.

PROCESS DESCRIPTION:

---
process_id: SYN011
process_source: synthetic
difficulty: medium
expected_features:
  - data_objects
  - data_store
  - annotations
  - single_pool
---

# SYN011 - Public grant application review

Use the BPMN Sketch Miner DSL to model the following process.
Return only the DSL output. Do not include explanations, markdown fences, or comments outside the DSL.

Process description:
At a public administration agency, an officer reviews a small business grant application. The process starts when the application form and supporting budget file are received. The officer registers the application in the grants database, checks the application form, reviews the budget file, and consults the eligibility rules. Add a note that incomplete applications must not be assessed for merit. If information is missing, the officer records the issue and sends a request for completion. If the application is complete, the officer writes an evaluation report, stores the report in the case repository, and issues the recommendation for decision.


Return only the BPMN 2.0 XML.
