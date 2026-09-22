# Synthetic corpus DSL generation — Gemini 3.5 Flash High/Thinking (SYSV5)

## Batch identity

- System prompt: `SYSV5` — `apps/tfm-lab/prompts/system/bpmn_sketch_miner_system_prompt_v5.md`
- Provider: `GEMINI`
- Model label: `GEMINI_3_5_FLASH_THINKING`
- Execution setting: Gemini 3.5 Flash (High reasoning, Agent SDK, fresh subagent context)
- Corpus: SYN001–SYN015, three runs each
- Isolation: one fresh Gemini 3.5 Flash (High) subagent context per experiment ID

## Counts

| Metric | Value |
|---|---:|
| Total planned experiments | 45 |
| Total generated outputs | 45 |
| Total pending outputs | 0 |
| Total failed outputs | 0 |
| Skipped existing outputs | 0 |

## Experiment index

| Experiment ID | Output path | Bytes | Lines | Status |
|---|---|---:|---:|---|
| EXP-SYN001-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R01 | apps/tfm-lab/prompts/experiments/EXP-SYN001-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R01/output.dsl | 388 | 12 | raw_output_generated |
| EXP-SYN001-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R02 | apps/tfm-lab/prompts/experiments/EXP-SYN001-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R02/output.dsl | 234 | 9 | raw_output_generated |
| EXP-SYN001-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R03 | apps/tfm-lab/prompts/experiments/EXP-SYN001-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R03/output.dsl | 340 | 14 | raw_output_generated |
| EXP-SYN002-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R01 | apps/tfm-lab/prompts/experiments/EXP-SYN002-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R01/output.dsl | 354 | 14 | raw_output_generated |
| EXP-SYN002-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R02 | apps/tfm-lab/prompts/experiments/EXP-SYN002-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R02/output.dsl | 312 | 12 | raw_output_generated |
| EXP-SYN002-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R03 | apps/tfm-lab/prompts/experiments/EXP-SYN002-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R03/output.dsl | 410 | 12 | raw_output_generated |
| EXP-SYN003-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R01 | apps/tfm-lab/prompts/experiments/EXP-SYN003-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R01/output.dsl | 203 | 9 | raw_output_generated |
| EXP-SYN003-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R02 | apps/tfm-lab/prompts/experiments/EXP-SYN003-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R02/output.dsl | 256 | 13 | raw_output_generated |
| EXP-SYN003-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R03 | apps/tfm-lab/prompts/experiments/EXP-SYN003-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R03/output.dsl | 258 | 12 | raw_output_generated |
| EXP-SYN004-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R01 | apps/tfm-lab/prompts/experiments/EXP-SYN004-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R01/output.dsl | 1081 | 56 | raw_output_generated |
| EXP-SYN004-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R02 | apps/tfm-lab/prompts/experiments/EXP-SYN004-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R02/output.dsl | 1099 | 52 | raw_output_generated |
| EXP-SYN004-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R03 | apps/tfm-lab/prompts/experiments/EXP-SYN004-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R03/output.dsl | 1139 | 56 | raw_output_generated |
| EXP-SYN005-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R01 | apps/tfm-lab/prompts/experiments/EXP-SYN005-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R01/output.dsl | 1899 | 58 | raw_output_generated |
| EXP-SYN005-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R02 | apps/tfm-lab/prompts/experiments/EXP-SYN005-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R02/output.dsl | 1718 | 52 | raw_output_generated |
| EXP-SYN005-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R03 | apps/tfm-lab/prompts/experiments/EXP-SYN005-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R03/output.dsl | 1970 | 64 | raw_output_generated |
| EXP-SYN006-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R01 | apps/tfm-lab/prompts/experiments/EXP-SYN006-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R01/output.dsl | 2216 | 73 | raw_output_generated |
| EXP-SYN006-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R02 | apps/tfm-lab/prompts/experiments/EXP-SYN006-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R02/output.dsl | 1321 | 64 | raw_output_generated |
| EXP-SYN006-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R03 | apps/tfm-lab/prompts/experiments/EXP-SYN006-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R03/output.dsl | 2044 | 94 | raw_output_generated |
| EXP-SYN007-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R01 | apps/tfm-lab/prompts/experiments/EXP-SYN007-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R01/output.dsl | 337 | 11 | raw_output_generated |
| EXP-SYN007-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R02 | apps/tfm-lab/prompts/experiments/EXP-SYN007-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R02/output.dsl | 330 | 9 | raw_output_generated |
| EXP-SYN007-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R03 | apps/tfm-lab/prompts/experiments/EXP-SYN007-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R03/output.dsl | 343 | 9 | raw_output_generated |
| EXP-SYN008-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R01 | apps/tfm-lab/prompts/experiments/EXP-SYN008-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R01/output.dsl | 319 | 13 | raw_output_generated |
| EXP-SYN008-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R02 | apps/tfm-lab/prompts/experiments/EXP-SYN008-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R02/output.dsl | 333 | 11 | raw_output_generated |
| EXP-SYN008-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R03 | apps/tfm-lab/prompts/experiments/EXP-SYN008-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R03/output.dsl | 333 | 11 | raw_output_generated |
| EXP-SYN009-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R01 | apps/tfm-lab/prompts/experiments/EXP-SYN009-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R01/output.dsl | 1019 | 46 | raw_output_generated |
| EXP-SYN009-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R02 | apps/tfm-lab/prompts/experiments/EXP-SYN009-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R02/output.dsl | 910 | 45 | raw_output_generated |
| EXP-SYN009-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R03 | apps/tfm-lab/prompts/experiments/EXP-SYN009-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R03/output.dsl | 1233 | 42 | raw_output_generated |
| EXP-SYN010-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R01 | apps/tfm-lab/prompts/experiments/EXP-SYN010-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R01/output.dsl | 1078 | 58 | raw_output_generated |
| EXP-SYN010-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R02 | apps/tfm-lab/prompts/experiments/EXP-SYN010-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R02/output.dsl | 1124 | 63 | raw_output_generated |
| EXP-SYN010-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R03 | apps/tfm-lab/prompts/experiments/EXP-SYN010-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R03/output.dsl | 1244 | 74 | raw_output_generated |
| EXP-SYN011-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R01 | apps/tfm-lab/prompts/experiments/EXP-SYN011-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R01/output.dsl | 1022 | 37 | raw_output_generated |
| EXP-SYN011-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R02 | apps/tfm-lab/prompts/experiments/EXP-SYN011-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R02/output.dsl | 970 | 35 | raw_output_generated |
| EXP-SYN011-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R03 | apps/tfm-lab/prompts/experiments/EXP-SYN011-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R03/output.dsl | 817 | 35 | raw_output_generated |
| EXP-SYN012-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R01 | apps/tfm-lab/prompts/experiments/EXP-SYN012-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R01/output.dsl | 1191 | 55 | raw_output_generated |
| EXP-SYN012-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R02 | apps/tfm-lab/prompts/experiments/EXP-SYN012-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R02/output.dsl | 1140 | 51 | raw_output_generated |
| EXP-SYN012-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R03 | apps/tfm-lab/prompts/experiments/EXP-SYN012-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R03/output.dsl | 1088 | 51 | raw_output_generated |
| EXP-SYN013-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R01 | apps/tfm-lab/prompts/experiments/EXP-SYN013-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R01/output.dsl | 692 | 34 | raw_output_generated |
| EXP-SYN013-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R02 | apps/tfm-lab/prompts/experiments/EXP-SYN013-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R02/output.dsl | 476 | 26 | raw_output_generated |
| EXP-SYN013-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R03 | apps/tfm-lab/prompts/experiments/EXP-SYN013-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R03/output.dsl | 507 | 22 | raw_output_generated |
| EXP-SYN014-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R01 | apps/tfm-lab/prompts/experiments/EXP-SYN014-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R01/output.dsl | 686 | 37 | raw_output_generated |
| EXP-SYN014-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R02 | apps/tfm-lab/prompts/experiments/EXP-SYN014-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R02/output.dsl | 1078 | 59 | raw_output_generated |
| EXP-SYN014-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R03 | apps/tfm-lab/prompts/experiments/EXP-SYN014-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R03/output.dsl | 831 | 43 | raw_output_generated |
| EXP-SYN015-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R01 | apps/tfm-lab/prompts/experiments/EXP-SYN015-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R01/output.dsl | 4336 | 153 | raw_output_generated |
| EXP-SYN015-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R02 | apps/tfm-lab/prompts/experiments/EXP-SYN015-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R02/output.dsl | 2941 | 113 | raw_output_generated |
| EXP-SYN015-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R03 | apps/tfm-lab/prompts/experiments/EXP-SYN015-SYSV5-GEMINI-GEMINI_3_5_FLASH_THINKING-R03/output.dsl | 2938 | 113 | raw_output_generated |

## Warnings and limitations

- Outputs are raw and were not manually corrected after generation.
- Observational checks found no empty outputs, Markdown fences, or generated `result.json` files.
- Official result metadata must still be generated manually through the TFM app.
- No experiment folder was generated in a reused agent/chat context.

## Verification

- `cmd /c npx pnpm --filter tfm-lab build` — passed.
- `cmd /c npx pnpm --filter tfm-lab test` — passed.
