# Plan e instrucciones: convertir BPMN-DSL-Monorepo en una skill

## Fuente única de instrucciones

Este `AGENTS.md` es la única fuente de instrucciones para todas las herramientas (Claude, ChatGPT/Codex, Gemini…). `CLAUDE.md` solo redirige aquí. Desde el 2026-09-25, cualquier cambio que el usuario pida sobre `CLAUDE.md` se aplica en este archivo, no en `CLAUDE.md`.

## Repositorio de trabajo vigente — actualización del usuario

El 2026-09-22 el usuario autorizó crear el commit local de esta preparación en `Skill-BPMN-v2`. Esta autorización sustituye las restricciones anteriores sobre commits en el nuevo repositorio; se mantiene la prohibición de push y la protección completa del repositorio original. Las menciones posteriores a ausencia de commits describen el estado histórico previo a esta autorización. Actualización del 2026-09-26: a petición expresa del usuario se hizo push a `origin/main` de `ignagp34/Skill-BPMN-v2` con todo lo hecho hasta entonces. La regla sigue siendo no hacer push sin que el usuario lo pida, comprobando antes que `origin` es ese repositorio.

Desde el 2026-09-22 el repositorio de desarrollo es **https://github.com/ignagp34/Skill-BPMN-v2.git**, clonado en `C:/Repositorios/Skill BPMN v2/Skill-BPMN-v2`. El remoto `origin` de ese clon apunta exclusivamente al nuevo repositorio. Estaba vacío al clonarlo; se prepara con una exportación de los archivos versionados del commit de referencia del original, sin su historial ni su configuración Git.

Toda nueva implementación, skill, adaptadores y documentación debe realizarse en este nuevo clon. Su `AGENTS.md` será el plan operativo que se actualizará en adelante. Las rutas técnicas de este documento se interpretan desde la raíz del nuevo clon, donde se mantiene la estructura del monorepo. Esta disposición sustituye las ubicaciones anteriores del plan. Los resultados ya generados fuera de él se conservan y se incorporan selectivamente, sin trasladar caches, entornos virtuales ni dependencias instaladas.

`BPMN-DSL-Monorepo/` y su GitHub siguen siendo exclusivamente referencia protegida: no modificar sus archivos versionados, hacer commits, cambiar remotos, crear PRs ni hacer pushes allí. La designación del nuevo repositorio autoriza trabajar en él; en esta transición no se realizan commits ni pushes. Cualquier futura operación Git debe comprobar primero que se dirige a `ignagp34/Skill-BPMN-v2`.

## Alcance y estado

La misión inicial de clonar, estudiar y planificar está completada. El 2026-09-22 el usuario autorizó continuar en otra tarea con los primeros pasos: preparar la referencia reproducible y resolver pronto la viabilidad en Work web. Las casillas pendientes describen trabajo aún no realizado.

Objetivo posterior: a partir de un resumen de proceso, una skill delega la generación del DSL a **GPT 5.6 Luna con razonamiento alto**, reutiliza el motor actual y entrega **PNG, BPMN y SVG**, con el prompt como entrega opcional. Conservar la evaluación para seguir investigando y mejorando el diseño.

Ubicación del proyecto: `BPMN-DSL-Monorepo/`, relativa a este archivo. Todas las rutas técnicas siguientes son relativas a esa raíz salvo indicación expresa. Este AGENTS.md gobierna esta carpeta y el clon. Mantener aquí el estado de las etapas y las decisiones de conversión.

- Repositorio: https://github.com/ignagp34/BPMN-DSL-Monorepo.git
- Commit de referencia: `f558eb0e0904c02264d5dccb6ad76164fda22919`.
- Inspección inicial: 2026-09-22; lectura del código, prompts, configuración, pruebas y documentación.
- Estado histórico de la inspección inicial: entonces no se habían instalado dependencias ni ejecutado pruebas. La ejecución de etapa 1 se documenta al final de este archivo y en `baseline-stage1/REPORT.md`; no confundirla con validación en Work.
- No modificar otros proyectos vecinos ni instalar globalmente la futura skill durante la preparación.

## Decisiones que se deben conservar

### Restricción del repositorio original — prioridad sobre las rutas propuestas

El usuario ha aclarado expresamente que `ignagp34/BPMN-DSL-Monorepo` está cerrado y no debe tocarse. **No hacer commits, pushes, pull requests ni ninguna escritura remota al repositorio original.** Tampoco crear commits en su clon local. Mantener los archivos versionados del clon `BPMN-DSL-Monorepo/` intactos como referencia congelada. Se pueden leer y ejecutar pruebas e instalar dependencias ignoradas, siempre que no se alteren archivos versionados, lockfiles ni históricos.

Todo desarrollo nuevo de la skill, adaptadores, paquetes, informes, baseline y resultados irá fuera del clon, en esta carpeta de proyecto, o en una copia de trabajo independiente sin remoto de escritura. Las rutas de creación propuestas más abajo (incluida `skills/bpmn/` dentro del repositorio) quedan sustituidas por rutas equivalentes fuera del clon. No inicializar ni realizar commits en un repositorio nuevo sin petición posterior del usuario. No revertir cambios ajenos si aparecen: identificarlos y preservarlos.

En la comprobación del 2026-09-22, el clon seguía limpio y HEAD y origin/HEAD coincidían con `f558eb0e0904c02264d5dccb6ad76164fda22919`. Los documentos AGENTS.md y CONTINUAR.md se encuentran fuera del clon y no modifican el repositorio original.

1. Priorizar la fidelidad al comportamiento actual sobre simplificar o reescribir el motor.
2. El modelo genera DSL; el motor genera el XML y su geometría. No sustituir esta vía por XML escrito directamente por el modelo, Mermaid, dibujos a mano o generación de imágenes.
3. Modelo generador por host (actualizado por el usuario el 2026-09-25), definido **solo** en `skills/bpmn/config/generators.json`: ChatGPT/Codex/Work → `gpt-5.6-luna`, esfuerzo `high`, subagente; Claude → `claude-opus-5-5`, esfuerzo `low`, subagente `bpmn-dsl-generator` (generado con `bpmn.mjs sync-agents`); cualquier otro host → genera el modelo de la conversación actual, registrando cuál. Sin API keys: se usa la cuenta de ChatGPT o Claude del usuario. Es la elección del usuario por coherencia y coste; no afirmar que un modelo equivale a otro ni que su calidad ya se ha medido. Cambiar un modelo = editar ese JSON y ejecutar `sync-agents`.
9. El resultado debe ser exactamente el del TFM: mismo motor, harness, prompt v5 de la web y exportadores. (Actualizado por el usuario el 2026-09-25, etapa 8: el layout por defecto es la versión `default` de `skills/bpmn/config/layouts.json`, hoy v24 (desde el 2026-09-26; antes v22, v20, v16, v15, v7, v6 y v4); el XML semántico sigue siendo exactamente el del TFM y `--layout v0` da la salida exacta del TFM, que usan la paridad y el corpus.) El CLI de la skill solo orquesta (Node + Vite + Playwright/Chromium, igual que `apps/tfm-lab/scripts/render-experiments.mts`); no reimplementa nada del dibujo.
10. Programar con principios SOLID y clean code: módulos pequeños de una sola responsabilidad, configuración separada del código y un único lugar por decisión, para que los cambios posteriores (p. ej. de modelo) sean triviales.
4. La skill debe funcionar sin que el usuario abra una web, copie prompts o pegue DSL. Puede utilizar Chromium sin interfaz y un servidor local efímero como dependencias internas del renderizado existente.
5. Entregar `.bpmn` con BPMN DI (posiciones y conectores), `.svg` y `.png`. 
6. Mantener las aplicaciones y la evaluación existentes durante esta conversión. No eliminar corpus, versiones de prompts, esquemas, resultados ni pruebas.
7. Separar la conversión fiel de las mejoras posteriores: no cambiar simultáneamente prompt, parser, layout y modelo al evaluar una mejora.
8. Conservar el lockfile y las atribuciones existentes (`LICENSE`, `THIRD-PARTY-NOTICES.md`, `docs/ATTRIBUTION.md`) al empaquetar código y recursos.

