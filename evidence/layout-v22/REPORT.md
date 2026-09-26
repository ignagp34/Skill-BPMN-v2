# Etapa 8 — candidato v22: carriles compactos (2026-09-26)

Paso 2 de `CONTINUAR.md`: v12 deja carriles altos (`find-a-job`). Base: v20, layout por defecto desde el 2026-09-26.

## Diagnóstico

bpmn-auto-layout coloca todo el proceso en una sola rejilla (filas de 140 px), con los carriles mezclados. `placePoolsAndLanes` de v0 apila después los carriles y da a cada uno la altura entre su primera y su última fila. Una fila que solo usan otros carriles queda dentro del carril como hueco vacío. Con la rejilla corregida de v12 hay muchas más.

## Cambio

`harness/v22/lane-rows.ts` sustituye `./pools.js` (antes de v2) y deja el resto de v20 igual. Antes de apilar, cada carril elimina sus filas vacías. Entre dos filas seguidas del carril, un hueco mayor que una fila pierde el exceso por el centro.

- Lo que está a menos de media fila de un centro de fila se mueve en bloque, así que los eventos de borde siguen en su tarea.
- Un punto de un flujo que cae en la banda eliminada pasa a su borde; la transformación es monótona y los tramos siguen ortogonales.
- El orden y la x no cambian. Las fases siguientes (apilado, enrutado, etiquetas, artefactos, marcos) vuelven a trazar todos los flujos.

## Resultados

Render `skill-runs/layout/v22-20260926-b55`: 55/55, XML semántico idéntico, 0 flujos sueltos (1634 flujos de secuencia comprobados).

**Frente a v20** (`compare-v20.json`): **pasa el filtro**. Cambian 7 casos y ninguno tiene regresiones duras.

| Caso | Área | Alto |
| --- | --- | --- |
| `f-canon-2-incoming-flight` | −24,4 % | −560 px |
| `f-s17-job-application` | −23,1 % | −280 px |
| `c-syn006-gemini` r01 | −17,9 % | −140 px |
| `c-syn015-chatgpt` | −13,2 % | −420 px |
| `f-canon-1-cheeseburger` | −12,8 % | −140 px |
| `f-s-a3-find-a-job` | −8,5 % | −140 px |
| `f-planta-residuos` | −1,9 % | −140 px |

Los flujos se acortan en 6 casos. En `c-syn015-chatgpt` hay 6 cruces menos y los flujos son 62 px más cortos de media.

- `laneSlackRatio` empeora en los 7 casos, pero es un efecto de la razón. La métrica solo cuenta el hueco por encima y por debajo del contenido de un carril, no las filas vacías entre nodos (justo lo que quita v22). El hueco fijo no cambia y el carril es más bajo, así que la razón sube.
- `find-a-job` solo baja una fila: sus carriles son altos porque usan muchas filas distintas, no por filas vacías. Juntar en una fila nodos de un carril que no se solapan en horizontal sería otro candidato (más agresivo; cambia qué flujos van en recto).

Imagen antes y después: `incoming-flight-v20-vs-v22.png` (izquierda v20, derecha v22).

## Votación

Votado por el usuario el 2026-09-26 (`human-votes.json`; A = v20, B = v22, vista oculta): **v22 7, v20 0** (p = 0,016), sin empates ni notas. Gana en todos los casos que cambian, incluido `find-a-job`.

## Lote A/B

`skill-runs/layout/ab-v20-v22-20260926/`: las 7 parejas que cambian, semilla `v20-v22-20260926`.

```powershell
node tools/layout-lab/layout.mjs vote --batch skill-runs/layout/ab-v20-v22-20260926
```
