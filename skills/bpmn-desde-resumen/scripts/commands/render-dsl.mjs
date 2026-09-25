// render-dsl --dsl <file> --out <dir> [--label <slug>] [--timeout-ms <n>] [--message-flows hidden|shown]
// (no generation)
import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { requireOption } from '../lib/cli-args.mjs';
import { engineRecord, findEngineRoot, verifyEngine } from '../lib/engine.mjs';
import { sha256 } from '../lib/hash.mjs';
import { RunStore } from '../lib/run-store.mjs';
import { STATUS } from '../lib/status.mjs';
import { renderAttempt } from './render.mjs';

const DIRECT = { host: 'direct-dsl', model: 'none', effort: 'none' };

export async function run(options) {
  const dslPath = resolve(requireOption(options, 'dsl'));
  const engine = await verifyEngine(findEngineRoot());
  const store = await RunStore.create(resolve(requireOption(options, 'out')),
    options.label ?? basename(dslPath).replace(/\.[^.]+$/, ''), {
      interfaceType: 'skill-dsl',
      representation: 'dsl',
      systemPromptVersion: 'NONE',
      processPromptVersion: 'none',
      status: STATUS.RENDERING,
      requestedGenerator: { ...DIRECT, profile: 'none', delegation: 'none' },
      source: { dsl: basename(dslPath), sha256: sha256(await readFile(dslPath)) },
      engine: engineRecord(engine),
      notes: 'Direct DSL render, no model generation.',
    });
  return renderAttempt(store, dslPath, { ...options, ...DIRECT });
}
