# Attribution & Provenance

This file credits third-party notation, schemas, and documentation reproduced in
or relied upon by this repository. Software dependencies and their licenses are
listed separately in [`THIRD-PARTY-NOTICES.md`](../THIRD-PARTY-NOTICES.md).

---

## BPMN Sketch Miner notation (textual DSL)

The textual domain-specific language used by this project — the trace-based
syntax in which a process is written as repeated, merge-by-label execution
traces (`( )` events, `[ ]` data objects, `|` parallel, `?` gateway questions,
`...` fragments, `//` annotations, pool/lane `:` annotations, etc.) — is the
**BPMN Sketch Miner** notation.

> **BPMN Sketch Miner**
> Ana Ivanchikj, Souhaila Serbout, and Cesare Pautasso
> Software Institute (USI), Università della Svizzera italiana, Lugano, Switzerland
> <https://www.bpmn-sketch-miner.ai/>

The system-prompt files in this repository
(`apps/tfm-lab/prompts/system/`, `apps/tfm-lab/input/`,
`apps/company-web/prompts/system/`) describe and give examples of this notation,
with syntax rules compiled from the official BPMN Sketch Miner documentation.
The notation, its syntax, and its authoring methodology are credited to the
authors above and are **not** the original work of this project. This project is
not affiliated with, sponsored by, or endorsed by the BPMN Sketch Miner authors
or USI.

### What in this project *is* original work

The following are independent, original work authored for this repository and
are **not** part of, derived from, or copied out of the BPMN Sketch Miner tool
or its source code:

- **`@text-to-bpmn/core`** — the DSL lexer/parser (built on Chevrotain), the
  semantic model, the BPMN 2.0 XML emitter, the orthogonal layout/edge-routing
  and renderer, and the validator.
- **`tfm-lab`** and **`company-web`** — the applications, their UI, and their
  integration with `bpmn-js` for on-canvas rendering.
- **`bpmn-eval`** (`TFM-eval/`) — the Python metric/evaluation pipeline.

In other words: the **notation** (how a user writes the text) is BPMN Sketch
Miner's; the **engine** that parses that text and produces/renders/evaluates
BPMN 2.0 is this project's own implementation.

> **Note on the v3.1 prompts.** The `*_system_prompt_v3_1*` files are pinned by
> content hash (`inputPromptHash` in the experiment `result.json` records) and
> are part of an already-delivered research dataset; they are intentionally left
> byte-for-byte unchanged. This central attribution covers them as well. See the
> compliance report for details.

---

## BPMN 2.0 XML schemas (OMG)

`TFM-eval/schemas/{BPMN20,BPMNDI,DC,DI,Semantic}.xsd` are the machine-readable
XML Schema files for the **Business Process Model and Notation (BPMN) 2.0**
specification, published by the **Object Management Group (OMG)**.

> Business Process Model and Notation (BPMN), Version 2.0
> Copyright © Object Management Group, Inc. (OMG)
> <https://www.omg.org/spec/BPMN/2.0/>

"BPMN", "Business Process Model and Notation", and "OMG" are trademarks of the
Object Management Group, Inc. These schema files are reproduced for
specification-conformance validation. See
[`../TFM-eval/schemas/NOTICE.md`](../TFM-eval/schemas/NOTICE.md) — the original
OMG copyright header should be restored into the `.xsd` files before public
release (flagged in the compliance report; left for the maintainer to apply
verbatim from the official OMG distribution).

---

## bpmn.io toolkit watermark

On-canvas rendering uses `bpmn-js` (and `diagram-js`) by bpmn.io / Camunda
Services GmbH. The bpmn.io License requires the bpmn.io watermark linking to
<https://bpmn.io> to remain fully visible and not visually overlapped in
rendered diagrams. This obligation is honored — see the bpmn.io entry in
[`THIRD-PARTY-NOTICES.md`](../THIRD-PARTY-NOTICES.md).

---

## Fonts

`company-web` loads **Geist**, **Instrument Serif**, **Roboto**, and
**JetBrains Mono** at runtime from Google Fonts; they are not redistributed in
this repository. Geist, Instrument Serif, and JetBrains Mono are licensed under
the SIL Open Font License 1.1; Roboto under the Apache License 2.0.

---

## Third-party trademarks

Trademarks referenced in UI copy or in experiment data are the property of their
respective owners and are used for nominative/descriptive (interoperability and
identification) purposes only. This includes, without limitation: BPMN, BPMN
Sketch Miner, Camunda, Signavio, Bizagi, draw.io, Vercel, OpenAI / ChatGPT /
GPT, Anthropic / Claude, and Google / Gemini. No affiliation or endorsement is
implied.
