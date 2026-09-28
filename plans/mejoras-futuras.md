# Mejoras futuras (anotadas por el usuario, 2026-09-26)

Ideas que el usuario pidió dejar por escrito con el detalle suficiente para implementarlas más adelante. Orden acordado (2026-09-26): 1 → 4 → 3 → 2, todas en este repositorio. **Estado:** 1 hecha en local (`plans/bpmn-edit.md`, `evidence/bpmn-edit/REPORT.md`); 4, 3 y 2 sin empezar. Las tres primeras son skills independientes de `bpmn`: pueden vivir en otro repositorio y solo reutilizar el motor y las herramientas de este. El orden de prioridad lo decide el usuario; según él, «por ahora vamos bien con lo que tenemos» y la edición manual sería «el toque final».

Resumen:

| # | Mejora | Tipo | Depende de |
| --- | --- | --- | --- |
| 1 | Skill `bpmn-edit`: editar a mano un diagrama generado, en una página local | Skill nueva | Motor y harness de este repositorio |
| 2 | Experimentos de layout con ediciones humanas como referencia | Experimento (etapa 8) | 1 |
| 3 | Alternativa a 2: anotar defectos con recuadros sobre la imagen | Experimento (etapa 8) | Página de votación del laboratorio |
| 4 | Skill de evaluación de modelos generadores | Skill nueva | CLI `bpmn` y `TFM-eval` |
| 5 | Anotar tareas de líneas paralelas con `//[tarea] texto` | Cambio del motor (parser) | Autorización expresa para tocar el motor congelado |

---

## 1. Skill `bpmn-edit`

### Objetivo

Recuperar lo que hacía la aplicación anterior (BPMN Generator, `apps/company-web`: pantalla `Editor.tsx` con el DSL y un modeler de bpmn-js), **sin la parte de copiar y pegar**: la skill abre directamente el diagrama generado en una página web local y el usuario lo edita ahí.

### Flujo de uso

1. Entrada, una de estas:
   - una carpeta de ejecución de la skill `bpmn` (`diagram.bpmn`, `normalized.dsl`, `run-info.json`);
   - un archivo DSL;
   - un `.bpmn` con DI.
2. La skill lanza un servidor efímero en `127.0.0.1` y un puerto libre, como `layout.mjs vote` (`tools/layout-lab/commands/vote.mjs`). Abre la página en el navegador sin que el usuario tenga que copiar nada.
3. La página muestra dos paneles:
   - **DSL** editable: al cambiarlo se vuelve a compilar y dibujar con el motor y el layout por defecto (`config/layouts.json`), como hacía `app.ts` con `renderSemanticXml`;
   - **lienzo** de bpmn-js con modelado activo: mover tareas, eventos y gateways, rehacer codos de las líneas (waypoints), mover etiquetas, ensanchar pools y carriles.
4. Botón **Guardar** (y guardado automático): escribe en una carpeta nueva de la ejecución `diagram.bpmn`, `diagram.svg` y `diagram.png`. Usa los mismos exportadores que la skill `bpmn` (`saveSVG` y el PNG del mismo SVG), con los flujos de mensaje ocultos o visibles según la opción de la ejecución (`stripMessageFlows`).
5. La skill comprueba los tres archivos igual que `bpmn` (DI reimportable, SVG con todos los elementos, PNG del tamaño del viewBox) y devuelve sus rutas.

### Dos tipos de edición, separados

- **Edición de la geometría** (mover y trazar): el XML semántico no cambia. Se guarda y se registra como decisión de layout (ver «Registro»).
- **Edición del DSL** (renombrar, añadir o quitar tareas, cambiar decisiones): cambia la semántica. Se vuelve a compilar y se avisa de que las ediciones de geometría hechas antes pueden perderse. Propuesta: conservar las posiciones de los elementos cuyo ID no cambie. Decidirlo al implementar.
- Bloquear en la interfaz lo que cambie la semántica desde el lienzo (paleta de creación, borrar, reconectar), salvo que el usuario lo pida. Así la edición del lienzo es solo de layout.

### Registro de las ediciones (clave para la mejora 2)

- Escuchar el `commandStack` de bpmn-js (`shape.move`, `connection.updateWaypoints`, `label.move`, `shape.resize`, `lane.resize`…) y guardar un `edits.json` con cada orden: elemento, tipo, antes y después y hora.
- Guardar también el DI inicial del motor (`engine.bpmn`) y el final del usuario (`user.bpmn`). La diferencia por elemento (desplazamiento, cambio de tamaño, codos añadidos o quitados, etiqueta movida) se calcula después y no depende de cómo se hizo la edición.
- `run-info.json` registra la versión de layout de partida, el hash del DSL, la duración de la sesión y el número de ediciones.

### Reutilización y restricciones

