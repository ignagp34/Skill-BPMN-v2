// prepare --out <dir> --host <host> (--summary-file <f> | --summary <text>) [--label <slug>]
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { requireOption, UsageError } from '../lib/cli-args.mjs';
import { engineRecord, findEngineRoot, PROMPT_COMPOSITION, SYSTEM_PROMPT_PATH, verifyEngine } from '../lib/engine.mjs';
import { resolveGenerator } from '../lib/generators.mjs';
import { composeHandoff, replyFileName } from '../lib/handoff.mjs';
import { sha256 } from '../lib/hash.mjs';
import { composeBasePrompt } from '../lib/prompt.mjs';
import { RunStore } from '../lib/run-store.mjs';
import { STATUS } from '../lib/status.mjs';

async function readSummary(options) {
  const summary = options['summary-file'] ? await readFile(resolve(options['summary-file']), 'utf8') : requireOption(options, 'summary');
  if (summary.trim().length === 0) throw new UsageError('The process summary is empty.');
  return summary;
}

export async function run(options) {
  const engineRoot = findEngineRoot();
  const requestedGenerator = resolveGenerator(options.host);
  const summary = await readSummary(options);
  const { prompt, systemPromptSha256 } = await composeBasePrompt(engineRoot, summary);
  const engine = await verifyEngine(engineRoot);

  const store = await RunStore.create(resolve(requireOption(options, 'out')), options.label ?? summary.split('\n')[0], {
    interfaceType: 'skill',
    representation: 'dsl',
    systemPromptVersion: 'V5',
    processPromptVersion: 'skill-summary',
    status: STATUS.AWAITING_GENERATION,
    requestedGenerator,
    engine: engineRecord(engine),
    prompt: { systemPrompt: SYSTEM_PROMPT_PATH, composition: PROMPT_COMPOSITION, systemPromptSha256,
      inputPromptSha256: sha256(prompt), summarySha256: sha256(summary), summaryChars: summary.length },
    notes: 'result.json keeps the harness metadata interfaceType "web" (frozen harness); this run-info.json records the real path: skill.',
  });
  await writeFile(store.path('summary.md'), summary);
  await writeFile(store.path('input_prompt.md'), prompt);

  const handoff = composeHandoff({ promptFile: store.path('input_prompt.md'), replyFile: store.path(replyFileName(1)) });
  return { exit: 0, payload: { runDir: store.dir, runId: store.info.runId, promptFile: handoff.promptFile,
    inputPromptSha256: store.info.prompt.inputPromptSha256, requestedGenerator, handoff,
    engineSourceVerified: engine.verified } };
}
