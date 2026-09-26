# Etapa 8 — candidato v7: ancho común de pools y carriles que llenan el pool (2026-09-26)

Propuesta E de `evidence/layout-review-20260926/REVIEW.md`, con el añadido del usuario: el primer carril y el último no dejan separación con la línea del pool. Reúne las propuestas E y F de la revisión, por decisión del usuario. Ejecución local, sin modelos; v0 intacto.

## Cambio

`tools/layout-lab/harness/v7/frames.ts`: una pasada final después de la de v6 (artefactos y bandas de título de v4):

- todos los pools, con sus carriles, llegan al borde derecho del pool más ancho (el borde izquierdo ya era común);
- el primer carril sube hasta la línea superior del pool y el último baja hasta la inferior. v0 deja 20 px vacíos por arriba y por abajo (`LANE_PAD_Y` en `packages/bpmn-core/src/render/pools.ts`). Los carriles anidados llenan su carril padre igual.

Solo crecen los marcos: formas, etiquetas y rutas conservan sus coordenadas y la caja exterior del diagrama no cambia.

## Resultados frente a v6 (`compare-v6.json`)

- 56/56 correctos, XML semántico idéntico, **pasa el filtro objetivo** (sin regresiones duras, área igual en los 56).
- Cambian los 56 diagramas (todos tenían las franjas). `poolWidthCV` baja a 0 en los 18 casos con pools de distinto ancho.
- `laneSlackRatio` empeora en los 56 por construcción: las franjas pasan a contar como hueco libre de los carriles. No es un defecto nuevo.
- Efecto lateral: los artefactos o anotaciones que v6 dejaba en la franja (p. ej. «Doble anotación por imagen» en `h-ml-01`) quedan ahora dentro de un carril, en lugar de cruzar una línea.

## Lote A/B

`skill-runs/layout/ab-v6-v7-20260926/`: 22 parejas, vista oculta, semilla `v6-v7-20260926`. Se eligieron los 18 casos en que cambia el ancho y 4 de un solo pool en que solo cambian las franjas (`f-es-almacen`, `f-canon-1-cheeseburger`, `f-simple`, `f-s17-job-application`), con la opción nueva `ab-batch --cases`. Una muestra aleatoria de 20 solo incluía 5 de los 18.
