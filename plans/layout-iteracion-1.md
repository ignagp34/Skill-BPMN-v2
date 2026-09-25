# Plan — iteración 1 de mejora del layout

Estado: **propuesta, sin implementar** (2026-09-25). Nada de este plan está programado.

## Punto de partida

- El layout actual es el del TFM (`layout v0`): `sanitizeForLayout → bpmn-auto-layout → layoutMissingProcesses → placePoolsAndLanes → orthogonalize → distributeParallelChannels → placeLabels → extendOuterLanes → placeArtifacts`. La skill lo reproduce exactamente (351/351 experimentos del corpus).
- **Pools múltiples:** `bpmn-auto-layout 0.5.0` solo coloca el primer proceso. Los demás pools los rellena `layout-missing.ts` con una fila horizontal por orden topológico ("horizontal stride"). No hay auto-layout real en el segundo pool y siguientes. Es el origen más probable de los peores diagramas multi-pool.
- **Métricas actuales:** solo son locales y sirven para *decidir* colocaciones, no para *evaluar* el diagrama. `placeArtifacts` ordena candidatos por cruces → codos → aglomeración → longitud. `placeLabels` penaliza los lados ocupados y el solape con aristas. Las 10 métricas de TFM-eval son semánticas y no miden la estética.
- **Defectos visibles en las muestras revisadas** (`gemini-03`, `pool-map-message-event` y el pedido de tienda generado hoy):
  - etiquetas de eventos que pisan el título del carril ("Necesidad de compra", "Incident Occurred");
  - flujos de mensaje que atraviesan etiquetas ("Paquete", "Aviso de cancelación");
  - tramos horizontales largos y vacíos ("Aviso de cancelación → Cancelar pedido");
  - pools apilados sin alinear los elementos que se comunican.

## Principios

1. **No perder el TFM.** `layout v0` sigue disponible y es el valor por defecto hasta que un candidato gane con evidencia. Los candidatos son versiones seleccionables (`layoutVersion`), no ediciones encima de v0. La paridad con el corpus del TFM se sigue comprobando sobre v0.
2. **Un cambio cada vez** (decisión 7 de AGENTS.md): cada candidato cambia una sola fase o idea y se compara con el anterior.
3. **Sin modelo en el bucle de layout.** El banco de pruebas usa DSL ya existente (corpus del TFM + fixtures): la diferencia se debe solo al layout. El XML semántico debe salir idéntico; un cambio de layout nunca puede cambiar la semántica.
4. **Ninguna métrica decide sola.** Las métricas objetivas y el juicio visual se validan entre sí. Una mejora no se acepta por optimizar un número si el diagrama no se ve mejor.

## Fase 0 — Cambio rápido pedido: flujos de mensaje ocultos por defecto

La web lo hacía con dos piezas (`company-web/src/ui/app.ts` `stripMessageFlows` y `Editor.tsx` `setMessageFlowVisibility`): ocultaba las líneas discontinuas y las quitaba también del BPMN exportado, para que no reaparecieran en Bizagi.

Propuesta: opción `--message-flows hidden|shown` en `render`/`render-dsl`, **hidden por defecto**, reutilizando esa lógica.
- Quita los `messageFlow` y sus `BPMNEdge` del BPMN.
- Vuelve a exportar SVG/PNG desde ese BPMN con `renderArtifactsFromLayout` (el harness ya lo expone).
- Las posiciones no cambian: el layout se calcula antes.
- La paridad, la evaluación y el corpus se ejecutan con `shown` para seguir comparando con el TFM.

**Decidido:** se quitan también del `.bpmn`, como en la web.

## Fase 1 — Banco de pruebas de layout (`layout-bench`)

- Selección fija y estratificada del corpus (351 DSL) + fixtures, unos 50 diagramas, cubriendo: 1 pool con y sin carriles; 2, 3 y 4+ pools; flujos de mensaje; eventos de borde; bucles; gateways anidados; artefactos (datos/anotaciones); etiquetas largas; tamaños pequeño/medio/grande.
- Manifiesto versionado con hash del DSL de cada caso. Nunca se regenera con el código candidato.
- Un comando que renderiza el banco con un `layoutVersion` dado a una carpeta nueva (reutiliza `render-dsl`).

