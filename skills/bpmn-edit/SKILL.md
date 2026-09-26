---
name: bpmn-edit
description: Abre un diagrama BPMN de la skill bpmn (su carpeta de ejecución, un DSL o un .bpmn con DI) en una página web local para retocarlo a mano. Se pueden mover tareas, eventos, gateways, codos de las líneas y etiquetas, y redimensionar pools y carriles; el DSL se puede editar y el motor vuelve a dibujar el diagrama. Guarda de nuevo PNG, SVG y .bpmn con los mismos exportadores y comprobaciones que bpmn, y registra cada edición. Úsala cuando el usuario quiera editar, retocar, ajustar o corregir a mano un diagrama BPMN ya generado.
---

# Editar a mano un diagrama BPMN

La página solo cambia el **layout**. Los nombres, los pasos y las conexiones se cambian en el DSL, en el panel izquierdo; el motor vuelve a dibujar el diagrama con el layout por defecto de `skills/bpmn/config/layouts.json`. No escribas ni edites XML BPMN a mano en nombre del usuario.

`CLI` = `node <carpeta de esta skill>/scripts/bpmn-edit.mjs`. `CLI doctor` debe dar `"ok": true`.

## Flujo

1. **Abrir.** Lanza en segundo plano, porque el comando sigue en marcha hasta que el usuario termina:
   - `CLI open --run <carpeta de ejecución de bpmn>`: guarda en `<run>/edits/`;
   - `CLI open --dsl <archivo> --out <destino>`;
   - `CLI open --bpmn <archivo> --out <destino>`: sin DSL, solo layout.

   La primera línea de la salida es `{ url, sessionDir }`, y la página se abre sola en el navegador. Da al usuario la URL por si no se abre. Los flujos de mensaje siguen la opción de la ejecución (`--message-flows` para cambiarla).
2. **El usuario edita.** Todo se guarda solo. Cuando pulsa **Terminar** (o cierra la pestaña y pasan 3 minutos), el comando acaba e imprime el resumen de la sesión.
3. **Entregar.** Según `status` (tabla de `skills/bpmn/references/contract.md`):
   - muestra el `diagram.png` de `sessionDir`;
   - enlaza con rutas absolutas `diagram.png`, `diagram.svg` y `diagram.bpmn`;
   - si `semanticIdentical` es `true`, di que el proceso no ha cambiado; si cambió el DSL, di en qué revisión quedó.

   Nunca presentes archivos que falten (`missing`).

Formato de la carpeta de sesión y de `edits.json`: `references/contract.md` y `references/edits-format.md`.

## Otros comandos

- `CLI export --session <sessionDir>`: vuelve a exportar `user.bpmn` sin página. Sirve tras un guardado interrumpido.
- `CLI diff --session <sessionDir>`: vuelve a calcular `edit-diff.json`.
