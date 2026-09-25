# Etapa 8 — candidato v1: auto-layout por pool (2026-09-25)

Ejecución local (Windows 11, Node 24.12.0, Playwright 1.60.0, Chromium 148.0.7778.96). Sin llamadas a modelos. v0 no se ha modificado: `smoke/verify-source.mjs` da 3319 archivos y 0 diferencias.

## Qué cambia (idea A del plan)

`bpmn-auto-layout 0.5.0` solo coloca el primer proceso de una colaboración; v0 rellena los demás pools con una fila única en orden topológico (`layout-missing.ts`). v1 da a cada pool su propio pase de `bpmn-auto-layout`:

- cada proceso sin ningún DI se extrae a unas definiciones temporales (con los mensajes, señales y errores compartidos), se sanea con `sanitizeForLayout` y se pasa por `bpmn-auto-layout`; sus formas y aristas se copian al plano de la colaboración;
- lo que siga sin DI (nodos inalcanzables desde un inicio) cae en la fila única de v0, igual que v0 hace con el primer proceso;
- todas las fases posteriores (pools y carriles, enrutado ortogonal, canales, etiquetas, carriles exteriores y artefactos) son las de v0 sin cambios.

Implementación: `tools/layout-lab/harness/v1/`. Es el harness del TFM tal cual (`main.ts` solo importa `apps/tfm-lab/src/headless/main.ts`) más un plugin de Vite que resuelve el `import "./layout-missing.js"` de `packages/bpmn-core/src/render/index.ts` a `per-pool-layout.ts`. No se edita ningún archivo de bpmn-core ni de tfm-lab. Registrado como `v1` en `tools/layout-lab/lib/layouts.mjs`.

## Render del banco

`bench-render --layout v1` → `skill-runs/layout/v1-20260925-b56` (`render-v1.json`): 56/56 correctos en 33 s.

- **XML semántico idéntico** en los 56 casos.
- **Un pool (36 casos):** `diagram.bpmn` y `diagram.png` idénticos byte a byte a v0. El SVG solo difiere por los IDs aleatorios de marcadores, ya documentado en la etapa 5. Es lo esperado: con un solo proceso el módulo nuevo no hace nada.
- **Multi-pool (20 casos):** 19 cambian; `c-syn015-sysv5-gemini-…-r02` sale con un `diagram.bpmn` idéntico byte a byte (no se ha investigado por qué ambos métodos coinciden en ese caso).

## `compare` contra v0 (`compare-v0.json`)

**El filtro objetivo preregistrado no pasa** (`objectiveGatePassed: false`). Las reglas de `config/acceptance.json` no se han tocado.

- Semántica: 0 fallos. Estados: 0 fallos.
- **Regresiones duras:** 17 de 19 casos afectados.
  - `edgeThroughShape` empeora en 16. Por tipo de flujo (`flow-kind-split.json`, lectura *post hoc*, informativa): los flujos de **secuencia** que atraviesan formas bajan de 12 a 1; los de **mensaje** suben de 42 a 115. El usuario recibe los flujos de mensaje ocultos por defecto, pero las métricas usan el layout completo, así que la regla sigue contando.
  - `labelEdgeOverlaps`: con secuencia bajan de 105 a 59; con mensaje suben de 66 a 129.
  - `labelsOnTitleBand` (3 casos) y `shapesOnTitleBand` (2): efecto de `placeArtifacts` y `placeLabels` de v0 sobre pools más compactos. Ejemplo visible: en `h-ml-03-deteccion-fraude` el objeto de datos "Modelo de fraude actualizado" queda sobre la banda de título del carril "Equipo de MLOps"; en `f-gemini-03`, la anotación de "Insured Party" toca la banda.
