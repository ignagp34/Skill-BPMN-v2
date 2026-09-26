// The layout bench: a fixed, versioned set of DSL cases (manifest.json + cases/*.dsl).
// It is selected once from existing DSL and never regenerated with candidate code;
// every read verifies the stored hashes.
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256 } from '../../../skills/bpmn/scripts/lib/hash.mjs';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
export const DEFAULT_BENCH = join(REPO_ROOT, 'tools/layout-lab/bench');
export const BENCH_SCHEMA = 'layout-bench/1';

/** Stratification tags; thresholds are part of the bench definition. */
export function tagsOf(f) {
  const tags = [];
  if (f.pools <= 1) tags.push(f.maxLanesInPool >= 2 ? 'pool1-lanes' : 'pool1-nolanes');
  else tags.push(f.pools >= 4 ? 'pools4plus' : `pools${f.pools}`);
  if (f.messageFlows > 0) tags.push('message-flows');
  if (f.boundaryEvents > 0) tags.push('boundary-events');
  if (f.loops > 0) tags.push('loops');
  if (f.gateways >= 4) tags.push('many-gateways');
  if (f.artifacts > 0) tags.push('artifacts');
  if (f.subprocesses > 0) tags.push('subprocess');
  if (f.maxLabelLength >= 45) tags.push('long-labels');
  tags.push(f.flowNodes < 10 ? 'size-small' : f.flowNodes < 25 ? 'size-medium' : 'size-large');
  return tags;
}

export async function loadBench(benchDir = DEFAULT_BENCH) {
  const manifestPath = join(benchDir, 'manifest.json');
  if (!existsSync(manifestPath)) throw new Error(`No bench at ${benchDir} (run bench-select first).`);
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (manifest.schema !== BENCH_SCHEMA) throw new Error(`Unexpected bench schema ${manifest.schema}`);
  const cases = [];
  for (const c of manifest.cases) {
    const bytes = await readFile(join(benchDir, c.dslFile));
    if (sha256(bytes) !== c.sha256) throw new Error(`Bench case ${c.id} changed: hash mismatch (${c.dslFile}).`);
    cases.push({ ...c, dsl: bytes.toString('utf8') });
  }
  return { manifest, cases, manifestSha256: sha256(await readFile(manifestPath)) };
}
