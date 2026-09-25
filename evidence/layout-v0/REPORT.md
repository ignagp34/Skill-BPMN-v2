# Etapa 8 — fase 0 y herramientas del banco de layout (2026-09-25)

Ejecución local (Windows 11, Node 24.12.0, Playwright 1.60.0, Chromium 148.0.7778.96). Sin llamadas a modelos. El layout del TFM (v0) no se ha modificado: `smoke/verify-source.mjs` da 3319 archivos y 0 diferencias.

## Fase 0: flujos de mensaje ocultos por defecto

- `render` y `render-dsl` aceptan `--message-flows hidden|shown`, con `hidden` por defecto. El layout se calcula con los flujos de mensaje. Después se quitan del BPMN (`messageFlow` y su `BPMNEdge`) con la misma lógica que `stripMessageFlows` de `apps/company-web/src/ui/app.ts`, ejecutada en la página del harness. El SVG y el PNG se reexportan desde ese BPMN con `renderArtifactsFromLayout` del harness. El BPMN resultante se reimporta y pasa las mismas comprobaciones que antes.
- Si hay flujos ocultos, la ejecución guarda el layout completo en `layout-full.bpmn`. `evaluate` lo usa en lugar de `diagram.bpmn`, de modo que las métricas TFM-eval siguen viendo los flujos de mensaje. Se ha comprobado con una ejecución: el staging contiene el `messageFlow`.
- Resultado en `pool-map-message-event`:
  - `diagram.bpmn` sin `messageFlow`;
  - `layout-full.bpmn` idéntico byte a byte al `diagram.bpmn` con `shown`;
  - `semantic.bpmn` idéntico;
  - PNG de las mismas dimensiones (522×618);
  - posiciones iguales, sin la línea discontinua.
- Paridad con `--message-flows shown` (`parity-phase0-shown.json`):
  - 12/12 casos pasan, byte a byte frente al runner original ejecutado el mismo día;
  - fallos inyectados correctos;
  - flujo prepare → reparar correcto.
  - `tfm-history.mjs` también usa `shown`.
- `harness.mjs` pasa a exponer `HarnessSession`: un Vite y un Chromium para muchos renders. `renderWithHarness` mantiene su comportamiento. Cada versión de layout indica su app y página del harness; v0 es `apps/tfm-lab` + `/index.headless.html`.

## Fase 1: banco `layout-bench`

- `tools/layout-lab/bench/`: `manifest.json` y 50 DSL copiados literalmente, con su SHA-256. Cada lectura verifica los hashes y el banco nunca se regenera.
- Candidatos:
  - 351 del corpus del TFM (estado histórico `success` o `success_with_warnings`, con `diagram.bpmn` guardado), con características leídas de ese BPMN;
  - 18 fixtures únicos, con características sacadas de un render v0.
- Selección voraz por déficit relativo de cuotas, determinista, con un máximo de 5 por proceso. El resultado cubre 18 procesos del corpus y 18 fixtures.
- **Cobertura real** (seleccionados/disponibles):

  | Categoría | Seleccionados | Disponibles |
  | --- | --- | --- |
  | 1 pool sin carriles | 15 | 135 |
  | 1 pool con carriles | 21 | 174 |
  | 2 pools | 12 | 58 |
  | **3 pools** | **0** | **0** |
  | 4+ pools | 2 | 2 (gemini-03, planta-residuos) |
  | Flujos de mensaje | 12 | 32 |
  | Eventos de borde | 6 | 32 |
  | Bucles | 8 | 21 |
  | ≥ 4 gateways | 18 | 90 |
  | Artefactos | 16 | 71 |
  | **Subprocesos** | **0** | **0** |
  | Etiquetas largas | 14 | 75 |
  | Tamaño pequeño / medio / grande | 12 / 28 / 10 | — |

- **Huecos:** no existe ningún DSL válido con exactamente 3 pools ni con subprocesos en el corpus ni en los fixtures. Los 3 pools se cubren con la ampliación descrita más abajo; los subprocesos siguen sin cubrir.
- Render v0 del banco: 50/50 correctos en 28 s. Los 32 casos del corpus dan un `diagram.bpmn` idéntico al guardado en el TFM, salvo el CRLF de Git. Un segundo render da métricas idénticas en los 50 casos (`determinism-rerun.json`: 0 casos afectados).

