# Plan e instrucciones: convertir BPMN-DSL-Monorepo en una skill

## Repositorio de trabajo vigente — actualización del usuario

El 2026-09-22 el usuario autorizó crear el commit local de esta preparación en `Skill-BPMN-v2`. Esta autorización sustituye las restricciones anteriores sobre commits en el nuevo repositorio; se mantiene la prohibición de push y la protección completa del repositorio original. Las menciones posteriores a ausencia de commits describen el estado histórico previo a esta autorización.

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

Todo desarrollo nuevo de la skill, adaptadores, paquetes, informes, baseline y resultados irá fuera del clon, en esta carpeta de proyecto, o en una copia de trabajo independiente sin remoto de escritura. Las rutas de creación propuestas más abajo (incluida `skills/bpmn-desde-resumen/` dentro del repositorio) quedan sustituidas por rutas equivalentes fuera del clon. No inicializar ni realizar commits en un repositorio nuevo sin petición posterior del usuario. No revertir cambios ajenos si aparecen: identificarlos y preservarlos.

En la comprobación del 2026-09-22, el clon seguía limpio y HEAD y origin/HEAD coincidían con `f558eb0e0904c02264d5dccb6ad76164fda22919`. Los documentos AGENTS.md y CONTINUAR.md se encuentran fuera del clon y no modifican el repositorio original.

1. Priorizar la fidelidad al comportamiento actual sobre simplificar o reescribir el motor.
2. El modelo genera DSL; el motor genera el XML y su geometría. No sustituir esta vía por XML escrito directamente por el modelo, Mermaid, dibujos a mano o generación de imágenes.
3. Usar el identificador `gpt-5.6-luna` y esfuerzo `high` en el subagente generador. Es la elección del usuario por coherencia y coste; no afirmar que equivale a GPT 5.5 ni que su calidad ya se ha medido.
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

### 2. Definir el contrato de la skill — pendiente

- [ ] Crear dentro del repositorio `skills/bpmn-desde-resumen/` cuando se inicie la implementación; mantener un `SKILL.md` breve y referencias de lectura selectiva.
- [ ] Contrato de entrada: resumen en lenguaje natural, destino de salida y opción de adjuntar prompt. Preservar idioma, actores, decisiones y restricciones del resumen; pedir aclaración solo si falta información material y registrar supuestos.
- [ ] Separar instrucciones de generación, ejecución determinista y evaluación. El corpus completo y la evaluación no se cargan en el contexto de cada generación.
- [ ] Definir estructura por ejecución: `diagram.bpmn`, `diagram.svg`, `diagram.png` y trazabilidad interna (`raw_output.txt`, `normalized.dsl`, `input_prompt.md`, `run-info.json`, `result.json`). El prompt se conserva para reproducibilidad y se adjunta al usuario solo cuando se solicite.
- [ ] Definir estados de éxito, advertencias, error de generación, compilación, render y exportación parcial; nunca presentar los tres entregables como disponibles sin comprobarlos.

Aceptación: contrato inequívoco y ejemplo de uso desde un resumen hasta los tres archivos, sin exigir interacción con una web.

### 3. Delegación al modelo — pendiente

- [ ] La skill debe solicitar un subagente con `model="gpt-5.6-luna"`, `reasoning_effort="high"` y contexto mínimo (`fork_turns="none"` cuando ese sea el contrato de la herramienta disponible).
- [ ] Dar al generador el prompt v5 seleccionado completo y el resumen exacto, sin historiales de investigación ni instrucciones que reescriban el estilo del prompt. Su trabajo termina en el DSL; el proceso principal ejecuta el motor.
- [ ] Verificar el modelo y esfuerzo realmente seleccionados en la ejecución. La metadata de `agents/openai.yaml` no sustituye la configuración de la llamada al subagente.
- [ ] Si no existe la capacidad de delegar con ese modelo/esfuerzo, informar de la limitación; no sustituirlo silenciosamente ni afirmar que se utilizó Luna. No crear tareas independientes en la barra lateral para simular subagentes.
- [ ] Conservar respuesta cruda y normalizarla con la lógica existente sin perder líneas vacías significativas. Registrar modelo, esfuerzo, prompt, hashes, intentos y consumo/tiempo si la herramienta los expone; no inventar métricas ausentes.
- [ ] Permitir como máximo dos correcciones adicionales motivadas por diagnósticos concretos. Guardar cada intento y el primero sin reparar. No regenerar indefinidamente ni corregir solo para mejorar una puntuación.

Aceptación: una generación real deja evidencia de Luna/high y produce DSL procesable, o comunica un fallo identificable sin ocultarlo.

### 4. Adaptador portable y exportación — pendiente