## Mapa técnico verificado

| Responsabilidad | Fuente actual | Uso en la conversión |
| --- | --- | --- |
| Motor compartido | `packages/bpmn-core/src/index.ts` | Consumir su API pública, sin copiar sus algoritmos a la skill. |
| Gramática y semántica | `packages/bpmn-core/src/dsl/` | Preservar sintaxis, normalización semántica, inferencia de gateways y trazas. |
| Emisión de BPMN | `packages/bpmn-core/src/bpmn/` | Mantener semántica e identificadores del motor. |
| Layout completo | `packages/bpmn-core/src/render/` | Conservar todas las fases y su orden. |
| Validación | `packages/bpmn-core/src/validation/bpmnValidation.ts` | Retener diagnósticos antes y después del layout. |
| Pipeline con diagnósticos | `apps/tfm-lab/src/experiments/evaluate.ts` | Reutilizar `evaluateDslPipeline` y su tratamiento de fallos. |
| Render sin interfaz | `apps/tfm-lab/src/headless/main.ts` y `index.headless.html` | Base del adaptador para la skill; utiliza un modeler real de bpmn-js. |
| Automatización del render | `apps/tfm-lab/scripts/render-experiments.mts` | Referencia para Vite, Playwright, exportación y metadatos. |
| Exportación compartida | `apps/tfm-lab/src/experiments/exporters.ts` | `saveSVG` y conversión del mismo SVG a PNG mediante Canvas. |
| Prompt de la web | `apps/company-web/prompts/system/internal_bpmn_dsl_system_prompt_v5.md` y `src/ui/screens/Handoff.tsx` | Base inicial del prompt y de su composición con el resumen. |
| Prompts de investigación | `apps/tfm-lab/prompts/system/` | Mantener v3.1, v4, v4.1, v5 y comparación XML. |
| Evidencia experimental | `apps/tfm-lab/prompts/experiments/` | Preservar salidas originales y procedencia. |
| Evaluación Python | `TFM-eval/` | Mantener métricas, esquemas y reportes JSON/CSV. |
| Orquestación actual | `scripts/run-evaluation.ps1` | Referencia para render + evaluación; adaptar rutas de salida para aislar nuevas ejecuciones. |

La web no llama al modelo automáticamente: `Handoff.tsx` prepara un prompt para copiar y pegar en un chat externo. La delegación automática será una capacidad nueva de la skill.

Los prompts v5 del laboratorio y de la web difieren en su presentación y referencias al motor; el diff inspeccionado mantiene las reglas de modelado. Elegir inicialmente el de la web y conservarlo completo, incluida la composición final de `Handoff.tsx`; no asumir que ambos archivos tienen el mismo hash. Registrar el origen exacto en cada ejecución.

El README anuncia 445 experimentos, pero este checkout contiene 441 directorios en `prompts/experiments`. Inventariar los casos completos, pendientes y fallidos desde los archivos reales antes de fijar tamaños de muestra.

## Invariante del diseño

La implementación vigente en `packages/bpmn-core/src/render/index.ts` ejecuta:

```text
sanitizeForLayout
→ layoutProcess (bpmn-auto-layout)
→ layoutMissingProcesses
→ placePoolsAndLanes
→ orthogonalize
→ distributeParallelChannels
→ placeLabels
→ extendOuterLanes
→ placeArtifacts
→ modeler.importXML + fit-viewport
```

Mantener el orden, parámetros, tamaños, separaciones, enrutado, fuentes y exportadores. `placeArtifacts` busca espacio libre para datos y anotaciones y considera obstáculos, cruces y longitud de asociaciones; no sustituirlo por colocación genérica. Algunos comentarios del render mencionan etapas pendientes o fallback, pero el código actual ejecuta las fases y lanza error si falla auto-layout: tomar el código ejecutable como referencia.

El PNG actual toma dimensiones del SVG, redondeadas hacia arriba, y se genera con Canvas sin relleno de fondo explícito. No cambiar transparencia, escala, fuentes o márgenes de forma silenciosa. Congelar también versión de Chromium y entorno tipográfico en las comparaciones.

## Etapas y criterios de aceptación

### Decisión de ejecución: Work web y Chromium

El objetivo incluye poder utilizar la skill desde Work en el navegador, sin depender de la aplicación de escritorio ni del ordenador del usuario encendido. Chromium puede ejecutarse sin interfaz en un entorno remoto; su uso no impone por sí mismo ejecución local.

La documentación oficial consultada el 2026-09-22 indica que Work web ejecuta tareas en infraestructura de OpenAI y puede utilizar herramientas de código/shell y navegador, sujetas a disponibilidad y permisos: https://learn.chatgpt.com/docs/enterprise/chatgpt-work-overview y https://learn.chatgpt.com/docs/enterprise/chatgpt-work-cloud-security. Esto no demuestra que el entorno concreto permita instalar o lanzar nuestro Node/Playwright/Chromium, ni que su navegador integrado sea controlable por nuestros scripts.

Prioridad técnica acordada: empaquetar una versión fiel del motor que trabaje en segundo plano, conservando auto-layout y todas las fases posteriores. Reutilizar código existente; no reimplementar el dibujo para evitar Chromium. El cálculo del layout y la exportación visual son etapas diferenciadas.

Orden de decisión:

1. Preparar el entorno y un caso mínimo local con un DSL existente, sin llamadas al modelo, para obtener una referencia y un paquete de prueba reproducible.
2. Probar pronto ese mismo caso dentro de Work web: DSL → BPMN con DI, SVG y PNG. Esta prueba es prioritaria antes de desarrollar toda la skill, no debe posponerse al empaquetado final.
3. Si el entorno permite ejecutar el paquete, mantener toda la ejecución allí.
4. Si hay una incompatibilidad real del entorno, documentarla y preparar la alternativa de alojar el mismo renderizador detrás de una herramienta/API accesible desde Work. El despliegue, los costes y el envío de datos a ese servicio se concretarán antes de ponerlo en funcionamiento; esta alternativa no está desplegada ni es todavía necesaria.

Verificar por separado la posibilidad de invocar un subagente Luna/high desde Work. El éxito de Chromium no demuestra disponibilidad del modelo o de la delegación.

Una prueba local, incluso en Linux o en un contenedor, no acredita compatibilidad con Work web. Si la tarea de continuación solo dispone de ejecución local, preparar el paquete y las instrucciones de prueba, registrar Work como pendiente y continuar los pasos locales independientes. No afirmar que se ha validado en la nube ni crear tareas cloud automáticamente sin petición explícita.

### 0. Preparación — completada

- [x] Clonar el repositorio sin modificar su implementación.
- [x] Identificar motor, fases de layout, prompt activo, exportadores y evaluación.
- [x] Registrar commit de origen, límites de la inspección y plan en este AGENTS.md.

