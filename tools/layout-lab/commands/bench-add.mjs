// bench-add --dir <folder of .dsl> --reason <text> [--bench <benchDir>] [--prefix h-]
// Appends hand-written cases to the bench (e.g. to fill a coverage gap). Existing
// cases are never touched; each new case must render validly with v0, whose
// render is only used to read its structural features. The addition is logged
// in manifest.additions so renders made before it are recognisable.
import { existsSync } from 'node:fs';
import { copyFile, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import { basename, join, relative, resolve } from 'node:path';
import { requireOption, UsageError } from '../../../skills/bpmn/scripts/lib/cli-args.mjs';
import { sha256 } from '../../../skills/bpmn/scripts/lib/hash.mjs';
import { parseBpmn, structuralFeatures } from '../lib/bpmn-model.mjs';
import { DEFAULT_BENCH, REPO_ROOT, tagsOf } from '../lib/bench.mjs';
import { layoutVersion } from '../lib/layouts.mjs';
import { openSession, renderCase } from '../lib/render-cases.mjs';

const OK = new Set(['success', 'success_with_warnings']);

export async function run(options) {
  const benchDir = resolve(options.bench ?? DEFAULT_BENCH);
  const sourceDir = resolve(requireOption(options, 'dir'));
  const reason = requireOption(options, 'reason');
  const prefix = options.prefix ?? 'h-';
  const manifestPath = join(benchDir, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const known = new Set(manifest.cases.map(c => c.id));
  const knownHashes = new Set(manifest.cases.map(c => c.sha256));

  const files = (await readdir(sourceDir)).filter(f => f.endsWith('.dsl')).sort();
  if (!files.length) throw new UsageError(`No .dsl files in ${sourceDir}`);
  const layout = layoutVersion('v0');
  const scratch = await mkdtemp(join(os.tmpdir(), 'layout-bench-add-'));
  const session = await openSession(layout);
  const added = []; const rejected = [];
  try {
    for (const file of files) {
      const id = `${prefix}${basename(file, '.dsl')}`;
      const bytes = await readFile(join(sourceDir, file));
      if (known.has(id) || knownHashes.has(sha256(bytes))) { rejected.push([id, 'already in bench']); continue; }
      const record = await renderCase(session, layout, { id, dsl: bytes.toString('utf8') }, scratch);
      if (!OK.has(record.status)) { rejected.push([id, record.status]); continue; }
      const features = structuralFeatures(parseBpmn(await readFile(join(scratch, id, 'diagram.bpmn'), 'utf8')));
      const dslFile = `cases/${id}.dsl`;
      if (existsSync(join(benchDir, dslFile))) { rejected.push([id, `${dslFile} exists`]); continue; }
      await copyFile(join(sourceDir, file), join(benchDir, dslFile));
      added.push({ id, origin: 'handwritten', source: relative(REPO_ROOT, join(sourceDir, file)).replaceAll('\\', '/'),
        processKey: `handwritten:${basename(file, '.dsl')}`, dslFile, sha256: sha256(bytes), tags: tagsOf(features), features,
        featuresFrom: 'v0 render' });
    }
  } finally {
    await session.close();
    await rm(scratch, { recursive: true, force: true });
  }

  if (added.length) {
    manifest.cases = [...manifest.cases, ...added].sort((a, b) => a.id.localeCompare(b.id));
    manifest.additions = [...(manifest.additions ?? []),
      { at: new Date().toISOString(), reason, source: relative(REPO_ROOT, sourceDir).replaceAll('\\', '/'), cases: added.map(c => c.id) }];
    for (const [tag, row] of Object.entries(manifest.coverage)) {
      const n = added.filter(c => c.tags.includes(tag)).length;
      row.selected += n;
      row.available += n;
    }
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }
  return { exit: rejected.length ? 1 : 0,
    payload: { bench: relative(REPO_ROOT, benchDir), added: added.map(c => [c.id, c.tags.join(' ')]), rejected, total: manifest.cases.length } };
}
