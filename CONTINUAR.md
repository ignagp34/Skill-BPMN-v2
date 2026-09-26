# Resumen para continuar — 2026-09-26 (etapa 8: v7 por defecto; candidatos v8–v12 pendientes de voto)

Lee primero `AGENTS.md` (única fuente de instrucciones; `CLAUDE.md` solo redirige). Repositorio `ignagp34/Skill-BPMN-v2`, rama `main`, clon en `C:/Repositorios/Skill BPMN v2/Skill-BPMN-v2`. El original `BPMN-DSL-Monorepo` sigue protegido. **Nunca push.** Commits locales autorizados.

## Contexto en una línea

Etapa 8 = mejorar el layout sin cambiar el DSL ni el XML semántico. Cada idea es una versión nueva (`skills/bpmn/config/layouts.json`, único registro; harness en `tools/layout-lab/harness/vN/`). Se compara en el banco de 56 DSL con `compare` (reglas en `tools/layout-lab/config/acceptance.json`) y con votación A/B del usuario (página local, tecla M para ver u ocultar mensajes). Juez Opus aplazado por decisión del usuario.

## Estado de las versiones

| Versión | Idea | Estado |
| --- | --- | --- |
| v0 | Layout del TFM | Congelado; la paridad y el corpus lo usan siempre (`--layout v0`). |
| v1 | Auto-layout por pool | Aceptado por voto (17–0). |
| v2 | Orden vertical de pools | Base; empate con v1 en su único caso. |
| v3 | Alineación horizontal entre pools | Perdió en las dos vistas. El usuario propuso C′ (alinear columnas con huecos), sin hacer. |
| v4 | Bandas de título despejadas | Filtro y voto (16–0); fue el defecto del 25/09 al 26/09. |
| v5 | Artefactos conscientes de las etiquetas | Voto 11–2 (6 empates); no pasa el filtro por 2 casos; el usuario pidió otra iteración antes de validarlo. |
| v6 | v5 afinado con las notas del usuario | Voto 10–3 (1 empate) sobre v5; frente a v4, 1 caso con regresión dura. Fue el defecto el 26/09 hasta v7. |
| v7 | Ancho común de pools y carriles que llenan el pool (E + F) | Pasa el filtro; voto 16–6 sobre v6. **Layout por defecto de la skill desde el 2026-09-26** (decisión del usuario). `evidence/layout-v7/REPORT.md`. |
| v8 | C: artefactos con alcance limitado, sin cohesión | 5 casos; falla el filtro por 1 etiqueta. Pendiente de voto. |
| v9 | G: etiquetas de eventos encima cuando abajo chocan | 7 casos; pasa el filtro. Pendiente de voto. |
| v10 | D: ancho de tarea según su palabra más larga | 11 casos; pasa el filtro. Pendiente de voto. |
| v11 | B: hacer sitio a los artefactos en el carril | 10 casos; mejor en artefactos; falla por área (+23 a +52 % en 4). Pendiente de voto. |
| v12 | A: bpmn-auto-layout corregido (addAfter y procesos sin inicio) | 7 casos; cruces 351 → 262; falla por área (`find-a-job` +200 %). Pendiente de voto. |

Commits: `2291771` (v1–v4, v4 por defecto), `771e704` (v5) y el de v6 (2026-09-26).

## Candidatos v8–v12 (2026-09-26, trabajo autónomo autorizado)

Resumen con imágenes antes/después: `evidence/layout-candidates-20260926/SUMMARY.md`; un informe por candidato en `evidence/layout-vN/REPORT.md`. Cada uno es independiente sobre v7 para votarlos por separado; son compatibles entre sí (tocan fases distintas).

Siguiente paso: el usuario vota los 5 lotes `skill-runs/layout/ab-v7-vN-20260926` (41 parejas; comando en el resumen). Después, desciegar y analizar cada lote como `evidence/layout-v7/human-votes.json`, decidir qué se combina, construir la combinación como versión nueva, renderizarla y compararla con v7 antes de proponerla como defecto. Si v12 gana, compactar la altura de los carriles (quedan altos).

