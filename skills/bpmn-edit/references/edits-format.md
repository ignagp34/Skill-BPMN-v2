# Formato de las ediciones

Pensado para la mejora 2 (`plans/mejoras-futuras.md` § 2): ediciones humanas como referencia del layout.

## `edits.json` (`bpmn-edit-log/1`)

`{ schema, sessionId, entries: [...] }`. Cada entrada tiene `seq`, `type`, `revision`, `at` (hora de la página) y `receivedAt` (hora del servidor). El resto de campos depende del tipo:

| `type` | Campos | Significado |
| --- | --- | --- |
| `edit` | `trigger` (`execute`, `undo`, `redo`), `command`, `changes` | Una orden de primer nivel del `commandStack` de bpmn-js: `elements.move` (arrastre de formas o etiquetas), `shape.move`, `connection.updateWaypoints` (codos y tramos), `shape.resize`, `lane.resize`. En `undo`/`redo`, `command` es la orden deshecha o rehecha. |
| `rejected` | `command`, `reason` (`not-layout`, `semantic`), `changes` | Una orden que se deshizo al momento. `changes` es lo que devolvió el deshacer. |
| `dsl` | `fromRevision`, `toRevision`, `lostEdits` | Se aplicó un DSL nuevo. `lostEdits` es el nº de elementos cuya geometría difería del motor. |
| `revert` | `fromRevision`, `toRevision` | «Volver al DSL anterior». |

`changes` es `[{ id, before, after }]`, con todo lo que cambió de geometría en esa orden, incluidas las líneas que bpmn-js recalcula al mover una forma:
- una forma o etiqueta: `{ x, y, width, height }` (la etiqueta de un elemento tiene id `<id>_label`);
- una línea: `{ waypoints: [[x, y], …] }`;
- `null` si el elemento no existía antes o después.

## `edit-diff.json` (`bpmn-edit-diff/1`)

Diferencia entre `engine.bpmn` y `user.bpmn` de la revisión guardada. No depende de cómo se hizo la edición.

- `summary`:
  - `changedElements` y `byKind` (participant, lane, task, event, gateway, data, annotation, edge);
  - `shapesMoved`, `shapesResized` y `labelsMoved`;
  - `edgesRerouted`, `bendsAdded` y `bendsRemoved`.
- `missing`: elementos que están en un lado y no en el otro. Debe estar vacío, porque la semántica no cambia.
- `changes[]`:
  - formas: `dx`, `dy` (desplazamiento del centro), `dWidth`, `dHeight`, `label` (`dx`, `dy`, antes/después) y `before`/`after`;
  - líneas: `waypointsChanged`, `bendsBefore`, `bendsAfter`, `bendsAdded`, `bendsRemoved`, `label` y los puntos antes/después.

Un codo es un punto intermedio donde la línea gira; los puntos alineados no cuentan. Tolerancia: 0,5 px.
