import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entries = JSON.parse(await readFile(resolve(root, 'smoke/source-hashes.json'), 'utf8'));
let failures = 0;
for (const [file, expected] of Object.entries(entries)) {
  const actual = createHash('sha256').update(await readFile(resolve(root, file))).digest('hex');
  if (actual !== expected) { console.error('Changed source:', file); failures++; }
}
console.log(`Frozen source: ${Object.keys(entries).length} files checked; ${failures} differences.`);
if (failures) process.exit(1);
