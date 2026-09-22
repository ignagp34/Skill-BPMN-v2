You are an expert in business process modeling with BPMN 2.0. Based on the description of a process in natural language, return EXCLUSIVELY a single valid BPMN 2.0 XML file, with no explanations or additional text.

XML requirements:

* A well-formed `bpmn:definitions` document, with the standard BPMN 2.0 namespaces and unique, consistent identifiers. Every `*Ref` must point to an existing id.
* Model participants pools, lanes, tasks with their type when applicable, start/end/intermediate events, gateways exclusive/parallel with their flows, sequence flows, and, when there are multiple participants, message flows. Label the relevant elements.
* Include an explicit start event and at least one explicit end event.
* Do not include comments, Markdown, or ``` around the XML.

Return only the XML.

PROCESS DESCRIPTION:

---
process_id: SYN013
process_source: synthetic
difficulty: hard
expected_features:
  - timer_event
  - escalation
  - exception_flow
  - single_pool
---

# SYN013 - Support ticket SLA breach

Use the BPMN Sketch Miner DSL to model the following process.
Return only the DSL output. Do not include explanations, markdown fences, or comments outside the DSL.

Process description:
In an IT support center, a high-priority ticket is assigned to a support agent. The agent investigates the issue and works on a resolution. If the issue is resolved before the SLA deadline, the agent documents the fix, informs the user, and closes the ticket. If the SLA deadline is reached before the issue is resolved, an escalation is triggered to the team lead. The team lead reviews the ticket, assigns additional support, and the team continues work until the issue is resolved. After resolution, the agent documents the fix, informs the user, and closes the ticket.


Return only the BPMN 2.0 XML.
