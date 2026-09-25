// Stage 4/5 check: the skill adapter (skills/bpmn-desde-resumen/scripts/bpmn.mjs)
// against the frozen stage-1 baseline, plus injected failure cases. No model calls.
//
//   node tools/skill-parity/parity.mjs <new-output-dir> [<same-day smoke/run.mjs output>]
//
// PNG parity: byte-equal to the baseline, or within the measured raster
// tolerance (pngdiff.mjs) when the SVG is identical. If a same-day output of the
// original smoke runner is given, the adapter must also be byte-equal to it.
// Writes <output>/parity-summary.json and exits non-zero on any unexplained difference.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { comparePngs, PNG_TOLERANCE } from './pngdiff.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const cli = join(root, 'skills/bpmn-desde-resumen/scripts/bpmn.mjs');
const output = resolve(process.argv[2] ?? join(root, 'skill-runs/parity'));
const reference = process.argv[3] ? resolve(process.argv[3]) : null;
await mkdir(output, { recursive: false }); // never overwrite earlier evidence
const cases = JSON.parse(await readFile(join(root, 'smoke/cases.json'), 'utf8'));

function run(args, env = {}) {
  const proc = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', env: { ...process.env, ...env } });
  let payload = null;
  try { payload = JSON.parse(proc.stdout); } catch { /* reported below */ }
  return { exit: proc.status, payload, stderr: proc.stderr.slice(-2000) };
}

const markers = s => {
  const ids = [...s.matchAll(/<marker id="([^"]+)"/g)].map(m => m[1]);
  ids.forEach((id, i) => { s = s.replaceAll(id, `MARKER_${i}`); });
  return s;
};

// Geometry of the DI: shapes (bounds) and edges (waypoints), keyed by element id.
function geometry(xml) {
  const shapes = {}; const edges = {};
  for (const m of xml.matchAll(/<bpmndi:BPMNShape\b[^>]*bpmnElement="([^"]+)"[^>]*>\s*<dc:Bounds ([^>]+)\/>/g)) shapes[m[1]] = m[2].trim();
  for (const m of xml.matchAll(/<bpmndi:BPMNEdge\b[^>]*bpmnElement="([^"]+)"[^>]*>([\s\S]*?)<\/bpmndi:BPMNEdge>/g)) {
    edges[m[1]] = [...m[2].matchAll(/<di:waypoint ([^>]+)\/>/g)].map(w => w[1].trim()).join(' | ');
  }
  return { shapes, edges };
}

function diffGeometry(a, b) {
  const out = [];
  for (const kind of ['shapes', 'edges']) {
    const keys = new Set([...Object.keys(a[kind]), ...Object.keys(b[kind])]);
    for (const k of keys) if (a[kind][k] !== b[kind][k]) out.push({ kind, id: k, baseline: a[kind][k] ?? null, adapter: b[kind][k] ?? null });
  }
  return out;
}

const summary = { startedAt: new Date().toISOString(), node: process.version, platform: `${process.platform}-${process.arch}`,
  modelCalls: 0, pngTolerance: PNG_TOLERANCE, sameDayReference: reference, parity: [], faults: [] };

