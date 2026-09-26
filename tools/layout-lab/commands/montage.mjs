// montage --batch <batchDir>
// For the visual judge: each pair as one image, both diagrams at the same scale,
// marked "1" and "2", in both orders (position-bias control). Writes
// <batch>/montage/<pairId>-o1.png (1 = left of the batch) and -o2.png (swapped),
// plus judge-tasks.json. Task names reveal neither case nor variant.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { requireOption } from '../../../skills/bpmn/scripts/lib/cli-args.mjs';
import { findEngineRoot } from '../../../skills/bpmn/scripts/lib/engine.mjs';
import { launchChromium } from '../../../skills/bpmn/scripts/lib/harness.mjs';
import { loadBatch, RUBRIC } from '../lib/ab.mjs';

const MAX_WIDTH = 2400;   // montage width cap (px)
const GAP = 24;
const HEADER = 44;

function montageHtml(first, second) {
  const w = Math.max(first.width, second.width); const h = Math.max(first.height, second.height);
  // Same rule as the voting page: side by side or stacked, whichever is bigger.
  const side = Math.min(1, (MAX_WIDTH - GAP * 3) / 2 / w); const stack = Math.min(1, (MAX_WIDTH - GAP * 2) / w);
  const stacked = stack * h * 2 < 3200 && stack > side * 1.25;
  const scale = stacked ? stack : side;
  const cell = (img, label) => `<figure><figcaption>${label}</figcaption>
    <img src="data:image/png;base64,${img.base64}" style="width:${Math.round(img.width * scale)}px;height:${Math.round(img.height * scale)}px"></figure>`;
  return `<!doctype html><html><body style="margin:0;background:#e5e7eb;font:bold 28px Arial, sans-serif">
    <div id="m" style="display:inline-flex;flex-direction:${stacked ? 'column' : 'row'};gap:${GAP}px;padding:${GAP}px;align-items:flex-start">
    <style>figure{margin:0;background:#fff;border:2px solid #9ca3af;border-radius:6px;padding:8px}
    figcaption{height:${HEADER - 8}px;color:#111827}img{display:block}</style>
    ${cell(first, 'Diagrama 1')}${cell(second, 'Diagrama 2')}</div></body></html>`;
}

export async function run(options) {
  const batchDir = resolve(requireOption(options, 'batch'));
  const batch = await loadBatch(batchDir);
  const out = join(batchDir, 'montage');
  await mkdir(out, { recursive: true });
  const browser = await launchChromium(findEngineRoot());
  const tasks = [];
  try {
    const page = await browser.newPage({ viewport: { width: MAX_WIDTH, height: 1200 } });
    for (const pair of batch.pairs) {
      const img = {};
      for (const side of ['left', 'right']) {
        img[side] = { ...pair.images[side], base64: (await readFile(join(batchDir, pair.images[side].file))).toString('base64') };
      }
      for (const [order, first, second] of [['o1', img.left, img.right], ['o2', img.right, img.left]]) {
        await page.setContent(montageHtml(first, second));
        const file = `montage/${pair.pairId}-${order}.png`;
        await page.locator('#m').screenshot({ path: join(batchDir, file) });
        tasks.push({ task: `${pair.pairId}-${order}`, image: join(batchDir, file) });
      }
    }
  } finally {
    await browser.close().catch(() => {});
  }
  await writeFile(join(out, 'judge-tasks.json'), `${JSON.stringify({ schema: 'layout-judge-tasks/1', rubric: RUBRIC,
    verdictsFile: join(batchDir, 'judge', 'verdicts.json'), tasks }, null, 2)}\n`);
  return { exit: 0, payload: { batch: batchDir, montages: tasks.length, tasks: join(out, 'judge-tasks.json') } };
}
