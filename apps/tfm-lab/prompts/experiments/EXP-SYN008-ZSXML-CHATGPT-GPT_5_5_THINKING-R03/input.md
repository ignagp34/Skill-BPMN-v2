You are an expert in business process modeling with BPMN 2.0. Based on the description of a process in natural language, return EXCLUSIVELY a single valid BPMN 2.0 XML file, with no explanations or additional text.

XML requirements:

* A well-formed `bpmn:definitions` document, with the standard BPMN 2.0 namespaces and unique, consistent identifiers. Every `*Ref` must point to an existing id.
* Model participants pools, lanes, tasks with their type when applicable, start/end/intermediate events, gateways exclusive/parallel with their flows, sequence flows, and, when there are multiple participants, message flows. Label the relevant elements.
* Include an explicit start event and at least one explicit end event.
* Do not include comments, Markdown, or ``` around the XML.

Return only the XML.

PROCESS DESCRIPTION:

---
process_id: SYN008
process_source: synthetic
difficulty: medium
expected_features:
  - parallel_gateway
  - fork_join
  - single_pool
  - tasks
---

# SYN008 - Procurement request fulfillment

Use the BPMN Sketch Miner DSL to model the following process.
Return only the DSL output. Do not include explanations, markdown fences, or comments outside the DSL.

Process description:
In a procurement office, a department submits a request for standard office equipment. A procurement specialist reviews the request and confirms that the items are on the approved catalog. Then the specialist starts three activities in parallel: reserve budget, create the purchase order, and notify the warehouse of the expected delivery. Once all three activities are completed, the specialist sends the order confirmation to the requesting department and closes the request.


Return only the BPMN 2.0 XML.
