# Contrato de la skill

## Entrada

- Resumen del proceso en lenguaje natural (archivo o texto), en cualquier idioma. Se conserva literal en `summary.md`; el idioma, actores, decisiones y restricciones son los del usuario.
- Destino de salida (`--out`). Cada ejecución crea una carpeta nueva `bpmn-<fecha>-<hora>-<slug>/`; nunca se sobrescribe otra.
- Opcional: adjuntar el prompt al usuario (se guarda siempre; se entrega solo si se pide).
- Opcional: `--layout <versión>` en `render` y `render-dsl`. Por defecto, la versión `default` de `config/layouts.json` (**v6** desde el 2026-09-26, aprobada por el usuario tras las votaciones A/B; ver `evidence/layout-v6/`; antes v4). `v0` es el layout exacto del TFM: la paridad, el corpus y `tfm-history` lo usan siempre. Cada intento registra `layout.version` y su harness en `attempt.json`/`run-info.json`. El XML semántico no depende del layout.
- Opcional: `--message-flows hidden|shown` en `render` y `render-dsl`. Por defecto **`hidden`** (decisión del usuario, 2026-09-25, igual que el botón «Hide message flows» de la web). El layout se calcula con los flujos de mensaje; después se quitan del `.bpmn` (el `messageFlow` y su `BPMNEdge`) y el SVG/PNG se reexportan desde ese BPMN. Las posiciones no cambian. `shown` da la salida exacta del TFM: se usa para la paridad, el corpus y las métricas.

## Carpeta de una ejecución

| Archivo | Contenido |
| --- | --- |
| `diagram.bpmn` | BPMN 2.0 con DI (formas, conectores, etiquetas) del layout final, sin flujos de mensaje salvo con `--message-flows shown`. Reimportado en bpmn-js antes de aceptarlo. |
| `diagram.svg` | `saveSVG` del mismo modeler. |
| `diagram.png` | El mismo SVG rasterizado con Canvas; tamaño = techo del viewBox; sin fondo añadido. |
| `summary.md` | Resumen literal. |
| `input_prompt.md` | Prompt v5 de la web + resumen, composición de `Handoff.tsx`. |
| `raw_output.txt` | Respuesta cruda del último intento. |
| `normalized.dsl` | DSL tras la normalización original. |
| `semantic.bpmn` | XML semántico antes del layout (incluye los flujos de mensaje siempre). |
| `layout-full.bpmn` | Solo con flujos de mensaje ocultos que existan: el layout completo, con ellos. `evaluate` lo usa en lugar de `diagram.bpmn`. |
| `result.json` | Resultado del harness original (diagnósticos, métricas). Su `interfaceType: "web"` es metadata heredada del harness congelado. |
| `run-info.json` | Trazabilidad: `interfaceType: "skill"`, motor y verificación de su código, hashes de prompt y resumen, generador pedido (de `config/generators.json`) y declarado por intento, runtime (Node, Playwright, Chromium), comprobaciones y estado. |
| `attempts/0N/` | Cada intento completo, incluido el primero sin reparar. |
| `evaluation/` | Solo si se ejecuta `evaluate`. |

La raíz refleja siempre el **último** intento: los entregables de intentos anteriores se retiran antes de copiar los nuevos.

## Estados y códigos de salida

| `status` | Salida | Significado | Entregables |
| --- | --- | --- | --- |
| `success` | 0 | Compila, sin advertencias | los tres |
| `success_with_warnings` | 0 | Compila; el motor sintetizó o advirtió algo (p. ej. inicio/fin implícito) | los tres |
| `parser_error` | 2 | El DSL no se puede analizar | ninguno; reparable |
| `semantic_error` | 2 | DSL analizable pero incoherente | ninguno; reparable |
| `render_error` | 3 | Falló el layout o la importación | ninguno; reparable |
| `partial_export` | 4 | Renderizó, pero falta o es incoherente algún formato | solo los válidos (`missing` indica cuáles faltan) |
| `generation_error` | 5 | Subagente sin respuesta, vacío o no disponible | ninguno |
| `infrastructure_error` | 1 | Chromium ausente, timeout, servidor | ninguno |
| error de uso | 64 | Argumentos inválidos o límite de intentos | — |

Un formato solo se entrega si pasa su comprobación: BPMN con `BPMNDiagram` y DI reimportable; SVG con dimensiones; PNG con firma válida; cada elemento del DI dibujado en el SVG; PNG del tamaño del SVG. Así los tres son de la misma ejecución.

## Entorno

- Motor: este repositorio (`pnpm install --frozen-lockfile`); la skill lo localiza subiendo desde su carpeta o con `BPMN_SKILL_ENGINE_ROOT`. `run-info.json` registra si el código del motor coincide con los hashes congelados (`engine.sourceVerified`).
- Chromium de Playwright: `PLAYWRIGHT_BROWSERS_PATH`, o `.playwright/` en la raíz del repositorio o su carpeta padre; si falta: `node apps/tfm-lab/node_modules/playwright/cli.js install chromium`.
- Servidor Vite efímero en `127.0.0.1` con puerto libre; navegador sin interfaz; timeout por render (`--timeout-ms`, 120 s por defecto); ambos se cierran siempre.
- Evaluación: Python con `bpmn_eval` (`--python`, `BPMN_EVAL_PYTHON`, `TFM-eval/.venv` o `../.venv-bpmn`).

## Ejemplo (Claude Code; en ChatGPT cambia `--host` y el generador que devuelve `prepare`)

```sh
node skills/bpmn-desde-resumen/scripts/bpmn.mjs prepare --out ./diagramas --host claude-code --summary-file resumen.md
# → requestedGenerator: claude-opus-5-5 / low vía subagente bpmn-dsl-generator; respuesta en <runDir>/reply-01.txt
node skills/bpmn-desde-resumen/scripts/bpmn.mjs render --run <runDir> --raw <runDir>/reply-01.txt   --model claude-opus-5-5 --effort low --host claude-code --evidence "Agent bpmn-dsl-generator"
```
