# Etapa 8 — candidato v6: v5 afinado con las notas del usuario (2026-09-25)

Petición del usuario tras el voto v4–v5: una iteración más sobre la colocación de artefactos antes de validarla, solo con las notas relacionadas. Ejecución local, sin modelos; v0 intacto (`verify-source` 3319/0).

## Notas usadas (de `evidence/layout-v5/REPORT.md`)

- Asociaciones rectas cuando el artefacto está cerca; codos solo si está lejos («signed documents», último objeto de `canon-3`, «Application form»).
- Más aire: «Civil Registry» un poco a la derecha, para dar espacio a «Register marriage»; «Case Repository» un poco a la izquierda.
- Juntar almacenes u objetos parecidos cercanos («Registro de trazabilidad», «Budget records»).

Las notas sobre etiquetas de eventos (ponerlas encima; «Parts arrive») son de otra idea y quedan para después.

## Cambio de código

El módulo de v5 pasa a ser configurable: `placeArtifactsWith(xml, tuning)`, con `V5_TUNING` como parámetros de v5. Tras el refactor, v5 dio `diagram.bpmn` idéntico en 56/56. v6 (`harness/v6/artifacts.ts`) solo aporta `V6_TUNING`:

| Parámetro | v5 | v6 |
| --- | --- | --- |
| Codo en asociación < 250 px | 60 | **250** |
| Aire: coste por forma a < 12 px de la huella (enlazadas incluidas) | 0 | **100** |
| Cohesión: coste por px hasta otro artefacto del mismo nombre, tipo y pool (tope 350 px) | 0 | **1,5** |

## Ablación sobre el banco (cada ajuste solo, frente a v5)

| Variante | Casos que cambian | Casos con regresión dura | Longitud total de asociaciones |
| --- | --- | --- | --- |
| Codos caros cerca | 5 | 2 (1 defecto cada uno) | ≈ igual |
| Aire como separación obligatoria de 12 px + aglomeración ×2 | 10 | 5 | +15 % |
| Aire como separación obligatoria de 6 px | 6 | 2 | ≈ igual |
| Aire suave (150 por forma, 12 px) | 5 | 3 | +3 % |
| Cohesión 0,5 sin tope | 0 | 0 | — (nunca compensa alargar la asociación) |
| Cohesión 1,5 con tope 350 px | 1 | 0 | ≈ igual |

La separación obligatoria deja artefactos sin sitio válido y los manda al respaldo de v0, que ignora las etiquetas; por eso el aire va como coste suave, con peso 100 (por debajo de cruzar una línea, 150). El peso final no se volvió a iterar.

## Resultados

- 56/56 correctos, XML semántico idéntico, área igual.
- **Frente a v5** (`compare-v5.json`): cambian 7 casos en las métricas y 14 en la imagen. Regresiones duras menores en 4 casos (sobre todo una etiqueta cruzada más: `c-syn011-chatgpt`, `c-syn015-gemini`, `h-ml-06`; `c-syn012-chatgpt` etiqueta sobre forma y texto cortado). Asociaciones +3 % (mediana 99 → 117 px). Cruces 4 mejor / 3 peor.
- **Frente a v4** (`compare-v4.json`): solo 1 caso con regresión dura (`c-syn012-sysv5-gemini`); v5 frente a v4 tenía 2.
- Comprobado en `canon-5`: «Civil Registry» pasa a la derecha de «Register marriage» en lugar de quedar pegado debajo.
- Las métricas no miden lo que piden las notas (asociaciones rectas, aire), así que decide el voto.

## Lote A/B

`skill-runs/layout/ab-v5-v6-20260925/`: 14 parejas (todos los casos cuya imagen cambia, incluidos `canon-5`, `canon-3`, `c-syn015`, `c-syn011` y `planta-residuos`), vista oculta con conmutador M, semilla `v5-v6-20260925`.

## Votación (desciegada el 2026-09-26)

Resumen en `human-votes.json` (A = v5, B = v6). El usuario votó 14/14 sin etiquetas ni notas.

- **v6 10, v5 3, 1 empate.** Tasa de v6 en los 13 decisivos: 0,77 (Wilson 95 %: 0,50–0,92); prueba de signos bilateral p = 0,09. Con este tamaño la preferencia es clara en dirección pero no concluyente; en el lote v4–v5 fue p = 0,02.
- **Efecto por ajuste.** En 7 casos el `diagram.bpmn` de v6 es idéntico byte a byte al de una sola ablación, así que el voto aísla ese ajuste:
  - codos caros cerca (`abl-bend`): v6 3–0 (`h-ml-06`, `c-syn015-gemini`, `canon-3`);
  - aire (`abl-airsoft`, peso 150, que en estos casos coincide con el 100 final): v6 3–0 y 1 empate (`canon-5`, `h-ml-03`, `gemini-04`; empate `canon-2`);
  - resto (ajustes combinados o aire con otro resultado): v6 4, v5 3. **Las tres derrotas de v6 están aquí.**
- Dos de las regresiones duras frente a v5 (una etiqueta cruzada más en `h-ml-06` y `c-syn015-gemini`) salen del ajuste de codos y el usuario prefirió v6 en ambas: la asociación recta pesa más que ese cruce de etiqueta.

### Revisión de las derrotas de v6 (inspección de las imágenes del lote)

- `c-syn012-chatgpt` (p11, la de regresión dura): la anotación «Adjustments require documented justification» sube al borde superior del carril y su texto queda cortado; «Explanation letter» se aleja al extremo derecho y sus asociaciones largas cruzan el diagrama (+20 % de longitud total).
- `c-syn015-chatgpt` (p07): «Signed documents» se aparta de «Record signed documents» y sus dos asociaciones diagonales se cruzan con las de «Contract repository» (+6 % de longitud).
- `planta-residuos` (p04, único caso en que actúa la cohesión): un «Registro de trazabilidad» se mueve hasta el carril Expediciones, a medio camino entre su tarea y el grupo de almacenes, con una asociación diagonal que cruza dos carriles. El tope de 350 px deja el artefacto sin llegar al grupo; la cohesión, tal como está, no produce lo que pedía la nota.

Patrón: el aire aleja el artefacto de su tarea cuando el hueco cercano está ocupado, y el coste de longitud no lo compensa en diagramas densos. Donde hay hueco (casos aislados), el aire gana.

### Limitaciones

- La ablación usó aire 150; v6 usa 100. La coincidencia byte a byte solo vale para los casos marcados en `human-votes.json`.
- Los pesos se eligieron sobre este banco y se votaron sobre los mismos casos (sobreajuste posible).
- La columna «Casos que cambian» de la tabla de ablación cuenta cambios en las métricas. Contando `diagram.bpmn` distinto de v5: codos 8, aire obligatorio 12 px 15, aire 6 px 10, aire suave 11, cohesión 0,5 2, cohesión 1,5 con tope 1; v6 14.

### Conclusión

v6 mejora a v5 en el voto y frente a v4 tiene menos regresiones duras (1 frente a 2). Codos caros cerca: los 3 casos aislados lo prefieren, pese a una etiqueta cruzada más en 2. Aire: bueno cuando hay hueco; necesita un límite para no alejar el artefacto de su tarea. Cohesión: no demostrada (un solo caso, perdido). La decisión sobre el layout por defecto corresponde al usuario.