### 1. Congelar una referencia reproducible — baseline local disponible; Work pendiente

- [x] Instalar con `pnpm install --frozen-lockfile`; comprobar versiones efectivas compatibles con el lockfile. El manifiesto declara Node >=20 y pnpm >=9, pero verificar también los requisitos efectivos de las dependencias resueltas.
- [x] Preparar Chromium de Playwright y Python >=3.11 con las dependencias de `TFM-eval/pyproject.toml` en un entorno aislado.
- [x] Obtener un primer caso DSL → BPMN/SVG/PNG reutilizando el harness actual, con insumos y salidas aislados; anticipar solo el adaptador mínimo necesario de la etapa 4.
- [x] Preparar un paquete de prueba portable con versiones, dependencias, entrada, comando, resultados esperados y diagnósticos; evitar rutas absolutas Windows en su ejecución.
- [ ] Ejecutar la prueba en Work web si se dispone de ese entorno y registrar evidencia, permisos y limitaciones. Si no está disponible, dejarla pendiente explícitamente y entregar el paquete para continuar allí.
- [ ] Registrar por separado la disponibilidad de delegación Luna/high en Work, sin consumir generaciones para la prueba determinista del motor.
- [x] Ejecutar `pnpm test`, `pnpm build` y `pytest` desde `TFM-eval`; registrar fallos previos a cualquier cambio.
- [x] Seleccionar y fijar un conjunto representativo: secuencia simple, XOR/AND/OR soportados, bucles, pools/carriles, mensajes, eventos de borde, datos/anotaciones, etiquetas largas y DSL inválido. Usar fixtures y experimentos existentes; documentar cobertura y exclusiones reales.
- [x] Copiar los insumos de la muestra a una carpeta de baseline separada. Renderizar con el motor del commit fijado sin sobrescribir los experimentos históricos.
- [x] Guardar DSL, XML semántico, BPMN DI, SVG, PNG, diagnósticos, hashes y versiones de runtime/motor/prompt.

Aceptación: referencia reproducible disponible, con fallos preexistentes identificados y muestras revisadas visualmente. Las pruebas futuras comparan contra este motor congelado, no contra una referencia regenerada con el código candidato.

### 2. Definir el contrato de la skill — completada (2026-09-25)

- [x] Crear dentro del repositorio `skills/bpmn/` cuando se inicie la implementación; mantener un `SKILL.md` breve y referencias de lectura selectiva.
- [x] Contrato de entrada: resumen en lenguaje natural, destino de salida y opción de adjuntar prompt. Preservar idioma, actores, decisiones y restricciones del resumen; pedir aclaración solo si falta información material y registrar supuestos.
- [x] Separar instrucciones de generación, ejecución determinista y evaluación. El corpus completo y la evaluación no se cargan en el contexto de cada generación.
- [x] Definir estructura por ejecución: `diagram.bpmn`, `diagram.svg`, `diagram.png` y trazabilidad interna (`raw_output.txt`, `normalized.dsl`, `input_prompt.md`, `run-info.json`, `result.json`). El prompt se conserva para reproducibilidad y se adjunta al usuario solo cuando se solicite.
- [x] Definir estados de éxito, advertencias, error de generación, compilación, render y exportación parcial; nunca presentar los tres entregables como disponibles sin comprobarlos.

Aceptación: contrato inequívoco y ejemplo de uso desde un resumen hasta los tres archivos, sin exigir interacción con una web.

### 3. Delegación al modelo — instrucciones y registro listos; generación real pendiente

- [ ] (Instrucciones en `references/generation.md`; subagente de Claude generado; sin ninguna generación real todavía.) La skill debe solicitar el generador de `config/generators.json` para el host: en ChatGPT/Codex un subagente con `model="gpt-5.6-luna"`, `reasoning_effort="high"` y contexto mínimo (`fork_turns="none"` cuando ese sea el contrato de la herramienta); en Claude el subagente `bpmn-dsl-generator` (`claude-opus-5-5`, `low`, sin herramientas ni CLAUDE.md).
- [x] Dar al generador el prompt v5 seleccionado completo y el resumen exacto, sin historiales de investigación ni instrucciones que reescriban el estilo del prompt. Su trabajo termina en el DSL; el proceso principal ejecuta el motor.
- [ ] (Mecanismo listo: `--model/--effort/--evidence`, `matchesRequested`; falta una ejecución real.) Verificar el modelo y esfuerzo realmente seleccionados en la ejecución. La metadata de `agents/openai.yaml` no sustituye la configuración de la llamada al subagente.
- [x] Si no existe la capacidad de delegar con ese modelo/esfuerzo, informar de la limitación; no sustituirlo silenciosamente ni afirmar que se utilizó Luna. No crear tareas independientes en la barra lateral para simular subagentes.
- [x] Conservar respuesta cruda y normalizarla con la lógica existente sin perder líneas vacías significativas. Registrar modelo, esfuerzo, prompt, hashes, intentos y consumo/tiempo si la herramienta los expone; no inventar métricas ausentes.
- [x] Permitir como máximo dos correcciones adicionales motivadas por diagnósticos concretos. Guardar cada intento y el primero sin reparar. No regenerar indefinidamente ni corregir solo para mejorar una puntuación.

Aceptación: una generación real deja evidencia de Luna/high y produce DSL procesable, o comunica un fallo identificable sin ocultarlo.

### 4. Adaptador portable y exportación — completada en local; Work pendiente

- [x] Crear un comando para procesar un DSL individual y un directorio de salida, independiente del catálogo de experimentos y del nombre `EXP-*`.
- [x] Reutilizar inicialmente el harness de tfm-lab y los exportadores compartidos; extraer módulos solo cuando sea necesario y sin duplicar el motor. Mantener `evaluateDslPipeline` como referencia del tratamiento de errores.
- [x] Ejecutar Chromium sin interfaz, con servidor limitado a localhost, puerto libre, timeout y cierre garantizado de navegador/servidor.
- [x] Escribir BPMN DI desde el layout final; exportar SVG del mismo modeler y PNG del mismo SVG. Comprobar que los tres representan la misma ejecución, no un diagrama anterior retenido tras un fallo.
- [x] Propagar errores parciales de exportación: el harness actual puede devolver SVG/PNG nulos aunque el pipeline haya renderizado. Comprobar disponibilidad, contenido y dimensiones por separado.
- [x] Usar directorios únicos por ejecución y aceptar rutas Windows con espacios. Conservar diagnóstico y archivos válidos si un formato falla; no sobrescribir históricos por defecto.
- [x] Revisar `interfaceType`, actualmente restringido a `"web"` en tipos/metadatos, para registrar la nueva vía de skill manteniendo lectura de resultados históricos.

Aceptación: un DSL de prueba produce BPMN, SVG y PNG utilizables desde el comando del adaptador, sin pasos manuales y conservando la cadena completa de diseño. Registrar por separado resultados locales y resultados de Work web; no confundirlos.

### 5. Comprobar paridad visual y semántica — completada en local salvo Bizagi

