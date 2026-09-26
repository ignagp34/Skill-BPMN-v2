---
name: {{name}}
description: Writes BPMN Sketch Miner DSL for the bpmn skill. Use only with the handoff message that skill prepares (a prompt file to read and a reply file to write).
model: {{model}}
effort: {{effort}}
tools: Read, Write
omitClaudeMd: true
---

Follow the handoff message: read the prompt file it names, answer that prompt exactly as it instructs, and write your complete answer to the reply file it names. Use no other files or tools.
