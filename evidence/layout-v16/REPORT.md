# Etapa 8 — candidato v16: nombres de datos encima cuando abajo chocan (2026-09-26)

Idea del usuario tras v9: lo que se hizo con los nombres de los eventos, aplicarlo también a los objetos de datos y los almacenes. v16 = v15 + ese único cambio.

## Cambio

bpmn-js dibuja el nombre de un objeto de datos o de un almacén debajo de la forma (ninguno lleva etiqueta en el DI). La pasada de v9 (`harness/v9/event-labels.ts`) se generaliza como `raiseLabels(xml, tipos)`; `raiseEventLabels` la llama con los eventos, como antes. v16 (`harness/v16/data-labels.ts`) la aplica a `DataObjectReference` y `DataStoreReference` después de la pasada de eventos de v15, sobre la geometría final. La regla es la de v9: el nombre sube si debajo choca con formas, flujos de secuencia, asociaciones o etiquetas, encima choca estrictamente menos y no sale del carril.

## Resultados

Render `skill-runs/layout/v16-20260926-b56`: 56/56, XML semántico idéntico.

- **Frente a v15** (`compare-v15.json`): **pasa el filtro**. Cambian 2 casos: etiquetas cruzadas por líneas −3 en `c-syn011-chatgpt` y −1 en `c-syn015-chatgpt`. Ninguna métrica peor salvo la distancia de la etiqueta a su forma, que crece al subirla (igual que en v9). En `c-syn011-chatgpt`, «Evaluation Report» y «Recommendation» suben y dejan de estar cruzados por sus asociaciones. «Case Repository» se queda abajo porque encima choca igual (`img/c-syn011-chatgpt-v15.png` frente a `img/c-syn011-chatgpt-v16.png`).
- **Frente a v7** (`compare-v7.json`): los mismos 18 casos y los mismos 4 fallos de área que v15; ninguna regresión dura.

El efecto es pequeño: en el banco casi todos los nombres de datos ya quedan libres debajo gracias a la colocación de artefactos de v5/v6.

## Lote A/B

`skill-runs/layout/ab-v15-v16-20260926/`: 2 parejas (todas las que cambian), semilla `v15-v16-20260926`. Comando de voto:

```powershell
node tools/layout-lab/layout.mjs vote --batch skill-runs/layout/ab-v15-v16-20260926
```

## Votación (2026-09-26)

`human-votes.json`: **v16 2, v15 0** (las 2 parejas; p = 0,5 por tamaño, no por dudas). v16 hereda la corrección de flujos sueltos de v15 (`evidence/layout-v15/REPORT.md`), sin cambios en el banco.

## Comprobaciones

- v15 re-renderizado tras generalizar la pasada de v9: idéntico 56/56.
- v9 re-renderizado: `diagram.bpmn` idéntico en 56/56. En `c-syn014-gemini`, el render original de v9 no tenía la vista sin mensajes (`hidden`): su generación agotó el tiempo (120 s), un fallo transitorio de infraestructura. El nuevo render sí la genera.
