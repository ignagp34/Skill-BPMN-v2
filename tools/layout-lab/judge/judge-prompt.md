# Juez visual de layout BPMN (Opus 5.5)

Prompt fijo del juez A/B (plan `plans/layout-iteracion-1.md`, fase 3). No lo edites entre lotes que se vayan a comparar. Si se cambia, versiónalo y regístralo.

## Cómo se lanza

1. `node tools/layout-lab/layout.mjs montage --batch <lote>` → `<lote>/montage/judge-tasks.json`.
2. El host lanza un subagente **Opus 5.5** (Claude Code: `model: opus`, sin el contexto de la conversación). Le pasa solo el mensaje de abajo, con las rutas sustituidas.
3. `node tools/layout-lab/layout.mjs agreement --batch <lote>` resuelve los dos órdenes y, si hay votos humanos, calcula kappa.

El juez no ve el caso, el layout ni las métricas. Cada pareja aparece dos veces con el orden invertido (`-o1`, `-o2`) y cada imagen se juzga por separado.

## Mensaje para el juez

> Eres revisor de diagramas BPMN. Lee `<judge-tasks.json>`. Para cada tarea, abre su imagen: muestra el mismo proceso dibujado dos veces, «Diagrama 1» y «Diagrama 2», a la misma escala. Juzga solo el **layout** (colocación, rutas, etiquetas y espacio), no el contenido del proceso, porque es idéntico en ambos.
>
> Rúbrica, en este orden de importancia:
> 1. `flow`: se entiende el flujo (dirección clara, camino principal fácil de seguir).
> 2. `labels`: etiquetas legibles, sin solapes con formas, líneas u otras etiquetas, ni con títulos de pool o carril.
> 3. `lines`: pocos cruces, pocas líneas superpuestas o confusas y pocos codos innecesarios.
> 4. `alignment`: alineación y orden (filas y columnas, espaciado regular).
> 5. `pools`: pools y carriles claros (anchos coherentes, elementos dentro de su carril).
> 6. `compactness`: compacto sin agobio (ni huecos grandes ni elementos apiñados).
>
> Para cada criterio indica cuál es mejor: `"1"`, `"2"` o `"tie"`. Da también una preferencia global (`"1"`, `"2"` o `"tie"`), una confianza de 1 a 5 y un motivo de una frase. Usa `"tie"` si la diferencia no cambia la lectura del diagrama. No prefieras un diagrama por ser más grande ni por estar a la izquierda.
>
> Escribe con la herramienta Write el archivo `<verdictsFile>` que indica `judge-tasks.json`. Debe contener solo este JSON:
>
> ```json
> { "judge": { "model": "<tu modelo>", "prompt": "tools/layout-lab/judge/judge-prompt.md" },
>   "verdicts": { "<task>": { "preferred": "1|2|tie", "confidence": 1, "criteria": { "flow": "1|2|tie", "labels": "…", "lines": "…", "alignment": "…", "pools": "…", "compactness": "…" }, "reason": "…" } } }
> ```
>
> Incluye todas las tareas. Responde solo «hecho» cuando hayas escrito el archivo.