Comprobaciones hechas: v6 y v7 re-renderizados idénticos byte a byte tras tocar el módulo de artefactos y la configuración compartida; pruebas del lab 8/8; `verify-source` 3319/0. Commits `7253888` (código) y el de la evidencia.

## Votos v5–v6 analizados (2026-09-26)

`evidence/layout-v6/human-votes.json` y sección «Votación» de `evidence/layout-v6/REPORT.md`.

- v6 10, v5 3, 1 empate; decisivos 0,77 (Wilson 0,50–0,92), signos p = 0,09. Sin notas ni etiquetas del usuario.
- En 7 casos v6 es byte a byte igual a una ablación de un solo ajuste: codos 3–0, aire 3–0–1. Las 3 derrotas son casos densos: el aire aleja el artefacto de su tarea (`c-syn012-chatgpt`, con texto de anotación cortado en el borde del carril; `c-syn015-chatgpt`) y el único caso de cohesión (`planta-residuos`, almacén a medio camino en otro carril).
- Siguiente iteración posible (idea C, antes llamada «v7»): codos caros cerca + aire con límite de distancia a su tarea; cohesión fuera o con otro diseño.

## Experimento v6 — qué hay

- **Código:** `tools/layout-lab/harness/v6/` (`artifacts.ts` con `V6_TUNING`). El módulo de v5 (`harness/v5/label-aware-artifacts.ts`) se hizo configurable (`placeArtifactsWith`, `V5_TUNING`, campos nuevos `bendNear/nearLength/air/airMargin/cohesion/cohesionRadius`, todos neutros en v5). Verificado: v5 da `diagram.bpmn` idéntico en 56/56 tras el refactor. v6 registrado en `layouts.json` (defecto: v6).
- **Evidencia:** `evidence/layout-v6/REPORT.md` (notas usadas, parámetros, tabla de ablación, métricas frente a v5 y v4), `compare-v5.json`, `compare-v4.json`, `metrics.json`, `render-v6.json`.
- **Render:** `skill-runs/layout/v6-20260925-b56` (56/56). Ablaciones en `skill-runs/layout/abl-*`; sus harness temporales se borraron (`harness/_ablation`), así que no se pueden regenerar sin rehacerlos.
- **Votación:** `skill-runs/layout/ab-v5-v6-20260925/` (A = v5, B = v6), analizada arriba.

## Pendiente

1. Hecho (2026-09-26): v6 fue el defecto y después v7, ambos por decisión del usuario. Volver a otra versión = editar `default` en `layouts.json`; la paridad sigue fijada en v0.
2. Hecho (2026-09-26, commit `6e0b868`): 5 métricas de artefactos en `metrics.mjs` (`assocLengthMean`, `assocBendsPerEdge`, `bentNearAssociations`, `longAssociations`, `artifactTextOutsidePool`), en el grupo de legibilidad: el filtro duro no cambia. Medidas en v0/v4/v5/v6 en `evidence/layout-v6/artifact-metrics.json` (v6: codos cerca 13 → 1 frente a v5, asociaciones largas 37 → 41). Los `compare-*.json` anteriores no se regeneraron.
3. Revisión visual de v6 con capturas y propuestas A–G: `evidence/layout-review-20260926/REVIEW.md`. E+F → v7 (defecto); A, B, C, D y G → v12, v11, v8, v10 y v9, pendientes de voto.
4. Si se itera, una idea cada vez y con ablación conservada en el repositorio, no en `$TMP`.

## Mejora potencial de artefactos: idea C (apuntada por el usuario; se llamó «v7» antes de que ese número pasara al candidato de marcos)

Artefactos, a partir del voto v5–v6: mantener los codos caros en asociaciones cercanas; mantener el aire pero con un límite de distancia a su tarea (en casos densos alejaba el artefacto: `c-syn012-chatgpt`, `c-syn015-chatgpt`); quitar la cohesión o rediseñarla (en `planta-residuos` deja el almacén a medio camino, en otro carril). Métricas de aceptación: `longAssociations`, `bentNearAssociations`, `assocLengthMean`. Es la propuesta C de la revisión.

