# Zero-shot BPMN-XML harness

Direct XML experiments use this folder name:

```text
EXP-SYN001-ZSXML-CHATGPT-GPT_5_5_THINKING-R01/
```

Required files:

```text
input.md          Prompt shown to the model
output.bpmn       Untouched XML pasted from the model
run-info.json     Provenance, representation, usage, and expected features
```

The harness writes `result.json`, `diagram.bpmn`, `diagram.svg`, and
`diagram.png`. It never overwrites `output.bpmn`.

## run-info.json

```json
{
  "representation": "zero_shot_xml",
  "processId": "SYN001",
  "processSource": "synthetic",
  "difficulty": "easy",
  "expectedFeatures": ["tasks", "start_end_events"],
  "provider": "CHATGPT",
  "modelLabel": "GPT_5_5_THINKING",
  "runNumber": 1,
  "inputSystemTokens": null,
  "inputProcessTokens": null,
  "inputTokens": null,
  "outputTokens": null,
  "totalTokens": null,
  "tokenSource": null,
  "elapsedSeconds": null,
  "iterations": 1,
  "postprocessing": []
}
```

The representation enum is `dsl`, `zero_shot_xml`, `zero_shot_image`, or
`zero_shot_mcp`. Token estimates are populated offline with fixed
`o200k_base` tokenization. Use `null` for token or timing values that were not
captured.
`postprocessing` records intentional changes to the model output; use `[]` when
the pasted XML is untouched.

## Fairness boundary

M1–M10 and expected-feature coverage always inspect raw `output.bpmn`.
`diagram.bpmn` is only a visualization artifact. If the raw XML has no BPMN DI,
the harness may apply `bpmn-auto-layout` before the bpmn-js import and records
`bpmn-auto-layout:render_only` in `result.json`.

`bpmnXmlValid` is exactly Python metric M1. Semantic success is derived as:

```text
dsl:            parserValid AND semanticValid
zero_shot_xml:  bpmnXmlValid AND bpmnImportValid
render_success: renderValid
```

Malformed raw XML receives M1=0 and zero metric scores; it is never repaired for
scoring.

## One-command run

```powershell
pwsh scripts/run-zero-shot-comparison.ps1
```

This ingests ZSXML folders, runs the unchanged DSL renderer, estimates token
usage, evaluates every EXP folder, and writes reports under
`TFM-eval/results/experiments/`.

To exercise the three fixtures without modifying them:

```powershell
Copy-Item apps/tfm-lab/tests/fixtures/zero-shot-experiments C:\tmp\zsxml-fixtures -Recurse
pwsh scripts/run-zero-shot-comparison.ps1 `
  -Experiments C:\tmp\zsxml-fixtures `
  -Force `
  -SkipDslRender
```

The fixture corpus contains valid XML with DI, broken references, and valid XML
without DI.

## Comparative outputs

`results.csv` adds representation, XML/import validity, split token usage,
iteration, and postprocessing columns. The comparative report additionally creates:

```text
comparative_by_model.csv
comparative_by_difficulty.csv
comparative_report.md
figures/dsl_vs_zero_shot_by_model.svg
figures/dsl_vs_zero_shot_by_difficulty.svg
```

The tables include M1–M5, M8, M6 size (`tnn`, `tnsf`), M7 CFC, M9 CNC, M10
cycle rate, semantic/render validity, feature coverage, tokens, elapsed time,
and iterations.
