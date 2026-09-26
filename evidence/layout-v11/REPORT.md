# Etapa 8 — candidato v11: hacer sitio a los artefactos (propuesta B, 2026-09-26)

Trabajo autónomo autorizado. Base: v7. Local, sin modelos.

## Cambio

`tools/layout-lab/harness/v11/lane-room.ts`. La colocación de v6 se ejecuta con un informe nuevo del módulo de v5 (`placeArtifactsWith(xml, tuning, report)`; sin informe, v5, v6 y v7 dan lo mismo). Mientras algún artefacto no tiene un sitio limpio (ningún candidato estricto dentro de su pool, o el elegido tapa una etiqueta o cruza una forma o una etiqueta):

1. se abre una banda horizontal justo debajo de la fila de su primera tarea enlazada, de la altura del artefacto más 40 px para su nombre. Todo lo que queda por debajo del corte (formas, etiquetas, puntos de ruta, carriles y pools) baja, y los carriles y pools que atraviesan el corte crecen;
2. se repite la colocación sobre el diagrama con más sitio.

Una banda por artefacto y por ronda, 6 rondas como máximo; los artefactos que siguen sin sitio limpio conservan la elección de v6.

## Resultados frente a v7 (`compare-v7.json`)

- 56/56 correctos, XML semántico idéntico. Cambian 10 casos.
- Es el candidato con más mejora en artefactos: etiquetas sobre formas 16 → 8, texto cortado 5 → 2, cruces 351 → 327, asociaciones largas 41 → 27, textos de artefactos fuera del pool 4 → 2, formas solapadas 2 → 1.
- **No pasa el filtro**: 4 casos crecen por encima del +15 % de área (`c-syn011-chatgpt` +52 %, `c-syn012-chatgpt` +27 %, `c-syn011-gemini` +26 %, `f-s17-document-approval` +23 %) y en `c-syn012-gemini` hay una etiqueta cruzada más. Crecer es lo que hace la propuesta. En `c-syn011-chatgpt` el crecimiento se nota en el resultado: cada artefacto queda junto a su tarea y desaparecen las líneas largas (`evidence/layout-candidates-20260926/img/v11-*.png`).

## Lote A/B

`skill-runs/layout/ab-v7-v11-20260926/`: 10 parejas, vista oculta, semilla `v7-v11-20260926`. Pendiente de voto.
