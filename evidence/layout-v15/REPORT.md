# Etapa 8 — candidato v15: bandas de v11 solo cuando sirven (2026-09-26)

v15 = v14 con un único cambio, a partir de la nota del usuario sobre v11 en `c-syn015-gemini`: «se ha agrandado innecesariamente el primer lane».

## Diagnóstico

v11 abre una banda bajo la fila del primer nodo de un artefacto sin sitio limpio y vuelve a colocar. En `c-syn015-gemini` el artefacto es «Estimated Budget», pegado al borde superior del pool. Una banda *debajo* de la fila no puede ayudarle: después de abrirla, todos los artefactos quedan exactamente donde estaban (los de debajo, desplazados con la banda) y el carril Requester crece 90 px para nada.

## Cambio

`harness/v11/lane-room.ts` acepta `keepOnlyHelpfulBands` (en v11 y v14, `false`: idénticos byte a byte 56/56). En v15 (`harness/v15/helpful-bands.ts`), una banda se queda solo si **cambia dónde va algún artefacto**. Si todos quedan en su sitio anterior, o en ese sitio desplazado por la banda, se deshace. El informe de colocación de v5 (`ArtifactChoice`) incluye ahora la caja elegida (`bounds`), sin cambiar la colocación.

## Criterios probados y descartados

Se probaron sobre el banco completo y se guardan en `skill-runs/layout/v15tryN-20260926-b56`:

1. **Menos artefactos sin sitio limpio.** Deshace bandas útiles: en `c-syn011` las asociaciones vuelven a ser largas y atraviesan «Register Application» y el gateway (`img/c-syn011-gemini-try1.png` frente a `img/c-syn011-gemini-v14.png`).
2. **Menos formas y etiquetas cruzadas o tapadas por los artefactos.** Ese recuento no ve las asociaciones largas. Deshace aún más bandas y vuelven 4 regresiones duras frente a v14.
3. **Algún artefacto dentro de la banda.** Conserva la de `c-syn015-gemini`, porque sus artefactos ya ocupaban esa franja.
4. Primera versión del criterio final: comparaba cada artefacto solo con su sitio desplazado si estaba bajo el corte, y fallaba en ese mismo caso. Un artefacto sigue a su nodo, que puede quedar al otro lado del corte. Ahora se aceptan las dos posiciones.

## Resultados

Render `skill-runs/layout/v15-20260926-b56`: 56/56, XML semántico idéntico.

- **Frente a v14** (`compare-v14.json`): **pasa el filtro**; solo cambia `c-syn015-gemini`, con 90 px menos de alto (−4,8 % de área) y ninguna métrica peor (`img/c-syn015-gemini-v15.png`).
- **Frente a v7** (`compare-v7.json`): 18 casos cambian, ninguna regresión dura; no pasa la banda de área en los mismos 4 casos que v14 (+22,6 % a +27,7 %). En esos casos las bandas sí mueven artefactos, y el usuario votó v11 8–1 con esas mismas bandas.

## Lote A/B

`skill-runs/layout/ab-v7-v15-20260926/`: 18 parejas, todas las que cambian frente a v7; semilla `v7-v15-20260926`; vista con los mensajes ocultos. Comando de voto:

```powershell
node tools/layout-lab/layout.mjs vote --batch skill-runs/layout/ab-v7-v15-20260926
```

## Votación y decisión

Voto del usuario (2026-09-26; `human-votes.json`): **v15 12, v7 1, 5 empates**; 13 decisivos, prueba de signos bilateral p = 0,003. La única pareja para v7 es `h-ml-06-vision-medica`. Empates: `c-syn015-chatgpt`, `h-ml-01`, `f-s17-document-approval`, `h-ml-02` y `f-canon-1-cheeseburger`. Sin notas; en `c-syn011-chatgpt`, etiquetas y alineación.

**Decisión del usuario: v15 pasa a ser el layout por defecto de la skill** (`skills/bpmn/config/layouts.json`; antes v7). Comprobado después del cambio: un `render-dsl` sin `--layout` de `c-syn015-gemini` da `success` y un `.bpmn` idéntico al de `hidden.bpmn` del banco v15; la paridad con v0 sigue `passed=true` (`skill-runs/parity-20260926-v15default`).

## Corrección tras el voto: flujos sueltos (2026-09-26)

En una generación real con Luna/high (`<repos>/BPMN-output/comparacion-gpt6-luna/high/`), «Desplegar gradualmente», el gateway «¿El despliegue degrada el servicio?» y «Revertir a la versión anterior» quedaron sin conexión: las formas en y = 1132–1212 y sus líneas 90 px más abajo (5 flujos sueltos). v7 y v10 dibujan bien ese DSL; el fallo viene de v11 y lo heredan v14 y v15.

Causa: la banda de v11 desplaza todo lo que queda por debajo de un corte horizontal. El corte se calcula con la fila del artefacto más un margen y puede atravesar una forma de la fila siguiente (aquí, porque una etiqueta de esa fila colgaba dentro del alcance). La forma no se mueve, porque su borde superior está por encima del corte, pero sus flujos, que salen de su centro o de su borde inferior, sí bajan.

Arreglo: opción `safeCut` en `harness/v11/lane-room.ts` (activada en v15 y, por tanto, en v16; desactivada en v11 y v14). El corte nunca atraviesa una forma ni una etiqueta de ningún pool: baja hasta 1 px por debajo de lo que cruzaría.

- El DSL del caso queda en `regression/luna-deploy-disconnected.dsl`. Con v15 corregido: 64 flujos, 0 sueltos (antes 5).
- Banco: v14, v15 y v16 re-renderizados con el arreglo, **idénticos byte a byte 56/56**. El arreglo solo actúa donde antes se rompía algo, así que los votos siguen siendo válidos.
- Ninguna métrica del banco detectaba flujos sueltos; propuesta pendiente: añadir una (`disconnectedFlows`) y una comprobación en la skill antes de entregar.

## Comprobaciones

- v7, v11 y v14 re-renderizados tras los cambios en los módulos compartidos: idénticos byte a byte, 56/56.
- Un control de v7 lanzado mientras se editaba un módulo compartido dio 1 fallo («Execution context was destroyed»: Vite recargó a mitad). Se repitió sin tocar nada y salió idéntico. Es el aviso ya anotado en `CONTINUAR.md`.
- Pruebas del lab 8/8; `verify-source` 3319/0.
