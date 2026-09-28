#!/usr/bin/env node
// CLI of the bpmn-tobe skill: the TO-BE of an AS-IS diagram of the skill bpmn,
// with coloured marks (bloqueo, mejora… from config/tobe.json) on its tasks and
// the same process geometry. It reuses that skill's engine, harness, exporters
// and checks; the model only chooses the marks, never the process.
//
//   prepare       --from <runDir of bpmn> (--request-file <f> | --request <text>) [--host <host>] [--out <dir>] [--label <slug>]
//   render        --run <tobeRun> --raw <file> --model <m> --effort <e> --host <h> [--evidence <text>]
//                 [--message-flows hidden|shown] [--timeout-ms <n>]
//   repair-prompt --run <tobeRun>
//   doctor
//
// Every command prints one JSON object on stdout.
import { parseArgs, UsageError } from '../../bpmn/scripts/lib/cli-args.mjs';
import { EXIT_FAILURE, EXIT_USAGE } from '../../bpmn/scripts/lib/status.mjs';

const COMMANDS = {
  prepare: () => import('./commands/prepare.mjs'),
  render: () => import('./commands/render.mjs'),
  'repair-prompt': () => import('./commands/repair-prompt.mjs'),
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
