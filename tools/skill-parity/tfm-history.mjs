// Re-renders historical TFM experiments (apps/tfm-lab/prompts/experiments/EXP-*)
// through the skill CLI and compares with the diagram.bpmn stored in the TFM.
//   node tools/skill-parity/tfm-history.mjs <new-output-dir> [<name filter>] [<max>]
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const cli = join(root, 'skills/bpmn-desde-resumen/scripts/bpmn.mjs');
const experiments = join(root, 'apps/tfm-lab/prompts/experiments');
const [outArg, filter = '-SYSV5-', maxArg = '15'] = process.argv.slice(2);
const output = resolve(outArg);
await mkdir(output, { recursive: false });

// Same eligibility as render-experiments.mts: app (raw_output.txt) or agent (output.dsl) convention.
const outputFile = dir => ['raw_output.txt', 'output.dsl'].find(f => existsSync(join(dir, f)));
const names = (await readdir(experiments)).filter(n => n.startsWith('EXP-') && n.includes(filter)
  && outputFile(join(experiments, n)) && existsSync(join(experiments, n, 'diagram.bpmn')));
// Spread the sample over the whole corpus instead of taking the first N.
const max = Number(maxArg);
const step = Math.max(1, Math.floor(names.length / max));
const sample = names.filter((_, i) => i % step === 0).slice(0, max);

const rows = [];
for (const name of sample) {
  const dir = join(experiments, name);
  const proc = spawnSync(process.execPath, [cli, 'render-dsl', '--layout', 'v0', '--message-flows', 'shown', '--dsl', join(dir, outputFile(dir)), '--out', output, '--label', name],
    { encoding: 'utf8' });
  const payload = JSON.parse(proc.stdout);
  const historical = JSON.parse(await readFile(join(dir, 'result.json'), 'utf8')).metadata?.status ?? null;
  const row = { experiment: name, runDir: payload.runDir, historicalStatus: historical, skillStatus: payload.status };
  const produced = payload.deliverables?.bpmn;
  const stored = await readFile(join(dir, 'diagram.bpmn'));
  const fresh = produced ? await readFile(produced) : null;
  // Stored TFM files went through Git EOL conversion on Windows (CRLF after the XML declaration); compare with LF.
  const body = b => b.toString('utf8').replace(/\r\n/g, '\n');
  row.bpmnBytesIdentical = !!fresh && stored.equals(fresh);
  row.bpmnIdentical = !!fresh && body(stored) === body(fresh);
  rows.push(row);
  console.log(`${name}: ${historical} → ${payload.status}; bpmn identical=${row.bpmnIdentical}`);
}
const summary = { filter, total: names.length, sampled: rows.length,
  identical: rows.filter(r => r.bpmnIdentical).length, bytesIdentical: rows.filter(r => r.bpmnBytesIdentical).length, sameStatus: rows.filter(r => r.historicalStatus === r.skillStatus).length, rows };
await writeFile(join(output, 'tfm-history-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
console.log(`identical ${summary.identical}/${summary.sampled}; same status ${summary.sameStatus}/${summary.sampled}`);
