// repair-prompt --run <tobeRun>
// Only for rejected marks (status invalid_marks): same prompt + the reasons.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { requireOption, UsageError } from '../../../bpmn/scripts/lib/cli-args.mjs';
import { composeHandoff, replyFileName } from '../../../bpmn/scripts/lib/handoff.mjs';
import { composeRepairPrompt } from '../lib/prompt.mjs';
import { MAX_ATTEMPTS, TobeStore } from '../lib/tobe-store.mjs';
import { INVALID_MARKS } from './render.mjs';

export async function run(options) {
  const store = await TobeStore.open(resolve(requireOption(options, 'run')));
  const last = store.lastAttempt;
  if (last?.status !== INVALID_MARKS) throw new UsageError(`Nothing to repair (last status: ${last?.status ?? 'none'}).`);
  store.assertCanAttempt();

  const next = store.nextAttemptNumber;
  const prompt = composeRepairPrompt({ basePrompt: await readFile(store.path('input_prompt.md'), 'utf8'),
    previousAnswer: await readFile(join(store.attemptDir(last.n), 'reply.txt'), 'utf8'), errors: last.errors });
  await mkdir(store.attemptDir(next), { recursive: true });
  const promptFile = join(store.attemptDir(next), 'input_prompt.md');
  await writeFile(promptFile, prompt);
  const handoff = composeHandoff({ promptFile, replyFile: store.path(replyFileName(next)) });
  return { exit: 0, payload: { promptFile, attempt: next, repairsLeft: MAX_ATTEMPTS - next,
    requestedGenerator: store.info.requestedGenerator, handoff } };
}