- [x] Comparar el mismo DSL en el baseline y en el adaptador, sin llamar al modelo. Esto aísla el efecto del empaquetado y del render del cambio de modelo.
- [x] Comparar nodos, tipos, conexiones, nombres, condiciones, pools y carriles; comparar posiciones, dimensiones, waypoints y bounds de etiquetas del DI.
- [x] Buscar igualdad del SVG y PNG en el entorno fijado. Si hay diferencias no semánticas de serialización o rasterización, documentar su causa y una tolerancia medida; no aceptar un umbral amplio sin inspección.
- [x] Revisar visualmente recortes, solapes, legibilidad, cruces, distribución de carriles, etiquetas y artefactos. No exigir que el baseline sea perfecto: exigir que la conversión no lo empeore.
- [ ] (Reimportación en bpmn-js hecha en cada render; Bizagi pendiente.) Reimportar los BPMN exportados; probar Bizagi cuando esté disponible y registrar versión y resultado. Si no se prueba, dejarlo explícitamente pendiente.
- [x] Verificar los casos de fallo: DSL inválido, ausencia de Chromium, timeout y fallo parcial de exportación.

Aceptación: ninguna regresión semántica o geométrica inexplicada en la muestra; diferencias visuales justificadas y revisadas. No atribuir a la skill una garantía visual basada solo en validación XML.

### 6. Conservar e integrar evaluación — ruta por ejecución lista; lotes pendientes

- [x] Mantener las diez métricas de `TFM-eval`, esquemas XSD, pruebas, comparación zero-shot y resultados históricos.
- [x] Conservar M1–M5 y M8 como puntuaciones; M6, M7, M9 y M10 son descriptivas y su `score=1.0` no significa excelencia ni debe mejorar artificialmente un promedio de calidad.
- [x] Añadir una ruta de evaluación opcional por ejecución o lote, con JSON/CSV en destinos nuevos. El orquestador actual fija la salida en `TFM-eval/results/experiments`; no usarlo sin aislar sus salidas para nuevas pruebas.
- [ ] Separar tres preguntas: fidelidad del motor al baseline, fidelidad del modelo al resumen y calidad visual del diagrama. Las métricas semánticas existentes no miden por sí solas las dos últimas.
- [ ] Evaluar Luna/high con el mismo conjunto de resúmenes y prompt fijado. Definir antes del lote un número de repeticiones y límite de coste; registrar fallos, no solo ejecuciones exitosas.
- [ ] Comparar GPT 5.5 histórico solo cuando proceso, prompt y condiciones sean comparables; identificar las diferencias de configuración. Distinguir primer intento de resultado reparado.
- [ ] Mantener rúbrica visual y evidencias junto al benchmark. Cada mejora futura debe versionar prompt o motor y mostrar comparación antes/después sin borrar la referencia.

Aceptación: evaluación ejecutable sin la interfaz web, reportes trazables y capacidad de iterar sin contaminar datos históricos.

### 7. Empaquetar y validar uso real — skill escrita y validada; paquete y uso real pendientes

- [x] Completar `SKILL.md`, referencias necesarias, scripts y metadata de interfaz. Mantener automática la selección de la skill salvo petición contraria.
- [ ] Preparar un paquete reproducible con el motor, harness y recursos necesarios o un mecanismo explícito de instalación fijado al commit; no depender de una ruta absoluta de este equipo ni de descargar HEAD en cada uso.
- [ ] Conservar dependencias y avisos pertinentes; no incluir todo el corpus o los entornos instalados en el contexto de generación. La evaluación y las aplicaciones siguen disponibles en el repositorio.
- [ ] (Validador: válido. Copia limpia probada usando el motor del checkout vía `BPMN_SKILL_ENGINE_ROOT`; falta con un paquete autocontenido.) Ejecutar el validador de skill-creator y una prueba integral desde una ubicación limpia, fuera de la ruta de desarrollo original.
- [ ] Validar al menos un resumen sencillo, uno con varios participantes y uno ambiguo o inválido. Verificar delegación, diagnósticos, entrega y prompt opcional.
- [ ] Mostrar PNG en la respuesta y enlazar los tres archivos usando rutas absolutas. Adjuntar prompt e informes cuando se pidan, sin llenar la respuesta de archivos internos.
- [x] Instalar para uso habitual cuando el usuario solicite esa entrega; documentar dependencias reales y cualquier limitación restante. (2026-09-25, Claude Code local: `~/.claude/skills/bpmn` es un enlace (junction) a `skills/bpmn` de este clon, así que el motor se localiza solo y los cambios del repositorio se aplican al instante; subagente en `~/.claude/agents/bpmn-dsl-generator.md` vía `sync-agents --target ~`. La skill anterior `bpmn` se movió, sin borrarla, a `~/.claude/skills-backup/bpmn-20260925`. Actualización del 2026-09-26, a petición del usuario: la skill pasa a llamarse `bpmn` (antes `bpmn-desde-resumen`; carpeta `skills/bpmn/`, junction `~/.claude/skills/bpmn`), la copia de seguridad `skills-backup/bpmn-20260925` se borró y los subagentes se regeneraron con `sync-agents`; paridad completa `passed=true` tras el cambio. La evidencia anterior conserva la ruta antigua. Depende de este clon con `node_modules` y del Chromium de `../.playwright`; la copia `anthropic-skills:bpmn` sincronizada desde claude.ai no se gestiona desde aquí.)

Aceptación: la skill instalada resuelve resumen → Luna/high → DSL → motor original → PNG/BPMN/SVG con paridad demostrada y evaluación disponible.

### 8. Mejora del layout — fase 0 y herramientas listas (2026-09-25); candidatos pendientes

Plan completo: `plans/layout-iteracion-1.md`. Pedido por el usuario: pools con auto-layout propio, flujos de mensaje ocultos por defecto, métricas de layout y evaluación visual con capturas. Condiciones: el layout del TFM (v0) se conserva intacto y seleccionable; cada mejora es una versión nueva, se cambia una idea cada vez, sin modelo en el bucle y con el XML semántico idéntico.

Decisiones del usuario (2026-09-25):
- flujos de mensaje ocultos por defecto y quitados también del `.bpmn`;
- proporción como ahora y, si hace falta un objetivo, 16:9;
- calibración humana sí, con una **página local** de votación A/B (servidor efímero en 127.0.0.1, votos con teclado guardados al instante en JSON; no Artifacts de claude.ai, que serían demasiados), sin abrir archivos a mano;
- juez visual Opus 5.5;
- **se puede cambiar todo el layout mientras el DSL y su interpretación (XML semántico) no cambien**. Esto sustituye, para esta etapa, la restricción de "mantener orden, parámetros y algoritmos" de la sección Invariante del diseño; v0 sigue seleccionable.