## Fase 2: métricas (`layout-metrics`)

Las métricas se calculan del DI del layout completo y de las **cajas reales de texto**. Esas cajas las mide Chromium sobre el SVG exportado (`getBBox` + CTM, mismas fuentes que el PNG). Las etiquetas externas y el texto de las anotaciones se tratan como texto libre. Hay 35 métricas en un registro (`tools/layout-lab/lib/metrics.mjs`):

- **Restricciones duras:**
  - solapes forma–forma;
  - aristas que atraviesan formas;
  - solapes de etiqueta con forma, etiqueta o arista;
  - etiquetas y formas sobre la banda de título de un pool o carril;
  - formas fuera de su carril;
  - texto recortado.
- **Legibilidad:**
  - cruces por tipo (secuencia/secuencia, secuencia/mensaje, mensaje/mensaje);
  - aristas superpuestas;
  - codos por arista;
  - flujos de secuencia rectos y hacia delante;
  - longitud y coeficiente de variación de las aristas;
  - tramos largos;
  - longitud y desalineación horizontal de los mensajes;
  - distancia de cada etiqueta a su elemento;
  - anchos y bordes de pools.
- **Compacidad (en banda):**
  - área y área por nodo;
  - proporción y desviación frente a 16:9;
  - ocupación;
  - holgura de carriles.

Validación manual:
- En `f-gemini-03`, cada defecto marcado corresponde a algo visible: 4 etiquetas de evento sobre el título del carril, anotaciones recortadas y anotaciones sobre la banda.
- En `c-syn012-…-gemini-…-r03`, los objetos de datos pisan tareas y hay texto recortado en «Review Invoice…».
- Las pruebas unitarias (`node --test tools/layout-lab/test/*.test.mjs`) pasan 6/6.

### Diagnóstico de v0 (casos afectados de 50, banco inicial; `metrics-v0-bench50.json`)

| Defecto | Casos | Total |
| --- | --- | --- |
| Tramos de secuencia largos (> 3 × mediana y > 200 px) | 39 | 169 |
| Etiquetas sobre la banda de título de pool o carril | 32 | 53 |
| Aristas superpuestas (> 5 px colineales) | 30 | 156 |
| Cruces de aristas | 28 | 509 |
| Etiqueta atravesada por una arista | 23 | 207 |
| Arista que atraviesa una forma | 10 | 54 |
| Etiqueta sobre una forma | 10 | 23 |
| Texto recortado | 9 | 12 |
| Etiqueta sobre etiqueta | 8 | 11 |
| Solape forma–forma | 3 | 3 |
| Forma sobre banda de título | 2 | 3 |
| Forma fuera de su carril | 0 | 0 |

Valores por nodo de flujo, 1 pool (36 casos) frente a 2 o más pools (14 casos):

| Métrica | 1 pool | 2+ pools |
| --- | --- | --- |
| Cruces | 0,22 | 0,86 |
| Etiqueta atravesada por arista | 0,09 | 0,35 |
| Arista a través de forma | 0,002 | 0,116 |
| Aristas superpuestas | 0,07 | 0,27 |

- En multi-pool, la desalineación horizontal media emisor–receptor de un mensaje es de 762 px y la dispersión de bordes de pool, de 1365 px.
- Los diagramas de 1 pool son muy apaisados: proporción media 3,0 frente al objetivo de 16:9 (1,78).

**Lectura:**
- Los peores defectos se concentran en los diagramas multi-pool, lo que confirma el orden del plan: idea A primero y luego B/C.
- La banda de título es el defecto duro más frecuente también en 1 pool: los eventos de inicio pegados al borde izquierdo del carril sacan la etiqueta hacia el título. Es la idea E y un candidato barato.
- `planta-residuos` (8 pools, 110 nodos) acumula muchos defectos y pesa en los totales; por eso se leen también los casos afectados.

## Fase 3: herramientas de evaluación visual (sin lote real todavía)

- `ab-batch` crea un lote ciego:
  - misma pareja de casos con los dos layouts;
  - lado aleatorio con semilla;
  - por defecto la vista con los flujos ocultos (lo que ve el usuario);
  - solo casos cuyas imágenes difieren.