## Ideas pendientes (del usuario y de la revisión del 26/09)

- Propuestas A–G de `evidence/layout-review-20260926/REVIEW.md`: capas por flujo en cada pool (gateways empujados al final), crecer el carril para hacer sitio a los artefactos, idea C de artefactos, ancho de tarea según su palabra más larga, ancho común de pools, carriles que llenan el pool, etiquetas de eventos arriba.

- Etiquetas de eventos encima cuando abajo chocan; «Parts arrive» (`gemini-04`) abajo a la izquierda, junto a «Parts».
- C′: alinear columnas entre pools insertando huecos dentro de cada pool.
- Agrupar almacenes de datos parecidos: fusionarlos cambiaría el XML semántico (fuera de alcance); colocarlos juntos está en v6.
- Carriles estrechos: el respaldo de v0 deja objetos sobre la línea entre carriles (`h-ml-03`).

## Comandos

```sh
L="node tools/layout-lab/layout.mjs"
$L bench-render --layout vN --out skill-runs/layout/vN-<fecha>-b56
$L metrics --render skill-runs/layout/vN-<fecha>-b56
$L compare --base <render base> --candidate <render candidato>
$L ab-batch --a <base> --b <candidato> --out skill-runs/layout/ab-<lote> --count 20 --seed <semilla>
$L vote --batch skill-runs/layout/ab-<lote>
node --test tools/layout-lab/test/*.test.mjs
node smoke/verify-source.mjs
node tools/skill-parity/parity.mjs      # paridad con v0
```

Notas prácticas: en Windows, `ERR_NO_BUFFER_SPACE` al abrir la página del harness es transitorio (repetir el render). Varios archivos usan CRLF: editar con normalización de fin de línea.

---

# Resumen anterior — 2026-09-25 (etapa 8: candidatos v2 a v6)

- Decisiones del usuario: v1 aceptado como base por su voto; juez aplazado; flujos de mensaje ocultos fuera de las reglas duras (`acceptance.json`); una idea por candidato.
- v2 (B, orden de pools): solo cambia planta-residuos, mejora sin regresiones. v3 (C, alineación entre pools): mensajes mucho más cortos, pero 1 regresión dura (placeArtifacts) y área +26/45/51 % en 3 casos. Evidencia `evidence/layout-v2/` y `evidence/layout-v3/`.
- Votado `ab-v2-v3-20260925` con los mensajes ocultos: v2 15/15. El usuario pide no descartar v3 por eso: la página de votación tiene ahora un conmutador M (ver u ocultar los flujos de mensaje).
- Votado `ab-v2-v3-shown-20260925` con los mensajes visibles: v2 12, v3 3. El usuario propone C′: alinear columnas entre pools insertando huecos, manteniendo las entradas a la izquierda.
- v1–v2 (planta-residuos): empate; v2 es la base.
- v4 = v2 + E1 (bandas de título despejadas): pasa el filtro; etiquetas/formas en banda → 0 casos, área +1,7 % mediana. Voto: v4 16, empates 4, v2 0 → aceptado; es la base actual. `evidence/layout-v4/`.
- v4 es el layout por defecto de la skill (aprobado por el usuario; `config/layouts.json`); `--layout v0` = TFM; la paridad usa v0 y pasa.
- v5 (artefactos conscientes de las etiquetas) hecho: mejora etiquetas cruzadas y texto desbordado, 2 regresiones duras; voto: v5 11, v4 2, 6 empates (`evidence/layout-v5/`); pendiente que el usuario decida si pasa a ser el defecto. Commit de v1–v4 y v4 por defecto: 2291771 (sin push).
- v6 = v5 afinado con las notas sobre artefactos (codos caros cerca, aire suave, cohesión): lote `ab-v5-v6-20260925` (14) pendiente de voto (`evidence/layout-v6/`).
- Siguiente: voto v5–v6 y decisión sobre el defecto (v4, v5 o v6); ideas del usuario tras v5 (asociaciones rectas si el artefacto está cerca, etiquetas de eventos arriba, ajuste fino horizontal, agrupar almacenes parecidos); C′ (propuesta del usuario: alinear columnas entre pools con huecos) o la etiqueta de los carriles estrechos (el respaldo de v5 deja objetos sobre la línea entre carriles).

