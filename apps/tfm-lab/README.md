# BPMN Sketch Miner DSL → Custom Orthogonal Renderer

Browser-based pipeline that ingests BPMN Sketch Miner DSL (v3.1) and renders it as an interactive BPMN 2.0 diagram with strict orthogonal routing, using `bpmn-js` as the canvas.

```
DSL text  →  Lexer  →  Parser (AST)  →  Semantic pass  →  BPMN 2.0 XML  →  bpmn-js + orthogonal layout  →  Canvas
```

## Prerequisites

- Node.js **≥ 20** (developed on Node 24)
- npm **≥ 10**

## Commands

```bash
npm install        # install dependencies
npm run dev        # start Vite dev server at http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build locally
npm test           # run vitest once
npm run test:watch # vitest in watch mode
npm run inspect <file>  # parse a .dsl file and print AST / model / errors
npm run render:experiments  # batch-render missing experiment artifacts (headless)
```

`npm run inspect tests/fixtures/gemini-05.dsl` is a quick way to eyeball the parser
output for any input — useful for spot-checking before committing.

## Batch experiment rendering (headless)

`render:experiments` automates the "open the app → paste output → render →
download" loop across every tracked experiment. It serves `index.headless.html`
with Vite and drives it with headless Chromium (Playwright), reusing the exact
same engine and export code as the live editor (`src/experiments/evaluate.ts`,
`exporters.ts`), so the batch artifacts are identical to interactive ones.

```bash
# one-time: download the Chromium headless shell used by Playwright
npx playwright install chromium

# fill any missing diagram.bpmn / diagram.svg / diagram.png / result.json
pnpm --filter tfm-lab render:experiments

# options
pnpm --filter tfm-lab render:experiments -- --experiments <dir>   # custom folder
pnpm --filter tfm-lab render:experiments -- --only EXP-SYN001     # subset
pnpm --filter tfm-lab render:experiments -- --force               # recompute all
```

An experiment folder is processed when it contains `raw_output.txt`. Folders with
only `notes.md` (not yet run) are skipped; runs whose DSL does not compile get a
`result.json` with the error status but no diagram (none is possible). Default
mode fills only missing files; `--force` recomputes everything with the current
engine — use it once for the final, version-consistent dataset.

To render **and** score in one step, use the repo-root orchestrator
[`scripts/run-evaluation.ps1`](../../scripts/run-evaluation.ps1).

## Engine

The DSL lexer, Chevrotain parser, and semantic pass produce a typed `Program`
and a `ResolvedModel` (flow nodes, sequence flows, gateways, boundary events),
surfacing AP-6 / AP-7 anchor-boundary violations and other diagnostics with line
numbers. Run `npm run inspect <file>` to see the parse for any DSL input.

## Project layout

```
.
├── index.html                split layout: textarea ⟷ bpmn-js canvas
├── src/
│   ├── main.ts               bpmn-js bootstrap
│   └── dsl/                  lexer + parser + semantic pass
├── scripts/
│   └── inspect.ts            CLI inspector for parsed AST / ResolvedModel
├── prompts/                  system prompts, curated processes, experiments
└── tests/
    ├── smoke.test.ts         vitest sanity test
    ├── fixtures/             8 valid + 2 invalid DSL fixtures
    └── dsl/                  parser & semantic-pass test suites
```
