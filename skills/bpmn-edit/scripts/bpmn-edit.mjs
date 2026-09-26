#!/usr/bin/env node
// CLI of the bpmn-edit skill: hand-edit the layout of a diagram of the bpmn
// skill in a local page. It reuses that skill's engine session, exporters and
// checks; nothing of the engine is copied here.
//
//   open    (--run <runDir> | --dsl <file> --out <dir> | --bpmn <file> --out <dir>)
//           [--out <dir>] [--layout <version>] [--message-flows hidden|shown] [--port 0] [--no-open]
//   export  --session <editDir>
//   diff    --session <editDir>
//   doctor
//
// `open` prints { url, sessionDir } when the page is ready and the session
// summary when it closes. The other commands print one JSON object.
import { parseArgs, UsageError } from '../../bpmn/scripts/lib/cli-args.mjs';
import { EXIT_FAILURE, EXIT_USAGE } from '../../bpmn/scripts/lib/status.mjs';

const COMMANDS = {
  open: () => import('./commands/open.mjs'),
  export: () => import('./commands/export.mjs'),
  diff: () => import('./commands/diff.mjs'),
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
