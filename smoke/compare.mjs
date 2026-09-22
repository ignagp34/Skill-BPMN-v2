import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const candidate = resolve(process.argv[2]);
const cases = JSON.parse(await readFile(join(root, 'smoke/cases.json'), 'utf8'));
function markers(s) {
  const ids = [...s.matchAll(/<marker id="([^"]+)"/g)].map(m => m[1]);
  ids.forEach((id, i) => { s = s.replaceAll(id, `MARKER_${i}`); });
  return s;
}
const rows = [];
for (const item of cases.filter(x => !x.invalid)) {
  const row = { id: item.id };
  for (const file of ['diagram.bpmn','diagram.svg','diagram.png']) {
    const baseline = await readFile(join(root, 'baseline-stage1/rendered', item.id, file));
    const output = await readFile(join(candidate, item.id, file));
    row[file] = baseline.equals(output);
    if (file.endsWith('.svg')) row.svgNormalized = markers(baseline.toString()) === markers(output.toString());
  }
  rows.push(row);
}
await writeFile(join(candidate, 'comparison.json'), JSON.stringify(rows, null, 2));
console.log(JSON.stringify(rows, null, 2));
if (rows.some(r => !r['diagram.bpmn'] || !r.svgNormalized || !r['diagram.png'])) process.exitCode = 1;
