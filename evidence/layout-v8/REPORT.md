# Etapa 8 — candidato v8: artefactos con alcance limitado (propuesta C, 2026-09-26)

Trabajo autónomo mientras el usuario estaba fuera, con su autorización. Base: v7 (layout por defecto). Ejecución local, sin modelos; v0 intacto (`verify-source` 3319/0).

## Cambio

`tools/layout-lab/harness/v8/artifacts.ts`, a partir del voto v5–v6 (`evidence/layout-v6/REPORT.md`):

- mantiene los codos caros en asociaciones cercanas y el aire suave de v6;
- **alcance**: cada px de una asociación por encima de 250 px cuesta 1 más. El aire ya no puede alejar un artefacto de su tarea, que es por lo que v6 perdió en diagramas densos;
- **sin cohesión**: su único caso (`planta-residuos`) dejó un almacén a medio camino y perdió el voto.

El módulo de v5 gana los pesos `reach` y `farLength`, neutros en v5 y v6: v6 y v7 siguen idénticos byte a byte en 56/56 tras el cambio.

## Barrido (variantes en `tools/layout-lab/harness/ablation/`, comparaciones en `ablation/`)

| Variante | Asoc. largas | Codos cerca | Long. media asoc. | Texto cortado | Etiq. sobre forma | Cruces | Casos con regresión dura | Casos que cambian |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| v7 (base) | 41 | 1 | 143,0 | 5 | 16 | 351 | — | — |
| sin cohesión | 41 | 1 | 143,2 | 5 | 16 | 347 | 0 | 2 |
| alcance 150, ×1 | 37 | 2 | 137,7 | 4 | 15 | 356 | 3 | 7 |
| alcance 150, ×3 | 37 | 2 | 134,6 | 4 | 15 | 368 | 3 | 10 |
| **alcance 250, ×1 (v8)** | 39 | 1 | 139,5 | 5 | 16 | 351 | 1 | 5 |
| alcance 250, ×3 | 43 | 1 | 138,9 | 5 | 16 | 363 | 1 | 5 |

Elegido alcance 250 / ×1: la mejora es menor que con 150, pero con menos regresiones y los mismos cruces. En `c-syn012-chatgpt`, el caso más denso, ninguna variante lo resuelve: con 150 se arregla la anotación cortada pero dos nombres de datos se tocan; con 250 la parte izquierda queda más limpia y la anotación sigue en el borde (lo que ataca v11).

## Resultados frente a v7 (`compare-v7.json`)

- 56/56 correctos, XML semántico idéntico. Cambian 5 casos.
- Asociaciones largas 41 → 39; longitud media 143 → 139,5; 1 codo más en total.
- **No pasa el filtro por 1 caso**: `c-syn012-chatgpt`, una línea más sobre una etiqueta.

## Lote A/B

`skill-runs/layout/ab-v7-v8-20260926/`: 5 parejas (todos los casos que cambian), vista oculta, semilla `v7-v8-20260926`. Pendiente de voto.
