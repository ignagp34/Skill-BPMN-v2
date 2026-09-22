# Prueba determinista para Work web — etapa 1

Este paquete procesa 12 entradas existentes: 10 deben producir BPMN con DI, SVG y PNG; dos deben fallar con `semantic_error` sin exportar diagramas. No llama a ningún modelo, no crea tareas cloud y no despliega servicios. Reutiliza sin cambios el harness, auto-layout, todas las fases del motor y los exportadores del commit `f558eb0e0904c02264d5dccb6ad76164fda22919`.

**Estado: probado en Windows local; Work web y Luna/high en Work pendientes.** El campo heredado `interfaceType: web` identifica el harness original, no acredita una ejecución en Work. `workWebValidated: false` es conservador: la evidencia del entorno objetivo debe acompañarse en un informe separado, no inferirse automáticamente.

## Ejecutar desde una carpeta limpia

Extraer `bpmn-stage1-portable.zip`. El ZIP incluye código fuente, evaluación, corpus histórico, atribuciones, entradas y baseline; no incluye Git, dependencias, navegadores, fuentes del sistema ni entornos virtuales. Abrir una terminal en la raíz extraída. Se necesitan acceso al registro npm y a la descarga de Playwright, permiso para lanzar procesos y escuchar en localhost.

Referencia exacta: Node **24.12.0**, pnpm **11.19.0**, Playwright **1.60.0**, Chromium **148.0.7778.96**, Windows 10.0.26200 x64. Los engines efectivos son más estrictos que Node >=20: jsdom exige `^20.19.0 || ^22.13.0 || >=24.0.0`. Para comparar usar Node 24.12.0. Instalar pnpm 11.19.0 con el mecanismo permitido por el entorno; no es preciso modificar el manifiesto ni el lockfile.

```sh
node --version
pnpm --version
node smoke/verify-source.mjs
pnpm install --frozen-lockfile
node apps/tfm-lab/node_modules/playwright/cli.js install chromium
node smoke/run.mjs smoke-output
node smoke/compare.mjs smoke-output
```

En Linux, si faltan bibliotecas del sistema y el entorno permite instalarlas, el comando oficial de Playwright es `node apps/tfm-lab/node_modules/playwright/cli.js install --with-deps chromium`. Registrar el error si no se dispone de ese permiso; no sustituir el motor. `PLAYWRIGHT_BROWSERS_PATH` permite elegir una carpeta escribible para el navegador. En la prueba Windows se utilizó una carpeta externa al repositorio. Se evita `pnpm exec playwright` porque el lanzador local observado añadía caracteres `^` a los argumentos; la entrada Node directa funcionó.

`smoke-output` debe ser nuevo: el runner rechaza sobrescrituras. Usa puerto libre en 127.0.0.1, navegador headless, contexto nuevo por caso, timeout de 120 segundos por evaluación y cierre de navegador/servidor en finally. Guarda todos los archivos válidos, diagnósticos, dimensiones y SHA-256. Un error de render o exportación parcial produce código de salida no cero. En entradas inválidas no se exporta la imagen de un caso anterior.

El primer comando comprueba 3319 archivos del snapshot original (se excluye únicamente `.gitignore`, ampliado para el nuevo proyecto). No pretende comprobar la integridad criptográfica del propio manifiesto: el ZIP tiene un SHA-256 externo. El smoke rechaza cambios al motor congelado; las futuras pruebas de un motor candidato necesitan otra vía y siempre compararán con este baseline inmutable.

## Qué comprobar en Work

1. Registrar identificación del entorno real, sistema operativo, Node/pnpm, permisos, salida de instalación y versión efectiva de Chromium.
2. Ejecutar los comandos. Verificar `summary.json`: 12 casos, 10 conjuntos completos, dos errores semánticos esperados; los BPMN válidos se reimportan con el modeler original. Conservar logs y archivos como evidencia cloud.
3. Comparar `comparison.json` y revisar los PNG. En Windows fijado, la referencia coincide byte a byte en BPMN y PNG y en SVG tras normalizar solo IDs aleatorios de marcadores. En Linux pueden cambiar fuentes, métricas de texto y rasterización: una diferencia requiere explicación y revisión, no un umbral amplio automático. No exigir igualdad de timestamps o IDs SVG aleatorios. El runner no añade fondo al PNG.
4. Registrar por separado las herramientas reales de delegación disponibles en Work: si aceptan `model="gpt-5.6-luna"`, `reasoning_effort="high"` y contexto mínimo. Leer su esquema sin invocar generaciones en este smoke. La sesión desktop anuncia esa combinación; esto no prueba Work ni una selección efectiva. Si falta la capacidad, dejarla bloqueada para la etapa 3 sin sustituir modelo. Una generación real posterior será necesaria para demostrar selección efectiva.

No se ha abierto una tarea cloud ni probado Bizagi. No se ha desplegado una API alternativa. No se ha implementado aún una skill completa ni un comando de producción para DSL arbitrario.

## Comprobaciones de proyecto y Python

```sh
pnpm test
pnpm build
pnpm --filter tfm-lab test
python -m venv .venv
# Linux/macOS:
.venv/bin/python -m pip install -r smoke/python-requirements.txt
.venv/bin/python -m pip install --no-deps --no-build-isolation -e ./TFM-eval
cd TFM-eval
../.venv/bin/python -m pytest --basetemp ../.tmp/pytest-stage1
```

En Windows sustituir `.venv/bin/python` por `.venv/Scripts/python.exe`. La referencia Python usa **3.14.0**, entorno aislado, dependencias fijadas en `python-requirements.txt` y backend setuptools incluido. El manifiesto permite >=3.11, pero no se ha probado cada versión. Si pip queda bloqueado al descargar, la instalación local se completó con `uv pip install --python <python-del-venv> --cache-dir <cache-local> -e './TFM-eval[dev]'`; conservar las versiones resueltas del archivo fijado para reproducciones.

Resultados previos: build pasa; core 167 pruebas pasan y 1 falla (`orthogonal.test.ts:260`, esperado 58, obtenido 98); tfm-lab 37 pasan. Python: primer intento 53 pasan/14 errores por permisos del directorio temporal; con basetemp escribible, 67 pasan. Son resultados del origen congelado, no fallos introducidos por la conversión.

Ver `../baseline-stage1/REPORT.md` para cobertura, inventario y revisión visual. Los logs iniciales conservan rutas históricas de procedencia; la ejecución del paquete no depende de ellas.