---

# Resumen anterior — 2026-09-25 (etapa 8: candidato v1)

Lee primero `AGENTS.md` (única fuente de instrucciones). Repositorio `ignagp34/Skill-BPMN-v2`, rama `main`. Esta sesión no ha hecho commits.

## Hecho en esta sesión

Evidencia en `evidence/layout-v1/REPORT.md`.

- **v1 = auto-layout por pool** en `tools/layout-lab/harness/v1/`: el harness del TFM sin cambios más un plugin de Vite que resuelve el `./layout-missing.js` de `render/index.ts` a `per-pool-layout.ts`. Registrado en `lib/layouts.mjs`. v0 intacto (`verify-source` 3319/0). Pruebas del lab 7/7.
- Render `skill-runs/layout/v1-20260925-b56`: 56/56, XML semántico idéntico; los 36 casos de un pool, idénticos byte a byte a v0.
- `compare`: **no pasa el filtro preregistrado**. Regresiones duras en 17 casos, casi todas de flujos de mensaje (atraviesan formas 42 → 115; los de secuencia 12 → 1), y 14 casos por encima de +15 % de área. Mejoran cruces (15/19), aristas largas (16/19) y codos (15/19). Nuevos defectos de banda de título vienen de `placeArtifacts`/`placeLabels` de v0.
- Lote A/B `skill-runs/layout/ab-v0-v1-20260925/` (19 parejas, vista oculta, semilla `v0-v1-20260925`). Votado por el usuario: **v1 17, empates 2, v0 0** (`evidence/layout-v1/human-votes.json`).

## Siguiente

1. Hecho: votos del usuario (v1 17 / empate 2 / v0 0).
2. Juez Opus 5.5 con `montage` y `judge/judge-prompt.md` (dos órdenes) → `agreement`.
3. Decidir con el usuario, antes de ver al juez, cómo cuentan los flujos de mensaje ocultos en las reglas duras; hoy cuentan.
4. Candidatos siguientes: B/C (orden y alineación entre pools) y E (etiquetas/artefactos fuera de la banda de título).

---

# Resumen para continuar — 2026-09-25 (etapa 8: fase 0 y herramientas de layout)

Lee primero `AGENTS.md` (única fuente de instrucciones). Repositorio `ignagp34/Skill-BPMN-v2`, rama `main`. El original sigue protegido. Esta sesión no ha hecho commits.

## Hecho en esta sesión

Evidencia en `evidence/layout-v0/REPORT.md`.

- **Fase 0.** Los flujos de mensaje están ocultos por defecto en `render` y `render-dsl` (BPMN, SVG y PNG); `--message-flows shown` da la salida del TFM. Con flujos ocultos se guarda `layout-full.bpmn`, que es lo que evalúa `evaluate`. La paridad (12/12) y `tfm-history` se ejecutan con `shown`. `verify-source` da 3319/0 y `doctor` ok.
- **`harness.mjs`.** Expone `HarnessSession` (un Vite y un Chromium para muchos renders) y acepta la app o página de harness de cada versión de layout.
- **`tools/layout-lab/`** (ver su README). CLI `layout.mjs` con `bench-select`, `bench-render`, `metrics`, `compare`, `ab-batch`, `vote`, `montage` y `agreement`. Pruebas: `node --test tools/layout-lab/test/*.test.mjs` (6/6).
  - Banco de 56 DSL: 32 del corpus, 18 fixtures y 6 procesos de IA con 3 pools escritos a mano (`fixtures/ai-3pools/`, añadidos con `bench-add`). Siguen sin cubrir los subprocesos. Render v0 de referencia: `skill-runs/layout/v0-20260925-b56`.
  - 35 métricas; el texto se mide en Chromium.
  - Diagnóstico de v0: los peores defectos están en multi-pool (4× cruces por nodo y mensajes desalineados 762 px de media). El defecto duro más frecuente son las etiquetas sobre la banda de título de pool o carril (38/56 casos).
  - Página de votación local probada de extremo a extremo con un lote de humo v0 contra v0. No hay lote real.

