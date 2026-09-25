#!/usr/bin/env node
// CLI of the bpmn-desde-resumen skill — deterministic side only. It composes
// the TFM generation prompt and runs the frozen TFM engine; the DSL itself is
// written by the model selected in config/generators.json (references/generation.md).
//
//   prepare       --out <dir> --host <host> (--summary-file <f> | --summary <text>) [--label <slug>]
//   render        --run <runDir> --raw <file> --model <m> --effort <e> --host <h> [--evidence <text>]
//   repair-prompt --run <runDir>
//   fail          --run <runDir> --reason <text> [--model m] [--effort e] [--host h]
//   render-dsl    --dsl <file> --out <dir> [--label <slug>]
//   evaluate      --run <runDir> [--python <exe>]
//   sync-agents   [--target <projectRoot>] [--check]
//   doctor
//
// Every command prints one JSON object on stdout.
import { parseArgs, UsageError } from './lib/cli-args.mjs';
import { EXIT_FAILURE, EXIT_USAGE } from './lib/status.mjs';

const COMMANDS = {
  prepare: () => import('./commands/prepare.mjs'),
  render: () => import('./commands/render.mjs'),
  'repair-prompt': () => import('./commands/repair-prompt.mjs'),
  fail: () => import('./commands/fail.mjs'),
  'render-dsl': () => import('./commands/render-dsl.mjs'),
  evaluate: () => import('./commands/evaluate.mjs'),
  'sync-agents': () => import('./commands/sync-agents.mjs'),
  doctor: () => import('./commands/doctor.mjs'),
};

const print = payload => process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);

try {
  const { command, options } = parseArgs(process.argv.slice(2));
  const load = COMMANDS[command];
  if (!load) throw new UsageError(`Unknown command "${command ?? ''}". Commands: ${Object.keys(COMMANDS).join(', ')}`);
  const { exit, payload } = await (await load()).run(options);
  print(payload);
  process.exitCode = exit;
} catch (err) {
  print({ error: err.message, usage: err instanceof UsageError });
  process.exitCode = err instanceof UsageError ? EXIT_USAGE : EXIT_FAILURE;
}
