---
name: bpmn-desde-resumen
description: Convierte un resumen de proceso en lenguaje natural en un diagrama BPMN 2.0 y entrega PNG, SVG y .bpmn con BPMN DI (editable en Bizagi, Camunda, bpmn.io), usando exactamente el motor y el prompt del TFM text-to-bpmn (auto-layout, carriles, enrutado ortogonal). El modelo solo redacta el DSL; el motor dibuja. Úsala cuando el usuario pida un diagrama BPMN, de proceso, de carriles o de flujo a partir de una descripción, o pase un DSL BPMN Sketch Miner para renderizar.
---

# BPMN desde resumen

El modelo solo escribe DSL; el motor del TFM genera el XML, la geometría y las imágenes. No escribas XML BPMN, Mermaid ni dibujos a mano, y no cambies el prompt ni el motor.

`CLI` = `node <carpeta de esta skill>/scripts/bpmn.mjs`. Cada comando imprime un JSON. `CLI doctor` debe dar `"ok": true` (si no, `references/contract.md` § Entorno).

## Flujo

1. **Resumen.** Guarda el resumen del usuario, literal y en su idioma, en un archivo. Pide aclaración solo si falta algo material (actores, decisión sin criterio, fin del proceso); añade la respuesta del usuario al mismo archivo con sus palabras.
2. **Preparar.** `CLI prepare --out <destino> --host <host> --summary-file <archivo>` → `runDir`, `promptFile` y `requestedGenerator` (modelo y esfuerzo que tocan en este host, según `config/generators.json`). `--host`: `claude-code`, `claude-desktop`, `claude-ai`, `chatgpt`, `chatgpt-work`, `codex` u otro.
3. **Generar.** Entrega el contenido exacto de `promptFile` al generador indicado en `requestedGenerator` y guarda su respuesta sin tocar en `<runDir>/reply-01.txt`. Cómo en cada host: `references/generation.md` (léelo antes de la primera generación).
4. **Renderizar.** `CLI render --run <runDir> --raw <runDir>/reply-01.txt --model <modelo real> --effort <esfuerzo real> --host <host> --evidence "<lo que muestre la herramienta>"`.
5. **Reparar (máx. 2).** Solo si el JSON trae `"canRepair": true`: `CLI repair-prompt --run <runDir>` → nuevo `promptFile`; repite 3 y 4 con `reply-0N.txt`. Nunca regeneres para "mejorar" un diagrama que ya compila.
6. **Entregar.** Según `status` (tabla en `references/contract.md`):
   - `success` / `success_with_warnings`: muestra el PNG y enlaza con rutas absolutas `diagram.png`, `diagram.svg`, `diagram.bpmn`. Menciona advertencias solo si afectan al significado.
   - `partial_export`: entrega solo los archivos de `deliverables` y di cuál falta.
   - errores: explica el fallo con los diagnósticos; no presentes archivos que no existan.
   Indica qué modelo generó el DSL. Adjunta `input_prompt.md` solo si el usuario lo pide.

## Otras entradas

- El usuario ya trae DSL: `CLI render-dsl --dsl <archivo> --out <destino>` (sin generación).
- Evaluación opcional (métricas TFM-eval, salida en `<runDir>/evaluation/`): `CLI evaluate --run <runDir>`; ver `references/evaluation.md`.
- Cambiar el modelo de un host: editar `config/generators.json` y ejecutar `CLI sync-agents`.
