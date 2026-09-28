# Plan: skill `bpmn-tobe` — TO-BE sobre un AS-IS, con anotaciones de color (2026-09-28)

Pedido por el usuario: partes 1 y 2 de la propuesta TO-BE. Son los diagramas que en la empresa llaman VSM, con anotaciones rojas para los bloqueos y verdes para las mejoras. El flujo del AS-IS no cambia. Los cambios de flujo (parte 3) quedan fuera.

Estado (2026-09-28): implementado en `skills/bpmn-tobe/`; resultados en `evidence/bpmn-tobe/REPORT.md`. Decisiones del usuario: colorear anotación y tarea, tonos suaves, Bizagi, dos diagramas, solo tareas, probar primero A. Tras los ejemplos, A′ (`derive-as-is`) queda por defecto.

## Hechos comprobados en el código

- En el DSL, `//texto` crea una anotación unida a la **tarea siguiente** (prompt v5 § 13.1). No hay forma de anotar eventos ni gateways.
- bpmn-js 17.11.1 pinta los colores de DI `color:background-color`/`color:border-color` y `bioc:fill`/`bioc:stroke` (`BpmnRenderUtil.js`). `saveSVG` y el PNG los conservan.
- Una anotación de bpmn-js no tiene relleno (`fill: 'none'`): solo se colorean el corchete y el texto. Para que se vea de lejos, hay que colorear también la tarea anotada.
- El layout por defecto (v24) incluye las bandas de v11: si una anotación nueva no cabe, se abre una franja horizontal y **todo lo de debajo baja**. Una anotación sola, por tanto, puede mover formas del AS-IS.

## Diseño

Skill nueva `skills/bpmn-tobe/`, con la estructura SOLID de `bpmn` y reutilizando sus módulos (`RunStore`, `HarnessSession`, `exportLayout`, `change-report`, traspaso por archivo, generadores).

1. **Entrada:** la carpeta de una ejecución AS-IS que compiló, y los bloqueos y mejoras en lenguaje natural.
2. **Generación estructurada, no reescritura del DSL.**
   - El modelo recibe un prompt corto: la narrativa, el DSL, la lista de tareas y la petición. No hace falta el prompt v5 de 70 KB.
   - Responde solo con un JSON: `[{ "task": "<nombre exacto>", "kind": "bloqueo" | "mejora", "text": "…" }]`.
   - El CLI valida que cada tarea exista e inserta la línea `//` antes de su primera aparición.
   - Así el flujo no puede cambiar por construcción. Se comprueba además con `dsl-change.json`, que solo debe mostrar anotaciones nuevas.
3. **Render** con el motor y la versión de layout del AS-IS.
4. **Pasada de color** tras el layout, igual que la de ocultar flujos de mensaje:
   - pone el color a la anotación y, según la decisión del usuario, a su tarea y a la asociación;
   - reexporta BPMN, SVG y PNG con `exportLayout`.
   - Los colores y tipos van en `config/tobe.json`, para que añadir uno nuevo (p. ej. «riesgo», en amarillo) sea editar ese archivo.
5. **Estabilidad:**
   - `stability.json` compara la DI del AS-IS y del TO-BE, emparejando las formas por nombre como `change-report`, e indica qué formas o líneas se han movido y cuánto.
   - Si hay movimientos, se usa la opción de la sección siguiente.
6. **Entrega:** PNG del TO-BE, los tres archivos, enlace al AS-IS y lista de anotaciones.

## Estabilidad: medir antes de decidir

Paso 0: añadir anotaciones sintéticas a los 55 casos del banco y contar cuántas formas se mueven con v24. Si se mueven, hay dos opciones:
- **A.** Un layout para TO-BE sin bandas: la anotación se coloca en el mejor hueco sin mover nada. Riesgo: que se solape en diagramas densos.
- **B.** Trasplante: las formas y líneas del AS-IS conservan su DI exacta y solo se colocan las anotaciones. Es estable al 100 %, pero exige ejecutar la colocación de artefactos sobre un BPMN ya maquetado.

Recomendación: A si la medición muestra pocos solapes; B si no.

## Pruebas previstas

- Unitarias: inserción de `//` y validación de nombres.
- De extremo a extremo con un AS-IS del banco: flujo idéntico, colores en SVG y PNG, `stability.json`.
- Una generación real con el subagente.
- Reimportar el `.bpmn`.
- Bizagi: pendiente si no está disponible.

## Decisiones del usuario pendientes

1. ¿Colorear solo la anotación o también la tarea?
2. ¿Tiene que ver los colores Bizagi? Usaría los dos juegos de atributos (`color:` de BPMN in Color y `bioc:`), pero sin probarlo no se puede garantizar.
3. ¿El AS-IS y el TO-BE se entregan por separado (propuesta) o en un solo diagrama?
4. ¿Solo tareas, o hace falta anotar también eventos o gateways? Esto último exigiría cambiar el motor.
