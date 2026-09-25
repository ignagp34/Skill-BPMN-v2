# Etapa 8 — candidato v4: bandas de título despejadas (2026-09-25)

v4 = v2 + idea E1 (primera parte de la idea E; el resto de E va aparte). Ejecución local, sin modelos; v0 intacto (`verify-source` 3319/0).

## Diagnóstico de partida (v2)

Con los flujos de mensaje ocultos, las etiquetas sobre la banda de título de un pool o carril aparecían en 38 de 56 casos: 82 etiquetas de eventos, casi todas del primer evento de cada carril, más 3 de objetos de datos. Había además 6 formas sobre la banda (objetos de datos y anotaciones de `placeArtifacts`) en 3 casos. Causa: el contenido empieza solo 30 px (`POOL_PAD_X`) después de la banda del carril, y bpmn-js centra la etiqueta de un evento bajo él con hasta 90 px de ancho.

## Qué cambia

Una pasada final tras `placeArtifacts` (`harness/v4/title-band-clearance.ts`, que sustituye `./artifacts.js` y llama al original):

- recoge el borde izquierdo de cada forma, de cada etiqueta con caja en el DI y de cada etiqueta externa estimada (eventos, gateways, objetos y almacenes de datos: ancho = mín(90, 6 px × caracteres), centrada bajo la forma);
- calcula la mayor invasión de la banda de cualquier marco (pool o carril) a su altura, con 6 px de margen;
- ensancha **todos** los marcos de pools y carriles hacia la izquierda en esa cantidad. Nada más se mueve: formas, etiquetas y rutas conservan sus coordenadas y los pools mantienen el borde izquierdo común.

Primera versión: ignoraba lo que sobresalía a la izquierda del marco y dejaba 1 caso (`h-ml-03`, etiqueta de un objeto de datos). Corregido antes de votar; los resultados siguientes son de la versión corregida.

## Resultados (`compare-v2.json`)

- 56/56 correctos, XML semántico idéntico. **Pasa el filtro objetivo**: 0 regresiones duras y 0 casos fuera de la banda de área.
- Etiquetas sobre la banda de título: de 38 casos a **0**. Formas sobre la banda: de 3 a **0**. Ancho de pools más uniforme en 18 casos.
- Coste: +6 a +48 px de ancho; área +1,7 % de mediana y +3,2 % como máximo. Cambian los 56 casos, porque todos se ensanchan un poco.
- Sin efecto sobre el resto de defectos: etiquetas cruzadas por asociaciones (21 casos), etiqueta sobre forma (11) y etiqueta sobre etiqueta (2). Se ve en `h-ml-03`: el objeto de datos «Modelo de fraude actualizado» cae sobre la etiqueta del temporizador y la línea entre carriles. Son de `placeArtifacts` o de enrutado; quedan para candidatos siguientes.

## Lote A/B

`skill-runs/layout/ab-v2-v4-20260925/`: 20 parejas escogidas al azar entre 56 elegibles (12 de un pool, 6 de 2 pools, 1 de 3 y 1 de 8), vista oculta con conmutador de mensajes, semilla `v2-v4-20260925`. Sin votos todavía.

## Votación humana (2026-09-25)

**v4 gana 16, empates 4, v2 gana 0** (`human-votes.json`). Los empates son 4 casos de un pool (`c-syn013-sysv31`, `c-syn006`, `c-syn004` y `f-gemini-04`), donde el cambio es de pocos píxeles. Entre los votos decisivos v4 gana el 100 %: intervalo de Wilson al 95 % [0,81; 1,00], prueba de signos p ≈ 3·10⁻⁵. Pasa también el filtro objetivo: **v4 es el primer candidato aceptado por las dos vías.** El usuario aprobó el mismo día hacer v4 el layout por defecto de la skill (`config/layouts.json`).
