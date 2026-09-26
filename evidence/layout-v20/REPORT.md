# Etapa 8 — candidato v20: combinación de v18 y v19 (2026-09-26)

Votos frente a v16 (`evidence/layout-v17|v18|v19/human-votes.json`):

| Candidato | Idea | Voto | p (signos) | Notas del usuario |
| --- | --- | --- | --- | --- |
| v17 | v16 + v13 (claridad de flujos) | v17 2, v16 0, 2 empates | 0,5 | `planta-residuos`: «al ser el diagrama grande no veo el caso». |
| v18 | v16 + v12 + v13 | **v18 6, v16 0**, 2 empates | 0,03 | `find-a-job`: «mucho mucho mejor» (flujo, etiquetas, alineación, pools, compacidad). `c-syn015-gemini` (empate): «pool de abajo más claro en la versión más grande». `f-s17-document-approval` (empate): «este ejemplo quizás es malo de cara a próximos experimentos». |
| v19 | v16 + H (etiquetas de flujo fuera de las tareas) | **v19 4, v16 0**, 1 empate | 0,13 | — |

Comentario general del usuario: «en general buenos cambios».

## Cambio

v20 = v18 + v19, sin reajustes: v16 + v12 (bpmn-auto-layout corregido) + v13 (claridad de flujos) + H (`harness/v19/flow-labels.ts` como última pasada). v17 no se añade aparte porque v18 ya lo contiene.

## Resultados

Render `skill-runs/layout/v20-20260926-b56`: 56/56, XML semántico idéntico, 0 flujos sueltos.

- **Frente a v18** (`compare-v18.json`): **pasa el filtro**. Cambian 5 casos: los de H, que además corrige la etiqueta sobre forma que v18 dejaba en `f-gemini-03`.
- **Frente a v16** (`compare-v16.json`): cambian 10 casos. Mejoran los cruces (4/2; −62 en `find-a-job`, −21 en `planta-residuos`, −18 en `c-syn015-gemini`), los flujos hacia delante (4/0), los tramos rectos (3/0), los solapes ambiguos (4/0), las caras mixtas (1/0) y las etiquetas sobre formas (2/0). No pasa el filtro por:
  - el área de v12: `find-a-job` +200 %, `c-syn015-gemini` +38 %; justo los dos casos que el usuario valoró mejor o empató con la versión grande;
  - `c-syn015-chatgpt`: 1 etiqueta sobre otra y 1 sobre una línea (de v12; la pareja la ganó v18).
- Las 4 líneas que atraviesan formas de más en `c-syn015-gemini` son flujos de mensaje, ocultos en lo que recibe el usuario; no cuentan en las reglas duras.

## Lote A/B

`skill-runs/layout/ab-v16-v20-20260926/`: todas las parejas que cambian, semilla `v16-v20-20260926`.

```powershell
node tools/layout-lab/layout.mjs vote --batch skill-runs/layout/ab-v16-v20-20260926
```

Pendiente: compactar la altura de los carriles de v12 (`find-a-job`); revisar si `f-s17-document-approval` sigue en el banco (nota del usuario; no tiene inicio, ver la tarea del evento de inicio).