## Siguiente

1. Primer candidato **v1**: auto-layout por pool (idea A), sustituyendo `layout-missing.ts` para los pools 2+. Hace falta un harness propio (app o página nueva que componga las fases de bpmn-core con el cambio), registrado en `tools/layout-lab/lib/layouts.mjs`. No se toca v0.
2. `bench-render` v1 → `compare` contra v0 (reglas en `config/acceptance.json`) → `ab-batch` de ~20 parejas → el usuario vota con `vote` → juez Opus 5.5 con `montage` y `judge/judge-prompt.md` → `agreement`.
3. Un candidato barato aparte: etiquetas fuera de la banda de título (idea E).

---

# Resumen para continuar — 2026-09-25 (fin de sesión)

Lee primero `AGENTS.md` (única fuente de instrucciones; `CLAUDE.md` solo redirige y los cambios pedidos sobre él van a `AGENTS.md`). Repositorio `ignagp34/Skill-BPMN-v2`, rama `main`, clon en `C:/Repositorios/Skill BPMN v2/Skill-BPMN-v2`. El original `BPMN-DSL-Monorepo` sigue protegido.

## Qué hay hecho

- **Skill** `skills/bpmn/`, instalada en Claude Code. `~/.claude/skills/bpmn` es un enlace (junction) a esa carpeta (nombre corto `bpmn` desde el 2026-09-26; la antigua `/bpmn` se borró).
- **CLI** `scripts/bpmn.mjs`: `prepare`, `render`, `repair-prompt`, `fail`, `render-dsl`, `evaluate`, `sync-agents`, `doctor`. Organización SOLID: `scripts/commands/` y `scripts/lib/`.
- **Fidelidad al TFM:** usa el harness del TFM sin cambios y reproduce 351/351 experimentos del corpus (`evidence/skill-stage2-5/`). La batería `tools/skill-parity/parity.mjs` pasa entera.
- **Generador por host**, definido solo en `config/generators.json`:
  - ChatGPT/Codex/Work → `gpt-5.6-luna` high;
  - Claude → `claude-opus-5-5` low, subagente `bpmn-dsl-generator` (plantilla en `templates/`, se instala con `sync-agents --target <proyecto o ~>`);
  - resto → el modelo de la conversación.
  - Sin API keys.
- **Traspaso al generador por archivo:** `prepare`/`repair-prompt` devuelven `handoff.message`; el generador lee `input_prompt.md` y escribe `reply-0N.txt`. Arreglo del primer uso real, en el que el subagente sin herramientas se negó.
  - Mecanismo verificado con un agente Opus genérico.
  - Sigue pendiente la generación con el propio `bpmn-dsl-generator`: hay que abrir una sesión nueva para que cargue la definición corregida (Read, Write).
  - Hay copias del subagente en `~/.claude/agents`, en `Skill-BPMN-v2/.claude/agents` y en la carpeta padre; `doctor` las comprueba todas.
- **Deriva del PNG:** el PNG del baseline del 22/09 ya no se reproduce byte a byte (raster). Se compara con `tools/skill-parity/pngdiff.mjs`.

## Siguiente trabajo: etapa 8, mejora del layout

Plan en `plans/layout-iteracion-1.md`. Decisiones del usuario:
- flujos de mensaje ocultos por defecto y **quitados también del `.bpmn`**;
- proporción como ahora y, si hace falta un objetivo, **16:9**;
- calibración humana con una **página local de votación A/B** servida por el CLI en 127.0.0.1: votos con teclado guardados al instante en JSON y lotes reanudables. No usar Artifacts de claude.ai (serían demasiados). Sin abrir archivos a mano;
- juez visual **Opus 5.5**;
- **se puede cambiar todo el layout mientras el DSL y su interpretación (XML semántico) no cambien**; v0 (layout del TFM) queda seleccionable para comparar.

