// prepare --from <runDir of skill bpmn> (--request-file <f> | --request <text>) [--host <host>] [--out <dir>] [--label <slug>]
//         [--strategy derive-as-is|no-bands]
// A new TO-BE run next to the AS-IS one; the AS-IS run is never modified.
import { existsSync } from 'node:fs';
import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { requireOption, UsageError } from '../../../bpmn/scripts/lib/cli-args.mjs';
import { engineRecord, findEngineRoot, verifyEngine } from '../../../bpmn/scripts/lib/engine.mjs';
import { resolveGenerator } from '../../../bpmn/scripts/lib/generators.mjs';
import { composeHandoff, replyFileName } from '../../../bpmn/scripts/lib/handoff.mjs';
import { sha256 } from '../../../bpmn/scripts/lib/hash.mjs';
import { RunStore, writeJson } from '../../../bpmn/scripts/lib/run-store.mjs';
import { STATUS } from '../../../bpmn/scripts/lib/status.mjs';
import { strategyOf } from '../lib/config.mjs';
import { composeTobePrompt } from '../lib/prompt.mjs';
import { annotatableTasks } from '../lib/dsl-insert.mjs';
import { listTasks } from '../lib/tasks.mjs';
import { TobeStore } from '../lib/tobe-store.mjs';

const COMPILED = new Set([STATUS.SUCCESS, STATUS.SUCCESS_WITH_WARNINGS, STATUS.PARTIAL_EXPORT]);

async function readRequest(options) {
  const request = options['request-file'] ? await readFile(resolve(options['request-file']), 'utf8') : requireOption(options, 'request');
  if (request.trim().length === 0) throw new UsageError('The request is empty.');
  return request;
}

async function openAsIs(dir) {
  const run = await RunStore.open(dir);
  if (!COMPILED.has(run.info.status)) throw new UsageError(`The AS-IS run did not compile (status: ${run.info.status}).`);
  for (const file of ['normalized.dsl', 'semantic.bpmn']) {
    if (!existsSync(run.path(file))) throw new UsageError(`The AS-IS run has no ${file}.`);
  }
  return run;
}

function hostFor(options, run) {
  const host = options.host ?? run.info.requestedGenerator?.host;
  if (!host || host === 'direct-dsl') throw new UsageError('Missing --host (the AS-IS run has no generator host).');
  return host;
}

export async function run(options) {
  const asIsDir = resolve(requireOption(options, 'from'));
  const asIs = await openAsIs(asIsDir);
  const request = await readRequest(options);
  const requestedGenerator = resolveGenerator(hostFor(options, asIs));
  const strategy = strategyOf(options.strategy);
  const engine = await verifyEngine(findEngineRoot());

  const dsl = await readFile(asIs.path('normalized.dsl'), 'utf8');
  const allTasks = listTasks(await readFile(asIs.path('semantic.bpmn'), 'utf8'));
  const tasks = annotatableTasks(dsl, allTasks);
  const unmarkable = allTasks.filter(t => !tasks.includes(t)).map(t => t.name);
  if (tasks.length === 0) throw new UsageError('The AS-IS process has no task that can carry a mark.');
  const summary = existsSync(asIs.path('summary.md')) ? await readFile(asIs.path('summary.md'), 'utf8') : null;
  const prompt = composeTobePrompt({ summary, dsl, tasks, request });

  const store = await TobeStore.create(resolve(options.out ?? dirname(asIsDir)),
    options.label ?? asIs.info.runId.replace(/^bpmn-\d{8}-\d{6}-/, ''), {
      status: STATUS.AWAITING_GENERATION,
      source: { asIsRun: asIs.dir, asIsRunId: asIs.info.runId, asIsStatus: asIs.info.status,
        asIsLayout: asIs.lastAttempt?.layout?.version ?? null, dslSha256: sha256(dsl) },
      strategy,
      unmarkableTasks: unmarkable,
      messageFlows: asIs.lastAttempt?.presentation?.messageFlows ?? null,
      requestedGenerator,
      engine: engineRecord(engine),
      prompt: { template: 'skills/bpmn-tobe/templates/prompt.md', inputPromptSha256: sha256(prompt), requestSha256: sha256(request) },
    });
  if (summary !== null) await writeFile(store.path('summary.md'), summary);
  await writeFile(store.path('request.md'), request);
  await writeFile(store.path('as-is.dsl'), dsl);
  await copyFile(asIs.path('semantic.bpmn'), store.path('as-is.semantic.bpmn'));
  await writeJson(store.path('tasks.json'), tasks);
  await writeFile(store.path('input_prompt.md'), prompt);

  const handoff = composeHandoff({ promptFile: store.path('input_prompt.md'), replyFile: store.path(replyFileName(1)) });
  return { exit: 0, payload: { runDir: store.dir, runId: store.info.runId, asIsRun: asIs.dir, tasks: tasks.length, unmarkableTasks: unmarkable,
    requestedGenerator, handoff, engineSourceVerified: engine.verified } };
}
