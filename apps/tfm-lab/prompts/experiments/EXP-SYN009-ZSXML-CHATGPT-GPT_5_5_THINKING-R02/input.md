You are an expert in business process modeling with BPMN 2.0. Based on the description of a process in natural language, return EXCLUSIVELY a single valid BPMN 2.0 XML file, with no explanations or additional text.

XML requirements:

* A well-formed `bpmn:definitions` document, with the standard BPMN 2.0 namespaces and unique, consistent identifiers. Every `*Ref` must point to an existing id.
* Model participants pools, lanes, tasks with their type when applicable, start/end/intermediate events, gateways exclusive/parallel with their flows, sequence flows, and, when there are multiple participants, message flows. Label the relevant elements.
* Include an explicit start event and at least one explicit end event.
* Do not include comments, Markdown, or ``` around the XML.

Return only the XML.

PROCESS DESCRIPTION:

---
process_id: SYN009
process_source: synthetic
difficulty: medium
expected_features:
  - multiple_pools
  - message_flow
  - send_receive
  - xor_gateway
---

# SYN009 - Applicant and HR interview scheduling

Use the BPMN Sketch Miner DSL to model the following process.
Return only the DSL output. Do not include explanations, markdown fences, or comments outside the DSL.

Process description:
An applicant and an HR recruiter coordinate an interview. The recruiter reviews the application and sends an invitation with proposed interview times to the applicant. The applicant receives the invitation and decides whether one of the proposed times is acceptable. If the applicant accepts a proposed time, the applicant sends the selected time to HR, HR confirms the interview, and the applicant receives the confirmation. If the applicant cannot attend any proposed time, the applicant sends a request for alternative times. HR receives the request, sends a new set of times, the applicant selects one of them, HR confirms the interview, and the applicant receives the confirmation. The process ends when both parties have the confirmed interview time.


Return only the BPMN 2.0 XML.