- Reutilizar el harness y los módulos de la skill `bpmn` (`scripts/lib/harness`, artefactos, carpeta de ejecución). No copiar el motor: la skill localiza este repositorio igual que hoy (`BPMN_SKILL_ENGINE_ROOT` o el enlace de la instalación).
- Sin API keys y sin servicios externos: todo en local.
- SOLID como en `bpmn`: servidor, página, exportación y registro en módulos separados; configuración en JSON.

### Aceptación

- [x] Desde una ejecución de `bpmn`, un comando abre la página. Se mueven una tarea y un codo, se guarda, y los tres archivos reflejan el cambio. El XML semántico es idéntico al de partida y `edits.json` contiene las dos ediciones. (Prueba automática `end to end from a bpmn run`: las ediciones las hace el script y no una persona; la prueba con una persona queda en manos del usuario.)
- [x] Editar el DSL vuelve a dibujar el diagrama y avisa si se pierden ediciones. (Misma prueba: revisión 2, aviso y «Volver al DSL anterior».)
- [x] Rutas de Windows con espacios; el servidor se cierra al terminar. (Carpetas de prueba con espacios; cierre con «Terminar», salida 0 y puerto libre; cierre por inactividad a los 182 s.)

---

## 2. Experimentos de layout con ediciones humanas

Requiere la mejora 1. Es el «toque final» del layout: en lugar de juzgar pares A/B, el usuario corrige a mano y sus correcciones pasan a ser la referencia.

### Protocolo propuesto

1. Elegir casos del banco (`tools/layout-lab/bench`, 55 DSL desde que se excluyó `f-s17-document-approval`) estratificados como el banco: una pool, varias pools, artefactos, bucles y etiquetas largas. Empezar con unos 10–15.
2. Renderizar con el layout por defecto vigente (el `default` de `skills/bpmn/config/layouts.json`). Fijar la versión en el registro.
3. El usuario corrige cada caso en `bpmn-edit` hasta que le parezca limpio. Opcionalmente, con un tiempo máximo por caso.
4. Guardar en `evidence/layout-human-edits/<caso>/`: `engine.bpmn`, `user.bpmn`, `edits.json`, las imágenes antes y después y una nota libre del usuario.
5. Análisis:
   - **Patrones de corrección**: qué tipos de elemento mueve más (etiquetas, artefactos, gateways…), en qué dirección y cuánto; qué codos quita o añade. Cada patrón repetido es una hipótesis de regla (como fueron las propuestas A–H).
   - **Métrica de distancia al humano**: para un candidato, distancia media de sus posiciones a las de `user.bpmn`, normalizada por el tamaño del diagrama, y diferencia de codos. Se añade al grupo de legibilidad de `metrics.mjs`/`compare`, no al filtro duro, hasta calibrarla.
   - **Calibración**: comprobar si las métricas actuales (`labelShapeOverlaps`, `crossings`, `longAssociations`…) mejoran de `engine.bpmn` a `user.bpmn`. Las que no mejoran no miden lo que le importa al usuario.
6. Cada regla nueva sigue siendo un candidato versionado (`vN` en `layouts.json`), con `compare` y voto como hasta ahora.

### Cuidados

- Las ediciones humanas no son únicas: dos correcciones distintas pueden ser igual de buenas. La distancia al humano se usa como señal, no como verdad absoluta.
- No sobreajustar las reglas a los casos editados: reservar algunos casos editados para validar.

---

## 3. Alternativa: anotar defectos con recuadros

Más barata que la mejora 2 y sin depender de `bpmn-edit`. Puede ampliar la página de votación actual.

1. Se genera el DSL y su imagen con el layout por defecto.
2. En una página local, el usuario dibuja recuadros (bounding boxes) sobre lo que no queda bien y, para cada uno, elige una etiqueta y escribe una nota opcional. Etiquetas: la rúbrica de la página de votación (flujo, etiquetas, líneas, alineación, pools, compacidad) más otras como «codo innecesario» o «texto tapado».
3. Se guarda `annotations.json` con cada recuadro en coordenadas del diagrama (no de la pantalla), la etiqueta, la nota y el layout de origen.
4. Al analizarlo, cada recuadro se cruza con el DI: qué formas, líneas y etiquetas quedan dentro. Así se obtiene un conjunto de defectos por elemento que sirve:
   - para priorizar ideas (qué defecto aparece más);
   - como prueba de regresión: un candidato nuevo debería resolver los recuadros sin crear otros (comprobable en parte con métricas locales dentro del recuadro);
   - para calibrar un juez automático (el juez Opus aplazado).
5. Reutiliza el servidor de `vote.mjs` (127.0.0.1, guardado inmediato en JSON, lotes reanudables, teclado).

---

## 4. Skill de evaluación de modelos generadores

### Objetivo

Decidir con datos qué modelo debe generar el DSL en cada host. Se lanzan varios subagentes con modelos distintos sobre los mismos resúmenes y se comparan. Contexto: el usuario está probando modelos y ha visto que Luna/high tarda 1–2 min por diagrama, frente a 20–30 s con GPT 5.5. El tiempo es un criterio, no solo la calidad.

