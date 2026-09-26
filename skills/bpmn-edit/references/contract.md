# Contrato de bpmn-edit

## Entradas de `open`

Solo una de estas:

| Entrada | Geometría de partida | DSL editable | Dónde se guarda |
| --- | --- | --- | --- |
| `--run <runDir>` | `layout-full.bpmn` de la ejecución si existe; si no, `diagram.bpmn`, tal cual | `normalized.dsl` | `<runDir>/edits/` (o `--out`) |
| `--dsl <archivo>` | el DSL dibujado por el motor al abrir | sí | `--out` (obligatorio) |
| `--bpmn <archivo>` con DI | el archivo | no | `--out` (obligatorio) |

Opciones de `open`:
- `--layout <versión>`: versión con la que se dibuja un DSL. Por defecto, la `default` de `skills/bpmn/config/layouts.json`, leída al abrir. Con `--run`, la geometría de partida es la de la ejecución y se registra su versión.
- `--message-flows hidden|shown`: por defecto, lo que usó la ejecución; si no, `hidden`, como en `bpmn`.
- `--port <n>`: por defecto, un puerto libre.
- `--no-open`: no abre el navegador.

## Carpeta de sesión `edit-<fecha>-<hora>-<slug>/`

Siempre es una carpeta nueva; los archivos de la entrada no se tocan.

| Archivo | Contenido |
| --- | --- |
| `session.json` | Estado (`status`) y fechas de inicio, fin y duración (`createdAt`, `endedAt`, `durationMs`). Origen con sus hashes. Motor verificado y `runtime`. Además: `messageFlows`, `recompileLayout` y `revisions[]` (n, versión de layout, hashes del DSL y del layout del motor); `currentRevision` y `saves`; los contadores de `edits` (`applied`, `undone`, `redone`, `rejected`); `lastSave` (comprobaciones, `semanticIdentical`, presentación de los flujos de mensaje); `deliverables` con hashes; `diff` (resumen de `edit-diff.json`) y `closedBy` (`page`, `idle`, `sigint`). |
| `engine.bpmn` | Layout del motor de la revisión guardada, completo (con flujos de mensaje). |
| `user.bpmn` | Layout del usuario en el último guardado, completo. |
| `edits.json` | Eventos de la página, en orden (`references/edits-format.md`). |
| `edit-diff.json` | Diferencia por elemento entre `engine.bpmn` y `user.bpmn`. |
| `diagram.bpmn`, `.svg`, `.png` | Entregables del último guardado, con los mismos exportadores, presentación de flujos de mensaje y comprobaciones que `bpmn`. Un formato solo aparece si pasa su comprobación. |
| `dsl/NN.dsl`, `dsl/NN-engine.bpmn` | Cada revisión del DSL y el layout que dio el motor. |

Al abrir se hace un primer guardado sin ediciones, así que la carpeta está completa desde el principio. Cada guardado sustituye los tres entregables a la vez; los anteriores se retiran primero.

## Qué se puede hacer en el lienzo

Solo layout (decisión del usuario, 2026-09-26):
- **Se puede:** mover formas, etiquetas y tramos de línea; añadir o quitar codos; redimensionar pools y carriles. Son las órdenes de `config/editor.json › allowedCommands`.
- **No se puede:** crear, borrar, reconectar, reemplazar ni renombrar. No hay paleta ni menú contextual, las reglas (`deniedRules`) lo impiden y el doble clic no edita.
- **Se deshace al momento**, con un aviso en la página y un evento `rejected`: cualquier otra orden, o un movimiento que cambie un elemento de carril, de pool o de adjunto.
- **Comprobación del servidor:** antes de exportar compara el XML semántico con el de la revisión (`semantic-check`: sin DI, sin prefijos ni orden) y rechaza con 409 lo que no sea idéntico.

## Cambiar el DSL

«Aplicar DSL» (Ctrl+Enter) dibuja el DSL con el motor y crea una revisión nueva.
- Las ediciones a mano del DSL anterior no se trasladan. La página dice cuántos elementos editados se han perdido, y «Volver al DSL anterior» recupera ese DSL con su geometría.
- Un DSL que no compila no cambia nada y muestra los diagnósticos del motor.
- Con `--bpmn` no hay DSL.

## Estados y salida

`status` y códigos de salida son los de `bpmn` (`skills/bpmn/scripts/lib/status.mjs`). Añade uno propio: `closed_without_save`, si la sesión se cierra sin haber guardado nunca.
- `open` imprime `{ url, sessionDir }` al estar lista la página y, al cerrarse, el resumen: `sessionDir`, `status`, `saves`, `revision`, `semanticIdentical`, `edits`, `layout`, `deliverables`, `missing` y `closedBy`.
- Si el DSL no dibuja al abrir, el resumen trae `startError` con los diagnósticos, y la salida es la del estado (2 o 3).

## Servidor

- **Red:** escucha en `127.0.0.1`, en un puerto libre.
- **Qué sirve:** la página (`web/`) y bpmn-js del motor (`/vendor/`, la misma versión 17.11.1 que el harness). Cada petición POST debe ser JSON.
- **Cierre:** con «Terminar», con Ctrl+C o cuando pasan `idleTimeoutMs` sin peticiones (la página envía un latido cada `heartbeatMs`). En todos los casos se cierran el servidor, Chromium y Vite.
- **API:** `GET /api/state`, `POST /api/compile {dsl}`, `POST /api/save {revision, xml, events}`, `POST /api/heartbeat` y `POST /api/quit`.