Orden propuesto:
1. Fase 0: `--message-flows hidden|shown`, oculto por defecto, reutilizando `stripMessageFlows` de `company-web/src/ui/app.ts` y reexportando SVG/PNG con `renderArtifactsFromLayout`. La paridad y el corpus deben ejecutarse con `shown`.
2. Banco `layout-bench` (~50 DSL estratificados).
3. `layout-metrics` y diagnóstico de v0.
4. Montajes A/B y página de votación.
5. Primera mejora: auto-layout por pool, sustituyendo `layout-missing.ts` para los pools 2+.

Pendientes aparte: generación real con Luna/high en ChatGPT/Codex, prueba en Work web, Bizagi y paquete autocontenido del motor.

---

# Estado anterior — 2026-09-25 (etapas 2, 4 y 5)

Skill en `skills/bpmn/` (CLI `scripts/bpmn.mjs`), paridad y fallos en `tools/skill-parity/`, evidencia en `evidence/skill-stage2-5/REPORT.md`. Instrucciones únicas en `AGENTS.md` (`CLAUDE.md` solo redirige). Generador por host solo en `skills/bpmn/config/generators.json` (ChatGPT: Luna/high; Claude: Opus 5.5/low vía `.claude/agents/bpmn-dsl-generator.md`, regenerado con `sync-agents`; otros: el modelo de la conversación; sin API keys). Skill = motor del TFM: 351/351 experimentos del corpus reproducidos. Siguiente: primera generación real (reiniciar Claude Code para cargar el subagente), prueba en Work web y paquete autocontenido. Ojo: el PNG del baseline del 22/09 ya no se reproduce byte a byte en esta máquina (deriva de raster documentada); usar `tools/skill-parity/pngdiff.mjs` para compararlo.

---

# Estado anterior — etapa 1 local completada

Actualización del usuario (2026-09-22): autorizado el commit local de la etapa 1 en `Skill-BPMN-v2`. Prevalece sobre la indicación anterior de no hacer commits. Sigue sin autorizarse push; el repositorio original permanece protegido.

Trabajar en este repositorio `Skill-BPMN-v2`; no hacer push ni commits. El origen sigue protegido. Leer AGENTS.md y baseline-stage1/REPORT.md. Baseline local congelado: diez diagramas y dos errores esperados; build correcto; core 167/168 con fallo previo, tfm 37/37, pytest 67/67. Paquete portable en deliverables/bpmn-stage1-portable.zip y su SHA-256; instrucciones smoke/README.md. Probado desde carpeta limpia local, con paridad BPMN/PNG y SVG normalizado.

Siguiente paso prioritario pendiente: ejecutar ese paquete en un entorno real Work web y comprobar por separado su esquema de delegación Luna/high. No usar generaciones en el smoke del motor, no confundir ejecución local con cloud, no sustituir el modelo. No desplegar API ni construir toda la skill antes de resolver viabilidad. Los resultados originales fuera de este clon se conservan. No repetir las comprobaciones locales sin un cambio o problema que lo justifique.

---

# Resumen para continuar: primera etapa de la skill BPMN

## Destino vigente — prevalece sobre las rutas históricas de abajo

El usuario ha designado `https://github.com/ignagp34/Skill-BPMN-v2.git` como repositorio de trabajo. Continuar en `C:/Repositorios/Skill BPMN v2/Skill-BPMN-v2`, leyendo y actualizando su AGENTS.md. Este clon nuevo se prepara con los archivos del commit de referencia, sin historial ni remoto del origen. Incorporar selectivamente los resultados útiles de `../baseline-stage1` y `../smoke`, preservando los originales; no copiar caches ni entornos instalados. El original `../BPMN-DSL-Monorepo` sigue protegido. No se han realizado commits ni pushes durante esta transición.

