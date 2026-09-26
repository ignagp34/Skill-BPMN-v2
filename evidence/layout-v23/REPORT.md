# Etapa 8 — candidato v23: v21 afinado con su votación (2026-09-26)

Base: v20 (defecto). v23 es v21 (desenredar líneas) con los ajustes que salen de leer sus derrotas, como v6 lo fue de v5.

## Voto de v21 y diagnóstico

v21 frente a v20: **v21 11, v20 7, 1 empate** (p = 0,48; `evidence/layout-v21/human-votes.json`), sin notas. Gana en `c-syn015-chatgpt`, pero pierde 7 casos.

- En 5 de las 7 derrotas, las rutas nuevas comparten más tramos de línea.
- En `h-ml-01` y `c-syn009` r02 (sysv31) añaden codos sin quitar ningún cruce.
- En `f-gemini-04`, «Zero» corre a 2 px de otra línea, y las ramas del gateway salen por la cara de «OK» y entran a sus tareas por arriba.

Se probaron tres ajustes por separado (ablaciones en `tools/layout-lab/harness/ablation/v23-*`, comparadas con v21 en `ablation-*-vs-v21.json`):

| Ajuste | Qué cambia | Casos distintos de v21 |
| --- | --- | --- |
| A | Un codo cuesta 80 en vez de 40. | **0**: no tiene ningún efecto. |
| B | Dos flujos sin origen ni destino común, paralelos a menos de 10 px, cuentan como fusionados en ese tramo. | 3 (quita la casi superposición de `f-gemini-04`). |
| C | Las cajas de nombre que prevé el enrutador ignoran los gateways y los extremos del propio flujo. | 8 |

**C era la causa principal.** v21 suponía que el nombre de un gateway va debajo del rombo, pero `placeLabels` de v0 lo pone en un vértice sin línea (debajo solo si está libre). Por eso el enrutador creía que salir de un gateway por abajo tapaba su nombre, y desviaba el flujo por un lado con más codos (`h-ml-01`: «Flow_13» salía por el vértice derecho). Con los nombres del origen y el destino del propio flujo pasa lo mismo: los mueven pasadas posteriores (v9 y la de eventos de borde de v21).

**v23 = v21 + B + C** (`harness/v23/untangle.ts`; A se descarta porque no cambia nada). Las opciones nuevas de `flow-clarity.ts` son neutras en v13 y v21: v20 y v21 se re-renderizaron idénticos (`.bpmn` 55/55).

## Resultados

Render `skill-runs/layout/v23b-20260926-b55`: 55/55, XML semántico idéntico, 0 flujos sueltos.

**Frente a v20** (`compare-v20.json`): **pasa el filtro**. Cambian 17 casos y ninguno tiene regresiones duras.

| | v21 | v23 |
| --- | --- | --- |
| Casos que cambian | 19 | 17 |
| Cruces de secuencia (total) | −26 | −25 |
| Tramos compartidos (total) | +4 | −1 |
| Codos por flujo (suma de deltas) | +0,77 | +0,05 |
| `c-syn015-chatgpt`, cruces | −8 | −9 |

En las 7 derrotas de v21:

- `f-gemini-04` y `h-ml-01` vuelven exactamente a v20.
- `c-syn009` r02 pierde los codos añadidos.
- `f-gemini-03` deja de compartir tramo.
- `planta-residuos` cambia (un cruce menos en vez de dos).
- `c-syn006` r01 y `h-ml-02` quedan como en v21.

**Frente a v21** (`compare-v21.json`): cambian 9 casos. `c-syn015-gemini` recupera una etiqueta sobre línea que v21 había quitado (vuelve al nivel de v20), así que ese filtro falla por 1 caso.

## Votación

Votado por el usuario el 2026-09-26 (`human-votes.json`; A = v20, B = v23): en los 7 casos de imagen nueva, **v23 5, v20 1, 1 empate**. Junto con los 10 casos idénticos a v21, que heredan su voto (7, 2 y 1), el total es **v23 12, v20 3, 2 empates** (p ≈ 0,035). En `f-gemini-04` y `h-ml-01` v23 es v20.

Nota del usuario en `c-syn009` r02 (sysv31): «la flecha al entrar en el evento de New set of times se ve mejor; sin embargo, la línea vertical que entra en Select Time está demasiado pegada a la tarea. Por eso fue empate en la anterior. Selecciono esta, pero prácticamente empate». Idea anotada: una separación mínima entre una línea y la tarea a la que no pertenece.

## Lote A/B

De los 17 casos que cambian, 10 son idénticos a v21 y ya tienen voto: v23 7, v20 2, 1 empate. Solo se votan los 7 cuya imagen es nueva: `skill-runs/layout/ab-v20-v23-20260926/`, semilla `v20-v23-20260926`.

```powershell
node tools/layout-lab/layout.mjs vote --batch skill-runs/layout/ab-v20-v23-20260926
```
