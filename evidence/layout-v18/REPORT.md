# Etapa 8 — candidato v18: v12 + v13 sobre v16 (2026-09-26)

v18 = v16 + v12 (bpmn-auto-layout con `Grid.addAfter` corregido, copia MIT en `harness/v12/`) + v13 (claridad de flujos). Es la pareja que ganó 5–0 frente a v12 solo; aquí se reconstruye sobre el defecto vigente.

## Resultados

Render `skill-runs/layout/v18-20260926-b56`: 56/56, XML semántico idéntico, 0 flujos sueltos.

- **Frente a v16** (`compare-v16.json`): cambian 7 casos. Área: `c-syn005-chatgpt` −24,8 %, `f-gemini-03` −11,7 %, `planta-residuos` −9,5 %, `c-syn015-chatgpt` −8,2 %, `c-syn009-gemini` igual, `c-syn015-gemini` +37,8 % y `find-a-job` +200,5 %.
- Mejoran los flujos hacia delante (4/0), los tramos rectos (3/0), los cruces (4/2), los solapes ambiguos (4/0) y las caras mixtas (1/0).
- **No pasa el filtro**: área en `find-a-job` y `c-syn015-gemini`, igual que v12, y 2 casos con etiquetas (`c-syn015-chatgpt`: 1 etiqueta sobre otra y 1 sobre línea; `f-gemini-03`: 1 etiqueta sobre forma).
- Sigue pendiente lo anotado para v12: compactar la altura de los carriles, que quedan altos en `find-a-job`.

## Lote A/B

`skill-runs/layout/ab-v16-v18-20260926/`: 8 parejas, semilla `v16-v18-20260926`.

```powershell
node tools/layout-lab/layout.mjs vote --batch skill-runs/layout/ab-v16-v18-20260926
```
