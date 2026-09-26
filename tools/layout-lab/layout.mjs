#!/usr/bin/env node
// Layout lab (stage 8, plans/layout-iteracion-1.md). No model calls: the bench is
// existing DSL, so every difference comes from the layout.
//
//   bench-select  [--out <benchDir>] [--size 50]                    one-off; never overwrites
//   bench-add     --dir <folder of .dsl> --reason <text> [--bench <benchDir>]  hand-written cases, append-only
//   bench-render  --layout <v> --out <dir> [--bench <benchDir>] [--only <id,id>]
//   metrics       --render <dir>                                    metrics.json per case + summary
//   compare       --base <renderDir> --candidate <renderDir> [--out <file>]
//   ab-batch      --a <renderDir> --b <renderDir> --out <batchDir> [--count 20] [--seed s] [--view hidden|shown]
//   vote          --batch <batchDir> [--port 0] [--no-open]           local A/B voting page
//   montage       --batch <batchDir>                                 side-by-side PNGs for the visual judge
//   agreement     --batch <batchDir> --judge <verdicts.json>        human vs judge (Cohen's kappa)
//
// Every command prints one JSON object on stdout (except vote while serving).
import { parseArgs, UsageError } from '../../skills/bpmn/scripts/lib/cli-args.mjs';

const COMMANDS = {
  'bench-select': () => import('./commands/bench-select.mjs'),
  'bench-add': () => import('./commands/bench-add.mjs'),
  'bench-render': () => import('./commands/bench-render.mjs'),
  metrics: () => import('./commands/metrics.mjs'),
  compare: () => import('./commands/compare.mjs'),
  'ab-batch': () => import('./commands/ab-batch.mjs'),
  vote: () => import('./commands/vote.mjs'),
  montage: () => import('./commands/montage.mjs'),
  agreement: () => import('./commands/agreement.mjs'),
};

const print = payload => process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);

try {
  const { command, options } = parseArgs(process.argv.slice(2));
  const load = COMMANDS[command];
  if (!load) throw new UsageError(`Unknown command "${command ?? ''}". Commands: ${Object.keys(COMMANDS).join(', ')}`);
  const { exit, payload } = await (await load()).run(options);
  if (payload !== undefined) print(payload);
  process.exitCode = exit;
} catch (err) {
  print({ error: err.message, usage: err instanceof UsageError });
  process.exitCode = err instanceof UsageError ? 64 : 1;
}
