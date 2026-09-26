# Etapa 8 — candidato v17: claridad de flujos sobre v16 (2026-09-26)

v17 = v16 + v13 (`harness/v13/flow-clarity.ts`, sin cambios): una cara de nodo no admite flujos que entran y salen, y dos flujos sin origen ni destino común no comparten tramo de línea. v13 ganó 3–0 (1 empate) frente a v7; aquí se reconstruye sobre el defecto vigente.

## Resultados

Render `skill-runs/layout/v17-20260926-b56`: 56/56, XML semántico idéntico, 0 flujos sueltos.

- **Frente a v16** (`compare-v16.json`): cambian 4 casos, sin cambio de área: `c-syn009-gemini`, `c-syn015-chatgpt`, `f-planta-residuos` y `find-a-job`. Caras mixtas 1 → 0 y solapes ambiguos mejor en 4 casos. Solapes de aristas 4/0, cruces 2/2.
- **No pasa el filtro por `find-a-job`**, como v13 sobre v7: el caso usa el respaldo de una fila y una ruta nueva pasa bajo la etiqueta de un gateway (1 etiqueta sobre forma y 1 cruzada más). Ese caso se arregla con v12 (ver v18).

## Lote A/B

`skill-runs/layout/ab-v16-v17-20260926/`: 4 parejas, semilla `v16-v17-20260926`.

```powershell
node tools/layout-lab/layout.mjs vote --batch skill-runs/layout/ab-v16-v17-20260926
```
