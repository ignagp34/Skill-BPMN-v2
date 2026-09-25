# Paridad de la skill con el motor congelado

Sin llamadas a modelos. Requiere `pnpm install --frozen-lockfile` y Chromium de Playwright.

```sh
node smoke/run.mjs skill-runs/smoke-<fecha>                                   # runner original, referencia del mismo día
node tools/skill-parity/parity.mjs skill-runs/parity-<fecha> skill-runs/smoke-<fecha>
node tools/skill-parity/pngdiff.mjs baseline-stage1/rendered skill-runs/smoke-<fecha> out.json
```

`parity.mjs` renderiza los 12 casos de `smoke/cases.json` con `bpmn.mjs render-dsl` y los compara con `baseline-stage1/rendered` (BPMN, XML semántico y DSL byte a byte; SVG normalizando IDs de marcadores; PNG byte a byte o dentro de `PNG_TOLERANCE`), y con la salida del runner original del mismo día si se indica (byte a byte). Después inyecta fallos (Chromium ausente, timeout, PNG que no se codifica) y recorre el flujo prepare → intento inválido → repair-prompt → intento válido, el límite de intentos y los errores de generación. Escribe `parity-summary.json`; salida ≠ 0 ante cualquier diferencia no explicada. Evidencia de 2026-09-25: `evidence/skill-stage2-5/`.
