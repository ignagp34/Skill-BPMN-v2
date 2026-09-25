// evaluate --run <runDir> [--python <exe>]   (TFM-eval metrics, output kept inside the run)
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { requireOption, UsageError } from '../lib/cli-args.mjs';
import { findEngineRoot } from '../lib/engine.mjs';
import { RunStore } from '../lib/run-store.mjs';

const STAGED_FILES = ['diagram.bpmn', 'result.json', 'raw_output.txt', 'normalized.dsl', 'input_prompt.md', 'run-info.json'];

function findPython(engineRoot, explicit) {
  const candidates = [explicit, process.env.BPMN_EVAL_PYTHON,
    join(engineRoot, 'TFM-eval/.venv/Scripts/python.exe'), join(engineRoot, 'TFM-eval/.venv/bin/python'),
    join(dirname(engineRoot), '.venv-bpmn/Scripts/python.exe'), join(dirname(engineRoot), '.venv-bpmn/bin/python')];
  const python = candidates.find(p => p && existsSync(p));
  if (!python) throw new Error('No Python with bpmn_eval found. Pass --python or set BPMN_EVAL_PYTHON.');
  return python;
}

// TFM-eval only discovers EXP-{process}-{sys}-{provider}-{model}-R{NN} folders.
function experimentName(info) {
  const segment = value => String(value ?? 'NONE').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'NONE';
  const generator = info.attempts.at(-1)?.generator ?? {};
  return ['EXP', 'SKILL', segment(info.systemPromptVersion), segment(generator.host), segment(generator.model),
    `R${String(info.attempts.length).padStart(2, '0')}`].join('-');
}

export async function run(options) {
  const engineRoot = findEngineRoot();
  const store = await RunStore.open(resolve(requireOption(options, 'run')));
  if (!existsSync(store.path('result.json'))) throw new UsageError('Nothing to evaluate: the run has no result.json.');

  const outDir = store.path('evaluation');
  const staging = join(outDir, 'staging');
  const experimentDir = join(staging, experimentName(store.info));
  await rm(staging, { recursive: true, force: true });
  await mkdir(experimentDir, { recursive: true });
  for (const name of STAGED_FILES) {
    if (existsSync(store.path(name))) await copyFile(store.path(name), join(experimentDir, name));
  }

  const proc = spawnSync(findPython(engineRoot, options.python), ['-m', 'bpmn_eval.cli_experiments', '--experiments', staging,
    '--schema-dir', join(engineRoot, 'TFM-eval/schemas'), '-o', outDir, '--format', 'both'],
  { cwd: join(engineRoot, 'TFM-eval'), encoding: 'utf8', env: { ...process.env, PYTHONPATH: join(engineRoot, 'TFM-eval/src') } });
  const logFile = join(outDir, 'evaluation.log');
  await writeFile(logFile, `${proc.stdout ?? ''}\n${proc.stderr ?? ''}`);
  if (proc.status !== 0) throw new Error(`Evaluation failed (exit ${proc.status}); see ${logFile}`);

  const reports = (await readdir(outDir)).filter(name => name !== 'staging').map(name => join(outDir, name));
  return { exit: 0, payload: { runDir: store.dir, reports } };
}
