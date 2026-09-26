# Plan — mejora 1: skill `bpmn-edit`

Diseño de partida: `plans/mejoras-futuras.md` § 1. Orden acordado con el usuario (2026-09-26): 1 → 4 → 3 → 2. Este plan no se implementa hasta que el usuario decida los puntos de § 7.

## 1. Arquitectura en una frase

Un servidor Node efímero en `127.0.0.1` sirve una página estática con un modeler de bpmn-js (el mismo 17.11.1 del harness) y, **del lado del servidor**, mantiene abierta una `HarnessSession` de la skill `bpmn`. Toda compilación del DSL y toda exportación pasan por esa sesión. Así el motor, el layout (`config/layouts.json`), `saveSVG`, el PNG del mismo SVG y las comprobaciones son exactamente los de `bpmn`. La página del usuario solo edita la geometría y envía el XML.

```text
navegador del usuario (web/editor.js, bpmn-js Modeler)
   │  POST /api/compile {dsl}         POST /api/save {xml, edits}
   ▼
edit-server.mjs ── engine-session.mjs ── HarnessSession (skills/bpmn/scripts/lib/harness.mjs)
                                         ├─ renderExperiment(dsl)          → layout del motor
                                         ├─ stripMessageFlowsInPage(xml)   → flujos de mensaje ocultos
                                         └─ renderArtifactsFromLayout(xml) → SVG + PNG + reimportación
```

¿Por qué no una app de Vite nueva como `company-web`? Porque habría que duplicar el cableado del motor y de cada versión de layout (`candidateConfig`). Con la sesión headless del servidor, la versión de layout es solo el `harness` de su entrada en `layouts.json`, como en `render-dsl`.

## 2. Entradas y carpeta de sesión

`open` acepta una de tres entradas:

| Entrada | Geometría inicial (`engine.bpmn`) | DSL editable | Versión de layout registrada |
| --- | --- | --- | --- |
| `--run <runDir>` de `bpmn` | `layout-full.bpmn` si existe, si no `diagram.bpmn` (tal cual, sin re-render) | `normalized.dsl` | la de `run-info.json` (último intento) |
| `--dsl <archivo>` | render con el `default` de `layouts.json` (o `--layout`) | sí | la usada |
| `--bpmn <archivo>` con DI | el archivo | no (panel desactivado: no hay DSL) | `unknown` |

Al recompilar un DSL se usa el `default` de `layouts.json` leído en ese momento (o `--layout`), y se registra. `--layout v0` sigue siendo el TFM exacto.

Carpeta nueva por sesión, nunca sobre otra (§ 7, decisión 2): `edit-<fecha>-<hora>-<slug>/`

| Archivo | Contenido |
| --- | --- |
| `session.json` | `schema: bpmn-edit-session/1`: origen (tipo, ruta, sha256), layout (versión, harness, de dónde sale), `messageFlows`, sha256 del DSL, inicio, fin, duración, nº de ediciones y de guardados, `semanticIdentical`, comprobaciones y entregables del último guardado, revisiones del DSL. |
| `engine.bpmn` | DI inicial del motor, completo (con flujos de mensaje). |
| `user.bpmn` | DI del usuario en el último guardado, completo. |
| `edits.json` | Una entrada por orden del `commandStack`: n.º, hora, orden (`shape.move`, `connection.updateWaypoints`, `label.move`, `shape.resize`, `lane.resize`…), elementos, antes/después (bounds, waypoints, bounds de etiqueta) y si fue deshacer/rehacer. |
| `edit-diff.json` | Diferencia por elemento entre `engine.bpmn` y `user.bpmn` (desplazamiento, cambio de tamaño, codos añadidos o quitados, etiqueta movida). No depende de cómo se editó. |
| `diagram.bpmn/.svg/.png` | Entregables, con flujos de mensaje según la opción; solo si pasan su comprobación, como en `bpmn`. |
| `dsl/NN.dsl`, `dsl/NN-engine.bpmn` | Cada revisión del DSL y el layout que dio el motor. |

## 3. Página

- Dos paneles, como `Editor.tsx`: DSL a la izquierda (textarea con diagnósticos del motor por línea) y lienzo a la derecha.
- **Lienzo solo de layout** (§ 7, decisión 3). Paleta y menú contextual vacíos. Una regla de bpmn-js que prohíbe crear, borrar, reconectar, reemplazar y editar nombres. Un `commandInterceptor` que rechaza cualquier orden fuera de la lista blanca de `config/editor.json`. Se permite mover formas, codos (waypoints) y etiquetas, y redimensionar pools y carriles.
- Flujos de mensaje: el lienzo carga el layout completo. Si la opción es `hidden`, se ocultan en pantalla como en `company-web` (`setMessageFlowVisibility`), con la tecla M para verlos, y se quitan al exportar (`stripMessageFlows`).
- Guardado automático con espera configurable, más el botón **Guardar**. Barra de estado con el resultado de las comprobaciones y las rutas.
- **Terminar** cierra el servidor. Además la página envía un latido. Si no llega ninguno durante `idleTimeoutMs`, el servidor se cierra solo, y también con Ctrl+C. En todos los casos se cierran el navegador headless y Vite.