- [x] Fase 0: `--message-flows hidden|shown` en `render`/`render-dsl`, oculto por defecto (BPMN, SVG y PNG), con la lógica de `stripMessageFlows` de company-web ejecutada en la página del harness y reexportación con `renderArtifactsFromLayout`. El layout completo queda en `layout-full.bpmn` y es el que usa `evaluate`. La paridad y `tfm-history` usan `shown`: 12/12 casos (`evidence/layout-v0/parity-phase0-shown.json`).
- [x] Fase 1: banco `tools/layout-lab/bench/` con 56 DSL y sus hashes: 32 del corpus, 18 fixtures y 6 escritos a mano. v0 da en los 32 del corpus el mismo `diagram.bpmn` que el TFM. Como el corpus no tenía ningún DSL con 3 pools, el usuario pidió añadir 6 procesos de IA con 3 pools (`tools/layout-lab/fixtures/ai-3pools/`, añadidos con `bench-add`). Siguen sin cubrir los subprocesos.
- [x] Fase 2: `layout-metrics` (35 métricas; texto medido en Chromium) y diagnóstico de v0 en `evidence/layout-v0/REPORT.md`. Los peores defectos se concentran en multi-pool; el defecto duro más frecuente son las etiquetas sobre la banda de título (38/56 casos).
- [ ] Fase 3: herramientas hechas y probadas con un lote de humo (`ab-batch`, página `vote`, `montage`, `judge/judge-prompt.md`, `agreement` con kappa). Faltan la calibración humana real (~20 parejas), el juez sobre un candidato y la métrica compuesta.
- [ ] Fase 4–5: candidatos priorizados por el diagnóstico (primero pools independientes, luego orden/alineación entre pools y etiquetas); aceptación con `compare` (reglas en `tools/layout-lab/config/acceptance.json`) y juez; evidencia en `evidence/layout-vN/`.
  - v1 (idea A, 2026-09-25): auto-layout propio por pool en `tools/layout-lab/harness/v1/` (harness del TFM + plugin de Vite que sustituye solo `layout-missing.js`; v0 intacto, `verify-source` 3319/0). Banco 56/56, XML semántico idéntico en todos; los 36 de un pool, idénticos byte a byte a v0. **No pasa el filtro objetivo preregistrado**: 17 casos con regresiones duras (sobre todo flujos de mensaje que cruzan formas: 42 → 115; los de secuencia bajan de 12 a 1) y 14 por encima de +15 % de área. Mejora cruces (15/19) y aristas largas (16/19). Votación del usuario sobre 19 parejas A/B: **v1 gana 17, 2 empates, 0 para v0**. Evidencia: `evidence/layout-v1/REPORT.md`.
  - Decisiones del usuario (2026-09-25, tras votar v1): v1 se acepta como base de los candidatos siguientes por su voto (el valor por defecto de la skill sigue siendo v0 mientras no diga lo contrario); se aplaza el juez Opus 5.5; **los flujos de mensaje ocultos no cuentan en las reglas duras** (`hiddenMessageFlowsCountInHard: false` en `acceptance.json`; las métricas calculan `hardVisible` sin mensajes ni sus etiquetas). Con esa regla, v1 frente a v0 queda con 5 casos de regresión dura, todos de banda de título (`evidence/layout-v1/compare-v0-visible.json`). Una idea por candidato; B y C se encadenan y E va aparte.
  - v2 = v1 + B (orden vertical de pools que minimiza los pools cruzados por mensajes; `harness/v2/pool-order.ts`): 56/56, semántica idéntica, solo cambia `f-planta-residuos` y mejora sin regresiones; pasa el filtro. Voto: empate (1 pareja); v2 es la base de E. `evidence/layout-v2/REPORT.md`.
  - v3 = v2 + C (desplazamiento horizontal por pool para alinear los extremos de los mensajes; `harness/v3/pool-align.ts`): 56/56, semántica idéntica, 15 casos cambian; mensajes −306 px de media, menos etiquetas en banda de título (15/0). No pasa el filtro: 1 regresión dura (objeto de datos en banda, `placeArtifacts`) y 3 casos por encima de +15 % de área. Lotes A/B `ab-v1-v2-20260925` (1 pareja) y `ab-v2-v3-20260925` (15). **Voto del usuario con los mensajes ocultos: v2 gana 15/15.** v3 no se descarta: el usuario pidió votarlo también con los mensajes visibles (página de votación con conmutador M; lote `ab-v2-v3-shown-20260925`: **v2 gana 12–3** también con los mensajes visibles). Propuesta del usuario pendiente, C′: alinear columnas entre pools insertando huecos dentro de cada pool, sin desplazar el pool entero. `evidence/layout-v3/REPORT.md`.
  - v4 = v2 + E1 (bandas de título despejadas: pasada final que ensancha todos los marcos hacia la izquierda según la mayor invasión de formas o etiquetas; `harness/v4/title-band-clearance.ts`). 56/56, semántica idéntica, **pasa el filtro**: etiquetas en banda de 38 casos a 0 y formas en banda de 3 a 0, con área +1,7 % de mediana (máx. +3,2 %). Lote `ab-v2-v4-20260925` (20 parejas): **v4 gana 16, 4 empates, 0 para v2**. Primer candidato aceptado por filtro y voto. **Desde el 2026-09-25 (aprobación del usuario), v4 es el layout por defecto de la skill** (`skills/bpmn/config/layouts.json`, único registro de versiones, también usado por el laboratorio). `render`/`render-dsl --layout v0` dan la salida exacta del TFM; `parity.mjs` y `tfm-history.mjs` fijan `--layout v0` (paridad completa: `passed=true`). Cada intento registra `layout.version` y su harness. `evidence/layout-v4/REPORT.md`.
  - v5 = v4 + colocación de artefactos consciente de las etiquetas (huella con nombre, anotaciones ajustadas al texto, etiquetas y líneas como coste, respaldo idéntico a v0; `harness/v5/`). 56/56, semántica idéntica; etiquetas cruzadas por líneas 16 mejor/0 peor, texto de anotación desbordado 9/0, textos fuera del pool 6 → 4; asociaciones +7 %. **No pasa el filtro por 2 casos.** Pesos ajustados sobre el banco (riesgo de sobreajuste). Lote `ab-v4-v5-20260925` (19): **v5 gana 11, v4 2, 6 empates** (votación interrumpida por un corte de luz y reanudada sin pérdida). Gana el voto pero no el filtro: aceptarlo como defecto lo decide el usuario (el defecto sigue en v4). Ideas del usuario en `evidence/layout-v5/REPORT.md`.
  - v6 = v5 afinado con las notas del usuario sobre artefactos (petición: una iteración más antes de validar v5). El módulo de v5 pasa a ser configurable (`placeArtifactsWith`, `V5_TUNING`; v5 idéntico 56/56). Codos caros en asociaciones cortas, aire suave y cohesión de artefactos con el mismo nombre; ablación en `evidence/layout-v6/REPORT.md` (la separación obligatoria empeoraba). Frente a v5, 4 regresiones duras menores; frente a v4, solo 1 caso. Lote `ab-v5-v6-20260925` (14): **v6 gana 10, v5 3, 1 empate** (p = 0,09; `evidence/layout-v6/human-votes.json`). Donde el voto aísla un ajuste, codos 3–0 y aire 3–0–1; las tres derrotas de v6 son casos densos en que el aire aleja el artefacto de su tarea (una con texto cortado) y el único caso de cohesión. Gana el voto; frente a v4, 1 caso con regresión dura. **Desde el 2026-09-26 (decisión del usuario), v6 es el layout por defecto de la skill** (antes v4). `evidence/layout-v6/REPORT.md`.
  - Métricas de artefactos (2026-09-26, petición del usuario): `assocLengthMean`, `assocBendsPerEdge`, `bentNearAssociations`, `longAssociations` y `artifactTextOutsidePool` en `tools/layout-lab/lib/metrics.mjs`, grupo de legibilidad (el filtro duro no cambia). Valores de v0/v4/v5/v6 en `evidence/layout-v6/artifact-metrics.json`.
  - Revisión visual de v6 con capturas y propuestas A–G en `evidence/layout-review-20260926/REVIEW.md`. Mejora potencial de artefactos apuntada por el usuario (propuesta C; se llamó «v7» antes de asignar ese número): codos caros cerca + aire limitado por la distancia a su tarea, sin cohesión o con otro diseño. Sin hacer.
  - v7 = v6 + propuesta E con el añadido del usuario (2026-09-26): ancho común de pools y carriles que llenan el pool, sin la franja de 20 px de v0 arriba y abajo (`harness/v7/frames.ts`; solo crecen los marcos). 56/56, semántica idéntica, **pasa el filtro**, área igual; `poolWidthCV` a 0 en 18 casos. Lote `ab-v6-v7-20260926` (22: los 18 de varios pools y 4 de uno; `ab-batch --cases`): **v7 16, v6 6** (p = 0,05); el usuario cree que las 6 de v6 fueron errores de tecla y acepta el resultado tal como se votó. **Desde el 2026-09-26 (decisión del usuario: «es un cambio correcto»), v7 es el layout por defecto de la skill** (antes v6). Página de votación arreglada: al revisar con el lote completo avanza, tecla S y `#pNN`.
  - Candidatos v8–v12 (2026-09-26, trabajo autónomo autorizado por el usuario mientras estaba fuera): cada propuesta de la revisión es un candidato independiente sobre v7. v8 = C (artefactos con alcance limitado, barrido en `harness/ablation/`), v9 = G (etiquetas de eventos encima), v10 = D (ancho de tarea según la palabra), v11 = B (hacer sitio a los artefactos), v12 = A (bpmn-auto-layout con `Grid.addAfter` corregido y arranque en procesos sin inicio, copia MIT en el harness). Pasan el filtro v9 y v10; v8 falla por 1 etiqueta y v11/v12 por área. Lotes `ab-v7-vN-20260926` (41 parejas) pendientes de voto. Resumen con imágenes: `evidence/layout-candidates-20260926/SUMMARY.md`. El defecto sigue en v7.
  - v13 (2026-09-26, notas del usuario sobre v12): claridad de flujos tras el reparto de canales. Una cara de nodo no admite flujos que entran y salen; flujos sin origen ni destino común no comparten línea (se desplaza un segmento o se vuelve a trazar; se admiten cruces, no fusiones). Métricas nuevas `mixedFaces` y `ambiguousOverlaps`: v7 1/9 → v13 0/0; v12 + v13 también 0/0. Lotes `ab-v7-v13-20260926` y `ab-v12-v12clarity-20260926`. **Pendiente de decisión del usuario**: evento de inicio para pools cuyo primer nodo recibe un bucle; cambia el XML semántico (fuera de la regla de la etapa 8, motor congelado). `evidence/layout-v13/REPORT.md`.
  - Votos del usuario sobre v8–v12 frente a v7 (2026-09-26; `evidence/layout-vN/human-votes.json`): v8 2–1 (2 empates), **v9 6–0** (2), **v10 9–1** (1), **v11 8–1** (1), v12 4–2 (1). Ganadores claros: v9, v10 y v11; siguiente paso, combinarlos en una versión nueva y compararla con v7 antes de proponerla como defecto. Notas del usuario en `CONTINUAR.md`. v13 y v12 + v13 siguen sin votar. El defecto sigue en v7.
  - v14 = v7 + v10 + v11 + v9 sin reajustes (v9 al final, sobre la geometría definitiva; `harness/v14/combined.ts`). 56/56, semántica idéntica; frente a v7, 18 casos cambian, **ninguna regresión dura** y falla solo la banda de área en los 4 casos de v11 (+22,6 % a +27,7 %). `evidence/layout-v14/REPORT.md`.
  - v15 = v14 + un cambio de la regla de v11 (nota del usuario sobre `c-syn015-gemini`, primer carril agrandado sin necesidad): una banda solo se queda si cambia dónde va algún artefacto (`keepOnlyHelpfulBands` en `harness/v11/lane-room.ts`, neutra en v11 y v14, idénticos 56/56). Frente a v14 pasa el filtro y solo cambia ese caso (−90 px de alto). Se probaron y descartaron otros tres criterios (detalle en el informe). Lote `ab-v7-v15-20260926` (18 parejas): **v15 12, v7 1, 5 empates** (p = 0,003). **Desde el 2026-09-26 (decisión del usuario), v15 es el layout por defecto de la skill** (antes v7); paridad con v0 `passed=true` tras el cambio. `evidence/layout-v15/REPORT.md`.
  - Decisiones del usuario (2026-09-26, tras v15): v8 queda fuera. Experimento anotado: nombres de objetos de datos y almacenes encima cuando debajo chocan (como v9). Tarea pendiente aparte: evento de inicio en pools cuyo primer nodo recibe un bucle (`synthesizeImplicitStartEvents` solo cubre nodos sin entrada; detalle en `CONTINUAR.md`).
  - v16 = v15 + la regla de v9 para objetos de datos y almacenes (experimento pedido por el usuario): la pasada de v9 se generaliza como `raiseLabels(xml, tipos)` (v9 y v15 idénticos). Frente a v15 pasa el filtro; cambian 2 casos (etiquetas cruzadas por líneas −3 y −1). Lote `ab-v15-v16-20260926` (2 parejas) pendiente de voto. `evidence/layout-v16/REPORT.md`.
  - Corrección de v15 tras el voto (2026-09-26): en una generación real con Luna, las bandas de v11 dejaban flujos sueltos cuando el corte atravesaba una forma. Opción `safeCut` (activa en v15 y v16): el banco sale idéntico 56/56 y el caso real queda con 0 flujos sueltos. Votos: **v16 2–0** sobre v15; **v12 + v13 5–0** sobre v12. `evidence/layout-v15/REPORT.md`, `evidence/layout-v16/`, `evidence/layout-v13/`.
  - **v16 es el layout por defecto desde el 2026-09-26** (decisión del usuario; antes v15). Candidatos sobre v16, pendientes de voto: v17 = v16 + v13 (4 casos; falla el filtro por `find-a-job`, como v13); v18 = v16 + v12 + v13 (7 casos; falla por área en `find-a-job` +200 % y `c-syn015-gemini` +38 % y por etiquetas en 2 casos); v19 = v16 + propuesta H (etiquetas de flujo sobre formas 4 → 0; pasa el filtro). Votos: **v17 2–0** (2 empates), **v18 6–0** (2 empates, p = 0,03), **v19 4–0** (1 empate); «en general buenos cambios». v20 = v18 + v19 sin reajustes: frente a v18 pasa el filtro; frente a v16 cambian 10 casos y falla por el área de v12 (`find-a-job`, `c-syn015-gemini`) y 1 caso de etiquetas. Voto del lote `ab-v16-v20-20260926`: **v20 10, v16 0**, 1 empate (p = 0,002). **Desde el 2026-09-26 (decisión del usuario), v20 es el layout por defecto** (antes v16); `render-dsl` de prueba con v20 y paridad con v0 `passed=true` tras el cambio. `evidence/layout-v20/REPORT.md` y `human-votes.json`.
  - Votos del usuario sobre v13 frente a v7 (2026-09-26): v13 3, v7 0, 1 empate (p = 0,25). `planta-residuos` y `find-a-job` siguen con cruces donde se pierde el flujo. `evidence/layout-v13/human-votes.json`.
  - Banco (2026-09-26, nota del usuario en el voto de v20: «Elimina este ejemplo»): `f-s17-document-approval` queda excluido sin borrarlo (`excluded` en `tools/layout-lab/bench/manifest.json`; `loadBench` lo salta). Desde entonces el banco tiene 55 casos y la base es `skill-runs/layout/v20-20260926-b55`, cuyo `.bpmn` es idéntico al del render de 56 en los 55 casos.
  - Candidatos sobre v20 (2026-09-26, independientes y pendientes de voto):
    - v21 = desenredar líneas, por la nota del usuario en `c-syn015-chatgpt`. El enrutador de v13 (ahora configurable con `clarifyFlowsWith`; v20 re-renderizado idéntico) también reencamina flujos que cruzan otros. Prevé las etiquetas (coste 400 por pasar sobre el nombre de un evento o gateway o no dejar sitio al propio nombre) y pone el nombre de un evento de borde al lado de su línea de salida. Pasa el filtro: 19 casos, sin regresiones duras, cruces de secuencia −26 (`c-syn015-chatgpt` 19 → 11), a cambio de algún codo más. Lote `ab-v20-v21-20260926` (19). `evidence/layout-v21/REPORT.md`.
    - v22 = carriles compactos (paso pendiente de v12). Cada carril quita las filas de la rejilla que solo usan otros carriles antes del apilado. Pasa el filtro: 7 casos, área −2 % a −24 %, sin regresiones duras. `find-a-job` solo baja una fila: sus carriles usan muchas filas distintas. Lote `ab-v20-v22-20260926` (7). `evidence/layout-v22/REPORT.md`.
    - Votos del usuario (2026-09-26): **v22 7, v20 0** (p = 0,016); v21 11, v20 7, 1 empate (p = 0,48, sin notas). **Desde el 2026-09-26 (decisión del usuario), v22 es el layout por defecto** (antes v20); `render-dsl` de prueba con v22 y paridad con v0 `passed=true` tras el cambio.
    - v23 = v21 afinado con sus derrotas, con ablación. Se probaron tres ajustes: A, codos a 80, sin ningún efecto; B, flujos paralelos a menos de 10 px cuentan como fusionados; C, el enrutador deja de suponer el nombre de un gateway debajo del rombo (v0 lo pone en un vértice libre) y de contar los nombres de los extremos del propio flujo. C era la causa principal de las derrotas. v23 = v21 + B + C: pasa el filtro frente a v20 (17 casos), cruces −25, tramos compartidos −1 y casi sin codos añadidos (+0,05 frente a +0,77). `gemini-04` y `h-ml-01` vuelven a v20. Lote `ab-v20-v23-20260926` solo con los 7 casos de imagen nueva; los otros 10 son idénticos a v21 y heredan su voto. Voto: **v23 12, v20 3, 2 empates** en total (p ≈ 0,035). `evidence/layout-v23/REPORT.md`.
    - v24 = v22 + v23 sin reajustes: pasa el filtro frente a v22, v23 y v20; frente a v22 cambian 17 casos (cruces mejor en 13, peor en 0; área igual). Solo 4 combinan los dos cambios: lote `ab-v22-v24-20260926` (4); los otros 13 son v23 y heredan su voto. Voto: 2–2 en los 4; en total **v24 12, v22 3, 2 empates** (p ≈ 0,035). Las 2 derrotas (`c-syn006` r01, `planta-residuos`) repiten las de v21 y v23. **Desde el 2026-09-26 (decisión del usuario), v24 es el layout por defecto** (antes v22); `render-dsl` de prueba con v24 y paridad con v0 `passed=true`. `evidence/layout-v24/REPORT.md`.
    - Idea anotada (nota del usuario en `c-syn009`): separación mínima entre una línea y la tarea a la que no pertenece.
  - Mejoras futuras (2026-09-26, petición del usuario): skill `bpmn-edit`, experimentos con ediciones humanas, anotación con recuadros y skill de evaluación de modelos. Detalle en `plans/mejoras-futuras.md`; estado en la sección 9.
  - Anotado (2026-09-26, nota del usuario): propuesta H, etiquetas de flujo que chocan con la tarea de destino; hay que desplazarlas a la izquierda según la longitud del texto. En v7, 4 casos, todos en `c-syn015-chatgpt`. Detalle en `evidence/layout-review-20260926/REVIEW.md`. Sin hacer. `evidence/layout-v7/REPORT.md`.

