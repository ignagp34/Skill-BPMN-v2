---
name: bpmn
description: Convierte un resumen de proceso en lenguaje natural en un diagrama BPMN 2.0 y entrega PNG, SVG y .bpmn con BPMN DI (editable en Bizagi, Camunda, bpmn.io), con el motor y el prompt del TFM text-to-bpmn (auto-layout por pool, carriles, enrutado ortogonal; layout mejorado por defecto y el exacto del TFM a petición). El modelo solo redacta el DSL; el motor dibuja. Úsala cuando el usuario pida un diagrama BPMN, de proceso, de carriles o de flujo a partir de una descripción, o pase un DSL BPMN Sketch Miner para renderizar.
---

# BPMN desde resumen (instalable desde claude.ai)

Esta skill solo prepara el motor; las instrucciones reales están en el repositorio Skill-BPMN-v2.

1. **Motor.** Ejecuta `bash <carpeta de esta skill>/scripts/ensure-engine.sh`. La última línea de la salida es `ENGINE`, la ruta del motor. La primera vez en una sesión en la nube tarda 1–2 minutos (clona e instala); avisa al usuario.
2. **Instrucciones.** Lee `ENGINE/skills/bpmn/SKILL.md` y síguelo entero, con `CLI` = `node ENGINE/skills/bpmn/scripts/bpmn.mjs` y las referencias en `ENGINE/skills/bpmn/references/`. Usa `--host claude-code`.
3. **Destino.** Pon `--out` dentro de la carpeta de trabajo actual, para que el usuario pueda abrir los archivos.
4. **Generador.** Si el subagente `bpmn-dsl-generator` no está entre los agentes disponibles (lo normal en una sesión recién creada en la nube), envía `handoff.message` tal cual con la herramienta Agent, `subagent_type: "general-purpose"` y `model: "opus"`. En `render` registra lo que de verdad se usó: `--model` con el modelo que muestre la herramienta (si solo conoces el alias, `opus`), `--effort unknown` y `--evidence "Agent general-purpose, model=opus; bpmn-dsl-generator no disponible"`. Dilo en la respuesta final.

La edición a mano (`bpmn-edit`) abre una página en 127.0.0.1 y no sirve en una sesión en la nube.
