# Generación del DSL

Qué modelo escribe el DSL en cada host lo decide **solo** `config/generators.json`. `prepare --host <host>` devuelve el generador pedido en `requestedGenerator` (`model`, `effort`, `delegation`, `subagent`). Sin API keys: se usa siempre la cuenta de ChatGPT o Claude con la que se está trabajando.

| Host (`--host`) | Perfil actual | Cómo delegar |
| --- | --- | --- |
| `chatgpt`, `chatgpt-work`, `codex` | `gpt-5.6-luna`, esfuerzo `high` | Herramienta de subagente con ese `model` y `reasoning_effort`, contexto mínimo (`fork_turns="none"` si la herramienta usa ese contrato). La metadata de `agents/openai.yaml` no configura el subagente. |
| `claude-code`, `claude-desktop` | `claude-opus-5-5`, esfuerzo `low` | Subagente `bpmn-dsl-generator` (lo genera `CLI sync-agents` en `.claude/agents/` con ese modelo y esfuerzo, sin herramientas y sin CLAUDE.md). Si no aparece entre los agentes disponibles, hay que reiniciar la sesión tras el primer `sync-agents`. |
| `claude-ai` u otro host sin subagentes | el de la conversación | Genera el propio modelo de la conversación con el prompt exacto; registra el modelo real. |
| Cualquier otro host (Gemini…) | `current-conversation` | Igual: genera el modelo con el que se está hablando y registra cuál es. |
| El usuario trae su DSL | — | `CLI render-dsl`; no hay generación. |

Cambiar de modelo: editar `config/generators.json` y ejecutar `CLI sync-agents`. `CLI doctor` avisa si el subagente de Claude no coincide con la configuración.

## Qué recibe el generador

- Un único mensaje: el contenido **exacto** de `promptFile` (`input_prompt.md`, o `attempts/0N/input_prompt.md` en una reparación). Sin historial, sin corpus, sin instrucciones de estilo añadidas, sin resumir ni traducir el prompt. Cuando genera el modelo de la conversación, trata ese archivo como la única instrucción de la respuesta.
- Su trabajo termina en el DSL.
- Guarda la respuesta completa sin editar (con los ``` si los trae) en `<runDir>/reply-0N.txt`. La normalización la hace el motor del TFM.

## Qué registrar en `render`

- `--model` y `--effort`: los **efectivos**. Si la herramienta no los confirma, pon los pedidos y dilo en `--evidence` ("solicitado; no confirmado por la herramienta"). Si genera la conversación, su modelo real y, si no se conoce, `--effort unknown`.
- `--host`: el mismo que en `prepare`.
- `--evidence`: lo que la herramienta exponga (id del subagente, modelo mostrado, tokens, tiempo). No inventes métricas.

`run-info.json` guarda el generador pedido y el declarado por intento, con `matchesRequested`. Si no coinciden, dilo en la respuesta final; nunca afirmes haber usado un modelo que no se usó.

## Si el generador falla

Respuesta vacía → `render` la registra como `generation_error`. Error, rechazo o timeout de la herramienta → `CLI fail --run <runDir> --reason "<error>" --model ... --effort ... --host ...`. Un reintento por fallo de la herramienta cuenta dentro del máximo de tres intentos. No crees tareas en la barra lateral ni sesiones cloud para simular un subagente.

## Reparaciones

`CLI repair-prompt` añade al prompt base los diagnósticos del motor y el DSL anterior; el prompt base no cambia. Máximo dos reparaciones, cada una motivada por diagnósticos concretos. Todos los intentos (incluido el primero) quedan en `attempts/0N/`.
