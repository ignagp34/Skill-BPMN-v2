# Mejora 1 — skill `bpmn-edit` (2026-09-26)

Plan y decisiones del usuario: `plans/bpmn-edit.md`.
- Al cambiar el DSL se rehace desde el motor, con aviso y «Volver al DSL anterior» (opción A); reaplicar ediciones (C) queda como paso siguiente.
- Con `--run` se guarda en `<runDir>/edits/`.
- El lienzo solo cambia el layout.

Todo en local (Windows 11, Node 24.12.0, Playwright 1.60.0, Chromium 148.0.7778.96), sin modelo, API keys ni servicios externos.

## Qué se ha hecho

- **Skill** `skills/bpmn-edit/`:
  - `SKILL.md` breve;
  - `references/contract.md` y `edits-format.md`;
  - `config/editor.json`: órdenes permitidas, reglas denegadas, autoguardado, latido e inactividad;
  - `scripts/bpmn-edit.mjs` con `open`, `export`, `diff` y `doctor`, un archivo por comando;
  - `scripts/lib/` con un módulo por responsabilidad: `source`, `session-store`, `engine-session`, `edit-controller`, `edit-server`, `semantic-check`, `di-diff` y `config`;
  - `web/` (página sin framework), `test/` y `agents/openai.yaml`.
- **Reutilización sin copiar:**
  - de `skills/bpmn/scripts/lib/`: `HarnessSession`, `inspectArtifacts`/`classifyRender`, `stripMessageFlowsInPage`/`parseMessageFlows`, `parseLayout`, `findEngineRoot`/`verifyEngine`, `RunStore.open`, `cli-args`, `status` y `hash`;
  - del laboratorio: `xml.mjs`, `bpmn-model.mjs` (`parseBpmn`) y `writeJsonAtomic`;
  - bpmn-js 17.11.1 se sirve desde `node_modules` del motor, la misma versión que el harness;
  - el layout se lee de `skills/bpmn/config/layouts.json`: la sesión de prueba registró `v24`, `from: "default"`.
- **Cambios en código compartido**, sin tocar el motor ni el harness congelado:
  - `harness.mjs`: `renderOne` se factoriza en `onHarnessPage` y se añade `HarnessSession.exportLayout(xml)`, que pasa un BPMN ya maquetado por el mismo `renderArtifactsFromLayout`, la misma presentación de flujos de mensaje y la misma reimportación que un render;
  - `run-store.mjs`: `allocateRunDir(outDir, prefix, label)`, que `RunStore.create` usa sin cambiar su resultado;
  - `open-browser.mjs`: sale de `tools/layout-lab/commands/vote.mjs`, que ahora lo importa.

## Cómo funciona

El servidor de `open` (127.0.0.1, puerto libre, POST solo JSON) mantiene abierta una `HarnessSession` con el harness de la versión de layout:
- **Compilar un DSL** es el mismo `renderExperiment` que `render-dsl`.
- **Guardar:** compara el XML semántico con el de la revisión (sin DI, sin prefijos ni orden) y rechaza con 409 si difiere; después exporta con `exportLayout` y aplica las comprobaciones de `bpmn`.
- **Página:** modeler de bpmn-js sin paleta, sin menú contextual y sin edición de nombres. Las reglas de `deniedRules` se rechazan antes de empezar. Una orden de primer nivel fuera de `allowedCommands`, o que cambie un elemento de carril, pool, adjunto o extremos, se deshace al momento, se registra como `rejected` y no se puede rehacer.
- **Registro:** cada orden aceptada va a `edits.json` con la geometría antes y después.
- **Cierre:** al terminar, `edit-diff.json` resume la diferencia por elemento entre `engine.bpmn` y `user.bpmn`.

Detalles encontrados al probar:
- bpmn-js reordena los elementos del proceso al mover una forma (la vuelve a añadir al final). Por eso la comparación semántica trata los hijos como conjunto; el orden no tiene significado en BPMN.
- El `preExecute` genérico de diagram-js no sirve para saber la orden de primer nivel: un comportamiento que devuelve un valor corta la propagación y se veía `connection.reconnect` en lugar de `shape.delete`. Se envuelve `commandStack.execute` y se cuenta la profundidad.

## Pruebas ejecutadas (resultados reales)

