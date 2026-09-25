# Etapa 8 — candidato v2: orden vertical de pools (2026-09-25)

v2 = v1 + idea B. Ejecución local, sin modelos; v0 intacto (`verify-source` 3319/0).

## Qué cambia

v0 y v1 apilan los pools en el orden del DSL. v2 prueba todas las permutaciones (hasta 8 pools) y elige el orden que minimiza Σ |fila(pool emisor) − fila(pool receptor)| sobre los flujos de mensaje, es decir, cuántos pools atraviesa cada mensaje. Si hay empate, gana el orden con menos pares intercambiados respecto al DSL, así que el orden declarado se mantiene siempre que ya sea óptimo; con 2 pools nunca cambia nada. Se ejecuta el `placePoolsAndLanes` de v0 sobre los participantes reordenados y después se restaura su orden en la colaboración, así que la parte semántica del BPMN no cambia.

Código: `tools/layout-lab/harness/v2/pool-order.ts`, que sustituye `./pools.js` en el harness mediante `harness/shared/candidate-config.ts` (el mismo mecanismo que v1, ahora compartido). Tras ese refactor, v1 se volvió a renderizar y dio `diagram.bpmn` idéntico en 56/56.

## Resultados (`compare-v1.json`)

- 56/56 correctos, XML semántico idéntico en todos.
- **Solo cambia 1 caso: `f-planta-residuos` (8 pools).** En los demás casos con 3 o más pools, el orden del DSL ya era óptimo o no hay mensajes (gemini-03).
- En ese caso mejora todo lo que cambia y no empeora nada duro: aristas que atraviesan formas −5, cruces −11, longitud media de mensajes −320 px. Área igual.
- Pasa el filtro objetivo. Lote A/B de 1 pareja en `skill-runs/layout/ab-v1-v2-20260925/`.

Limitación: en este banco la idea B casi no tiene dónde actuar; su efecto real solo se verá con procesos de 3 o más pools con mensajes entre pools no contiguos.

## Votación humana (2026-09-25)

`ab-v1-v2-alt-20260925` (1 pareja, `f-planta-residuos`, vista oculta con conmutador; el usuario miró también la vista con mensajes): **empate** (`human-votes.json`). v2 pasa el filtro objetivo y no pierde a la vista: queda como base de E.