## 4. Módulos y archivos

```text
skills/bpmn-edit/
  SKILL.md                      breve: cuándo usarla, comando open, qué devolver al usuario
  references/contract.md        entradas, carpeta de sesión, estados, API HTTP
  references/edits-format.md    formato de edits.json y edit-diff.json (para la mejora 2)
  config/editor.json            órdenes permitidas, autosave, latido/inactividad, puerto, patrón de carpeta
  scripts/bpmn-edit.mjs         despachador (reutiliza cli-args de bpmn)
  scripts/commands/open.mjs     abre la sesión y sirve la página
  scripts/commands/export.mjs   re-exporta user.bpmn de una sesión sin página (pruebas y reintentos)
  scripts/commands/diff.mjs     calcula edit-diff.json
  scripts/commands/doctor.mjs   motor, Chromium y bpmn-js disponibles
  scripts/lib/source.mjs        resuelve --run | --dsl | --bpmn → DSL, XML inicial, versión de layout
  scripts/lib/session-store.mjs carpeta de sesión, session.json, escrituras atómicas
  scripts/lib/engine-session.mjs compilar DSL y exportar XML con HarnessSession + inspectArtifacts
  scripts/lib/semantic-check.mjs compara la parte semántica (sin bpmndi) de dos BPMN de forma canónica
  scripts/lib/di-diff.mjs       diferencia por elemento entre dos DI
  scripts/lib/edit-server.mjs   rutas HTTP, estáticos, latido y cierre
  scripts/lib/geometry-carry.mjs solo si se elige conservar ediciones al cambiar el DSL (§ 7)
  web/index.html, editor.js, editor.css
  test/bpmn-edit.test.mjs
```

### Reutilización, sin copiar

| De | Qué |
| --- | --- |
| `skills/bpmn/scripts/lib/harness.mjs` | `HarnessSession` (Vite + Chromium headless, `renderExperiment`, `renderArtifactsFromLayout`) |
| `.../artifacts.mjs` | `inspectArtifacts`, `classifyRender`, `extractDiagnostics` |
| `.../message-flows.mjs` | `stripMessageFlowsInPage`, `parseMessageFlows` |
| `.../layouts.mjs` | `parseLayout`, `DEFAULT_LAYOUT` (se lee de `layouts.json`, no se supone) |
| `.../engine.mjs` | `findEngineRoot` (`BPMN_SKILL_ENGINE_ROOT` o el enlace), `verifyEngine`, `engineRecord` |
| `.../run-store.mjs` | `RunStore.open` para leer una ejecución; `writeJson`, `nowIso` |
| `.../cli-args.mjs`, `hash.mjs`, `status.mjs` | argumentos, sha256, estados y códigos de salida |
| `tools/layout-lab/lib/vote-server.mjs` | patrón del servidor (127.0.0.1, puerto 0, `send`, `readBody` con límite, escritura atómica) |
| `tools/layout-lab/lib/xml.mjs`, `bpmn-model.mjs` | parser XML y modelo DI para `semantic-check` y `di-diff` |
| `bpmn-js/dist/bpmn-modeler.production.min.js` del motor | la página lo pide a `/vendor/`, servido desde `apps/tfm-lab/node_modules` |

Dos refactors pequeños en código compartido, para no duplicar (ninguno toca el harness ni el motor):

1. `openBrowser` sale de `tools/layout-lab/commands/vote.mjs` a `skills/bpmn/scripts/lib/open-browser.mjs`, y `vote.mjs` lo importa.
2. `run-store.mjs` exporta la asignación de carpeta única (`allocateRunDir(outDir, prefix, label)`), que hoy está dentro de `RunStore.create` con el prefijo `bpmn-`. `RunStore.create` la usa sin cambiar su resultado.

Tras ambos: `verify-source`, pruebas del lab y paridad completa (sola).

## 5. Pruebas

- **Unitarias** (`node --test skills/bpmn-edit/test/`):
  - `di-diff` con DI sintéticos;
  - `semantic-check`, que debe ser igual con solo geometría cambiada y distinto al renombrar;
  - `source` con las tres entradas;
  - `session-store`: carpeta única y rutas con espacios.
