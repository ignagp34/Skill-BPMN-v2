// Post-hoc reading of compare-v0.json (written after seeing the gate result, so
// it does NOT change the pre-registered verdict): splits the edge-related hard
// hits of every affected case by flow kind, because message flows are hidden
// by default in what the user receives while metrics use the full layout.
//   node evidence/layout-v1/flow-kind-split.mjs <v0 render> <v1 render> > evidence/layout-v1/flow-kind-split.json
import { readFileSync } from 'node:fs';

const [v0, v1] = process.argv.slice(2);
const KEYS = ['edgeThroughShape', 'labelEdgeOverlaps'];
const compare = JSON.parse(readFileSync(`${v1}/compare-v0.json`, 'utf8'));

function split(dir, id, key) {
  const xml = readFileSync(`${dir}/${id}/diagram.bpmn`, 'utf8');
  const isMessage = edgeId => xml.includes(`<bpmn:messageFlow id="${edgeId}"`);
  const hits = JSON.parse(readFileSync(`${dir}/${id}/metrics.json`, 'utf8')).details[key] ?? [];
  const edgeOf = key === 'edgeThroughShape' ? h => h[0] : h => h[1];
  const message = hits.filter(h => isMessage(edgeOf(h))).length;
  return { sequence: hits.length - message, message };
}

const cases = compare.affectedCases.map(id => ({
  id, ...Object.fromEntries(KEYS.map(k => [k, { v0: split(v0, id, k), v1: split(v1, id, k) }])),
}));
const total = (k, v, kind) => cases.reduce((s, c) => s + c[k][v][kind], 0);
const totals = Object.fromEntries(KEYS.map(k => [k, {
  v0: { sequence: total(k, 'v0', 'sequence'), message: total(k, 'v0', 'message') },
  v1: { sequence: total(k, 'v1', 'sequence'), message: total(k, 'v1', 'message') } }]));
process.stdout.write(`${JSON.stringify({ schema: 'layout-flow-kind-split/1', note: 'post hoc; informative only', totals, cases }, null, 2)}\n`);
