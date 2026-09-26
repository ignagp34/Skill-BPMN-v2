# Etapa 8 — candidato v9: etiquetas de eventos encima cuando abajo chocan (propuesta G, 2026-09-26)

Idea del usuario tras el voto v4–v5. Trabajo autónomo autorizado. Base: v7. Local, sin modelos.

## Cambio

`tools/layout-lab/harness/v9/event-labels.ts`: pasada final tras la de v7. bpmn-js dibuja el nombre de un evento sin etiqueta DI debajo de él, alineado arriba en su borde inferior y ajustado a 90 px en Arial 11 px. Para cada evento (salvo los de borde, cuya etiqueta arriba caería sobre la tarea):

- mide ese texto en la página del harness (canvas) y cuenta lo que taparía la caja de abajo: formas, flujos de secuencia, asociaciones y otras etiquetas. Los flujos de mensaje no cuentan porque se entregan ocultos;
- si la caja de encima tapa estrictamente menos y queda dentro del carril del evento, escribe una etiqueta DI encima (3 px de separación).

## Resultados frente a v7 (`compare-v7.json`)

- 56/56 correctos, XML semántico idéntico. **Pasa el filtro**: sin regresiones duras, área igual.
- Cambian 7 casos (8 imágenes). Etiquetas sobre formas 16 → 14; etiquetas cruzadas por líneas 174 → 168.
- Ejemplo: en `h-ml-01`, «Requisitos del modelo» sube y la asociación de «Especificación del caso de uso» ya no la tacha (`evidence/layout-candidates-20260926/img/v9-*.png`).
- Pendiente de otra idea: el nombre de «Parts arrive» (`gemini-04`) abajo a la izquierda, junto a «Parts», no se ha tocado.

## Lote A/B

`skill-runs/layout/ab-v7-v9-20260926/`: 8 parejas, vista oculta, semilla `v7-v9-20260926`. Pendiente de voto.
