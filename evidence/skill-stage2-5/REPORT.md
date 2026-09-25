# Etapas 2–5 — skill, adaptador y paridad (ejecución local, 2026-09-25)

Windows 10.0.26200 x64, Node 24.12.0, Playwright 1.60.0, Chromium 148.0.7778.96 (headless shell, raster SwiftShader). Cero llamadas a modelos. Work web no probado.

## Qué se ha construido

- `skills/bpmn-desde-resumen/`: `SKILL.md`, `references/{contract,generation,evaluation}.md`, `agents/openai.yaml`, `scripts/bpmn.mjs` (`prepare`, `render`, `repair-prompt`, `fail`, `render-dsl`, `evaluate`, `doctor`). Validador de skill-creator: "Skill is valid!".
- `tools/skill-parity/`: `parity.mjs` (paridad + fallos inyectados + flujo de reparación) y `pngdiff.mjs` (comparación de píxeles con el Chromium fijado).
- El motor, el harness, los prompts, la evaluación y el baseline no se han modificado: `node smoke/verify-source.mjs` → 3319 archivos, 0 diferencias.

## Resultados (`parity-summary.json`)

| Comprobación | Resultado |
| --- | --- |
| 10 DSL válidos por el adaptador frente al baseline del 22/09 | `diagram.bpmn`, `semantic.bpmn` y `normalized.dsl` idénticos byte a byte; SVG idéntico tras normalizar solo los IDs aleatorios de `<marker>`; mismo `status`. |
| PNG frente al baseline del 22/09 | Mismo tamaño en los 10; difieren en antialiasing: máx. 3–4/255 por canal en 0,25–1,6 % de píxeles. |
| PNG frente al runner original (`smoke/run.mjs`) ejecutado hoy | Idénticos byte a byte en los 10 (también BPMN y SVG normalizado). |
| 2 DSL inválidos | `semantic_error`, sin entregables, igual que el baseline. |
| Chromium ausente | `infrastructure_error`, salida 1, sin entregables. |
| Timeout (50 ms) | `infrastructure_error`, salida 1, sin entregables. |
| Fallo del codificador PNG (inyectado en la página, sin tocar el harness) | `partial_export`, salida 4; se entregan BPMN y SVG, falta PNG. |
| Prompt | `input_prompt.md` idéntico a `Handoff.tsx buildPrompt()` (plantilla extraída del fuente). |
| Flujo de reparación | 1.º intento `semantic_error` (salida 2, reparable) → `repair-prompt` extiende el prompt base → 2.º intento correcto; la raíz refleja el último intento; el primero se conserva; límite de 3 intentos aplicado (salida 64); `fail` y respuesta vacía → `generation_error` (salida 5). |
| Evaluación aislada | `evaluate` sobre una ejecución: 10 métricas en `<run>/evaluation/`; `TFM-eval/results/` intacto. |
| Ubicación limpia | Skill copiada fuera del repo: sin motor → error claro; con `BPMN_SKILL_ENGINE_ROOT` → render correcto en ruta con espacios. |

Revisión visual: salidas del adaptador de `gemini-03` y `pool-map-message-event` revisadas; geometría idéntica al baseline (BPMN byte a byte). Los solapes de etiquetas de eventos con los títulos de carril ya estaban en el baseline.

## Fidelidad al corpus del TFM (`tfm-history-summary.json`, `tfm-history-stale.json`)

`tools/skill-parity/tfm-history.mjs` renderiza con la skill las respuestas guardadas de **351 experimentos** del TFM (todos los que tienen DSL y `diagram.bpmn`: prompts v3.1, v4 y v5; ChatGPT, Gemini y Claude) y compara con el `diagram.bpmn` guardado. Resultado: **346/351 idénticos** en contenido y **351/351 con el mismo estado**. La única diferencia de bytes en los 346 es el CRLF tras la declaración XML, añadido por Git en Windows al guardar el corpus.

Los 5 restantes (v3.1, evaluados el 2026-06-14) se generaron con una versión anterior del motor: el runner original del TFM ejecutado hoy tampoco los reproduce y da exactamente los mismos bytes que la skill en los 5. Conclusión: la skill produce lo mismo que el motor del TFM en el commit fijado en 351/351 casos comprobados.

Tras refactorizar el CLI (SOLID, 2026-09-25) se repitieron paridad, fallos inyectados y flujo de reparación: todo pasa (`skill-runs/parity-20260925d`). El refactor también corrigió un falso positivo: una tarea llamada "Print visit label" (ID terminado en `_label`) se marcaba como `partial_export`.

## Deriva del PNG del baseline

Ni el runner original ni el adaptador reproducen hoy los bytes PNG del 22/09, con las mismas versiones de Node, Playwright, Chromium y Windows (último parche del sistema: 16/09). El SVG de entrada al raster es idéntico, así que la diferencia está en el entorno de rasterización, no en el código. Diagnóstico: el raster actual es por software (SwiftShader) y es determinista (dos ejecuciones independientes dan los mismos bytes; `--disable-gpu` da el mismo resultado). La causa exacta del cambio respecto al 22/09 no está identificada.

Tolerancia adoptada solo para el PNG frente a ese baseline, y solo si el SVG normalizado es idéntico: mismo tamaño, delta máximo ≤ 4/255 y ≤ 2 % de píxeles distintos (`PNG_TOLERANCE` en `pngdiff.mjs`). Lo medido está dentro, sin margen amplio. `smoke/compare.mjs` exige igualdad byte a byte y hoy falla en el PNG en esta máquina; es el comportamiento esperado de un baseline congelado y no se ha modificado.

## Pendiente

- Generación real con `gpt-5.6-luna`/`high` (etapa 3): no disponible en este host (Claude). Instrucciones y registro listos; ninguna generación ejecutada.
- Work web, Bizagi, empaquetado autocontenido del motor con la skill, lotes de evaluación Luna/high y rúbrica visual.