- `vote` levanta un servidor efímero en 127.0.0.1 y abre el navegador. La página:
  - muestra ambas imágenes a la misma escala, lado a lado o apiladas según cuál muestre más;
  - vota con ← / → / ↓ (o E);
  - marca con 1–6 el criterio de la rúbrica y admite una nota con N;
  - vuelve atrás con ↑;
  - hace zoom 1:1 con Z.
  
  Cada voto se escribe al instante en `votes.json` (renombrado atómico). El lote se reanuda en la primera pareja sin votar. Con «Terminar» el servidor se cierra. El navegador solo recibe los lados (izquierda/derecha); la correspondencia con las variantes queda en el servidor.
- `montage` genera, por pareja, un PNG con «Diagrama 1» y «Diagrama 2» en ambos órdenes para el juez. `judge/judge-prompt.md` es el prompt fijo del juez (Opus 5.5).
- `agreement` resuelve los dos órdenes (si no coinciden, cuenta como empate) y calcula el acuerdo bruto, la kappa de Cohen y el sesgo de posición.
- Probado de extremo a extremo con un lote de humo v0 contra v0 (5 parejas idénticas):
  - votos, notas, etiquetas, empate, volver atrás, recarga con reanudación y cierre;
  - montajes;
  - kappa comprobada a mano (0,6875) con veredictos **sintéticos**, solo para probar el código.
- No hay todavía lote de calibración real: requiere un candidato distinto de v0.

## Ampliación del banco: 6 procesos de IA con 3 pools (2026-09-25)

A petición del usuario se añadieron 6 DSL escritos a mano, sin modelo, en `tools/layout-lab/fixtures/ai-3pools/`, todos con 3 pools y temática de IA:

| Caso | Tareas | Nodos | Qué cubre |
| --- | --- | --- | --- |
| clasificador de imágenes | 11 | 23 | bucle de reentrenamiento, datos, anotación |
| fine-tuning de un LLM | 13 | 29 | paralelo, evento de borde no interruptor (48 h), bucle |
| detección de fraude | 11 | 31 | gateway de eventos con temporizador, data store, anotación, inicio por temporizador |
| deriva de datos | 8 | 20 | inicio por temporizador, dos decisiones |
| chatbot RAG | 10 | 23 | paralelo, bucle de evaluación, etiquetas largas |
| visión médica | 12 | 27 | evento de borde de error con reintento, fin por error |

- Todos quedan por debajo de 20 actividades (entre 8 y 13 tareas).
- Los seis compilan con v0 sin errores ni advertencias. Se revisaron visualmente y la semántica es la pretendida.
- En la primera versión hubo dos defectos del DSL, corregidos antes de añadirlos:
  - en fine-tuning, el carril del evento de borde heredaba otro pool;
  - en el chatbot RAG, los fragmentos `...` generaban un inicio implícito.
- Se añadieron con el comando nuevo `bench-add`, que no toca los casos existentes, exige un render v0 válido y registra la ampliación en `manifest.additions`. Es idempotente: repetirlo rechaza los 6.
- El banco pasa a tener **56 casos**: 3 pools cubiertos con 6/6, multi-pool 20 y flujos de mensaje 18.
- Render v0 del banco ampliado: 56/56 correctos. Diagnóstico en `metrics-v0.json`:

  | Defecto | Casos |
  | --- | --- |
  | Tramos largos | 45 |
  | **Etiquetas sobre la banda de título** | **38** |
  | Cruces | 34 |
  | Aristas superpuestas | 34 |
  | Etiqueta atravesada por arista | 29 |
  | Etiqueta sobre forma | 12 |
  | Arista a través de forma | 11 |
  | Etiqueta sobre etiqueta | 10 |
  | Texto recortado | 10 |
  | Solape forma–forma | 3 |
  | Forma sobre banda | 2 |

- Los seis casos nuevos repiten el patrón multi-pool:
  - una etiqueta de evento de inicio sobre la banda de título en cada pool (3 por caso);
  - desalineación media de los mensajes entre 338 y 638 px;
  - dispersión de bordes de pool entre 924 y 1522 px.