- **Integración sin página**: `export --session` sobre un `user.bpmn` con una tarea y un codo movidos a mano en el XML. Comprueba que los tres entregables pasan las comprobaciones, que `semanticIdentical: true` y que el PNG ha cambiado.
- **Extremo a extremo con la página real**: Playwright abre la página servida por `open --no-open`. Mueve una tarea (`modeling.moveShape`) y un codo (`modeling.updateWaypoints`) y pulsa Guardar. Comprueba lo siguiente:
  - los tres archivos reflejan el cambio;
  - el XML semántico es idéntico al de partida;
  - `edits.json` tiene exactamente esas dos ediciones;
  - intentar borrar o crear una forma no hace nada.

  Después cambia el DSL, comprueba que se vuelve a dibujar y que llega el aviso de ediciones perdidas, pulsa Terminar y comprueba que el puerto queda libre.
- Todo con salidas en `C:/.../Skill BPMN v2/...` (ruta con espacios) y en carpetas nuevas bajo `skill-runs/bpmn-edit-<fecha>/`.
- Regresión de lo existente: `node smoke/verify-source.mjs` (3319/0), `node --test tools/layout-lab/test/layout-lab.test.mjs` y `node tools/skill-parity/parity.mjs skill-runs/parity-<fecha>` lanzada sola.

## 6. Comandos

```powershell
node skills/bpmn-edit/scripts/bpmn-edit.mjs open --run <runDir> [--out <dir>] [--message-flows hidden|shown] [--port 0] [--no-open]
node skills/bpmn-edit/scripts/bpmn-edit.mjs open --dsl <archivo> --out <dir> [--layout <versión>]
node skills/bpmn-edit/scripts/bpmn-edit.mjs open --bpmn <archivo> --out <dir>
node skills/bpmn-edit/scripts/bpmn-edit.mjs export --session <editDir>
node skills/bpmn-edit/scripts/bpmn-edit.mjs diff --session <editDir>
node skills/bpmn-edit/scripts/bpmn-edit.mjs doctor
```

`open` imprime `{ url, sessionDir }` al arrancar y, al terminar, el JSON de la sesión (estado, entregables, `semanticIdentical`, nº de ediciones). Los estados y códigos de salida son los de `bpmn` (`status.mjs`).

## 7. Decisiones del usuario

1. **Ediciones de geometría al cambiar el DSL.** Dato relevante: el motor da a formas y gateways ID derivados de carril + nombre (`Task_Registrar_Clerk_Receive_Request`), pero a los flujos ID secuenciales (`Flow_1`, `Flow_2`…) que se renumeran al añadir o quitar pasos. Renombrar una tarea o cambiarla de carril cambia su ID.
   - **A. Rehacer desde el motor.** Tras recompilar, el diagrama es el del motor. La página avisa de cuántas ediciones se pierden y permite volver al DSL anterior con sus ediciones. Simple y sin ambigüedad.
   - **B. Conservar posiciones absolutas** (la propuesta de `mejoras-futuras.md`). Cada forma que conserve su ID recupera la posición del usuario, y los flujos se emparejan por origen y destino. Riesgo: las formas nuevas las coloca el motor pensando en su layout y pueden quedar encima de las que movió el usuario.
   - **C. Reaplicar las ediciones como desplazamientos.** Sobre el layout nuevo, cada forma con el mismo ID se mueve lo mismo que la movió el usuario, con órdenes de bpmn-js, de modo que sus líneas se recalculan. Un codo editado solo se reaplica si su flujo conserva origen, destino y trazado del motor. La página lista las ediciones que no se pudieron reaplicar y ofrece descartarlas todas.
   - **Recomendación: A en la primera entrega y C como paso siguiente dentro de esta mejora.** C respeta la intención del usuario («esta tarea, más abajo») y choca menos que B. A es la base de C y ya cumple el criterio de aceptación («avisa si se pierden ediciones»). Para la mejora 2, C no es necesaria: cada sesión de edición parte de un DSL fijo.
2. **Dónde se guarda.** Recomendación: con `--run`, en `<runDir>/edits/edit-<fecha>-<hora>/` (carpeta nueva; la ejecución original no se toca); con `--dsl` o `--bpmn`, `--out` es obligatorio. Alternativa: `--out` siempre obligatorio.
3. **Bloqueo semántico en el lienzo.** Recomendación: bloqueado siempre en esta versión (también renombrar, porque eso se hace en el DSL), sin opción para desbloquearlo hasta que se pida.

**Decidido por el usuario (2026-09-26):** las tres recomendaciones.
1. A ahora y C después, dentro de esta mejora.
2. Con `--run`, en `<runDir>/edits/`; con `--dsl` o `--bpmn`, `--out` obligatorio.
3. Lienzo bloqueado siempre.

Detalle de implementación de A: el aviso no bloquea. El DSL nuevo se aplica, la página dice cuántas ediciones se han perdido y «Volver al DSL anterior» recupera el DSL y la geometría editada.

## 8. Qué quedará en manos del usuario

Probar la página con un diagrama real: mover, trazar, redimensionar, guardar y cambiar el DSL. Opinar sobre la comodidad de la edición. Si procede, abrir un `.bpmn` guardado en Bizagi.
