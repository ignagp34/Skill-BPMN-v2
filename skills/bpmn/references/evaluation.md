# Evaluación opcional

`CLI evaluate --run <runDir> [--python <exe>]` puntúa la ejecución con las diez métricas de `TFM-eval` sin modificarlo: copia la ejecución a `<runDir>/evaluation/staging/EXP-SKILL-V5-<HOST>-<MODELO>-R<NN>/` (el evaluador solo descubre carpetas `EXP-*`) y escribe `results.json`, `results.csv`, informes comparativos y `evaluation.log` en `<runDir>/evaluation/`. Nunca escribe en `TFM-eval/results/`.

Lectura de las métricas:

- M1–M5 y M8 son puntuaciones. M6, M7, M9 y M10 son descriptivas: su `score=1.0` no significa excelencia y no deben entrar en un promedio de calidad.
- Estas métricas miden la estructura del BPMN. No miden por sí solas la fidelidad del modelo al resumen ni la calidad visual; esas preguntas requieren revisión aparte.
- Distingue el primer intento del resultado reparado (`run-info.json` → `attempts`).

Para lotes y comparaciones (Luna/high frente a históricos de GPT 5.5) ver `AGENTS.md`, etapa 6: fijar antes número de repeticiones y límite de coste, y comparar solo con proceso y prompt equivalentes.
