# Etapa 8 — candidato v19: propuesta H, etiquetas de flujo fuera de las tareas (2026-09-26)

Nota del usuario sobre `c-syn015-chatgpt`: «Critical risk», «No critical risk», «Above budget»… están bien situadas, pero hay que desplazarlas un poco a la izquierda según la longitud del texto.

## Diagnóstico

`placeLabels` de v0 estima el ancho de una etiqueta de flujo con 6 px por carácter y la ancla al 75 % del último tramo recto. Si el tramo es corto, la etiqueta cae sobre la tarea de destino. Con las cajas de texto medidas en Chromium (`text-boxes.json`), bpmn-js dibuja el texto centrado en la caja del DI, alineado arriba, en Arial de 11 px (12 px por línea). En v16 hay 4 etiquetas de flujo sobre formas en todo el banco, las 4 en `c-syn015-chatgpt` y sobre su tarea de destino.

## Cambio

`harness/v19/flow-labels.ts`, pasada final después de v16. Mide el texto real de cada etiqueta de flujo. Si toca una forma, o queda a menos de 4 px, la desliza a lo largo del tramo al que pertenece y prueba también el otro lado de la línea; el centro no sale del tramo. Gana la posición que toca menos formas, después menos etiquetas y después menos líneas, y entre iguales la que menos se mueve. Si no consigue tocar menos formas, la etiqueta se queda donde estaba.

Las utilidades de texto y colisión de v9 pasan a `harness/shared/label-geometry.ts`; v9 y v16 se re-renderizaron idénticos.

## Resultados

Render `skill-runs/layout/v19-20260926-b56`: 56/56, XML semántico idéntico, 0 flujos sueltos.

- **Frente a v16** (`compare-v16.json`): **pasa el filtro**. Cambian 4 casos: `c-syn015-chatgpt` (las 4 etiquetas) y 3 con una etiqueta a menos de 4 px de una forma (`c-syn006-gemini` r01 y r02, `f-canon-4-composting`). Etiquetas de flujo sobre formas: **4 → 0**. Ninguna métrica peor.
- Recorte antes y después: `c-syn015-chatgpt-v16-vs-v19.png` (arriba v16, abajo v19).

## Lote A/B

`skill-runs/layout/ab-v16-v19-20260926/`: 5 parejas, semilla `v16-v19-20260926`.

```powershell
node tools/layout-lab/layout.mjs vote --batch skill-runs/layout/ab-v16-v19-20260926
```
