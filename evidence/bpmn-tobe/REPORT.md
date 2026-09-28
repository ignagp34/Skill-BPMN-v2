# Skill `bpmn-tobe`: TO-BE con marcas de color sobre un AS-IS (2026-09-28)

Plan: `plans/bpmn-tobe.md`. Decisiones del usuario (2026-09-28):
- Solo se anotan tareas. Rojo para bloqueos y verde para mejoras, en tonos suaves; el amarillo (riesgo) se deja para más adelante.
- Se colorean las anotaciones y también la tarea anotada.
- Entrega en dos diagramas.
- Bizagi debería mostrar los colores.
- Probar primero la opción A (sin bandas).

Todo en local (Windows 11, Node 24.12.0, Chromium 148). Generador: subagente `bpmn-dsl-generator` (Opus 5.5/low).

## Qué se ha hecho

- `skills/bpmn-tobe/` con la organización de `bpmn` y `bpmn-edit`. Reutiliza sin copiar la `HarnessSession`, `exportLayout`, las comprobaciones de artefactos, el traspaso por archivo, los generadores y `semanticDiff`.
  - `prepare`: tareas marcables, prompt corto y `handoff`.
  - `render`: valida el JSON, inserta las líneas `//`, dibuja, colorea, exporta y comprueba la estabilidad.
  - También `repair-prompt` y `doctor`.
- **El modelo no escribe DSL**: devuelve `{annotations: [{task, kind, text}], notes}`.
  - El CLI valida los nombres exactos (un nombre repetido en varios carriles exige `lane`) e inserta `//<prefijo><texto>` antes de la primera línea propia de la tarea.
  - El resto del DSL queda idéntico; lo comprueba la prueba unitaria.
  - Tras el render se comprueba que cada anotación quedó unida a su tarea (`lostMarks`).
- **Colores**, con la configuración en `config/tobe.json`:
  - bloqueo: borde y texto `#A94442`, fondo `#F2DEDE`;
  - mejora: borde y texto `#3C763D`, fondo `#DFF0D8`.
  - Se escriben tres vocabularios: `color:` (BPMN in Color) y `bioc:` en la DI, y `bizagi:BizagiProperty` (`bgColor`, `borderColor`, `textColor`) en el elemento semántico.
- **Layout `v24-tobe`** (`tools/layout-lab/harness/v24-tobe/`, registrado en `layouts.json`): v24 sin las bandas de v11. Solo cambia la pasada de artefactos y ningún módulo existente.
- **Estrategia `derive-as-is`**, añadida al ver los resultados de A: el TO-BE se dibuja con el layout por defecto (v24) y el AS-IS es ese dibujo sin las marcas. Se comprueba que su proceso es el de la ejecución de origen (`semanticDiff`, sin contar los flujos de mensaje ocultos). Es la estrategia por defecto; `--strategy no-bands` elige A.
- Limitación del motor, sin tocarlo: una línea `//` delante de una línea paralela (`A|B`) se une al gateway paralelo (`semantic.ts attachAnnotations`). Las tareas que solo aparecen en líneas paralelas no se pueden marcar; salen en `unmarkableTasks` y no se ofrecen al modelo.

## Ejemplos (generación real, misma respuesta para las dos estrategias)

| | Ejemplo 1: detección de fraude (3 pools) | Ejemplo 2: chatbot RAG (3 pools, 3 carriles) |
| --- | --- | --- |
| Petición | 3 bloqueos y 3 mejoras | 4 bloqueos y 4 mejoras |
| Respuesta | 6 marcas válidas, 0 notas (11 907 tokens, 13,7 s) | 8 marcas válidas, 0 notas (11 818 tokens, 14,5 s). 2 tareas no marcables (paralelas) |
| AS-IS frente a TO-BE | estable en las dos estrategias (0 formas, 0 líneas, 0 marcos) | estable en las dos estrategias |
| AS-IS de **A** frente al AS-IS original (v24) | **distinto**: 2 formas movidas, 3 líneas reencaminadas, 7 marcos | idéntico |
| AS-IS de **A′** frente al AS-IS original | **idéntico** | distinto: 19 formas y 21 líneas movidas, porque las bandas abiertas para las anotaciones nuevas dejan más aire en el AS-IS |
| Calidad visual del TO-BE | A: el objeto de datos pisa la etiqueta de un evento y un texto se sale del pool. A′: mejor, aunque un texto roza el borde inferior del pool | A: anotaciones sobre las etiquetas de eventos de Legal y un texto fuera del pool. A′: sin solapes con etiquetas |

Imágenes en `ex1-fraude/` y `ex2-rag/` (`as-is-original`, `derive-*`, `no-bands-*`), con la petición, la respuesta, las marcas y `stability.json`.

Conclusión: A cumple la estabilidad, pero sin bandas las anotaciones se amontonan en carriles densos, e incluso el AS-IS empeora frente al original. A′ da la misma estabilidad por construcción y mejor colocación; su coste es que el AS-IS puede tener más aire que el original. Queda A′ por defecto.

Defecto común a las dos, heredado de la colocación de artefactos de v6: en carriles densos, algún texto de anotación cruza el borde de un carril o del pool. Es una mejora del layout pendiente: tratar los bordes de carril como obstáculo para el texto.

## Bizagi Modeler 4.2.0.003

1. Se importó el TO-BE con solo `color:` y `bioc:`: posiciones correctas, pero **sin colores** (tareas en el azul de Bizagi y anotaciones grises).
2. Se coloreó una tarea a mano y se exportó (`bizagi-export-hand-coloured.bpmn`). Bizagi guarda el color en `extensionElements/bizagi:BizagiExtensions/bizagi:BizagiProperties/bizagi:BizagiProperty` del elemento semántico.
3. Con esa extensión añadida, **Bizagi muestra los colores**: tareas y anotaciones de bloqueo en rojo suave y anotaciones de mejora en verde (revisado en pantalla). En bpmn-js el PNG es idéntico byte a byte al de antes de añadir la extensión.
4. En el paso 2, la exportación de Bizagi avisó de «Invalid graphical element», pero escribió el archivo. No se ha investigado.

## Pruebas

- `node --test skills/bpmn-tobe/test/bpmn-tobe.test.mjs`: 5/5.
- `node --test tools/layout-lab/test/layout-lab.test.mjs`: 8/8.
- `node --test skills/bpmn-edit/test/bpmn-edit.test.mjs`: 6/6.
- `node smoke/verify-source.mjs`: 3319/0.
- `CLI doctor`: `ok: true`.

## Qué no se ha probado

- La generación desde ChatGPT/Luna.
- Peticiones ambiguas o con marcas que no encajan en ninguna tarea (el camino de `notes` y `repair-prompt` no se ha ejecutado con el modelo).
- Diagramas con subprocesos.
- La reimportación en Camunda.
- Instalar la skill en `~/.claude/skills` (no se ha pedido).
