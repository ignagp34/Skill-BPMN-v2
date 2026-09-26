# Etapa 8 — candidato v12: gateways junto a su tarea (propuesta A, 2026-09-26)

Trabajo autónomo autorizado. Base: v7. Local, sin modelos.

## Diagnóstico

Dos causas en bpmn-auto-layout 0.5.0, leídas en su código y comprobadas ejecutándolo:

1. **Procesos sin entrada.** Solo arranca desde nodos sin flujo entrante. Si todos lo tienen (un bucle sin evento de inicio: `find-a-job`, `f-s17-document-approval` y el pool Supplier de `c-syn015-gemini`), no coloca nada, y el motor recurre al respaldo de v0: una sola fila en orden topológico por carril, con los gateways al final.
2. **`Grid.addAfter` inserta en la fila** (`splice`): cada nodo añadido «después de» otro empuja una columna a la derecha todo lo que ya había en esa fila, y la cola de la fila deriva.

## Cambio

`tools/layout-lab/harness/v12/auto-layout.js` es una copia de `bpmn-auto-layout/dist/index.js` (MIT; atribución en `tools/layout-lab/harness/v12/NOTICE.md`, porque `THIRD-PARTY-NOTICES.md` pertenece a la instantánea congelada) con dos cambios marcados «layout v12»:

- un nodo ocupa la celda siguiente si está libre; si no, se abre una columna en todas las filas, para que sigan alineadas;
- si no hay nodo de arranque, la búsqueda empieza por el primer nodo del proceso en orden de documento, y todo nodo que quede sin alcanzar arranca una fila nueva igual.

`shared/candidate-config.ts` permite ahora que un candidato sustituya también un paquete que importan los módulos del harness (aquí `bpmn-auto-layout`, también en el auto-layout por pool de v1). v7 re-renderizado tras el cambio: idéntico en 56/56.

## Resultados frente a v7 (`compare-v7.json`)

- 56/56 correctos, XML semántico idéntico. Cambian 7 casos.
- Cruces 351 → 262; entre flujos de secuencia, 135 → 55. Longitud media de los flujos de secuencia 168,8 → 157,2; menos codos.
- **No pasa el filtro**: `find-a-job` triplica su área (+200 %) y el pool Supplier de `c-syn015-gemini` crece un 38 %. Las filas de la rejilla se reparten entre carriles y dejan carriles muy altos. Hay además 2 casos con regresiones duras de etiquetas (`c-syn015-chatgpt`, `gemini-03`).
- En `find-a-job` el flujo pasa a leerse de izquierda a derecha, cada decisión junto a su tarea (`evidence/layout-candidates-20260926/img/v12-*.png`). Siguiente paso natural si gana: compactar la altura de los carriles.

## Lote A/B

`skill-runs/layout/ab-v7-v12-20260926/`: parejas de todos los casos que cambian, vista oculta, semilla `v7-v12-20260926`. Pendiente de voto.
