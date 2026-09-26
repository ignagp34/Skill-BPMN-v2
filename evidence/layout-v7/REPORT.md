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

## Votación (2026-09-26)

Resumen en `human-votes.json` (A = v6, B = v7). 22/22 votadas, sin notas ni etiquetas.

- **v7 16, v6 6, sin empates.** Tasa de v7: 0,73 (Wilson 95 %: 0,52–0,87); prueba de signos bilateral p = 0,05.
- Solo franjas (4 casos de un pool): v7 3, v6 1. Ancho y franjas (18 casos de varios pools): v7 13, v6 5.
- Tras desciegar, el usuario indicó que las 6 elecciones de v6 fueron probablemente errores de tecla e intentó corregirlas, pero la página lo dejaba en la pareja 1: con el lote completo, cada voto abría el aviso final sin avanzar. Quedaron 8 revisiones de p01, siempre al mismo lado. Después aceptó el resultado tal como se votó. El recuento no cambia; los votos previos al intento están en `votes-before-correction.json`, en la carpeta del lote.
- Arreglo de la página (`tools/layout-lab/vote/index.html`): al revisar con el lote completo pasa a la pareja siguiente; tecla **S** para avanzar sin votar; `#pNN` en la URL abre esa pareja. Probado sobre una copia del lote.
- Posible matiz, sin confirmar por el usuario: en `c-syn015` (p17, p21) el pool pequeño queda casi vacío al estirarlo hasta el ancho del grande.

## Decisión

El usuario da v7 por bueno («es un cambio correcto»). **v7 es el layout por defecto de la skill desde el 2026-09-26** (antes v6). Comprobado con `render-dsl` sin `--layout`: registra `v7` y su layout completo es idéntico al del banco.
