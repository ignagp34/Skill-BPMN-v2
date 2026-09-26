// metrics --render <dir>
// Writes <dir>/<case>/metrics.json and <dir>/metrics.json (summary + v0-style
// diagnosis: which defects are most frequent) and <dir>/metrics.csv.
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { requireOption } from '../../../skills/bpmn/scripts/lib/cli-args.mjs';
import { parseBpmn } from '../lib/bpmn-model.mjs';
import { mean, median } from '../lib/geometry.mjs';
import { computeMetrics, METRICS } from '../lib/metrics.mjs';
import { RENDER_INFO } from './bench-render.mjs';

const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
const OK = new Set(['success', 'success_with_warnings']);

export async function caseMetrics(renderDir, id) {
  const dir = join(renderDir, id);
  const path = join(dir, 'metrics.json'); // always recomputed: metric code may have changed
  const model = parseBpmn(await readFile(join(dir, 'diagram.bpmn'), 'utf8'));
  const result = { id, ...computeMetrics(model, await readJson(join(dir, 'text-boxes.json'))) };
  await writeFile(path, `${JSON.stringify(result, null, 2)}\n`);
  return result;
}

/** Summary per metric; for "hard" and count-like metrics also how many cases show the defect. */
export function summarise(rows) {
  const out = {};
  for (const m of METRICS) {
    const values = rows.map(r => r.values[m.key]).filter(v => typeof v === 'number');
    const affected = rows.filter(r => r.values[m.key] > 0).map(r => r.id);
    out[m.key] = { group: m.group, better: m.better, n: values.length, mean: mean(values), median: median(values),
      total: values.reduce((a, b) => a + b, 0), casesAffected: affected.length,
      worst: [...rows].filter(r => typeof r.values[m.key] === 'number')
        .sort((a, b) => (m.better === 'higher' ? a.values[m.key] - b.values[m.key] : b.values[m.key] - a.values[m.key]))
        .slice(0, 5).map(r => [r.id, r.values[m.key]]) };
  }
  return out;
}

function toCsv(rows) {
  const keys = METRICS.map(m => m.key);
  const countKeys = Object.keys(rows[0]?.counts ?? {});
  const lines = [['id', ...countKeys, ...keys].join(',')];
  for (const r of rows) lines.push([r.id, ...countKeys.map(k => r.counts[k]), ...keys.map(k => r.values[k] ?? '')].join(','));
  return `${lines.join('\n')}\n`;
}

export async function run(options) {
  const renderDir = resolve(requireOption(options, 'render'));
  const info = await readJson(join(renderDir, RENDER_INFO));
  const rows = [];
  for (const c of info.cases.filter(c => OK.has(c.status))) rows.push(await caseMetrics(renderDir, c.id));
  const summary = summarise(rows);
  const diagnosis = METRICS.filter(m => m.group === 'hard' || ['crossings', 'edgeOverlaps', 'longSeqEdges'].includes(m.key))
    .map(m => ({ metric: m.key, group: m.group, casesAffected: summary[m.key].casesAffected, total: summary[m.key].total }))
    .sort((a, b) => b.casesAffected - a.casesAffected || b.total - a.total);
  const report = { schema: 'layout-metrics/1', layout: info.layout.name, cases: rows.length,
    skipped: info.cases.filter(c => !OK.has(c.status)).map(c => c.id), diagnosis, summary };
  await writeFile(join(renderDir, 'metrics.json'), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(join(renderDir, 'metrics.csv'), toCsv(rows));
  return { exit: 0, payload: { renderDir, cases: rows.length, diagnosis } };
}
