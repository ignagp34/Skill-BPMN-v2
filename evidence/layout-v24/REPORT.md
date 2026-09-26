# Etapa 8 — candidato v24: v22 + v23 (2026-09-26)

Base: v22, layout por defecto desde el 2026-09-26.

## Cambio

v24 = v22 (carriles compactos, ganó 7–0 a v20) + v23 (desenredar líneas afinado, ganó 12–3 a v20), sin reajustes (`harness/v24/vite.config.ts`). Tocan fases distintas: v22 el apilado de carriles (`./pools.js`); v23 el enrutado tras el reparto de canales (`./edge-channels.js`) y el nombre de los eventos de borde (`./artifacts.js`).

## Resultados

Render `skill-runs/layout/v24-20260926-b55`: 55/55, XML semántico idéntico, 0 flujos sueltos.

- **Frente a v22** (`compare-v22.json`): **pasa el filtro**. Cambian 17 casos, ninguno con regresiones duras ni cambio de área. Los cruces de secuencia mejoran en 13 casos y no empeoran en ninguno. Codos y tramos compartidos, neutros (5/5 y 3/3).
- Frente a v23 (`compare-v23.json`) y frente a v20 (`compare-v20.json`): también pasa el filtro.
- De los 17 casos, 13 son idénticos a v23 donde v22 no cambia nada. Frente a v22 son lo mismo que v23 frente a v20, ya votado. Solo 4 combinan los dos cambios: `c-syn006` r01 (−1 cruce), `c-syn015-chatgpt` (−3 sobre los −6 que ya quitó v22), `planta-residuos` (−1) y `job-application`.

## Lote A/B

`skill-runs/layout/ab-v22-v24-20260926/`: los 4 casos que combinan los dos cambios, semilla `v22-v24-20260926`.

```powershell
node tools/layout-lab/layout.mjs vote --batch skill-runs/layout/ab-v22-v24-20260926
```
