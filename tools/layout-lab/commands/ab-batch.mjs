// ab-batch --a <renderDir> --b <renderDir> --out <batchDir> [--count 20] [--seed s]
//          [--view hidden|shown] [--include-identical]
// Builds a blind A/B batch: same case, both layouts, random side per pair.
// By default only cases whose images differ are used (identical pairs teach nothing).
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { requireOption, UsageError } from '../../../skills/bpmn-desde-resumen/scripts/lib/cli-args.mjs';
import { sha256 } from '../../../skills/bpmn-desde-resumen/scripts/lib/hash.mjs';
import { BATCH_FILE, rng, RUBRIC, shuffle, writeJsonAtomic } from '../lib/ab.mjs';
import { RENDER_INFO } from './bench-render.mjs';

const OK = new Set(['success', 'success_with_warnings']);
const readJson = async path => JSON.parse(await readFile(path, 'utf8'));

/** The image a user would get: hidden.png when the case has message flows and the view is hidden. */
function imageOf(renderDir, id, view) {
  const hidden = join(renderDir, id, 'hidden.png');
  return view === 'hidden' && existsSync(hidden) ? hidden : join(renderDir, id, 'diagram.png');
}

const pngSize = bytes => ({ width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) });

export async function run(options) {
  const [aDir, bDir] = [resolve(requireOption(options, 'a')), resolve(requireOption(options, 'b'))];
  const out = resolve(requireOption(options, 'out'));
  if (existsSync(out)) throw new UsageError(`${out} exists; a batch is never overwritten (votes live there).`);
  const view = options.view ?? 'hidden';
  if (!['hidden', 'shown'].includes(view)) throw new UsageError('--view must be hidden or shown');
  const count = Number(options.count ?? 20);
  const seed = String(options.seed ?? Date.now());
  const [a, b] = [await readJson(join(aDir, RENDER_INFO)), await readJson(join(bDir, RENDER_INFO))];
  if (a.benchManifestSha256 !== b.benchManifestSha256) throw new Error('The two renders used different benches.');

  const bStatus = new Map(b.cases.map(c => [c.id, c.status]));
  const eligible = [];
  for (const c of a.cases.filter(c => OK.has(c.status) && OK.has(bStatus.get(c.id)))) {
    const [ia, ib] = [await readFile(imageOf(aDir, c.id, view)), await readFile(imageOf(bDir, c.id, view))];
    if (options['include-identical'] || sha256(ia) !== sha256(ib)) eligible.push(c.id);
  }
  const random = rng(seed);
  const chosen = shuffle(eligible, random).slice(0, count);

  await mkdir(join(out, 'images'), { recursive: true });
  const pairs = [];
  for (const [i, id] of chosen.entries()) {
    const pairId = `p${String(i + 1).padStart(2, '0')}`;
    const aOnLeft = random() < 0.5;
    const sides = { left: aOnLeft ? 'A' : 'B', right: aOnLeft ? 'B' : 'A' };
    const images = {};
    for (const side of ['left', 'right']) {
      const source = imageOf(sides[side] === 'A' ? aDir : bDir, id, view);
      const file = `images/${pairId}-${side}.png`;
      await copyFile(source, join(out, file));
      images[side] = { file, ...pngSize(await readFile(source)) };
    }
    pairs.push({ pairId, caseId: id, sides, images });
  }
  const batch = { schema: 'layout-ab-batch/1', createdAt: new Date().toISOString(), seed, view,
    variants: { A: { layout: a.layout.name, render: aDir }, B: { layout: b.layout.name, render: bDir } },
    eligibleCases: eligible.length, rubric: RUBRIC, pairs };
  await writeJsonAtomic(join(out, BATCH_FILE), batch);
  return { exit: 0, payload: { batch: out, pairs: pairs.length, eligible: eligible.length, view,
    next: `node tools/layout-lab/layout.mjs vote --batch "${out}"` } };
}
