# Etapa 8 — candidato v5: colocación de artefactos consciente de las etiquetas (2026-09-25)

v5 = v4 + una sola idea: `placeArtifacts` juzga cada posición por lo que realmente se dibuja. Ejecución local, sin modelos; v0 intacto (`verify-source` 3319/0).

## Diagnóstico de partida (v4, flujos de mensaje ocultos)

Defectos duros más frecuentes tras v4: etiquetas cruzadas por líneas en 21 de 56 casos (objeto de datos × asociación 37, evento × asociación 19, almacén de datos × asociación 16), etiqueta sobre forma en 11 y texto de anotación desbordado. Causa: `placeArtifacts` de v0 busca sitio solo con la caja de la forma. Ignora el nombre del objeto o almacén (bpmn-js lo dibuja debajo, hasta 90 px de ancho y varias líneas), el texto de las anotaciones (alto fijo de 40 px) y las etiquetas externas de los demás elementos; además, la puntuación de las asociaciones solo cuenta cruces con formas.

## Qué cambia

`harness/v5/label-aware-artifacts.ts` es una copia de `render/artifacts.ts` con los cambios marcados `v5:` (diff completo en `artifacts-v0-to-v5.diff`); `harness/v5/artifacts.ts` la encadena con la pasada de bandas de v4. Reglas estrictas:

- **Huella** = forma + nombre estimado (objetos y almacenes); anotaciones con el alto que pide su texto. La huella debe quedar dentro del pool, con 2 px de separación de formas y artefactos, sin tocar flujos ni asociaciones ya trazadas.
- **Coste ponderado**, en píxeles de longitud de asociación: cruzar una forma 1000, tapar o cruzar una etiqueta 300, cruzar una línea 150, codo 60, aglomeración 20 y la longitud tal cual. Las etiquetas de otros elementos, la propia y la del nodo enlazado cuentan.
- La búsqueda estricta explora el doble de anillos.
- **Respaldo:** si no hay sitio válido dentro del pool, el artefacto se coloca exactamente como en v0 (mismos obstáculos, tolerancia y tamaño). Orden de preferencia: dentro/estricto > dentro/v0 > fuera/estricto > fuera/v0.

### Iteraciones antes de votar (todas sobre el banco; registradas por transparencia)

1. Etiquetas como obstáculos absolutos: 5 casos de solape de formas, por la tolerancia de 4 px de v0 y por anotaciones colocadas fuera del pool. Se añadieron la separación de 2 px y el orden de preferencia.
2. El respaldo usaba el nuevo alto de las anotaciones y pisaba etiquetas; se hizo idéntico a v0.
3. +110 cruces de asociaciones (la puntuación de v0 no cuenta líneas): se añadieron los cruces con flujos y asociaciones, primero sumados y luego ordenados detrás de los cruces con formas.
4. Longitud total de asociaciones +63 % (etiquetas absolutas: los artefactos se iban lejos; ninguna métrica lo medía, se midió aparte): se pasó al coste ponderado.
5. La etiqueta del nodo enlazado estaba excluida; se incluyó. La comprobación de «dentro del pool» pasó a usar la huella.

Los pesos se fijaron por razonamiento (defectos de clase dura > legibilidad > longitud), pero se ajustaron mirando este banco: hay riesgo de sobreajuste, y la votación es la comprobación independiente.

## Resultados (`compare-v4.json`)

- 56/56 correctos, XML semántico idéntico; cambian 18 casos; área −4,2 % a 0 %.
- **No pasa el filtro objetivo por 2 casos:** `c-syn011-sysv5-chatgpt` (una asociación atraviesa una anotación) y `c-syn012-sysv5-gemini` (una anotación tapa la etiqueta de un evento: era la opción de menor coste).
- Mejoras (casos mejor/peor): etiquetas cruzadas por líneas 16/0 (de 21 a 14 casos con el defecto), etiqueta sobre forma 3/1, etiqueta sobre etiqueta 2/1, texto de anotación desbordado 9/0, cruces 8/5.
- Coste: solapes de líneas 0/4; longitud total de asociaciones +7 % (mediana 100 → 99 px; 17 asociaciones más de 150 px más largas).
- Medida aparte (no está en el registro de métricas): textos de artefactos fuera de su pool, v0 7, v4 6, **v5 4**.
- Límite visible: en pools estrechos no cabe la huella completa y actúa el respaldo (p. ej. `h-ml-03`, «Modelo de fraude actualizado» queda como en v4).

## Lote A/B

`skill-runs/layout/ab-v4-v5-20260925/`: 19 parejas (todos los casos cuya imagen cambia), vista oculta con conmutador M, semilla `v4-v5-20260925`. Sin votos todavía.

## Votación humana (2026-09-25)

Interrumpida por un corte de luz tras 11 parejas; los votos ya estaban en disco y el lote se reanudó. Resultado (`human-votes.json`): **v5 gana 11, v4 gana 2, empates 6**. Entre los decisivos v5 gana el 85 % (Wilson 95 % [0,58; 0,96]; prueba de signos p ≈ 0,02). v4 gana en `c-syn011-sysv5-chatgpt` (una de las dos regresiones duras) y `f-gemini-04`.

**v5 gana el voto pero no pasa el filtro objetivo (2 casos):** igual que v1, su aceptación depende de la decisión del usuario. El valor por defecto de la skill sigue siendo v4.

### Ideas del usuario en las notas (para candidatos siguientes)

- **Asociaciones rectas cuando el artefacto está cerca** («signed documents», el último objeto de `canon-3`, «Application form»); los codos, solo cuando está lejos.
- **Ajustes finos en horizontal**: «Civil Registry» un poco a la derecha, para dar aire a «Register Marriage»; «Case Repository» un poco a la izquierda.
- **Etiquetas de eventos arriba** cuando abajo chocan, con la misma separación (`canon-3`, `c-syn011`).
- **Mejor sitio para una etiqueta concreta**: «Parts arrive» (`gemini-04`), abajo a la izquierda, junto a «Parts».
- **Agrupar almacenes de datos parecidos** (p. ej., varios «Registro de trazabilidad» en `planta-residuos`). Fusionarlos en uno cambiaría el XML semántico, así que no cabe en esta etapa; sí colocarlos juntos.
