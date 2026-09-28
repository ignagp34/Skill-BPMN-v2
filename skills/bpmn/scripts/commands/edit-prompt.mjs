// edit-prompt --from <runDir> (--request-file <f> | --request <text>) [--host <host>] [--out <dir>] [--label <slug>]
// A change the user asks for on a diagram that already compiles. Creates a new
// run that points to its parent; the parent is never modified.
import { existsSync } from 'node:fs';
import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { requireOption, UsageError } from '../lib/cli-args.mjs';
import { BASE_DSL, BASE_SEMANTIC } from '../lib/change-report.mjs';
import { engineRecord, findEngineRoot, SYSTEM_PROMPT_PATH, verifyEngine } from '../lib/engine.mjs';
import { resolveGenerator } from '../lib/generators.mjs';
import { composeHandoff, replyFileName } from '../lib/handoff.mjs';
import { sha256 } from '../lib/hash.mjs';
import { composeEditPrompt, readSystemPrompt } from '../lib/prompt.mjs';
import { RunStore } from '../lib/run-store.mjs';
import { STATUS } from '../lib/status.mjs';

const EDITABLE = new Set([STATUS.SUCCESS, STATUS.SUCCESS_WITH_WARNINGS, STATUS.PARTIAL_EXPORT]);
const COMPOSITION = 'edit: v5 system prompt + original narrative + changes already applied + current DSL + requested change';

async function readRequest(options) {
  const request = options['request-file'] ? await readFile(resolve(options['request-file']), 'utf8') : requireOption(options, 'request');
  if (request.trim().length === 0) throw new UsageError('The requested change is empty.');
  return request;
}

async function openParent(dir) {
  const parent = await RunStore.open(dir);
  if (!EDITABLE.has(parent.info.status)) {
    throw new UsageError(`The parent run did not compile (status: ${parent.info.status}); repair it first with repair-prompt.`);
  }
  for (const file of ['normalized.dsl', 'semantic.bpmn']) {
    if (!existsSync(parent.path(file))) throw new UsageError(`The parent run has no ${file}.`);
  }
  return parent;
}

/** Host of the edit: --host, else the parent's (a render-dsl parent has none). */
function hostFor(options, parent) {
  const host = options.host ?? parent.info.requestedGenerator?.host;
  if (!host || host === 'direct-dsl') throw new UsageError('Missing --host (the parent run has no generator host).');
  return host;
}

export async function run(options) {
  const parentDir = resolve(requireOption(options, 'from'));
  const parent = await openParent(parentDir);
  const request = await readRequest(options);
  const requestedGenerator = resolveGenerator(hostFor(options, parent));
  const engineRoot = findEngineRoot();
  const engine = await verifyEngine(engineRoot);

  const summary = existsSync(parent.path('summary.md')) ? await readFile(parent.path('summary.md'), 'utf8') : null;
  const history = [...(parent.info.edit?.history ?? []), ...(parent.info.edit ? [parent.info.edit.request] : [])];
  const currentDsl = await readFile(parent.path('normalized.dsl'), 'utf8');
  const systemPrompt = await readSystemPrompt(engineRoot);
  const prompt = composeEditPrompt({ systemPrompt, summary, history, currentDsl, request });
  const lastParentAttempt = parent.lastAttempt;

  const store = await RunStore.create(resolve(options.out ?? dirname(parentDir)),
    options.label ?? `edit ${request.split('\n')[0]}`, {
      interfaceType: 'skill',
      representation: 'dsl',
      systemPromptVersion: 'V5',
      processPromptVersion: 'skill-edit',
      status: STATUS.AWAITING_GENERATION,
      requestedGenerator,
      engine: engineRecord(engine),
      edit: { parentRun: parent.dir, parentRunId: parent.info.runId, parentStatus: parent.info.status,
        request, requestSha256: sha256(request), history, baseDslSha256: sha256(currentDsl),
        parentLayout: lastParentAttempt?.layout?.version ?? null,
        parentMessageFlows: lastParentAttempt?.presentation?.messageFlows ?? null },
      prompt: { systemPrompt: SYSTEM_PROMPT_PATH, composition: COMPOSITION, systemPromptSha256: sha256(systemPrompt),
        inputPromptSha256: sha256(prompt), summarySha256: summary === null ? null : sha256(summary) },
      notes: 'Edit of an existing diagram: the model rewrites the whole DSL applying only the requested change; dsl-change.json reports what changed.',
    });
  if (summary !== null) await writeFile(store.path('summary.md'), summary);
  await writeFile(store.path('edit-request.md'), request);
  await copyFile(parent.path('normalized.dsl'), store.path(BASE_DSL));
  await copyFile(parent.path('semantic.bpmn'), store.path(BASE_SEMANTIC));
  await writeFile(store.path('input_prompt.md'), prompt);

  const handoff = composeHandoff({ promptFile: store.path('input_prompt.md'), replyFile: store.path(replyFileName(1)) });
  return { exit: 0, payload: { runDir: store.dir, runId: store.info.runId, parentRun: parent.dir,
    promptFile: handoff.promptFile, inputPromptSha256: store.info.prompt.inputPromptSha256, requestedGenerator, handoff,
    renderWith: { layout: store.info.edit.parentLayout, messageFlows: store.info.edit.parentMessageFlows },
    engineSourceVerified: engine.verified } };
}
