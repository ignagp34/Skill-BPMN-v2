# BPMN-DSL Monorepo

Two apps sharing one engine.

```
packages/
  bpmn-core/        @text-to-bpmn/core — DSL → BPMN parser, layout, renderer, validator
apps/
  tfm-lab/          research / thesis editor (live DSL↔canvas, experiments tab)
  company-web/      landing + demo page intended for Vercel deployment
```

## Setup

```sh
pnpm install
```

## Run

| Command | What it does |
|---|---|
| `pnpm dev:tfm` | TFM lab editor on http://localhost:5173 |
| `pnpm dev:company` | Company demo page (Vite default port) |
| `pnpm build` | Build every workspace |
| `pnpm test` | Run every workspace's test suite |

## Evaluate experiments (thesis pipeline)

Once experiment outputs are stored under `apps/tfm-lab/prompts/experiments/`,
one command renders every missing artifact (`diagram.bpmn` / `.svg` / `.png` /
`result.json`) and scores every experiment with the 10 BPMN metrics:

```powershell
# one-time browser download for headless rendering
pnpm --filter tfm-lab exec playwright install chromium

# render missing artifacts + evaluate everything
pwsh scripts/run-evaluation.ps1            # add -Force for a version-consistent re-render
```

Results land in `TFM-eval/results/experiments/` (`results.csv` + `results.json`).
The two stages can also be run on their own — see
[`apps/tfm-lab/README.md`](apps/tfm-lab/README.md) (render) and
[`TFM-eval/README.md`](TFM-eval/README.md) (`bpmn-eval-experiments`). Evaluation
is semantic-only and never requires rendering.

The zero-shot BPMN-XML comparison is driven separately by
`scripts/run-zero-shot-comparison.ps1` — see
[`docs/zero-shot-bpmn-xml-harness.md`](docs/zero-shot-bpmn-xml-harness.md).

> **Note on bundled data.** The 445 experiment runs under
> `apps/tfm-lab/prompts/experiments/` are included as raw data (model output
> `diagram.bpmn`, input prompts and `result.json`). The rendered `diagram.png` /
> `diagram.svg` are **not** bundled — regenerate them with the render command
> above.

## Engine API

Both apps import from `@text-to-bpmn/core`:

```ts
import { parseDsl, emitBpmnXml, renderSemanticXml, validateBpmnModel, generateDiagram } from "@text-to-bpmn/core";
```

Improvements to parser/layout/rendering inside `packages/bpmn-core/` reach both apps automatically — no copy-paste.

## Deploy `company-web` to Vercel

1. Import this repo in Vercel.
2. Set **Root Directory** to `apps/company-web`.
3. Framework preset: **Vite**. Build command: `pnpm build`. Output: `dist`.
4. Install command: leave default — Vercel detects pnpm workspaces.

## Analysis & results

- `TFM-eval/results/` — evaluation outputs (`results.csv` / `results.json`) and RQ figures.
- `docs/analisis-derivado/` — derived-metrics analysis and figures.
- `docs/zero-shot-bpmn-xml-harness.md` — zero-shot BPMN-XML harness documentation.

The written thesis report (memoria) is submitted separately and is not bundled
in this repository.

## License & attribution

- The original code in this repository is licensed under the **MIT License** — see [`LICENSE`](LICENSE).
- Third-party software, their licenses, and the bpmn.io watermark obligation are listed in [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md).
- The textual DSL is the **BPMN Sketch Miner** notation (Ivanchikj, Serbout & Pautasso, USI); the parser/engine/renderer here are original work. Notation, OMG BPMN 2.0 schema, font, and trademark attributions are in [`docs/ATTRIBUTION.md`](docs/ATTRIBUTION.md).
- A full license/IP audit is recorded in [`COMPLIANCE-REPORT.md`](COMPLIANCE-REPORT.md).
