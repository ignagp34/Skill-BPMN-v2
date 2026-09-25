// repair-prompt --run <runDir>
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { requireOption, UsageError } from '../lib/cli-args.mjs';
import { composeRepairPrompt } from '../lib/prompt.mjs';
import { RunStore } from '../lib/run-store.mjs';
import { isRepairable, MAX_ATTEMPTS } from '../lib/status.mjs';

async function previousDsl(dir) {
  const normalized = join(dir, 'normalized.dsl');
  return readFile(existsSync(normalized) ? normalized : join(dir, 'raw_output.txt'), 'utf8');
}

export async function run(options) {
  const store = await RunStore.open(resolve(requireOption(options, 'run')));
  const last = store.lastAttempt;
  if (!last || !isRepairable(last.status)) throw new UsageError(`No repairable attempt (last status: ${last?.status ?? 'none'}).`);
  store.assertCanAttempt();

  const errors = last.diagnostics.filter(d => d.severity === 'error');
  const prompt = composeRepairPrompt({ basePrompt: await readFile(store.path('input_prompt.md'), 'utf8'),
    status: last.status, diagnostics: errors, previousDsl: await previousDsl(store.attemptDir(last.n)) });

  const next = store.nextAttemptNumber;
  await mkdir(store.attemptDir(next), { recursive: true });
  const promptFile = join(store.attemptDir(next), 'input_prompt.md');
  await writeFile(promptFile, prompt);
  return { exit: 0, payload: { promptFile, attempt: next, repairsLeft: MAX_ATTEMPTS - next, diagnostics: errors.length,
    requestedGenerator: store.info.requestedGenerator } };
}
