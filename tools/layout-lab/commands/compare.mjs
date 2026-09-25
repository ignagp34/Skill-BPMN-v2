// compare --base <renderDir> --candidate <renderDir> [--out <file>]
// Objective gate for a layout candidate (fase 5, steps 2–3): identical semantic
// XML in every case, no hard-constraint regression, area within the pre-registered
// band; plus per-metric deltas read as a Pareto front (no single score).
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { requireOption } from '../../../skills/bpmn-desde-resumen/scripts/lib/cli-args.mjs';
import { REPO_ROOT } from '../lib/bench.mjs';
import { mean } from '../lib/geometry.mjs';
import { METRICS } from '../lib/metrics.mjs';
import { RENDER_INFO } from './bench-render.mjs';
import { caseMetrics } from './metrics.mjs';

const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
const OK = new Set(['success', 'success_with_warnings']);

/** +1 candidate better, -1 worse, 0 equal/not comparable. */
function verdict(metric, base, cand) {
  if (typeof base !== 'number' || typeof cand !== 'number' || metric.better === 'band' || metric.better === 'info') return 0;
  if (Math.abs(cand - base) < 1e-9) return 0;
  return (metric.better === 'lower' ? cand < base : cand > base) ? 1 : -1;
}

export async function run(options) {
  const baseDir = resolve(requireOption(options, 'base'));
  const candDir = resolve(requireOption(options, 'candidate'));
  const rules = await readJson(join(REPO_ROOT, 'tools/layout-lab/config/acceptance.json'));
  const [base, cand] = [await readJson(join(baseDir, RENDER_INFO)), await readJson(join(candDir, RENDER_INFO))];
  if (base.benchManifestSha256 !== cand.benchManifestSha256) throw new Error('The two renders used different benches.');

  const candById = new Map(cand.cases.map(c => [c.id, c]));
  const cases = [];
  for (const b of base.cases) {
    const c = candById.get(b.id);
    const row = { id: b.id, baseStatus: b.status, candidateStatus: c?.status ?? 'missing',
      semanticIdentical: !!c && b.semanticSha256 === c.semanticSha256 };
    if (OK.has(b.status) && OK.has(c?.status)) {
      const [mb, mc] = [await caseMetrics(baseDir, b.id), await caseMetrics(candDir, b.id)];
      row.deltas = {}; row.better = []; row.worse = [];
      for (const m of METRICS) {
        const [vb, vc] = [mb.values[m.key], mc.values[m.key]];
        row.deltas[m.key] = typeof vb === 'number' && typeof vc === 'number' ? vc - vb : null;
        const v = verdict(m, vb, vc);
        if (v > 0) row.better.push(m.key); else if (v < 0) row.worse.push(m.key);
      }
      // Hidden message flows do not count unless the rules say so (user decision 2026-09-25).
      const hard = (metrics, key) => (rules.hiddenMessageFlowsCountInHard === false
        ? metrics.hardVisible?.[key] ?? metrics.values[key] : metrics.values[key]);
      row.hardDeltas = Object.fromEntries(METRICS.filter(m => m.group === 'hard')
        .map(m => [m.key, hard(mc, m.key) - hard(mb, m.key)]));
      row.hardRegressions = Object.entries(row.hardDeltas).filter(([, d]) => d > 0).map(([k]) => k);
      row.areaGrowth = mb.values.area ? mc.values.area / mb.values.area - 1 : null;
      row.changed = METRICS.some(m => row.deltas[m.key]);
    }
    cases.push(row);
  }

  const failures = {
    semantic: cases.filter(r => !r.semanticIdentical).map(r => r.id),
    status: cases.filter(r => OK.has(r.baseStatus) && !OK.has(r.candidateStatus)).map(r => r.id),
    hardRegressions: cases.filter(r => r.hardRegressions?.length > rules.hardConstraintRegressionsAllowed)
      .map(r => [r.id, r.hardRegressions]),
    areaBand: cases.filter(r => r.areaGrowth > rules.areaGrowthMax).map(r => [r.id, Math.round(r.areaGrowth * 1000) / 1000]),
  };
  const compared = cases.filter(r => r.deltas);
  const metrics = Object.fromEntries(METRICS.map(m => [m.key, {
    group: m.group, better: m.better, meanDelta: mean(compared.map(r => r.deltas[m.key]).filter(v => typeof v === 'number')),
    casesBetter: compared.filter(r => r.better.includes(m.key)).length,
    casesWorse: compared.filter(r => r.worse.includes(m.key)).length }]));
  const report = { schema: 'layout-compare/1', base: base.layout.name, candidate: cand.layout.name, rules,
    affectedCases: compared.filter(r => r.changed).map(r => r.id),
    objectiveGatePassed: Object.values(failures).every(list => list.length === 0),
    failures, metrics, cases };
  const out = resolve(options.out ?? join(candDir, `compare-${base.layout.name}.json`));
  await writeFile(out, `${JSON.stringify(report, null, 2)}\n`);
  return { exit: report.objectiveGatePassed ? 0 : 1,
    payload: { out, objectiveGatePassed: report.objectiveGatePassed, affected: report.affectedCases.length, failures } };
}
