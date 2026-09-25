# Estado actual de continuidad — 2026-09-25: etapas 2, 4 y 5 completadas en local

Skill en `skills/bpmn-desde-resumen/` (CLI `scripts/bpmn.mjs`), paridad y fallos en `tools/skill-parity/`, evidencia en `evidence/skill-stage2-5/REPORT.md`. Instrucciones únicas en `AGENTS.md` (`CLAUDE.md` solo redirige). Generador por host solo en `skills/bpmn-desde-resumen/config/generators.json` (ChatGPT: Luna/high; Claude: Opus 5.5/low vía `.claude/agents/bpmn-dsl-generator.md`, regenerado con `sync-agents`; otros: el modelo de la conversación; sin API keys). Skill = motor del TFM: 351/351 experimentos del corpus reproducidos. Siguiente: primera generación real (reiniciar Claude Code para cargar el subagente), prueba en Work web y paquete autocontenido. Ojo: el PNG del baseline del 22/09 ya no se reproduce byte a byte en esta máquina (deriva de raster documentada); usar `tools/skill-parity/pngdiff.mjs` para compararlo.

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