for (const item of cases) {
  const res = run(['render-dsl', '--message-flows', 'shown', '--dsl', join(root, 'smoke/inputs', `${item.id}.dsl`), '--out', join(output, 'cases'), '--label', item.id]);
  const baseDir = join(root, 'baseline-stage1/rendered', item.id);
  const baseChecks = JSON.parse(await readFile(join(baseDir, 'checks.json'), 'utf8'));
  const row = { id: item.id, invalid: item.invalid, baselineStatus: baseChecks.status, adapterStatus: res.payload?.status, exit: res.exit };
  const runDir = res.payload?.runDir;
  if (item.invalid) {
    row.passed = res.payload?.status === baseChecks.status && res.payload.missing.length === 3;
  } else if (runDir) {
    for (const file of ['diagram.bpmn', 'diagram.png', 'semantic.bpmn', 'normalized.dsl']) {
      const a = await readFile(join(baseDir, file)); const p = join(runDir, file);
      row[file] = existsSync(p) && a.equals(await readFile(p));
    }
    const svgA = await readFile(join(baseDir, 'diagram.svg'), 'utf8');
    const svgB = existsSync(join(runDir, 'diagram.svg')) ? await readFile(join(runDir, 'diagram.svg'), 'utf8') : '';
    row['diagram.svg'] = svgA === svgB;
    row.svgNormalized = markers(svgA) === markers(svgB);
    if (!row['diagram.bpmn'] && existsSync(join(runDir, 'diagram.bpmn'))) {
      row.geometryDiff = diffGeometry(geometry(await readFile(join(baseDir, 'diagram.bpmn'), 'utf8')),
        geometry(await readFile(join(runDir, 'diagram.bpmn'), 'utf8'))).slice(0, 50);
    }
    const info = JSON.parse(await readFile(join(runDir, 'run-info.json'), 'utf8'));
    row.checks = info.attempts[0].checks;
    if (reference) {
      row.reference = {};
      for (const file of ['diagram.bpmn', 'diagram.png']) {
        const r = join(reference, item.id, file);
        row.reference[file] = existsSync(r) && existsSync(join(runDir, file)) && (await readFile(r)).equals(await readFile(join(runDir, file)));
      }
      const r = join(reference, item.id, 'diagram.svg');
      row.reference.svgNormalized = existsSync(r) && markers(await readFile(r, 'utf8')) === markers(svgB);
    }
    if (!row['diagram.png'] && existsSync(join(runDir, 'diagram.png'))) {
      [row.pngPixels] = await comparePngs([{ id: item.id, a: join(baseDir, 'diagram.png'), b: join(runDir, 'diagram.png') }]);
    }
    const pngOk = row['diagram.png'] || row.pngPixels?.withinTolerance === true;
    const refOk = !reference || (row.reference['diagram.bpmn'] && row.reference['diagram.png'] && row.reference.svgNormalized);
    row.passed = res.payload.status === baseChecks.status && row['diagram.bpmn'] && pngOk && refOk
      && row['semantic.bpmn'] && row.svgNormalized && row.checks.svgMatchesBpmn && row.checks.pngMatchesSvg;
  } else {
    row.passed = false; row.stderr = res.stderr;
  }
  summary.parity.push(row);
  console.log(`${item.id}: ${row.adapterStatus} parity=${row.passed}`);
}

// ---- injected failures -----------------------------------------------------
const valid = join(root, 'smoke/inputs/simple.dsl');
async function fault(name, args, env, expect) {
  const res = run(args, env);
  const p = res.payload ?? {};
  const passed = res.exit === expect.exit && p.status === expect.status
    && JSON.stringify([...(p.missing ?? [])].sort()) === JSON.stringify([...expect.missing].sort());
  summary.faults.push({ name, exit: res.exit, status: p.status, missing: p.missing, error: p.error, passed });
  console.log(`fault ${name}: ${p.status} exit=${res.exit} passed=${passed}`);
  return p;
}
const emptyBrowsers = await mkdtemp(join(os.tmpdir(), 'no-chromium-'));
await fault('chromium-missing', ['render-dsl', '--message-flows', 'shown', '--dsl', valid, '--out', join(output, 'faults'), '--label', 'no-chromium'],
  { PLAYWRIGHT_BROWSERS_PATH: emptyBrowsers }, { exit: 1, status: 'infrastructure_error', missing: ['diagram.bpmn', 'diagram.svg', 'diagram.png'] });
await fault('timeout', ['render-dsl', '--message-flows', 'shown', '--dsl', valid, '--out', join(output, 'faults'), '--label', 'timeout', '--timeout-ms', '50'],
  {}, { exit: 1, status: 'infrastructure_error', missing: ['diagram.bpmn', 'diagram.svg', 'diagram.png'] });
await fault('png-export-fails', ['render-dsl', '--message-flows', 'shown', '--dsl', valid, '--out', join(output, 'faults'), '--label', 'png-fault'],
  { BPMN_SKILL_FAULT: 'png' }, { exit: 4, status: 'partial_export', missing: ['diagram.png'] });