### 9. Mejoras futuras — `plans/mejoras-futuras.md`

Decisiones del usuario (2026-09-26):
- Orden: **1 → 4 → 3 → 2**, una mejora cada vez, con un plan corto en `plans/<mejora>.md` antes de implementar.
- Todas las skills en este mismo repositorio, cada una en `skills/<nombre>/`, con la organización SOLID de `skills/bpmn` y reutilizando sus módulos.

- [x] **Mejora 1, skill `bpmn-edit`** (2026-09-26; hecha y probada en local; falta la prueba del usuario). Plan: `plans/bpmn-edit.md`.
  - Decisiones: al cambiar el DSL se rehace desde el motor, con aviso y «Volver al DSL anterior» (A), y la opción C (reaplicar ediciones como desplazamientos) es el paso siguiente; con `--run` se guarda en `<runDir>/edits/`; el lienzo solo cambia el layout.
  - `open --run|--dsl|--bpmn` sirve una página en 127.0.0.1. El servidor compila y exporta con la `HarnessSession` de `bpmn` y el nuevo `exportLayout`, con los mismos exportadores, la misma presentación de flujos de mensaje y las mismas comprobaciones. Rechaza con 409 cualquier guardado cuyo XML semántico cambie. Deja `edits.json`, `engine.bpmn`, `user.bpmn` y `edit-diff.json`.
  - Refactors compartidos: `allocateRunDir` (`run-store.mjs`) y `open-browser.mjs` (lo usa `vote`).
  - Pruebas: 6/6, `verify-source` 3319/0, laboratorio 8/8 y paridad `passed=true` (`skill-runs/parity-20260926-bpmnedit`). Evidencia en `evidence/bpmn-edit/REPORT.md`.