## Restricción posterior del usuario: origen cerrado

No hacer commits, pushes, PRs ni escrituras remotas a `ignagp34/BPMN-DSL-Monorepo`. Tampoco hacer commits en el clon. Conservar sus archivos versionados intactos. Desarrollar adaptadores y skill y guardar resultados fuera del clon, bajo `C:/Repositorios/Skill BPMN v2`, o en una copia independiente sin remoto de escritura. Esta restricción prevalece sobre cualquier ruta de implementación del resumen o del plan que antes apuntara al interior del clon. No inicializar otro repositorio ni hacer commits sin petición posterior. Las pruebas e instalaciones locales pueden continuar si no modifican archivos versionados del origen.

El usuario ha autorizado iniciar los primeros pasos del plan en una nueva tarea. Lee primero `AGENTS.md` de esta misma carpeta y respeta sus decisiones. Trabaja exclusivamente en `C:/Repositorios/Skill BPMN v2` y su clon `BPMN-DSL-Monorepo`, sin tocar proyectos vecinos.

## Objetivo y estado recibido

Convertir el repositorio https://github.com/ignagp34/BPMN-DSL-Monorepo.git en una skill que reciba un resumen, delegue el DSL a `gpt-5.6-luna` con esfuerzo `high` y entregue PNG, BPMN con DI y SVG; prompt opcional. Preservar diseño y evaluación. El commit de referencia es `f558eb0e0904c02264d5dccb6ad76164fda22919`.

Se ha clonado y estudiado el código. En la fase inicial no se instalaron dependencias ni se ejecutaron pruebas o renders. Comprueba el estado actual antes de actuar y preserva cambios del usuario. `AGENTS.md` y este resumen están en la carpeta padre del clon, fuera de su Git.

El repositorio ya tiene un harness sin interfaz en `apps/tfm-lab/src/headless/main.ts`, un runner en `apps/tfm-lab/scripts/render-experiments.mts`, exportadores compartidos y el motor en `packages/bpmn-core`. Conservar auto-layout y la cadena completa de ajustes. La evaluación semántica en `TFM-eval` no demuestra por sí sola fidelidad visual. El prompt v5 de company-web es la referencia inicial; no cambiarlo durante esta etapa.

## Trabajo solicitado ahora

1. Revisar instrucciones aplicables, estado Git, versiones y dependencias. Preparar Node/pnpm, Chromium y Python aislado manteniendo el lockfile.
2. Producir una primera referencia con un DSL existente y el motor original: BPMN, SVG y PNG en una carpeta separada. Reutilizar el runner actual; si hace falta, añadir solo un adaptador mínimo sin alterar algoritmos.
3. Preparar una prueba portable para Work web. Chromium puede ejecutarse en remoto y no exige la aplicación local. Sigue sin estar demostrado que el entorno de Work admita este paquete. Una ejecución local no resuelve esa comprobación.
4. Ejecutar pruebas y build existentes, registrar fallos previos e inventariar una muestra representativa para congelar el baseline según etapa 1. No sobrescribir corpus ni resultados históricos; revisar los destinos fijos del orquestador de evaluación antes de usarlo.
5. Registrar evidencia y actualizar casillas en AGENTS.md. Entregar archivos del primer caso, resultados de pruebas, instrucciones del paquete portable y pendientes reales de Work.

Esta nueva tarea comienza en el proyecto local. Si no tiene un entorno real de Work web, preparar y entregar la prueba para allí sin fingir validación cloud y sin abrir nuevas tareas cloud por iniciativa propia. Avanzar en las comprobaciones locales independientes. La disponibilidad de subagentes Luna/high en Work es otra comprobación pendiente, separada del render.

No desplegar un servicio ni construir toda la skill en esta primera etapa. Si Work impide el render, documentar el bloqueo y proponer alojar el mismo motor como alternativa, conservando diseño. No eliminar auto-layout ni reemplazar el motor con un dibujo aproximado.
