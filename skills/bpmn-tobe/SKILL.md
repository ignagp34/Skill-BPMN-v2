---
name: bpmn-tobe
description: Turns an AS-IS BPMN diagram made with the skill bpmn into its TO-BE version (value stream map style), without changing the process. Blocking points (red) and improvement actions (green) become coloured annotations on the tasks, the annotated tasks are coloured too, and the process keeps the same position in both diagrams. Delivers two diagrams, AS-IS and TO-BE, each as PNG, SVG and .bpmn with DI, with the colours in BPMN in Color and bpmn.io format. Use it when the user wants to mark bottlenecks, blocking points, waste or improvements on an existing BPMN diagram, or asks for the TO-BE/VSM of an AS-IS.
---

# TO-BE of an AS-IS BPMN diagram

The process does not change: the model only chooses **which task** gets **which mark** (a JSON). The CLI inserts the `//` lines in the DSL, the TFM engine draws, a pass after the layout applies the colours, and the skill bpmn's exporters and checks run. Do not write DSL or XML by hand. Changes to the flow are out of scope: if the user wants to add or remove steps, first use `edit-prompt` of the skill bpmn to create a new AS-IS.

`CLI` = `node <folder of this skill>/scripts/bpmn-tobe.mjs`. `CLI doctor` must return `"ok": true`.

## Flow

1. **AS-IS.** You need the folder of a skill bpmn run that compiled. If there is none, create it first with the skill bpmn.
2. **Prepare.** Save the user's blocking points and improvements, word for word, in a file, then run `CLI prepare --from <AS-IS runDir> --request-file <file> [--host <host>]`. It returns `runDir` and `handoff`. `unmarkableTasks` lists the tasks that appear only in parallel lines (`A|B`); those cannot carry a mark.
3. **Generate.** Send `handoff.message` exactly as it is to the generator of the skill bpmn (in Claude Code, a new `bpmn-dsl-generator` subagent). It reads `promptFile` and writes its JSON to `replyFile`.
4. **Render.** Run `CLI render --run <runDir> --raw <handoff.replyFile> --model <actual model> --effort <actual effort> --host <host> --evidence "<…>"`.
5. **Repair (at most 2).** Only if the result has `"canRepair": true` (status `invalid_marks`, e.g. a task name that does not exist): run `CLI repair-prompt --run <runDir>`, then repeat steps 3 and 4.
6. **Deliver**, according to `status` (table in `../bpmn/references/contract.md`):
   - Show the TO-BE PNG, and link the three files of `deliverables.asIs` and the three of `deliverables.toBe` with absolute paths.
   - Pass on the `notes` (requests that could not be attached to a task) and `lostMarks`.
   - If `stability.stable` is `false`, report it: some part of the process moved.
   - With the default strategy, the AS-IS is the TO-BE without its marks. If making room for the annotations opened bands, it has more space than the original AS-IS.
   - Never present files that are not listed in `deliverables`.

Kinds, colours and strategy: `config/tobe.json`. Run folder and statuses: `references/contract.md`.
