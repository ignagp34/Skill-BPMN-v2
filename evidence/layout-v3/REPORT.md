# Etapa 8 — candidato v3: alineación horizontal entre pools (2026-09-25)

v3 = v2 + idea C. Ejecución local, sin modelos; v0 intacto (`verify-source` 3319/0).

## Qué cambia

Tras apilar los pools, el contenido de cada pool se desplaza a la derecha una cantidad dx ≥ 0 para que los dos extremos de sus flujos de mensaje queden en la misma x (mensajes verticales y cortos). dx minimiza Σ |x(centro emisor) − x(centro receptor)| por descenso coordenado: cada pool se mueve a la mediana ponderada de los desplazamientos que piden sus mensajes, y no se mueve si esa mediana es un intervalo que ya lo contiene. Después se normaliza para que el menor dx sea 0. Los marcos de pools y carriles conservan el borde izquierdo común y crecen por la derecha, así que las cabeceras siguen alineadas. Los mensajes reciben de nuevo waypoints rectos de centro a centro, como los siembra `pools.ts`. Después se ejecuta el enrutado ortogonal de v0.

Código: `tools/layout-lab/harness/v3/pool-align.ts`, que envuelve el `placePoolsAndLanes` de v2.

## Resultados (`compare-v2.json`, flujos de mensaje ocultos sin contar en las reglas duras)

- 56/56 correctos, XML semántico idéntico en todos. Cambian 15 casos, todos con mensajes entre pools.
- **Mensajes:** longitud media −306 px y desalineación horizontal media −285 px (15 de 15 casos mejoran). Cruces: 7 mejoran y 1 empeora. Codos por arista: 15 mejoran.
- **Etiquetas sobre la banda de título** (layout completo): 15 casos mejoran y 0 empeoran. Los eventos de inicio desplazados dejan de pisar la cabecera del carril.
- **El filtro objetivo no pasa:**
  - regresión dura visible en 1 caso: en `f-planta-residuos`, un objeto de datos queda sobre la banda de título del carril Generador (es `placeArtifacts`, el mismo fallo que en v1). En ese caso, las etiquetas visibles sobre la banda bajan de 15 a 3;
  - 3 casos superan el área en +15 %: `f-pool-map-message-event` +51 %, `h-ml-04-deriva-datos` +45 % y `f-planta-residuos` +26 %. La mediana es 0 %. El coste visible es un hueco vacío a la izquierda de los pools desplazados.

## Lote A/B

`skill-runs/layout/ab-v2-v3-20260925/`: 15 parejas, vista oculta, semilla `v2-v3-20260925`. Sin votos todavía.

## Votación humana (2026-09-25)

**v2 gana 15 de 15 con los flujos de mensaje ocultos** (`human-votes.json`). v3 no queda descartado: el usuario pidió no descartarlo, porque en esa vista no se podía apreciar su beneficio. Las notas del usuario:

- `h-ml-03`: «El primer lane tiene la entrada más cercana, por lo demás es similar». El hueco a la izquierda aleja la entrada.
- `c-syn010-…-r01`: con los flujos de mensaje ocultos no se aprecia el beneficio de alinearlos; propone un botón para ver u ocultar los flujos de mensaje.

Conclusión provisional: con los mensajes ocultos, la idea C solo muestra su coste (espacio vacío, pools desplazados). Falta juzgarla con los mensajes visibles.

## Segunda votación, con los mensajes visibles

La página de votación tiene ahora un conmutador de flujos de mensaje (tecla M): `ab-batch` copia las dos vistas de cada imagen cuando el caso tiene mensajes, y cada voto registra `sawAltView`. Lote nuevo `skill-runs/layout/ab-v2-v3-shown-20260925/`: 15 parejas, vista inicial con mensajes visibles, semilla `v2-v3-shown-20260925`.

Resultado (`human-votes-shown.json`): **v2 gana 12, v3 gana 3** (`c-syn009-…-r02`, `c-syn010-chatgpt-…-r03` y `c-syn015-chatgpt-…-r03`). Solo en `h-ml-03` se usó el conmutador para ver la otra vista. Con esta implementación, C pierde también cuando los mensajes se ven.

Nota del usuario en `h-ml-03` (propuesta de una variante, **C′**): mantener la entrada de cada pool junto al borde izquierdo y alargar las líneas, insertando huecos, «eventos o actividades vacías» en el auto-layout, para que los extremos de cada mensaje coincidan. Por ejemplo, «Compra con tarjeta» encima de «Solicitud de autorización», «Introducir datos de pago» encima de «Consultar historial»… Es decir, alinear columnas entre pools en lugar de desplazar el pool entero. El usuario advierte que algunos elementos del pool central quedarían sin pareja arriba. No está implementada.
