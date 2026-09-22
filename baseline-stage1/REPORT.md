# Evidencia de etapa 1 — 2026-09-22

Referencia local congelada del motor `f558eb0e0904c02264d5dccb6ad76164fda22919`. Se empezó en el clon original limpio y, por instrucción posterior, se trasladaron selectivamente herramientas y evidencia a `Skill-BPMN-v2`. No se han realizado commits, pushes, PRs ni escrituras remotas. Los archivos versionados del origen, sus históricos y lockfile permanecen intactos. El nuevo repositorio conserva el snapshot completo, sin Git del origen, y añade solo preparación, documentación y evidencia.

## Pruebas y dependencias

| Comprobación | Resultado |
| --- | --- |
| `pnpm install --frozen-lockfile` | Correcto en origen y nuevo destino; lock SHA-256 `cfba9ce5af3308ff70b78db503d2a4c3b6b627e1b346bf7e8383ae6feb3a1ee4` |
| Runtime | Node 24.12.0; pnpm 11.19.0; Python 3.14.0 aislado |
| Render | Playwright 1.60.0; Chromium 148.0.7778.96; Windows 10.0.26200 x64 |
| `pnpm test` | Core: 167 pasan, 1 falla; la ejecución recursiva para antes de tfm-lab |
| Fallo previo | `packages/bpmn-core/tests/render/orthogonal.test.ts:260`: entrada superior a Input customer order, esperado 58 y obtenido 98 |
| `pnpm --filter tfm-lab test` | 37 pasan; company-web no define suite |
| `pnpm build` | Pasa los proyectos; advertencias de tamaño de bundle |
| `pytest` | 53 pasan/14 errores por temporales sin permiso; repitiendo con `--basetemp` local: 67 pasan |
| Harness original | `original/EXP-FIXTURE-BASELINE-LOCAL-NONE-R01`: éxito con advertencias, tres formatos |
| Muestra congelada | `rendered/`: 10 casos válidos con tres formatos, 2 errores semánticos esperados sin diagramas |
| Reimportación | 10/10 BPMN válidos reimportan y vuelven a exportar imágenes en bpmn-js |
| Nuevo destino | 3319 archivos del snapshot verificados; todos los casos pasan de nuevo; comparación completa sin diferencias de BPMN/PNG/SVG normalizado |

Los logs se conservan en `logs/`. `audit.json` conserva versiones, engines, hashes del prompt v5 y Handoff, hashes de Arial y conteos BPMN. La familia del SVG es Arial, sans-serif. No se redistribuyen las fuentes del sistema ni se garantiza paridad tipográfica con Linux. El exportador conserva transparencia y dimensiones originales. Python se instaló con uv tras quedar pip esperando dependencias de build; no se modificó pyproject.toml. Se fija setuptools 84.0.0 junto al resto de dependencias para repetir la instalación sin resolución del backend.

## Cobertura y límites reales

| Caso | Cobertura |
| --- | --- |
| simple | Secuencia de dos tareas y dos carriles; literal existente de `semantic.test.ts:64` |
| s17-document-approval | Bucle, pregunta, documentos y data store; primer caso del runner original |
| canon-1-cheeseburger | Paralelismo AND, sincronización, carriles y etiquetas largas |
| pool-map-message-event | Pools explícitos, carriles y flujo de mensaje |
| gemini-03 | XOR, varios pools, anotaciones y textos largos |
| gemini-04 | XOR de varias alternativas, bucles, datos y anotaciones |
| gemini-05 | Evento temporal y borde interruptivo, bucle, anotación |
| s17-job-application | AND y borde no interruptivo |
| s17-pizza-order | Gateway basado en eventos, recepción, timer, terminación |
| es-almacen | Acentos, varios carriles y trazas; se conserva la interpretación actual del motor |
| ap6-trace-ends-at-anchor / ap7-anchor-buried | Errores semánticos AP-6/AP-7 esperados |

