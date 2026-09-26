// fail --run <runDir> --reason <text> [--model m] [--effort e] [--host h]
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { requireOption } from '../lib/cli-args.mjs';
import { declaredGenerator } from '../lib/generators.mjs';
import { RunStore } from '../lib/run-store.mjs';
import { exitCodeFor, STATUS } from '../lib/status.mjs';

export async function run(options) {
  const store = await RunStore.open(resolve(requireOption(options, 'run')));
  store.assertCanAttempt();
  const n = store.nextAttemptNumber;
  await mkdir(store.attemptDir(n), { recursive: true });
  await store.recordAttempt({ n, kind: n === 1 ? 'initial' : 'repair',
    generator: declaredGenerator(options, store.info.requestedGenerator),
    status: STATUS.GENERATION_ERROR, error: requireOption(options, 'reason'), diagnostics: [] });
  return { exit: exitCodeFor(store.info.status), payload: store.summary() };
}
