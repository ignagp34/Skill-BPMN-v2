// render --run <runDir> --raw <file> --model <m> --effort <e> --host <h> [--evidence <text>] [--timeout-ms <n>]
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { requireOption } from '../lib/cli-args.mjs';
import { attemptFiles, classifyRender, extractDiagnostics, inspectArtifacts } from '../lib/artifacts.mjs';
import { findEngineRoot } from '../lib/engine.mjs';
import { declaredGenerator } from '../lib/generators.mjs';
import { DEFAULT_TIMEOUT_MS, renderWithHarness } from '../lib/harness.mjs';
import { sha256 } from '../lib/hash.mjs';
import { nowIso, RunStore } from '../lib/run-store.mjs';
import { exitCodeFor, STATUS } from '../lib/status.mjs';

/** RenderExperimentInput for apps/tfm-lab/src/headless/main.ts. */
function harnessInput(store, n, rawOutput, inputPrompt, generator) {
  return {
    experimentId: store.info.runId,
    processId: 'SKILL',
    processSource: 'skill:summary.md',
    systemPromptVersion: store.info.systemPromptVersion ?? 'NONE',
    processPromptVersion: store.info.processPromptVersion ?? 'none',
    provider: generator.host ?? 'unknown',
    modelLabel: generator.model ?? 'unknown',
    runNumber: n,
    createdAt: nowIso(),
    notes: `bpmn-desde-resumen skill run ${store.info.runId}, attempt ${n}.`,
    inputPrompt,
    rawOutput,
  };
}

async function writeFiles(dir, files) {
  const hashes = {};
  for (const [name, bytes] of Object.entries(files)) {
    if (bytes == null) continue;
    await writeFile(join(dir, name), bytes);
    hashes[name] = sha256(bytes);
  }
  return hashes;
}

/** Runs the engine on one raw generator answer and returns the attempt's outcome fields. */
async function renderRawOutput(engineRoot, dir, input, timeoutMs) {
  let rendered;
  try {
    rendered = await renderWithHarness(engineRoot, [input], { timeoutMs });
  } catch (error) {
    return { outcome: { status: STATUS.INFRASTRUCTURE_ERROR, error: error.message, infra: error.kind ?? 'harness' } };
  }
  const { runtime, results: [result] } = rendered;
  if (result.error) {
    return { runtime, outcome: { status: STATUS.INFRASTRUCTURE_ERROR, error: result.error.message,
      infra: result.error.kind ?? 'harness', pageErrors: result.pageErrors } };
  }
  const { output, reimported, pageErrors } = result;
  const inspected = inspectArtifacts(output);
  const hashes = await writeFiles(dir, attemptFiles(output, inspected, reimported));
  return { runtime, outcome: { status: classifyRender(output, inspected, reimported), harnessStatus: output.status,
    succeeded: output.succeeded, reimported, checks: inspected.checks, exportAvailability: output.exportAvailability,
    pageErrors, diagnostics: extractDiagnostics(output.resultJson), hashes } };
}

export async function renderAttempt(store, rawPath, options) {
  store.assertCanAttempt();
  const n = store.nextAttemptNumber;
  const dir = store.attemptDir(n);
  await mkdir(dir, { recursive: true });

  const rawOutput = await readFile(resolve(rawPath), 'utf8');
  const promptPath = store.promptPathFor(n);
  const inputPrompt = existsSync(promptPath) ? await readFile(promptPath, 'utf8') : '';
  const generator = declaredGenerator(options, store.info.requestedGenerator);
  await writeFile(join(dir, 'raw_output.txt'), rawOutput);
  if (inputPrompt && !existsSync(join(dir, 'input_prompt.md'))) await writeFile(join(dir, 'input_prompt.md'), inputPrompt);

  const started = Date.now();
  const { outcome, runtime } = rawOutput.trim().length === 0
    ? { outcome: { status: STATUS.GENERATION_ERROR, error: 'Empty generator output.' } }
    : await renderRawOutput(findEngineRoot(), dir, harnessInput(store, n, rawOutput, inputPrompt, generator),
      Number(options['timeout-ms'] ?? DEFAULT_TIMEOUT_MS));

  await store.recordAttempt({ n, kind: n === 1 ? 'initial' : 'repair', generator, durationMs: Date.now() - started,
    inputPromptSha256: sha256(inputPrompt), rawOutputSha256: sha256(rawOutput), diagnostics: [], ...outcome }, runtime);
  return { exit: exitCodeFor(store.info.status), payload: store.summary() };
}

export async function run(options) {
  const store = await RunStore.open(resolve(requireOption(options, 'run')));
  return renderAttempt(store, requireOption(options, 'raw'), options);
}