- [ ] Mejora 4, skill de evaluación de modelos: siguiente.
- [ ] Mejora 3, anotar defectos con recuadros.
- [ ] Mejora 2, experimentos con ediciones humanas.

## Disciplina de seguimiento

Al continuar, marcar cada casilla solo con evidencia. Registrar cambios, comandos relevantes, resultados y limitaciones sin confundir lectura del código con pruebas ejecutadas. Empezar por la etapa 1; no optimizar el diseño hasta cerrar la paridad. Eliminar evaluación o cambiar modelo, esfuerzo, prompt base o algoritmos de layout requiere una petición posterior que cambie este alcance.


## Evidencia de etapa 1 — ejecución local 2026-09-22

El desarrollo vigente está en este clon nuevo; no se ha realizado ningún commit, push, PR ni escritura remota. El origen protegido mantiene HEAD f558eb0e0904c02264d5dccb6ad76164fda22919 y archivos versionados intactos. Dependencias ignoradas instaladas en ambos checkouts; entornos Python/Chromium y caches conservados fuera del contenido versionable.

- `baseline-stage1/REPORT.md`: resultados, revisión visual de diez PNG, cobertura y exclusiones. `audit.json`, `corpus-inventory.json`, `rendered/`, `original/` y `logs/` conservan la evidencia original, sin regenerarla sobre el motor candidato.
- Node 24.12.0 / pnpm 11.19.0, frozen lock intacto; jsdom exige ^20.19.0 || ^22.13.0 || >=24.0.0. Playwright 1.60.0 / Chromium 148.0.7778.96; Python 3.14.0 aislado. Dependencias Python fijadas en `smoke/python-requirements.txt`.
- Build pasa. Core: 167 pasan/1 fallo previo en orthogonal.test.ts:260 (98 frente a 58); tfm-lab: 37 pasan. Pytest: 67 pasan con temporal local; primer intento falló por permisos de temporales (53 pasan/14 errores). No se corrigió el motor para alterar esta referencia.
- Diez fixtures válidos exportan/reimportan BPMN DI, SVG, PNG; dos inválidos producen semantic_error sin imágenes. `semantic.bpmn`, DSL, diagnósticos, checks y hashes están guardados. OR inclusivo no aparece soportado por la síntesis DSL inspeccionada: exclusión explícita; XOR/AND/event-based sí cubiertos.
- Primer caso con runner original frente al wrapper: BPMN y PNG idénticos; SVG idéntico normalizando únicamente IDs aleatorios de markers. Desde el nuevo destino, los diez casos conservan esa paridad. El snapshot conserva 3319 archivos verificados; solo se amplía .gitignore y se añaden documentos/herramientas/evidencia, sin cambiar motor, prompts, harness o evaluación.
- `smoke/README.md` documenta ejecución portable; `smoke/run.mjs` usa el harness original, localhost y outputs nuevos, sin llamadas al modelo. `smoke/package.py` construye ZIP con snapshot completo y atribuciones, sin Git ni runtimes instalados. `deliverables/` está ignorado.
- Work web: pendiente, no accesible en esta tarea; no se ha creado tarea cloud. Luna/high: anunciado en el esquema local, no invocado; esquema/capacidad y selección efectiva en Work pendientes por separado. Cero generaciones y ninguna sustitución. No marcar estas dos casillas como verificadas.
- Bizagi, pruebas inyectadas de timeout/Chromium ausente/exportación parcial y validación real de skill quedan pendientes de sus etapas. No se ha desplegado servicio ni instalado/construido la skill completa.