## Fase 2 — Métricas objetivas (`layout-metrics`)

Se calculan del DI de `diagram.bpmn` y, para el texto, de las cajas reales de las etiquetas en el SVG. Todas normalizadas por nº de elementos para comparar diagramas de distinto tamaño.

**Restricciones duras** (el objetivo es 0; cualquier regresión rechaza el candidato):
- solapes forma–forma;
- aristas que atraviesan formas (salvo en sus extremos);
- solapes de etiquetas con formas, con otras etiquetas y con aristas;
- etiquetas sobre la banda del título de pool o carril;
- formas fuera de su carril o pool;
- texto recortado.

**Legibilidad** (literatura de dibujo de grafos, Purchase et al., y trabajos sobre calidad de layout BPMN):
- cruces de aristas, separados en secuencia/secuencia, secuencia/mensaje y mensaje/mensaje;
- codos por arista y longitud total de aristas;
- dirección del flujo: % de flujos de secuencia que avanzan hacia la derecha (los retrocesos solo son aceptables en bucles);
- alineación: elementos consecutivos en la misma fila y camino principal ("happy path") recto;
- uniformidad del espaciado (varianza de huecos) y longitud de aristas;
- flujos de mensaje: longitud y desalineación horizontal emisor–receptor;
- distancia de cada etiqueta a su elemento;
- pools: anchos coherentes y bordes alineados.

**Compacidad y proporción** (para evitar lo que temes: que "optimizar" sea separarlo todo):
- ratio de espacio vacío (área del diagrama / área ocupada) y relación de aspecto frente a un formato objetivo;
- carriles con altura sobrante;
- se usan como **banda**, no como algo a maximizar. Un candidato no puede superar el área de v0 en más de un porcentaje fijado de antemano salvo que el juicio visual lo justifique.

**Salida:** tabla por caso y resumen con deltas frente a v0 por métrica. Al principio no hay puntuación única: se lee como un frente de Pareto (mejor en algo, peor en nada relevante).

**Primer uso:** ejecutar las métricas sobre v0 para obtener la lista de defectos más frecuentes. Esa lista ordena el trabajo de la fase 4.

## Fase 3 — Evaluación visual

**Juez visual (modelo multimodal, p. ej. Opus 5.5):**
- **Comparaciones por pares A/B ciegas:** mismo DSL, v0 frente a candidato, montaje lado a lado a la misma escala, sin decir cuál es cuál.
- **Rúbrica fija**, con preferencia, empate permitido, confianza y motivo breve:
  - se entiende el flujo;
  - etiquetas legibles y sin solapes;
  - cruces y líneas confusas;
  - alineación y orden;
  - claridad de pools y carriles;
  - compacidad sin agobio.
- **Control de sesgo de posición:** cada par se juzga dos veces con el orden invertido. Si los veredictos no son consistentes, el caso cuenta como empate.
- **Revisión de defectos por imagen** (lista de fallos visibles), que se cruza con las métricas: si el juez ve un defecto que ninguna métrica detecta, falta una métrica; si una métrica marca algo invisible, sobra o está mal calibrada.
- **Herramienta necesaria:** generador de montajes A/B con el Chromium ya fijado (sin dependencias nuevas).

**Anclaje humano (calibración):**
- el usuario puntúa unas 20 parejas con la misma rúbrica en una página de valoración ágil (ver decisión 3): ve cada pareja directamente y vota con un clic o una tecla;
- se mide el acuerdo del juez contigo (kappa de Cohen);
- solo si el acuerdo es aceptable se confía en el juez para el resto del banco.

**Métrica compuesta, al final:** con los juicios A/B y los deltas de métricas se ajusta un modelo sencillo (regresión logística) que indica qué métricas predicen la preferencia y con qué peso. Esa es la "métrica de belleza" validada. Se revalida con parejas nuevas antes de usarla para decidir.

## Fase 4 — Ideas de mejora (lluvia de ideas, a priorizar con los datos de las fases 2–3)

**A. Pools como diagramas independientes** (tu propuesta; probablemente la de más impacto):
- extraer cada proceso a unas definiciones temporales;
- pasar `bpmn-auto-layout` a cada uno por separado, sustituyendo `layout-missing` para los pools 2+;
- después, componer los pools apilados. Los carriles de cada pool siguen con `placePoolsAndLanes`.

