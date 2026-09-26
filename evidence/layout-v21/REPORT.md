# Etapa 8 — candidato v21: desenredar líneas (2026-09-26)

Nota del usuario al votar v20, en `c-syn015-chatgpt`: «la siguiente mejora es hacer que en esta clase de diagramas las líneas sean menos confusas y no den la sensación de estar enmarañadas o de nudo». Base: v20, layout por defecto desde el 2026-09-26.

## Diagnóstico

En `c-syn015-chatgpt` (v20) hay 19 cruces entre flujos de secuencia. Buena parte vienen de flujos largos que cruzan carriles enteros cuando podían ir por un lado libre. Por ejemplo, las dos salidas de «Should the scope be reduced?» bajaban por todo el carril Procurement. El paso de claridad de v13 ya tenía un mini-enrutador (rutas ortogonales que no atraviesan formas, una dirección por cara, sin fusiones), pero solo lo aplicaba a caras mixtas y fusiones ambiguas.

## Cambio

Una idea: el mismo enrutador también trata como problemático un flujo que cruza otro. Aplica cada vez el cambio que más baja el coste del diagrama (hasta 80 rondas). Es `harness/v21/untangle.ts`, y `harness/v13/flow-clarity.ts` pasa a ser configurable (`clarifyFlowsWith`, `V13_TUNING`, neutro).

El primer render bajaba los cruces, pero ponía líneas sobre etiquetas en 5 casos, porque el enrutado va antes que la colocación de etiquetas. Dos ajustes, dentro de la misma idea:

1. **El enrutador prevé las etiquetas.** Una ruta cuesta 400 (más que dos cruces) si pasa por la caja por defecto del nombre de un evento o gateway (debajo, centrada, 90 px), o si no deja sitio a su propio nombre donde lo pondrá `placeLabels` de v0 (último tramo horizontal, al 75 %, encima o debajo). Con 150 (lo mismo que un cruce) el enrutador cambiaba un cruce por una línea sobre texto. Un cruce se lee; un texto tapado, no.
2. **El nombre de un evento de borde, al lado de su línea de salida** (`harness/v21/boundary-labels.ts`, última pasada). En v20, el flujo de un temporizador («5 days» en `job-application`, «30 days» en `gemini-05`) iba pegado al borde inferior de su tarea y cruzaba otros flujos. Ahora sale por abajo, y ninguna ruta evita el texto que bpmn-js pone debajo. Si esa caja choca, se prueba la misma caja a la izquierda y a la derecha del evento, y gana el lado que cubre menos (como v9, que no puede subirla porque encima está la tarea).

v13 se re-renderizó tras cada cambio: v20 sigue idéntico 55/55 (`.bpmn`).

## Resultados

Render `skill-runs/layout/v21-final-20260926-b55`: 55/55, XML semántico idéntico, 0 flujos sueltos (1634 flujos). Es idéntico al render anterior con el mismo código: determinista. En ese render anterior, un caso agotó el tiempo por coincidir con otro render; solo tarda 8 s.

**Frente a v20** (`compare-v20.json`): **pasa el filtro**. Cambian 19 casos y ninguno tiene regresiones duras.

- Cruces entre flujos de secuencia: mejoran 14 casos y no empeora ninguno; −26 en total. `c-syn015-chatgpt`: −8 (19 → 11). También bajan en `h-ml-02` (−3), `planta-residuos`, `composting` y `c-syn006` r02 (−2 cada uno).
- Etiquetas sobre líneas: mejoran 4 casos y no empeora ninguno.
- Codos por flujo: +0,014 de media, peor en 13 casos. Es el precio de dar la vuelta en vez de cruzar. La longitud media baja en 9 casos y sube en 6.
- `edgeOverlaps` sube en 6 casos, pero los solapes ambiguos siguen en 0. Son flujos con el mismo origen o destino que comparten tronco, lo que la regla de agrupación permite.
- Área igual en todos.

Imagen: `c-syn015-chatgpt-v20-vs-v21.png` (arriba v20, abajo v21; pool principal).

## Lote A/B

`skill-runs/layout/ab-v20-v21-20260926/`: las 19 parejas que cambian, semilla `v20-v21-20260926`.

```powershell
node tools/layout-lab/layout.mjs vote --batch skill-runs/layout/ab-v20-v21-20260926
```

## Votación

Votado por el usuario el 2026-09-26 (`human-votes.json`; A = v20, B = v21, vista oculta): **v21 11, v20 7, 1 empate** (p = 0,48), sin notas ni etiquetas. Gana en el caso que motivó la idea (`c-syn015-chatgpt`, −8 cruces), pero no con claridad en el conjunto.

Lectura de las derrotas (`compare-v20.json`): en 5 de las 7, las rutas nuevas comparten más tramos de línea (`edgeOverlaps` +1 a +3), y en 2 (`h-ml-01`, `c-syn009` r02 sysv31) añaden codos sin quitar ningún cruce. Donde gana, los tramos compartidos no suben salvo en un caso. El caso más claro es `f-gemini-04`. En v20, las ramas del gateway salían limpias por abajo. En v21 salen por la cara de «OK», entran a las tareas por arriba con más codos, y «Zero» corre a 2 px de la vuelta de «Reorder fastest parts», así que parecen una sola línea. El enrutador solo penalizaba los solapes exactos, y un cruce (150) valía más que dos codos (80). Esto lleva a v23.

Siguiente posible: v21 + v22 (tocan fases distintas: v22 el apilado de carriles, v21 el enrutado y las etiquetas de borde), si los dos ganan su voto.
