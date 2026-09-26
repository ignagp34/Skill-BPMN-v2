# Etapa 8 — candidato v14: combinación de v9, v10 y v11 (2026-09-26)

Paso 1 de `CONTINUAR.md`. Tras los votos frente a v7 (v9 6–0, v10 9–1, v11 8–1), v14 combina los tres ganadores claros sobre v7, **sin reajustar ninguno**:

| Fase | Módulo | Idea |
| --- | --- | --- |
| `layout-missing` | `harness/v10/task-width.ts` | D: ancho de tarea según su palabra más larga (tras el auto-layout por pool). |
| `pools` | `harness/v2/pool-order.ts` | Igual que v7. |
| `artifacts` | `harness/v14/combined.ts` | B de v11 (bandas para artefactos, luego bandas de título de v4 y marcos de v7) y, al final, G de v9 (etiquetas de eventos encima). |

v9 va la última porque v11 mueve formas y rutas y v9 decide sobre las colisiones finales. v8, v12 y v13 no entran (sin decisión o sin votar).

## Resultados

Render `skill-runs/layout/v14-20260926-b56`: 56/56, XML semántico idéntico. Un primer render tuvo un tiempo agotado transitorio en `c-syn002-claude` (por separado se renderizó sin problema); se repitió el banco entero en una carpeta nueva y el anterior se conserva como `v14-20260926-b56-timeout`.

- **Frente a v7** (`compare-v7.json`): 18 casos cambian. **Ninguna regresión dura** (v11 solo tenía 1 frente a v7; la combinación la elimina). No pasa el filtro solo por la banda de área, en los mismos 4 casos que v11:

  | Caso | v11 | v14 |
  | --- | --- | --- |
  | `c-syn011-gemini` | +26,0 % | +27,7 % |
  | `c-syn011-chatgpt` | +52,0 % | +26,8 % |
  | `c-syn012-chatgpt` | +27,2 % | +27,2 % |
  | `f-s17-document-approval` | +22,6 % | +22,6 % |

- Frente a cada componente (`compare-v9.json`, `compare-v10.json`, `compare-v11.json`): ninguna regresión dura; frente a v11 pasa el filtro.
- Métricas (casos mejor/peor frente a v7): etiquetas sobre formas 7/0, etiquetas sobre líneas 7/1 (la peor, `c-syn012-gemini`, ya lo era en v11), texto cortado 3/0, cruces 5/1, solapes de aristas 5/0, asociaciones largas 5/0; caras mixtas y solapes ambiguos sin cambios (0/0). Empeoran, como se esperaba, la longitud de los flujos (v10 ensancha) y la distancia de etiquetas (v9 las sube).

## Nota del usuario sobre v11, reproducida

En `c-syn015-gemini` (`img/c-syn015-gemini-v7.png` frente a `img/c-syn015-gemini-v14.png`) el carril Requester crece 90 px y los artefactos de arriba no se mueven: la banda no sirve para nada. Se corrige en v15 (`evidence/layout-v15/REPORT.md`) como un cambio aparte.

## Comprobaciones

- v11 y v14 se re-renderizaron tras hacer configurable `harness/v11/lane-room.ts` (opción `keepOnlyHelpfulBands`, neutra en v11): idénticos byte a byte, 56/56.
- Pruebas del lab 8/8; `verify-source` 3319/0.
