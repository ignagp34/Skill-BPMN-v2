# Generación del DSL

Qué modelo escribe el DSL en cada host lo decide **solo** `config/generators.json`. `prepare --host <host>` devuelve el generador pedido en `requestedGenerator` (`model`, `effort`, `delegation`, `subagent`). Sin API keys: se usa siempre la cuenta de ChatGPT o Claude con la que se está trabajando.

| Host (`--host`) | Perfil actual | Cómo delegar |
| --- | --- | --- |
| `chatgpt`, `chatgpt-work`, `codex` | `gpt-5.6-luna`, esfuerzo `high` | Herramienta de subagente con ese `model` y `reasoning_effort` y `handoff.message` como mensaje, contexto mínimo (`fork_turns="none"` si la herramienta usa ese contrato). La metadata de `agents/openai.yaml` no configura el subagente. |
| `claude-code`, `claude-desktop` | `claude-opus-5-5`, esfuerzo `low` | Subagente `bpmn-dsl-generator` con `handoff.message` como prompt (lo genera `CLI sync-agents` en `.claude/agents/` con ese modelo y esfuerzo, solo con Read y Write, sin CLAUDE.md). Si no aparece entre los agentes disponibles, hay que reiniciar la sesión tras el primer `sync-agents`. |
| `claude-ai` u otro host sin subagentes | el de la conversación | El propio modelo de la conversación sigue `handoff.message`: lee `promptFile` y escribe su respuesta en `replyFile`; registra el modelo real. |
| Cualquier otro host (Gemini…) | `current-conversation` | Igual: genera el modelo con el que se está hablando y registra cuál es. |
| El usuario trae su DSL | — | `CLI render-dsl`; no hay generación. |

Cambiar de modelo: editar `config/generators.json` y ejecutar `CLI sync-agents`. `CLI doctor` avisa si el subagente de Claude no coincide con la configuración.

## Traspaso por archivo

- El prompt (~70 KB) **nunca** se copia en un mensaje. `prepare`, `repair-prompt` y `edit-prompt` devuelven `handoff.message`: una instrucción breve que nombra `promptFile` (`input_prompt.md` o `attempts/0N/input_prompt.md`) y `replyFile` (`reply-0N.txt`). Envía ese mensaje tal cual, sin añadir historial, corpus ni instrucciones de estilo.
- El generador lee `promptFile` completo, lo responde exactamente y escribe su respuesta sin editar (con los ``` si los trae) en `replyFile`. Su trabajo termina ahí; la normalización la hace el motor del TFM.
- Si `replyFile` no existe o está vacío tras la delegación, no lo rellenes tú: registra el fallo (ver abajo).

## Qué registrar en `render`

- `--model` y `--effort`: los **efectivos**. Si la herramienta no los confirma, pon los pedidos y dilo en `--evidence` ("solicitado; no confirmado por la herramienta"). Si genera la conversación, su modelo real y, si no se conoce, `--effort unknown`.
- `--host`: el mismo que en `prepare`.
- `--evidence`: lo que la herramienta exponga (id del subagente, modelo mostrado, tokens, tiempo). No inventes métricas.

`run-info.json` guarda el generador pedido y el declarado por intento, con `matchesRequested`. Si no coinciden, dilo en la respuesta final; nunca afirmes haber usado un modelo que no se usó.

## Si el generador falla

Respuesta vacía → `render` la registra como `generation_error`. Error, rechazo o timeout de la herramienta → `CLI fail --run <runDir> --reason "<error>" --model ... --effort ... --host ...`. Un reintento por fallo de la herramienta cuenta dentro del máximo de tres intentos. No crees tareas en la barra lateral ni sesiones cloud para simular un subagente.

## Reparaciones

`CLI repair-prompt` añade al prompt base los diagnósticos del motor y el DSL anterior; el prompt base no cambia. Máximo dos reparaciones, cada una motivada por diagnósticos concretos. Todos los intentos (incluido el primero) quedan en `attempts/0N/`.

## Ediciones

`CLI edit-prompt --from <runDir>` compone: prompt v5 sin cambios + narrativa original (`summary.md` de la ejecución de origen, si existe) + cambios ya aplicados en ediciones anteriores + DSL actual (`normalized.dsl`) + petición del usuario. Se pide el DSL completo, cambiando solo lo pedido. Solo se admite como origen una ejecución que compiló (`success`, `success_with_warnings` o `partial_export`).

- Siempre un subagente nuevo, con el mismo generador y el mismo traspaso por archivo. No se retoma el agente que hizo el diagrama: todo el contexto está en el prompt, la edición puede llegar en otra sesión y así queda reproducible.
- La ejecución nueva guarda `edit-request.md`, `base.dsl` y `base-semantic.bpmn`, y en `run-info.json` `edit.parentRun` y `edit.history`. Su primer intento es `kind: "edit"`, con las mismas dos reparaciones que cualquier otra ejecución (`repair-prompt` parte del prompt de edición).
- `render` escribe `dsl-change.json`: diff por líneas del DSL y diff del XML semántico por nombres (pool, carril, tipo y nombre; flujos por origen, destino y condición), no por ids. `semanticIdentical: true` significa que el proceso no cambió.
