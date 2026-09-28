# `edit-prompt`: cambios del proceso sobre un diagrama ya generado (2026-09-28)

Pedido por el usuario: cuando se pide un cambio sobre un diagrama existente, no generar desde cero. No se busca estabilidad visual: el diagrama se vuelve a maquetar entero. `repair-prompt` no cambia.

## Qué se ha hecho

- `scripts/commands/edit-prompt.mjs`: `--from <runDir> (--request-file | --request) [--host] [--out] [--label]`.
  - Solo acepta como origen una ejecución que compiló.
  - Crea una ejecución nueva (por defecto junto a la de origen) y no modifica la de origen.
  - Por defecto usa el host de la ejecución de origen; si esta viene de `render-dsl`, hay que pasar `--host`.
  - Devuelve `handoff` y `renderWith` (layout y flujos de mensaje de la ejecución de origen).
- `lib/prompt.mjs`: `composeEditPrompt`, con prompt v5 sin cambios + narrativa original + cambios ya aplicados + DSL actual + petición; pide el DSL completo cambiando solo lo pedido. `readSystemPrompt` se factoriza sin cambiar `composeBasePrompt`.
- `lib/change-report.mjs`: `dsl-change.json`, con un diff por líneas (LCS) del DSL normalizado y un diff del XML semántico por nombres (reutiliza `parseBpmn` del laboratorio, cargado desde la raíz del motor). Si el último intento no dejó DSL y XML semántico, el informe se borra.
- `commands/render.mjs`: el primer intento de una edición es `kind: "edit"`, y el JSON trae `change`.
- Documentación: `SKILL.md` (sección «Cambios sobre un diagrama ya generado»), `references/generation.md` § Ediciones y `references/contract.md`.

## Pruebas (resultados reales, local)

Salidas en el scratchpad de la sesión; muestra en `sample/`.

1. **Origen:** `render-dsl` de `tools/layout-lab/fixtures/ai-3pools/ml-03-deteccion-fraude.dsl` → `success` (v24, flujos de mensaje ocultos).
2. `edit-prompt` sin `--host` desde una ejecución de `render-dsl` → error de uso 64. Con `--host claude-code` → ejecución nueva con `base.dsl`, `base-semantic.bpmn`, `edit-request.md` y `renderWith: {v24, hidden}`.
3. **Generación real** con el subagente `bpmn-dsl-generator` (Opus 5.5/low; 38 870 tokens, 19,9 s). Petición: «Antes de autorizar el pago, el analista de riesgos debe comprobar la lista de comercios bloqueados».
   - Resultado: `success`, **1 línea añadida y 0 quitadas** en el DSL.
   - Diff semántico: la tarea nueva y sus dos flujos añadidos, y el flujo directo «¿El riesgo es alto? → Autorizar pago [No]» quitado. Nada más cambió. Revisado en `sample/diagram.png`.
4. **Edición encadenada:** el prompt lleva «CHANGES ALREADY APPLIED» con la petición anterior, y `edit.history` la registra.
5. **Una respuesta que reescribe el proceso** (DSL manual de una sola línea, que el motor acepta): el informe lo muestra, con 53 líneas quitadas y todo el inventario en `removed`.
6. **Fallo y reparación:** con un DSL inválido del baseline (`ap6-trace-ends-at-anchor`) se obtiene `semantic_error`, `canRepair: true`, `change: null` y ningún `dsl-change.json`. Después, `repair-prompt` → intento 2, cuyo prompt contiene la petición y los diagnósticos. El intento 2 con el DSL de origen da `success` y `semanticIdentical: true`. Tipos de intento: `edit,repair`.
7. `node tools/skill-parity/parity.mjs skill-runs/parity-20260928-editprompt` → `passed=true` (12 casos, fallos inyectados y flujo de reparación; `promptMatchesHandoff: true`).

## Qué no se ha probado

- La edición desde ChatGPT/Luna.
- Peticiones ambiguas o que contradicen la narrativa.
- Una medición sistemática de cuánto conserva el modelo lo que no se pidió: solo hay un caso real.