### Diseño

- **Configuración** (`config/models-under-test.json`): lista de modelos y esfuerzos por host. En ChatGPT/Codex, subagentes con `model` y `reasoning_effort`; en Claude, un subagente por modelo generado como `bpmn-dsl-generator`. También el número de repeticiones por resumen y un límite de coste o de ejecuciones, fijados **antes** del lote (regla de la etapa 6).
- **Conjunto de resúmenes** fijo y versionado: reutilizar los resúmenes del corpus del TFM (`apps/tfm-lab/prompts/experiments`) para poder comparar con GPT 5.5 histórico, más casos con varios participantes, ambiguos e inválidos.
- **Ejecución**: para cada modelo, resumen y repetición, `bpmn.mjs prepare` → subagente → `render` (con las reparaciones permitidas, máximo 2) → `evaluate`. Cada subagente trabaja en su propia carpeta y con el mismo prompt v5. Se lanzan en paralelo si el host lo permite.
- **Registro por ejecución**:
  - modelo y esfuerzo **realmente usados** (`matchesRequested`);
  - tiempo de generación (del traspaso a la respuesta), tokens o coste si la herramienta los da (sin inventarlos);
  - estado del primer intento y del final, y número de reparaciones.
- **Métricas**:
  - éxito del primer intento y final;
  - métricas semánticas de `TFM-eval` (M1–M5 y M8 como puntuaciones; M6, M7, M9 y M10 descriptivas, sin promediarlas como calidad);
  - fidelidad al resumen (actores, decisiones, pasos omitidos o inventados), idealmente con una rúbrica y un juez distinto del modelo evaluado;
  - métricas de layout del resultado y, opcionalmente, un voto A/B humano entre modelos con la página de votación;
  - tiempo mediano y percentil 90, y coste.
- **Informe**: tabla por modelo con calidad, fiabilidad, tiempo y coste, y la frontera calidad–tiempo. Recomendación, sin cambiar nada por sí sola: cambiar el generador sigue siendo editar `skills/bpmn/config/generators.json` y ejecutar `sync-agents`, con la aprobación del usuario.

### Cuidados

- Separar el primer intento del resultado reparado.
- No comparar con los resultados históricos si cambian el prompt o las condiciones; identificar las diferencias.
- No crear tareas en la barra lateral para simular subagentes; si un host no permite elegir el modelo, decirlo y no sustituirlo en silencio.
- Resultados en carpetas nuevas; nunca en `TFM-eval/results/`.

---

## 5. Anotar tareas de líneas paralelas (`//[tarea] texto`)

Anotada por el usuario el 2026-09-28 como punto pendiente. **No se implementa por ahora: el usuario no quiere modificar todavía el motor del TFM.**

### Problema

Un `//` delante de una línea paralela (`A|B`) se une al gateway paralelo, no a una tarea (`packages/bpmn-core/src/dsl/semantic.ts`, `attachAnnotations`). Se hizo así a propósito, para que la nota no saltara a la tarea que va después de la unión. En una línea paralela no hay una sola «tarea siguiente»: el paso siguiente es la bifurcación entera. Tampoco sirve la anotación en la misma línea (`A // x|B`): el lexer separa por `|` antes de buscar `//`, y el texto acaba formando parte del nombre de la tarea.

Consecuencia actual: una tarea que solo aparece dentro de líneas paralelas no se puede anotar. La skill `bpmn-tobe` la lista en `unmarkableTasks` y no se la ofrece al modelo (caso real: `evidence/bpmn-tobe/ex2-rag/`).

### Propuesta elegida (opción 2 de las 4 comparadas)

- Sintaxis: `//[Nombre exacto de la tarea] texto`, en la línea anterior a una línea paralela.
- Si el nombre coincide con una tarea de esa línea paralela, la anotación va a esa tarea.
- Si no coincide: aviso y la nota va al gateway, como ahora.
- Sin corchetes, el comportamiento no cambia.

Opciones descartadas:
- «Siempre la primera rama»: la segunda no se podría anotar nunca.
- `//` dentro de cada rama: rompe «una línea, un elemento».
- Por posición (`//2:`): cambia de tarea en silencio si se reordenan las ramas.

### Al implementarla

- Pedir antes la autorización expresa del usuario: toca el parser del motor congelado.
- Paridad y corpus completos (`parity.mjs`, `tfm-history.mjs`, `verify-source`). Ningún DSL existente usa `//[`, así que todo debe salir idéntico. Registrar el cambio de hashes del código del motor.
- `bpmn-tobe`: escribir `//[tarea] <prefijo><texto>` para las tareas paralelas y quitarlas de `unmarkableTasks`. El modelo no tiene que aprender nada.
- Documentarlo en el prompt v5 solo si el usuario quiere que el generador de diagramas también lo use: eso sería una nueva versión del prompt.