- [ ] Crear un comando para procesar un DSL individual y un directorio de salida, independiente del catálogo de experimentos y del nombre `EXP-*`.
- [ ] Reutilizar inicialmente el harness de tfm-lab y los exportadores compartidos; extraer módulos solo cuando sea necesario y sin duplicar el motor. Mantener `evaluateDslPipeline` como referencia del tratamiento de errores.
- [ ] Ejecutar Chromium sin interfaz, con servidor limitado a localhost, puerto libre, timeout y cierre garantizado de navegador/servidor.
- [ ] Escribir BPMN DI desde el layout final; exportar SVG del mismo modeler y PNG del mismo SVG. Comprobar que los tres representan la misma ejecución, no un diagrama anterior retenido tras un fallo.
- [ ] Propagar errores parciales de exportación: el harness actual puede devolver SVG/PNG nulos aunque el pipeline haya renderizado. Comprobar disponibilidad, contenido y dimensiones por separado.
- [ ] Usar directorios únicos por ejecución y aceptar rutas Windows con espacios. Conservar diagnóstico y archivos válidos si un formato falla; no sobrescribir históricos por defecto.
- [ ] Revisar `interfaceType`, actualmente restringido a `"web"` en tipos/metadatos, para registrar la nueva vía de skill manteniendo lectura de resultados históricos.

Aceptación: un DSL de prueba produce BPMN, SVG y PNG utilizables desde el comando del adaptador, sin pasos manuales y conservando la cadena completa de diseño. Registrar por separado resultados locales y resultados de Work web; no confundirlos.

### 5. Comprobar paridad visual y semántica — pendiente

- [ ] Comparar el mismo DSL en el baseline y en el adaptador, sin llamar al modelo. Esto aísla el efecto del empaquetado y del render del cambio de modelo.
- [ ] Comparar nodos, tipos, conexiones, nombres, condiciones, pools y carriles; comparar posiciones, dimensiones, waypoints y bounds de etiquetas del DI.
- [ ] Buscar igualdad del SVG y PNG en el entorno fijado. Si hay diferencias no semánticas de serialización o rasterización, documentar su causa y una tolerancia medida; no aceptar un umbral amplio sin inspección.
- [ ] Revisar visualmente recortes, solapes, legibilidad, cruces, distribución de carriles, etiquetas y artefactos. No exigir que el baseline sea perfecto: exigir que la conversión no lo empeore.
- [ ] Reimportar los BPMN exportados; probar Bizagi cuando esté disponible y registrar versión y resultado. Si no se prueba, dejarlo explícitamente pendiente.
- [ ] Verificar los casos de fallo: DSL inválido, ausencia de Chromium, timeout y fallo parcial de exportación.

Aceptación: ninguna regresión semántica o geométrica inexplicada en la muestra; diferencias visuales justificadas y revisadas. No atribuir a la skill una garantía visual basada solo en validación XML.

### 6. Conservar e integrar evaluación — pendiente

- [ ] Mantener las diez métricas de `TFM-eval`, esquemas XSD, pruebas, comparación zero-shot y resultados históricos.
- [ ] Conservar M1–M5 y M8 como puntuaciones; M6, M7, M9 y M10 son descriptivas y su `score=1.0` no significa excelencia ni debe mejorar artificialmente un promedio de calidad.
- [ ] Añadir una ruta de evaluación opcional por ejecución o lote, con JSON/CSV en destinos nuevos. El orquestador actual fija la salida en `TFM-eval/results/experiments`; no usarlo sin aislar sus salidas para nuevas pruebas.
- [ ] Separar tres preguntas: fidelidad del motor al baseline, fidelidad del modelo al resumen y calidad visual del diagrama. Las métricas semánticas existentes no miden por sí solas las dos últimas.
- [ ] Evaluar Luna/high con el mismo conjunto de resúmenes y prompt fijado. Definir antes del lote un número de repeticiones y límite de coste; registrar fallos, no solo ejecuciones exitosas.
- [ ] Comparar GPT 5.5 histórico solo cuando proceso, prompt y condiciones sean comparables; identificar las diferencias de configuración. Distinguir primer intento de resultado reparado.
- [ ] Mantener rúbrica visual y evidencias junto al benchmark. Cada mejora futura debe versionar prompt o motor y mostrar comparación antes/después sin borrar la referencia.

Aceptación: evaluación ejecutable sin la interfaz web, reportes trazables y capacidad de iterar sin contaminar datos históricos.

### 7. Empaquetar y validar uso real — pendiente

- [ ] Completar `SKILL.md`, referencias necesarias, scripts y metadata de interfaz. Mantener automática la selección de la skill salvo petición contraria.
- [ ] Preparar un paquete reproducible con el motor, harness y recursos necesarios o un mecanismo explícito de instalación fijado al commit; no depender de una ruta absoluta de este equipo ni de descargar HEAD en cada uso.
- [ ] Conservar dependencias y avisos pertinentes; no incluir todo el corpus o los entornos instalados en el contexto de generación. La evaluación y las aplicaciones siguen disponibles en el repositorio.
- [ ] Ejecutar el validador de skill-creator y una prueba integral desde una ubicación limpia, fuera de la ruta de desarrollo original.
- [ ] Validar al menos un resumen sencillo, uno con varios participantes y uno ambiguo o inválido. Verificar delegación, diagnósticos, entrega y prompt opcional.
- [ ] Mostrar PNG en la respuesta y enlazar los tres archivos usando rutas absolutas. Adjuntar prompt e informes cuando se pidan, sin llenar la respuesta de archivos internos.
- [ ] Instalar para uso habitual cuando el usuario solicite esa entrega; documentar dependencias reales y cualquier limitación restante.

Aceptación: la skill instalada resuelve resumen → Luna/high → DSL → motor original → PNG/BPMN/SVG con paridad demostrada y evaluación disponible.

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