**B. Orden de pools:** elegir el orden vertical que minimiza cruces y longitud de los flujos de mensaje (con pocos pools basta con probar todas las permutaciones).

**C. Alineación entre pools:** desplazar horizontalmente cada pool, o insertar huecos, para que emisor y receptor de un mensaje queden en la misma x. Así los mensajes son verticales y cortos.

**D. Anchos de pool:** igualar anchos y alinear bordes; evitar pools muy cortos junto a otros muy largos.

**E. Etiquetas:**
- prohibir la banda del título de carril;
- evitar rutas de aristas y mensajes;
- colocar las etiquetas de los flujos de mensaje en el tramo vertical;
- partir las etiquetas largas en líneas.

**F. Enrutado:**
- los mensajes deben esquivar etiquetas;
- repartir los puertos de entrada y salida;
- menos codos en retrocesos;
- canalizar los bucles por debajo o por encima de la fila.

**G. Compactación:**
- eliminar columnas vacías;
- acortar tramos horizontales largos;
- altura de carril según su contenido.

**H. Camino principal:** mantener recta la rama más larga o la primera salida de cada gateway, con las ramas alternativas simétricas.

**I. Motor alternativo como referencia:** ELK "layered" (elkjs), con particiones por carril, puertos y enrutado ortogonal, solo como candidato experimental para comparar. No sustituye la línea incremental sobre v0.

**J. Parámetros:** barrido controlado de separaciones y tamaños (`laneGrid`, huecos, márgenes), evaluado con las mismas métricas y el juez.

## Fase 5 — Bucle de iteración y criterio de aceptación

Para cada candidato (una idea):
1. Implementar como `layoutVersion` nuevo, sin tocar v0.
2. Renderizar el banco y comprobar que el XML semántico es idéntico en todos los casos.
3. Métricas: 0 regresiones en restricciones duras; mejora en la métrica objetivo; compacidad dentro de la banda.
4. Juez visual A/B: el candidato gana en una proporción fijada de antemano de los casos afectados (con intervalo de confianza), y no pierde claramente en los no afectados.
5. Registrar la evidencia en `evidence/layout-vN/`: métricas, montajes, veredictos y casos perdidos revisados a mano.
6. Si se acepta, pasa a ser la base del siguiente candidato. El valor por defecto de la skill solo cambia con tu aprobación.

Orden propuesto:
1. Fase 0.
2. Herramientas: banco, métricas y montajes. Sin tocar el layout.
3. Diagnóstico de v0.
4. Calibración humana del juez.
5. Idea A (pools independientes).
6. B y C (orden y alineación entre pools).
7. E (etiquetas).
8. Resto según el diagnóstico.

## Decisiones del usuario (2026-09-25)

1. **Flujos de mensaje:** ocultos por defecto y **quitados también del `.bpmn`**, como en la web (`--message-flows shown` para paridad y evaluación).
2. **Proporción:** en principio se mantiene como ahora; si hace falta un objetivo, **16:9** (A4 apaisado se queda pequeño).
3. **Calibración humana:** sí, siempre que sea ágil. El usuario no debe abrir archivos a mano. Hace falta una página de valoración que muestre cada pareja A/B directamente, se responda con un clic o una tecla (A / B / empate, más una nota opcional) y guarde los votos sin pasos manuales. **Decidido: página local**, no Artifacts de claude.ai (serían demasiados y saturarían la galería). Un comando del CLI levanta un servidor efímero en `127.0.0.1` que sirve las parejas del lote (PNG lado a lado, orden A/B aleatorio y ciego). Se vota con teclado (A / B / empate, más nota opcional) y cada voto se escribe al instante en un JSON del lote, que Claude lee después. Admite reanudar un lote a medias. Merece dedicarle tiempo de diseño para que votar sea rápido.
4. **Juez visual:** Opus 5.5.
5. **Alcance:** se puede cambiar **todo el layout** (algoritmos, fases, parámetros, motor de layout) siempre que no cambie la lógica del diagrama: el DSL y su interpretación (XML semántico) deben ser idénticos. v0 se conserva seleccionable para comparar.