- **Área:** 14 casos superan la banda del +15 %. Crecimiento en los 19 afectados: mínimo −28 %, mediana +20 %, máximo +46 %. Las ramas pasan a ocupar filas propias en lugar de apretarse en una.
- **Legibilidad** (casos mejor/peor de 19):

  | Métrica | Mejor | Peor |
  | --- | --- | --- |
  | cruces totales | 15 | 1 |
  | cruces secuencia/secuencia | 9 | 1 |
  | aristas de secuencia largas | 16 | 1 |
  | variación de longitud de aristas | 17 | 2 |
  | codos por arista | 15 | 1 |
  | tramos rectos de secuencia | 11 | 2 |
  | desalineación horizontal de mensajes | 10 | 7 |
  | longitud de mensajes | 5 | 12 |
  | solapes de aristas | 4 | 8 |
  | holgura de carriles | 15 | 2 |

Resumen: v1 mejora el flujo de secuencia dentro de cada pool (menos cruces, aristas más cortas y uniformes, casi ninguna secuencia atravesando formas) a cambio de diagramas más altos y de flujos de mensaje más largos que cruzan más formas y etiquetas. Los defectos nuevos en bandas de título vienen de fases posteriores de v0, no del auto-layout.

## Revisión visual rápida (no sustituye la votación)

- `f-gemini-03`: los pools Student e Insured Party dejan de tener ramas y bucles apretados en una fila; las ramas Sí/No quedan en filas separadas y el retorno deja de solaparse con la tarea.
- `h-ml-03-deteccion-fraude`: el pool Banco pasa de una fila con retrocesos cruzados a ramas en filas; los tres pools quedan alineados a la izquierda. Regresión: el objeto de datos del tercer pool, sobre la banda de título.

## Lote A/B para calibración humana

`ab-batch --a v0 --b v1 --count 20 --seed v0-v1-20260925 --view hidden` → `skill-runs/layout/ab-v0-v1-20260925/`: **19 parejas**, todos los casos cuyo PNG oculto difiere (los 19 multi-pool afectados; los de un pool son idénticos y no enseñan nada). Lado izquierdo/derecho aleatorio y ciego; la correspondencia está en `batch.json` y no se debe mirar antes de votar.

Votar: `node tools/layout-lab/layout.mjs vote --batch skill-runs/layout/ab-v0-v1-20260925`.

## Pendiente

- Votos del usuario sobre el lote; después juez Opus 5.5 (`montage` + `judge/judge-prompt.md`, dos órdenes) y `agreement` (kappa ≥ 0,6).
- Decidir con los votos si v1 se acepta pese al filtro objetivo. La regla de `acceptance.json` permite superar el área si el juicio visual lo justifica, pero no las regresiones duras: aceptar v1 exigiría una decisión explícita del usuario sobre cómo contar los flujos de mensaje ocultos, tomada antes de ver los veredictos del juez.
- Candidatos siguientes que atacan justo lo que empeora: B/C (orden y alineación entre pools, para acortar mensajes) y E (etiquetas y artefactos fuera de la banda de título).

## Votación humana (2026-09-25)

El usuario votó las 19 parejas en la página local (`human-votes.json`; votos crudos en `skill-runs/layout/ab-v0-v1-20260925/votes.json`). Desciegado después de votar:

- **v1 gana 17, empates 2, v0 gana 0.** Los empates son `f-pool-map-message-event` y `f-pool-map-missing-message-flow`, los dos casos más pequeños.
- Entre los votos decisivos v1 gana el 100 %: intervalo de Wilson al 95 % [0,82; 1,00]; prueba de signos bilateral p ≈ 1,5·10⁻⁵. Supera el umbral preregistrado del 60 %, que estaba pensado para el juez.
- Motivos marcados en los votos a v1: alineación 6, pools 4, flujo 3, líneas 2.
- Solo hay un votante y el juez todavía no se ha ejecutado, así que aún no se puede calcular el kappa.

Consecuencia: el juicio visual contradice la regla objetiva de las regresiones duras. El usuario prefiere v1 incluso en los casos con más flujos de mensaje que atraviesan formas (con los flujos ocultos no se ven) y con más área.