OR inclusivo no se da por soportado: el código DSL inspeccionado no sintetiza `inclusiveGateway`, y la muestra no lo produce. Las alternativas múltiples de gemini-04 son XOR. No se ha inventado una fixture OR ni cambiado la gramática para cubrirla. La muestra es de fixtures existentes, no una evaluación del modelo sobre los resúmenes históricos. La emisión semántica del caso document-approval no contiene gateway XOR pese a su pregunta: conservar el comportamiento observado no valida su fidelidad al proceso.

## Paridad y revisión visual

El primer caso ejecutado por el runner original y por el wrapper conserva BPMN y PNG byte a byte. El SVG solo difiere en IDs aleatorios `marker-*` y sus referencias; normalizados por orden de declaración, coincide completo. Se conservan ambos originales y sus hashes. Tras trasladar al nuevo destino, la comparación se extendió a los 10 casos: BPMN y PNG idénticos; SVG normalizados idénticos. No se aplicó tolerancia geométrica ni visual.

Se revisaron visualmente los diez PNG. Son observaciones del baseline, no correcciones:

- simple, pizza y pools/mensajes: tareas, conectores y carriles legibles; el flujo de mensaje atraviesa el espacio transparente entre pools.
- document-approval: documento sobre la tarea y datos fuera del pool; parte del texto se ve mal sobre un visor oscuro por transparencia. No se añadió fondo ni se recolocaron artefactos.
- canon-1: diagrama muy ancho; exige zoom para leer a tamaño de pantalla. La entrada lateral del primer nodo coincide con el fallo previo de la prueba de enrutado.
- gemini-03: anotación del pool Self-Employed roza/solapa la tarea; algunos textos de inicio están próximos a los títulos verticales. Se preserva.
- gemini-04: asociaciones de datos y anotaciones cruzan la zona central; bucles extendidos, sin recorte exterior evidente.
- gemini-05: borde temporal y retornos visibles, etiqueta del timer legible; diagrama ancho.
- job-application: mucho espacio vacío en Candidate y trayectos largos del borde; no se compactó.
- es-almacen: dos inicios y retorno largo; no se reinterpretaron las trazas ni la pregunta.

La revisión fue de conjunto (las imágenes de canon-1 y gemini-05 se redujeron en el visor). No sustituye una auditoría exhaustiva de solapes ni la fidelidad al resumen. Bizagi, fallos inyectados de timeout/ausencia de Chromium/exportación parcial y paridad en otro sistema operativo quedan para etapas posteriores.

## Inventario histórico

`corpus-inventory.json` registra los **441** directorios reales: 375 con raw_output.txt u output.dsl, 375 con normalized_dsl.txt y 396 con diagram.bpmn. Ninguno incluye a la vez BPMN, SVG, PNG y result.json. Hay 66 sin las dos convenciones de salida cruda; esto no los convierte automáticamente en pendientes porque algunos conservan XML/resultados. Los estados declarados son 199 success, 191 success_with_warnings, 24 semantic_error, 6 bpmn_xml_error y 21 sin metadata de estado. No se usaron los 445 anunciados por README como tamaño real ni se sobreescribieron históricos.

## Pendientes cloud separados

No hay entorno de ejecución de Work web accesible en esta tarea. El paquete y `smoke/README.md` permiten continuar allí. Ni la ejecución Windows ni la reubicación local validan Work.

El esquema local de subagentes anuncia `gpt-5.6-luna` y esfuerzo `high`; no se invocó. La capacidad de delegación en Work y la selección efectiva del modelo/esfuerzo siguen sin verificar. Cero llamadas de generación, sin sustituciones de modelo. No hay servicio desplegado ni skill instalada.


Prueba final del paquete: ZIP extraído en `portable-check/`, sin node_modules ni Git. Instalación frozen nueva (cache local reutilizada), verificación de 3319 archivos y smoke completo: códigos 0/0/0 (install/render/compare). Chromium se reutilizó desde la instalación local fijada; no se probó descarga en Work. Los diez casos conservan BPMN/PNG byte idénticos y SVG normalizados idénticos. Evidencia: `baseline-stage1/portable-summary.json`, `portable-comparison.json` y logs `portable-*`. La regeneración final del ZIP solo incorpora esta evidencia/documentación, sin cambios de código desde el ZIP probado.