// Full generation contract without a model: prepare → broken answer → repair
// prompt → fixed answer; then limits and generation failures.
const flowDir = join(output, 'flow'); await mkdir(flowDir);
await writeFile(join(flowDir, 'summary.md'), 'Un cliente envía un pedido; la tienda lo revisa y lo envía.\n');
await writeFile(join(flowDir, 'broken.txt'), await readFile(join(root, 'smoke/inputs/ap6-trace-ends-at-anchor.dsl'), 'utf8'));
await writeFile(join(flowDir, 'fixed.txt'), `\`\`\`\n${await readFile(valid, 'utf8')}\n\`\`\`\n`);
const prep = run(['prepare', '--out', join(flowDir, 'runs'), '--host', 'claude-code', '--summary-file', join(flowDir, 'summary.md')]).payload;
const gen = ['--model', 'fixture-no-model', '--effort', 'none', '--host', 'parity-test'];
const first = run(['render', '--run', prep.runDir, '--raw', join(flowDir, 'broken.txt'), ...gen]);
const repair = run(['repair-prompt', '--run', prep.runDir]);
const second = run(['render', '--run', prep.runDir, '--raw', join(flowDir, 'fixed.txt'), ...gen]);
const repairText = await readFile(repair.payload.promptFile, 'utf8');
const basePrompt = await readFile(join(prep.runDir, 'input_prompt.md'), 'utf8');
const flowInfo = JSON.parse(await readFile(join(prep.runDir, 'run-info.json'), 'utf8'));
// input_prompt.md must equal Handoff.tsx buildPrompt(): its template literal
// (CRLF source → LF per template semantics) with the raw v5 file and the summary.
const handoff = await readFile(join(root, 'apps/company-web/src/ui/screens/Handoff.tsx'), 'utf8');
const template = handoff.match(/return `(\$\{systemPromptV5\}[\s\S]*?)`;/)[1].replace(/\r\n?/g, '\n');
const v5 = await readFile(join(root, 'apps/company-web/prompts/system/internal_bpmn_dsl_system_prompt_v5.md'), 'utf8');
const summaryText = (await readFile(join(flowDir, 'summary.md'), 'utf8')).trim();
const promptMatchesHandoff = template.replace('${systemPromptV5}', () => v5).replace('${narrative}', () => summaryText) === basePrompt;
const flow = { promptMatchesHandoff, firstStatus: first.payload.status, firstExit: first.exit, canRepair: first.payload.canRepair,
  repairPromptExtendsBase: repairText.startsWith(basePrompt) && repairText.includes('ENGINE DIAGNOSTICS'),
  secondStatus: second.payload.status, secondExit: second.exit, rootMirrorsLast: second.payload.missing.length === 0,
  firstAttemptKept: existsSync(join(prep.runDir, 'attempts/01/raw_output.txt')),
  generatorRecorded: flowInfo.attempts.every(a => a.generator.model === 'fixture-no-model' && a.generator.matchesRequested === false) };
// Two failed attempts on a fresh run, then the third is the limit.
const prep2 = run(['prepare', '--out', join(flowDir, 'runs'), '--host', 'claude-code', '--summary-file', join(flowDir, 'summary.md'), '--label', 'limit']).payload;
for (let i = 0; i < 3; i += 1) run(['render', '--run', prep2.runDir, '--raw', join(flowDir, 'broken.txt'), ...gen]);
const fourth = run(['render', '--run', prep2.runDir, '--raw', join(flowDir, 'fixed.txt'), ...gen]);
const repairAfterLimit = run(['repair-prompt', '--run', prep2.runDir]);
flow.limitEnforced = fourth.exit === 64 && repairAfterLimit.exit === 64;
const prep3 = run(['prepare', '--out', join(flowDir, 'runs'), '--host', 'claude-code', '--summary-file', join(flowDir, 'summary.md'), '--label', 'genfail']).payload;
const genFail = run(['fail', '--run', prep3.runDir, '--reason', 'Subagent with gpt-5.6-luna/high not available in this host', '--host', 'parity-test']);
flow.generationFailure = genFail.exit === 5 && genFail.payload.status === 'generation_error' && genFail.payload.missing.length === 3;
await writeFile(join(flowDir, 'empty.txt'), '');
const prep4 = run(['prepare', '--out', join(flowDir, 'runs'), '--host', 'claude-code', '--summary-file', join(flowDir, 'summary.md'), '--label', 'empty']).payload;
const empty = run(['render', '--run', prep4.runDir, '--raw', join(flowDir, 'empty.txt'), ...gen]);
flow.emptyOutput = empty.exit === 5 && empty.payload.status === 'generation_error';
flow.passed = flow.promptMatchesHandoff && flow.firstStatus === 'semantic_error' && flow.firstExit === 2 && flow.canRepair && flow.repairPromptExtendsBase
  && flow.secondExit === 0 && flow.rootMirrorsLast && flow.firstAttemptKept && flow.generatorRecorded
  && flow.limitEnforced && flow.generationFailure && flow.emptyOutput;
summary.flow = flow;
console.log('flow:', JSON.stringify(flow));

summary.finishedAt = new Date().toISOString();
summary.passed = summary.parity.every(r => r.passed) && summary.faults.every(f => f.passed) && flow.passed;
await writeFile(join(output, 'parity-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
console.log(`passed=${summary.passed}`);
if (!summary.passed) process.exitCode = 1;
