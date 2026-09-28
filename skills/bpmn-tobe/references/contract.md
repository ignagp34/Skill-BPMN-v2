# Contrato de `bpmn-tobe`

## Configuración (`config/tobe.json`)

- `kinds`: tipos de marca.
  - Cada tipo tiene `label`, `meaning` (va al prompt), `prefix` (texto delante de la anotación), `stroke` (corchete, texto, asociación y borde de la tarea) y `fill` (fondo de la tarea).
  - Hoy: `bloqueo` en rojo suave y `mejora` en verde suave.
  - Para añadir `riesgo` basta con añadir una entrada: el prompt, la validación y los colores la leen de aquí.
- `colorTask`: colorea también la tarea anotada. Si una tarea tiene varios tipos, manda el primero de `taskPriority`.
- `strategy`, que puede ser:
  - `derive-as-is` (por defecto): el TO-BE se dibuja con el layout por defecto de la skill `bpmn` y el AS-IS es ese mismo dibujo sin las marcas. La geometría es idéntica por construcción. Se comprueba que el proceso del AS-IS derivado es el de la ejecución de origen (`semanticIdentical`), sin contar los flujos de mensaje ocultos.
  - `no-bands`: el AS-IS y el TO-BE se dibujan por separado con `v24-tobe` (v24 sin las bandas de v11), así que las anotaciones no pueden mover el proceso. Resultado en los dos ejemplos de `evidence/bpmn-tobe/`: estable, pero las anotaciones se solapan con etiquetas y se salen del pool, y en uno el AS-IS ya no coincidía con el original.
  - Se elige por ejecución con `prepare --strategy`.

## Carpeta `tobe-<fecha>-<hora>-<slug>/`

| Archivo | Contenido |
| --- | --- |
| `as-is/diagram.{bpmn,svg,png}` | AS-IS: dibujo sin marcas, con el mismo DSL y XML semántico que la ejecución de origen (`normalized.dsl`, `semantic.bpmn`). |
| `to-be/diagram.{bpmn,svg,png}` | TO-BE con colores en DI (`color:background-color`/`border-color` y `bioc:fill`/`stroke`) y sus `normalized.dsl`, `semantic.bpmn` y `result.json`. |
| `request.md`, `summary.md` | Petición literal del usuario y narrativa de la ejecución de origen, si existe. |
| `as-is.dsl`, `as-is.semantic.bpmn`, `tasks.json` | DSL, XML semántico y tareas marcables del AS-IS de origen. |
| `input_prompt.md`, `reply-0N.txt`, `attempts/0N/` | Prompt, respuestas y cada intento (`attempt.json`, `reply.txt` y, en las reparaciones, su prompt). |
| `marks.json`, `to-be.dsl` | Marcas validadas, con la línea de `to-be.dsl` en la que se insertó cada una, y el DSL resultante (el AS-IS más las líneas `//`). |
| `stability.json` | Formas movidas, marcos redimensionados, etiquetas movidas, líneas reencaminadas y elementos que faltan entre AS-IS y TO-BE. Las formas se emparejan por id y las conexiones por tipo, origen y destino. |
| `run-info.json` | Origen, estrategia, generador pedido y declarado por intento, runtime y resumen de estabilidad. |

## Estados

Los de la skill `bpmn` (`success`, `success_with_warnings`, `partial_export`, `render_error`, `infrastructure_error`, `generation_error`) más:
- `invalid_marks` (salida 2): el JSON no es válido, una tarea no existe o es ambigua, un tipo es desconocido o una tarea no tiene línea propia en el DSL. Se repara con `repair-prompt`, hasta 3 intentos en total.

Una marca que el motor no llega a unir a su tarea aparece en `lostMarks` y deja el estado en `partial_export`.