| Comando | Resultado |
| --- | --- |
| `node --test skills/bpmn-edit/test/bpmn-edit.test.mjs` | **6/6** (7,8 s). Log: `skill-runs/bpmn-edit-20260926/tests.log` |
| `node smoke/verify-source.mjs` | 3319 archivos, 0 diferencias |
| `node --test tools/layout-lab/test/layout-lab.test.mjs` | 8/8 |
| `node tools/skill-parity/parity.mjs skill-runs/parity-20260926-bpmnedit` (sola) | `passed=true`: 12 casos, fallos inyectados (Chromium ausente, timeout, PNG) y flujo de reparación. Log: `skill-runs/parity-20260926-bpmnedit.log` |
| `node skills/bpmn-edit/scripts/bpmn-edit.mjs doctor` | `ok: true` (bpmn-js presente, layout v24, Chromium 148) |
| `quick_validate.py` de skill-creator sobre `skills/bpmn-edit` y `skills/bpmn` | «Skill is valid!» las dos (PyYAML instalado solo en el scratchpad) |
| `layout.mjs vote --batch skill-runs/layout/ab-v22-v24-20260926 --no-open` + `POST /api/quit` | Arranca, sirve el estado y cierra (tras mover `openBrowser`) |

Qué comprueba cada prueba de extremo a extremo (Chromium headless con la página real; salidas en `%TEMP%\bpmn edit test …`, rutas con espacios):

1. **Desde una ejecución de `bpmn`:** `render-dsl` del caso `c-syn014-sysv5-claude-opus_4_8_medium-r01` (2 pools, 5 flujos de mensaje) y después `open --run`.
   - La sesión queda en `<runDir>/edits/` y `engine.bpmn` es idéntico byte a byte al `layout-full.bpmn` de la ejecución.
   - Se mueve una tarea 60 px (`modeling.moveShape`) y se añade un codo a un flujo (`updateWaypoints`), y se guarda.
     - Resultado: `success` y `semanticIdentical: true`. `edits.json` contiene exactamente `shape.move` y `connection.updateWaypoints`.
     - Entregables: el PNG ha cambiado y `diagram.bpmn` no lleva flujos de mensaje. `edit-diff.json` da `dy = 60` en la tarea y codos añadidos en el flujo.
   - Borrar (`modeling.removeShape`) y mover una tarea a otro pool quedan deshechos (`rejected`, `not-layout` y `semantic`), y la regla `elements.delete` da `false`.
   - Un DSL con una tarea renombrada crea la revisión 2 (`success`) y el aviso «se han perdido…» (`lostEdits ≥ 2`). «Volver al DSL anterior» recupera la revisión 1 con la tarea movida 60 px.
   - «Terminar»: el proceso sale con 0, `closedBy: "page"`, 2 revisiones, `edits.applied = 2`, `edits.rejected = 2`; el servidor ya no responde. Sin errores de página.
2. **Con el ratón**, en una ventana de 1600×1000:
   - se arrastran una tarea (`elements.move`), un tramo de línea (`connection.updateWaypoints`) y una etiqueta (`elements.move`), y se redimensiona un pool por su asa inferior (`lane.resize`, porque el pool tiene un carril);
   - arrastrar una tarea al otro pool queda rechazado (`semantic`) y no se puede rehacer;
   - Supr y el doble clic no hacen nada;
   - al guardar: `success`, `semanticIdentical: true`.

Pruebas manuales o de un solo uso (salidas en `skill-runs/bpmn-edit-20260926/`, ignorado por Git):
- `open --run skill-runs/render-dsl-v24default-20260926/bpmn-…-luna-deploy-disconnected --out …/manual`: la página cargó en el navegador integrado de Claude (captura revisada: 2 pools, flujos de mensaje ocultos). «Terminar» cerró la sesión y el proceso salió con 0.
  - Primer intento: la rejilla de la página dejaba el lienzo sin altura con el aviso oculto, y `fit-viewport` fallaba («non-finite»). Se corrigió: diseño flex y `fit()` solo con tamaño.
- **Inactividad:** `open --dsl … --no-open` sin abrir la página: se cerró sola a los **182 s** (`closedBy: "idle"`, `status: success`, salida 0).
- **Muestra** (sesión de la prueba con ratón) en `evidence/bpmn-edit/sample-mouse/`: `session.json`, `edits.json`, `edit-diff.json`, `diagram.png` y `page.png` (captura de la página).
  - Resumen de la diferencia: 6 elementos (1 tarea movida, 2 etiquetas, 3 líneas recalculadas, 5 codos añadidos) y `missing` vacío.
  - Comprobaciones del último guardado: todas `true`, PNG 1519×1022 = viewBox, 5 flujos de mensaje quitados.

## Qué no se ha probado

- **Uso por una persona.** Nadie ha editado todavía un diagrama a mano en la página; las ediciones de las pruebas son programadas (API de bpmn-js y ratón de Playwright). Falta la opinión del usuario sobre la comodidad.
- **Navegadores.** Solo Chromium (Playwright y el navegador integrado); no Edge, Firefox ni Chrome del usuario.
- **Bizagi:** no se ha reimportado ningún `.bpmn` editado.
- **Entrada `--bpmn`:** cubierta solo por la resolución de la entrada, no con la página.
- **Opción C** (reaplicar ediciones tras cambiar el DSL): sin hacer, como se acordó.
