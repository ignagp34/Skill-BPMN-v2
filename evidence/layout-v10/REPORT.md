# Etapa 8 — candidato v10: ancho de tarea según su palabra más larga (propuesta D, 2026-09-26)

Trabajo autónomo autorizado. Base: v7. Local, sin modelos.

## Cambio

`tools/layout-lab/harness/v10/task-width.ts` envuelve el auto-layout por pool (v1), antes de pools, enrutado y etiquetas. bpmn-js escribe el nombre de una tarea en Arial 12 px con 7 px de relleno por lado (86 px útiles en 100) y parte la palabra que no cabe. Cada tarea cuya palabra más larga necesita más sitio crece hacia la derecha, redondeando a 10 px, y todo lo que en su proceso queda a la derecha de su centro (formas, etiquetas, puntos de ruta) se desplaza lo mismo. Las fases siguientes corren sin cambios.

## Resultados frente a v7 (`compare-v7.json`)

- 56/56 correctos, XML semántico idéntico. **Pasa el filtro**: sin regresiones duras; el área crece menos del 15 % en todos.
- Cambian 11 casos (los de las 13 tareas con palabras de 14 letras o más de la revisión, y cualquier otra palabra que no cupiera). Por construcción ninguna palabra se parte; comprobado a ojo en `h-ml-01` («hiperparámetros», `evidence/layout-candidates-20260926/img/v10-*.png`).
- Efectos laterales pequeños: cruces 351 → 357 (6 casos con flujos de mensaje algo más largos), solapes de aristas 217 → 209.

## Lote A/B

`skill-runs/layout/ab-v7-v10-20260926/`: 11 parejas, vista oculta, semilla `v7-v10-20260926`. Pendiente de voto.
