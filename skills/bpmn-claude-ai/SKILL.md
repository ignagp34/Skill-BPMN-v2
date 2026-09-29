---
name: bpmn
description: Punto de entrada de las skills BPMN del repositorio Skill-BPMN-v2 (motor y prompt del TFM text-to-bpmn). Crea diagramas BPMN 2.0 desde un resumen o un DSL BPMN Sketch Miner y entrega PNG, SVG y .bpmn con BPMN DI (Bizagi, Camunda, bpmn.io); modifica un diagrama ya generado; hace el TO-BE de un AS-IS con puntos de bloqueo y mejoras marcados en color (estilo VSM); retoca el layout a mano; y cualquier otra skill BPMN que se añada al repositorio. Úsala cuando el usuario pida un diagrama BPMN, de proceso, de carriles o de flujo, cambiar uno existente, marcar cuellos de botella o mejoras, o un TO-BE/AS-IS.
---

# Skills BPMN (índice que se actualiza solo)

Esta skill no contiene las instrucciones: las trae del repositorio Skill-BPMN-v2, así que las skills nuevas del repositorio quedan disponibles sin volver a instalar nada.

1. **Motor y catálogo.** Ejecuta `bash <carpeta de esta skill>/scripts/ensure-engine.sh`. La última línea es un JSON: `engine` (ruta del motor), `commit`, `updated` y `skills` (`name`, `description`, `skillFile` de cada skill del repositorio). La primera vez tarda 1–2 minutos (clona e instala); avisa al usuario.
2. **Elegir.** Compara la petición con las `description` y escoge la skill que la cubre. Si la tarea necesita varias (p. ej. crear el AS-IS con `bpmn` y luego el TO-BE), síguelas en orden.
3. **Seguir.** Lee su `skillFile` completo y síguelo. Las rutas relativas y `<carpeta de esta skill>` se refieren a la carpeta de ese `skillFile`; «la skill bpmn» es `engine/skills/bpmn`. Usa `--host claude-code` y pon `--out` dentro de la carpeta de trabajo actual.
4. **Generador.** Si una skill pide el subagente `bpmn-dsl-generator` y no está entre los agentes disponibles (lo normal en una sesión recién creada), envía `handoff.message` tal cual con la herramienta Agent, `subagent_type: "general-purpose"` y `model: "opus"`. En `render` registra lo que de verdad se usó: `--model` con el modelo que muestre la herramienta (si solo conoces el alias, `opus`), `--effort unknown` y `--evidence "Agent general-purpose, model=opus; bpmn-dsl-generator no disponible"`. Dilo en la respuesta final.

Las skills que abren una página en 127.0.0.1 (p. ej. `bpmn-edit`) solo sirven si el usuario está en el mismo equipo, no en una sesión en la nube. Para fijar una versión en lugar de la última de `main`: `BPMN_SKILL_REF=<rama o etiqueta>`.
