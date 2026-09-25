// bench-select [--out <benchDir>] [--size 50]
// One-off selection of the layout bench from existing DSL: the TFM corpus
// (features read from its stored diagram.bpmn) and the repository fixtures
// (features from a v0 render). Refuses to overwrite an existing bench.
import { existsSync } from 'node:fs';
import { copyFile, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import { basename, join, relative, resolve } from 'node:path';
import { sha256 } from '../../../skills/bpmn-desde-resumen/scripts/lib/hash.mjs';
import { parseBpmn, structuralFeatures } from '../lib/bpmn-model.mjs';
import { BENCH_SCHEMA, DEFAULT_BENCH, REPO_ROOT, tagsOf } from '../lib/bench.mjs';
import { layoutVersion } from '../lib/layouts.mjs';
import { openSession, renderCase } from '../lib/render-cases.mjs';

const EXPERIMENTS = 'apps/tfm-lab/prompts/experiments';
const FIXTURE_DIRS = ['packages/bpmn-core/tests/fixtures', 'apps/company-web/src/fixtures', 'apps/tfm-lab/fixtures', 'smoke/inputs'];
const OK = new Set(['success', 'success_with_warnings']);

/** Minimum number of cases per tag; the greedy pass fills the largest relative deficits first. */
const QUOTAS = {
  'pool1-nolanes': 6, 'pool1-lanes': 10, pools2: 12, pools3: 4, pools4plus: 3,
  'message-flows': 12, 'boundary-events': 6, loops: 6, 'many-gateways': 10, artifacts: 8, subprocess: 1,
  'long-labels': 6, 'size-small': 8, 'size-medium': 15, 'size-large': 10,
};
const MAX_PER_PROCESS = 5;

async function corpusCandidates() {
  const root = join(REPO_ROOT, EXPERIMENTS);
  const out = [];
  for (const name of (await readdir(root)).filter(n => n.startsWith('EXP-')).sort()) {
    const dir = join(root, name);
    const dslName = ['raw_output.txt', 'output.dsl'].find(f => existsSync(join(dir, f)));
    if (!dslName || !existsSync(join(dir, 'diagram.bpmn')) || !existsSync(join(dir, 'result.json'))) continue;
    const status = JSON.parse(await readFile(join(dir, 'result.json'), 'utf8')).metadata?.status;
    if (!OK.has(status)) continue;
    const features = structuralFeatures(parseBpmn(await readFile(join(dir, 'diagram.bpmn'), 'utf8')));
    out.push({ id: `c-${name.slice(4).toLowerCase()}`, origin: 'corpus', source: `${EXPERIMENTS}/${name}/${dslName}`,
      processKey: name.split('-')[1], features, featuresFrom: 'stored diagram.bpmn' });
  }
  return out;
}

async function fixtureCandidates() {
  const found = new Map(); // content hash → first path
  for (const dir of FIXTURE_DIRS) {
    for (const file of (await readdir(join(REPO_ROOT, dir))).filter(f => f.endsWith('.dsl')).sort()) {
      const path = `${dir}/${file}`;
      const hash = sha256(await readFile(join(REPO_ROOT, path)));
      if (!found.has(hash)) found.set(hash, path);
    }
  }
  const layout = layoutVersion('v0');
  const scratch = await mkdtemp(join(os.tmpdir(), 'layout-bench-'));
  const session = await openSession(layout);
  const out = [];
  try {
    for (const path of found.values()) {
      const id = `f-${basename(path, '.dsl')}`;
      const record = await renderCase(session, layout, { id, dsl: await readFile(join(REPO_ROOT, path), 'utf8') }, scratch);
      if (!OK.has(record.status)) continue;
      const features = structuralFeatures(parseBpmn(await readFile(join(scratch, id, 'diagram.bpmn'), 'utf8')));
      out.push({ id, origin: 'fixture', source: path, processKey: `fixture:${basename(path, '.dsl')}`, features,
        featuresFrom: 'v0 render' });
    }
  } finally {
    await session.close();
    await rm(scratch, { recursive: true, force: true });
  }
  return out;
}

/** Deterministic greedy stratified selection. */
export function select(candidates, size, quotas = QUOTAS) {
  const counts = Object.fromEntries(Object.keys(quotas).map(t => [t, 0]));
  const perProcess = new Map();
  const chosen = [];
  const pool = candidates.map(c => ({ ...c, tags: tagsOf(c.features), tiebreak: sha256(c.id) }));
  while (chosen.length < size) {
    let best = null;
    for (const c of pool) {
      if (c.picked || (perProcess.get(c.processKey) ?? 0) >= MAX_PER_PROCESS) continue;
      const deficit = c.tags.reduce((s, t) => s + (quotas[t] ? Math.max(0, quotas[t] - counts[t]) / quotas[t] : 0), 0);
      const score = deficit + (perProcess.has(c.processKey) ? 0 : 0.5) - 0.05 * (perProcess.get(c.processKey) ?? 0);
      if (!best || score > best.score || (score === best.score && c.tiebreak < best.c.tiebreak)) best = { c, score };
    }
    if (!best) break;
    best.c.picked = true;
    chosen.push(best.c);
    perProcess.set(best.c.processKey, (perProcess.get(best.c.processKey) ?? 0) + 1);
    for (const t of best.c.tags) if (t in counts) counts[t] += 1;
  }
  return { chosen, counts };
}

export async function run(options) {
  const benchDir = resolve(options.out ?? DEFAULT_BENCH);
  if (existsSync(join(benchDir, 'manifest.json'))) throw new Error(`${benchDir} already holds a bench; it is never regenerated.`);
  const size = Number(options.size ?? 50);
  const candidates = [...await corpusCandidates(), ...await fixtureCandidates()];
  const { chosen, counts } = select(candidates, size);

  await mkdir(join(benchDir, 'cases'), { recursive: true });
  const cases = [];
  for (const c of chosen.sort((a, b) => a.id.localeCompare(b.id))) {
    const dslFile = `cases/${c.id}.dsl`;
    await copyFile(join(REPO_ROOT, c.source), join(benchDir, dslFile));
    cases.push({ id: c.id, origin: c.origin, source: c.source, processKey: c.processKey, dslFile,
      sha256: sha256(await readFile(join(benchDir, dslFile))), tags: c.tags, features: c.features, featuresFrom: c.featuresFrom });
  }
  const available = Object.fromEntries(Object.keys(QUOTAS).map(t => [t, candidates.filter(c => tagsOf(c.features).includes(t)).length]));
  const manifest = {
    schema: BENCH_SCHEMA, createdAt: new Date().toISOString(),
    selection: { size, quotas: QUOTAS, maxPerProcess: MAX_PER_PROCESS, algorithm: 'greedy relative-deficit, tie-break sha256(id)',
      candidates: { corpus: candidates.filter(c => c.origin === 'corpus').length, fixtures: candidates.filter(c => c.origin === 'fixture').length },
      eligibility: 'corpus: historical status success/success_with_warnings with stored diagram.bpmn; fixtures: valid v0 render' },
    coverage: Object.fromEntries(Object.keys(QUOTAS).map(t => [t, { quota: QUOTAS[t], selected: counts[t], available: available[t] }])),
    cases,
  };
  await writeFile(join(benchDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return { exit: 0, payload: { bench: relative(REPO_ROOT, benchDir), cases: cases.length, coverage: manifest.coverage } };
}