Prueba final del paquete: ZIP extraído en `portable-check/`, sin node_modules ni Git. Instalación frozen nueva (cache local reutilizada), verificación de 3319 archivos y smoke completo: códigos 0/0/0 (install/render/compare). Chromium se reutilizó desde la instalación local fijada; no se probó descarga en Work. Los diez casos conservan BPMN/PNG byte idénticos y SVG normalizados idénticos. Evidencia: `baseline-stage1/portable-summary.json`, `portable-comparison.json` y logs `portable-*`. La regeneración final del ZIP solo incorpora esta evidencia/documentación, sin cambios de código desde el ZIP probado.

## Evidencia de etapas 2–5 — ejecución local 2026-09-25

Detalle: `evidence/skill-stage2-5/REPORT.md` y `parity-summary.json`. Cero generaciones de modelo; Work web sin probar.

- Skill en `skills/bpmn/` (validador de skill-creator: válida). CLI `scripts/bpmn.mjs`: `prepare`, `render`, `repair-prompt`, `fail`, `render-dsl`, `evaluate`, `doctor`. Reutiliza sin cambios el harness `index.headless.html` (`renderExperiment`, `renderArtifactsFromLayout`); `smoke/verify-source.mjs` sigue en 3319/0.
- Paridad (`tools/skill-parity/parity.mjs`): 10 casos válidos con BPMN, XML semántico y DSL normalizado idénticos al baseline y SVG idéntico normalizando marcadores; 2 inválidos con el mismo `semantic_error`. Fallos inyectados correctos: Chromium ausente y timeout → `infrastructure_error`; PNG no codificable → `partial_export` con BPMN y SVG.
- Deriva del PNG: con las mismas versiones, el runner original ya no reproduce hoy los bytes PNG del 22/09 (antialiasing, máx. 4/255 en ≤1,6 % de píxeles, mismas dimensiones). El adaptador es idéntico byte a byte al runner original ejecutado hoy. Raster por software (SwiftShader) y determinista; causa exacta no identificada. Tolerancia medida solo para esa comparación: `PNG_TOLERANCE` en `tools/skill-parity/pngdiff.mjs`. `smoke/compare.mjs` (estricto) no se ha cambiado y hoy falla en PNG en esta máquina.
- Prompt: `input_prompt.md` idéntico a `Handoff.tsx buildPrompt()` (comprobado contra la plantilla del fuente, CRLF del v5 conservado).
- Evaluación: `evaluate` copia la ejecución a `<run>/evaluation/staging/EXP-SKILL-…` y escribe ahí las 10 métricas; `TFM-eval/results/` intacto.
- Fidelidad al corpus del TFM (`tools/skill-parity/tfm-history.mjs`): 351 experimentos con DSL y `diagram.bpmn` → 346 idénticos al guardado (solo difiere el CRLF que añadió Git) y 351/351 con el mismo estado. Los 5 restantes (v3.1, 2026-06-14) vienen de un motor anterior: el runner original del TFM de hoy da los mismos bytes que la skill en los 5 (`evidence/skill-stage2-5/tfm-history-stale.json`).

### Decisiones 2026-09-25

- **Skill genérica respecto al host.** La parte determinista es un CLI de Node sin dependencias de un agente concreto. La generación la hace el host con el modelo de `config/generators.json` (decisión 3; sustituye la regla inicial de "fallar si no hay Luna"). El modelo real queda registrado por intento con `matchesRequested`; nunca se afirma haber usado un modelo que no se usó.
- **`interfaceType`.** No se modifica el harness congelado (rompería `verify-source` y la paridad). `result.json` conserva `"web"` heredado; `run-info.json` registra `interfaceType: "skill"` (o `"skill-dsl"`). Los históricos se leen igual.
- **Consistencia de la ejecución.** Un formato solo se entrega si pasa su comprobación (DI reimportable, cada elemento del DI dibujado en el SVG, PNG del tamaño del viewBox). La raíz de la ejecución refleja siempre el último intento.
- **Descartado por el usuario (2026-09-25):** llamar a la API de OpenAI con `OPENAI_API_KEY`. No usar API keys.
- **Refactor SOLID (2026-09-25):** `scripts/bpmn.mjs` solo despacha; `scripts/commands/` un archivo por comando; `scripts/lib/` una responsabilidad por módulo (argumentos, estados, motor, prompt, harness, artefactos, carpeta de ejecución, generadores). Tras el refactor la batería de paridad sigue pasando entera.
- **Traspaso al generador por archivo (arreglo 2026-09-25):** en la primera ejecución real desde Claude, el subagente se negó (estaba instalado con `tools: []` y "no uses herramientas") y copiar el prompt de 70 KB en el mensaje no era viable, así que la conversación redactó el DSL (registrado con `matchesRequested: false`). Ahora `prepare` y `repair-prompt` devuelven `handoff.message`: el generador lee `promptFile` y escribe su respuesta literal en `replyFile`. El subagente tiene solo `Read, Write`. `doctor` comprueba todas las copias del subagente: la del proyecto tiene prioridad y había una antigua en la carpeta padre. Mecanismo verificado con un agente Opus genérico (leyó 70 KB, escribió la respuesta y el render dio `success`). El subagente corregido requiere reiniciar la sesión para cargarse; sigue pendiente una generación con él.
- **Falso positivo corregido:** la comprobación SVG↔BPMN excluía IDs acabados en `_label`; una tarea "Print visit label" daba `partial_export`. Ya no se filtra.

Siguiente paso: primera generación real (etapa 3) — en Claude Code con el subagente `bpmn-dsl-generator` (Opus 5.5/low; requiere reiniciar la sesión tras crear `.claude/agents/`) y en ChatGPT/Codex con Luna/high —, prueba del paquete en Work web y empaquetado autocontenido (etapa 7).
