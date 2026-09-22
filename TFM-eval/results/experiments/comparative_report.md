# DSL vs zero-shot XML comparison

The CSV tables group the same raw-artifact M1-M10 metrics, validity, expected
feature coverage, token usage, elapsed time, and iterations by representation.
Token fields are offline `o200k_base` estimates, not billing measurements.
They exclude hidden reasoning/thinking tokens absent from saved web artifacts.

`scored_mean` averages quality over successful runs only; `scored_mean_penalized`
averages over all runs counting failures as 0, which removes the survivorship bias
when comparing approaches with different success rates. Always read the two
together with `semantic_success_rate`.

Grouping dimensions:

- `comparative_by_model.csv` - by model and representation.
- `comparative_by_difficulty.csv` - by difficulty and representation.
- `comparative_by_prompt_version.csv` - by system-prompt version (RQ5 ablation).
- `comparative_by_model_prompt.csv` - by model x system-prompt version. Filter to
  `SYSV31` for the main model comparison (RQ2); compare v3.1/v4/v5 within a model
  for RQ5.

Figures:

- `figures/dsl_vs_zero_shot_by_model.svg`
- `figures/dsl_vs_zero_shot_by_difficulty.svg`
