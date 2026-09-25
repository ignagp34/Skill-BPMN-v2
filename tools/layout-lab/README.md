# Layout lab (etapa 8)

Herramientas para mejorar el layout sin perder el del TFM (v0). Plan: `plans/layout-iteracion-1.md`. Sin llamadas a modelos: el banco es DSL existente, así que cualquier diferencia se debe solo al layout. Requiere el mismo entorno que la skill (`pnpm install --frozen-lockfile` y el Chromium de Playwright).

```sh
L="node tools/layout-lab/layout.mjs"
$L bench-render --layout v0 --out skill-runs/layout/v0-<fecha>          # 50 casos, ~30 s
$L metrics --render skill-runs/layout/v0-<fecha>                        # métricas + diagnóstico
$L bench-render --layout v1 --out skill-runs/layout/v1-<fecha>
$L compare --base skill-runs/layout/v0-<fecha> --candidate skill-runs/layout/v1-<fecha>
$L ab-batch --a skill-runs/layout/v0-<fecha> --b skill-runs/layout/v1-<fecha> --out skill-runs/layout/ab-<lote> --count 20
$L vote --batch skill-runs/layout/ab-<lote>                             # página local de votación
$L montage --batch skill-runs/layout/ab-<lote>                          # imágenes para el juez (Opus 5.5)
$L agreement --batch skill-runs/layout/ab-<lote>                        # kappa humano–juez
node --test tools/layout-lab/test/*.test.mjs
```

| Pieza | Qué hace |
| --- | --- |
| `bench/` | Banco fijo: `manifest.json` (fuente, hash, características, etiquetas y cobertura) y `cases/*.dsl`. Lo crea una sola vez `bench-select`, que nunca sobrescribe. `bench-add --dir … --reason …` solo añade casos escritos a mano (deben renderizar con v0) y registra la ampliación en `manifest.additions`. |
| `fixtures/ai-3pools/` | 6 procesos de IA con 3 pools escritos a mano (≤ 20 actividades) para cubrir el hueco de 3 pools. |
| `lib/layouts.mjs` | Versiones de layout seleccionables. v0 = harness congelado del TFM. Un candidato añade su propia app o página de harness y nunca edita v0. |
| `lib/render-cases.mjs` | Render por lotes con el `HarnessSession` de la skill. Por caso, en una carpeta nueva: `diagram.*` (layout completo, con flujos de mensaje), `hidden.*` (sin ellos, lo que ve el usuario), `semantic.bpmn` y `text-boxes.json` (cajas de texto medidas en Chromium). |
| `lib/metrics.mjs` | Registro de métricas (`hard`, `legibility`, `compactness`). Añadir una métrica = añadir una entrada. |
| `config/acceptance.json` | Reglas de aceptación fijadas antes de ver resultados: XML semántico idéntico, 0 regresiones duras, área máxima +15 %, juez ≥ 60 % de victorias, kappa ≥ 0,6. |
| `vote/index.html` + `lib/vote-server.mjs` | Página de votación ciega: teclado (← → ↓, 1–6, N, ↑, V, Z). Cada voto va a `votes.json` al instante y el lote se puede reanudar. |
| `judge/judge-prompt.md` | Prompt fijo del juez visual; cada pareja se juzga en los dos órdenes. |

Los renders y los lotes van a `skill-runs/layout/` (ignorado por Git); los resúmenes que valgan como evidencia, a `evidence/layout-vN/`.
