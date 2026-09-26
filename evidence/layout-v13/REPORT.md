# Etapa 8 — candidato v13: claridad de los flujos (2026-09-26)

A partir de las notas del usuario sobre `find-a-job` en v12:

1. de una misma cara de una tarea no deben entrar y salir flujos a la vez: se pierde hacia dónde van las flechas;
2. falta el evento de inicio (ver «Evento de inicio», abajo);
3. las líneas completamente rectas se juntan y no se sabe adónde va cada una. Agrupar líneas embellece el diagrama, pero no todas se pueden agrupar sin perder la lectura del flujo. Es un punto crítico que requiere estudio.

## Diagnóstico

- En v12, «Report job applications → Send new…» sale por la cara derecha en (125, 98) y el bucle «Merge → Report job applications» llega por la misma cara y el mismo punto. Comparten 100 px de línea en sentidos opuestos. «Yes → Negotiate job interview» y el bucle suben por x = 675 y x = 690 hasta y = 98 y comparten 15 px (el recuadro verde).
- `orthogonal.ts` solo *prefiere* una cara libre para las actividades (`filterActivitySideConflicts`): si no genera ningún candidato en otra cara, se queda con la mixta. Además no se aplica a gateways ni a eventos.
- `edge-channels.ts` solo separa los segmentos horizontales *interiores* de flujos con orígenes distintos. Nunca separa los tramos que tocan un nodo ni los verticales.

Métricas nuevas en `tools/layout-lab/lib/metrics.mjs` (grupo de legibilidad; el filtro duro no cambia):

- `mixedFaces`: caras de nodo con flujos de secuencia que entran y salen;
- `ambiguousOverlaps`: pares de flujos que comparten más de 5 px de línea sin compartir origen (abanico de salida) ni destino (unión).

| Render | Caras mixtas | Solapes ambiguos |
| --- | --- | --- |
| v0 (TFM) | 4 (4 casos) | 10 (8 casos) |
| v7 (defecto) | 1 (1 caso) | 9 (4 casos), 2.724 px compartidos en `planta-residuos` |
| v12 | 3 (2 casos) | 11 (5 casos) |
| **v13** | **0** | **0** |
| **v12 + v13** | **0** | **0** |

Detalle por caso en `flow-readability.json`.

Caras mixtas por tipo de nodo. El usuario observó que no solo pasa en tareas, también en eventos, y que en los gateways no parece haber problemas:

| Render | Eventos | Tareas | Gateways |
| --- | --- | --- | --- |
| v0 | 4 (eventos de recepción de mensaje en `c-syn009` y `c-syn010`) | 0 | 0 |
| v1 a v11 (incluido v7) | 1 («New Set of Times», `c-syn009`, cara superior) | 0 | 0 |
| v12 | 1 | 1 («Report job applications») | 1 (la unión delante de esa tarea, parte del mismo enredo) |
| v13 | 0 | 0 | 0 |

Los eventos son el origen habitual. v13 aplica la regla por igual a tareas, eventos y gateways; en un gateway sin conflicto no cambia nada.

## Criterio de agrupación

- **Se agrupan:** los flujos con el mismo origen (tronco de salida) y los que tienen el mismo destino (tronco de llegada). El tramo compartido tiene un solo sentido y acaba en un solo nodo.
- **No se agrupan:** los flujos sin origen ni destino común, ni los que van en sentidos opuestos por una misma cara. Ahí es preferible un cruce: el ojo sigue una línea a través de un cruce, pero no a través de una fusión.
- **Pendiente de estudio:** las uniones en T, cuando una línea termina sobre el tramo de otra sin compartirlo. Ninguna métrica las mide todavía.

## Cambio

`tools/layout-lab/harness/v13/flow-clarity.ts`: pasada después del reparto de canales de v0 (antes de etiquetas, carriles y artefactos). Mientras haya caras mixtas o solapes ambiguos, aplica el único cambio que más baja el coste del diagrama:

- desplazar un segmento interior de un flujo implicado 12, 24 o 36 px (los vecinos se estiran y la ruta sigue siendo ortogonal), o
- volver a trazarlo con un mini-enrutador: rutas ortogonales entre caras permitidas (una cara no admite la dirección contraria), que salen y entran perpendiculares, no cruzan formas (8 px de holgura con las formas ajenas), no salen del pool y se puntúan por longitud fusionada, cruces, codos y longitud.

Máximo 40 rondas. La búsqueda poda de forma determinista (ramificación y poda), con el mismo resultado que sin poda; se comprobó en `find-a-job`, que pasó de agotar el tiempo (120 s) a unos 2 s.

## Resultados

- **v13 frente a v7** (`compare-v7.json`): 56/56 correctos, XML semántico idéntico, área igual. Cambian 4 casos (`c-syn009-gemini`, `c-syn015-chatgpt`, `planta-residuos`, `find-a-job`). Cruces 351 → 336, solapes de aristas 217 → 207. **No pasa el filtro por `find-a-job`**: en v7 ese caso usa el respaldo de una fila y una de las rutas nuevas pasa bajo la etiqueta de un gateway (una etiqueta sobre forma y dos cruzadas más). Ese caso se arregla de verdad con v12.
- **v12 + v13** (`v12-plus-v13-compare-v7.json`, variante `harness/ablation/v12-clarity`): los mismos fallos de filtro que v12 solo (área de `find-a-job` y `c-syn015-gemini`, dos casos de etiquetas); ni caras mixtas ni solapes ambiguos.
- Imágenes en `img/`: `find-a-job-v12` frente a `find-a-job-v12-plus-v13` (el recuadro verde del usuario: el bucle entra ahora por arriba y «Yes» sube solo) y `c-syn009-v7` frente a `c-syn009-v13`.

## Evento de inicio

El motor ya sintetiza un inicio implícito (`synthesizeImplicitStartEvents`, `packages/bpmn-core/src/dsl/semantic.ts`) para cada nodo **sin entrada**. Falla cuando el primer nodo recibe un bucle: ningún nodo queda sin entrada y el pool se queda sin inicio. En el banco pasa en `find-a-job`, `f-s17-document-approval` y el pool Supplier de `c-syn015-gemini`.

Añadirlo cambia el XML semántico, no el layout, así que queda fuera de la regla de la etapa 8, y el motor está congelado (`verify-source`). Se puede hacer como una normalización semántica versionada fuera del motor (un inicio antes del nodo de la primera línea del DSL, o antes de su unión si la tiene), desactivada en v0, la paridad y el corpus. **Pendiente de la decisión del usuario.**

## Lotes A/B

- `skill-runs/layout/ab-v7-v13-20260926/`: 4 parejas (v7 frente a v13), semilla `v7-v13-20260926`.
- `skill-runs/layout/ab-v12-v12clarity-20260926/`: 5 parejas (v12 frente a v12 + v13), semilla `v12-v12clarity-20260926`.

El primero ya está votado; el segundo sigue pendiente.

## Votación (2026-09-26)

`human-votes.json`: **v13 3, v7 0, 1 empate** (prueba de signos p = 0,25; demasiado pocas parejas para ser significativo). Notas del usuario:
- `c-syn009-gemini`: «Mucho mejor» (etiquetas, líneas, alineación).
- `f-planta-residuos`: gana v13, pero «hay que seguir trabajando, ambos diagramas tienen cruces donde se pierde el flujo».
- `find-a-job`: empate; «ambos están demasiado enredados, no se entienden».
- `c-syn015-chatgpt`: gana v13 (flujo y líneas).
