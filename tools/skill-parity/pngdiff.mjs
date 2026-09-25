// Pixel comparison of PNG pairs using the pinned Chromium (no extra deps).
//   node tools/skill-parity/pngdiff.mjs <baselineDir> <candidateDir> [out.json]
// Each dir holds <id>/diagram.png. Reports size, differing pixels and max channel delta.
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// Raster tolerance measured on 2026-09-25 (docs in skill-parity/README.md):
// identical SVG, identical size, antialiasing-only noise.
export const PNG_TOLERANCE = { maxDelta: 4, maxDifferingRatio: 0.02 };

export async function comparePngs(pairs) {
  if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
    for (const d of [join(root, '.playwright'), join(dirname(root), '.playwright')]) if (existsSync(d)) { process.env.PLAYWRIGHT_BROWSERS_PATH = d; break; }
  }
  const require = createRequire(join(root, 'apps/tfm-lab/package.json'));
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const rows = [];
  try {
    for (const { id, a, b } of pairs) {
      const urls = await Promise.all([a, b].map(async p => `data:image/png;base64,${(await readFile(p)).toString('base64')}`));
      const row = await page.evaluate(async ([x, y]) => {
        const load = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
        const [ia, ib] = await Promise.all([load(x), load(y)]);
        if (ia.width !== ib.width || ia.height !== ib.height) return { sameSize: false, a: [ia.width, ia.height], b: [ib.width, ib.height] };
        const px = img => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
          const g = c.getContext('2d'); g.drawImage(img, 0, 0); return g.getImageData(0, 0, c.width, c.height).data; };
        const da = px(ia); const db = px(ib);
        let diff = 0; let maxDelta = 0;
        for (let i = 0; i < da.length; i += 4) {
          const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]), Math.abs(da[i + 3] - db[i + 3]));
          if (d > 0) { diff += 1; if (d > maxDelta) maxDelta = d; }
        }
        return { sameSize: true, width: ia.width, height: ia.height, pixels: da.length / 4, differing: diff, maxDelta };
      }, urls);
      row.id = id;
      if (row.pixels) row.differingRatio = +(row.differing / row.pixels).toFixed(6);
      row.withinTolerance = row.sameSize && row.maxDelta <= PNG_TOLERANCE.maxDelta && row.differingRatio <= PNG_TOLERANCE.maxDifferingRatio;
      rows.push(row);
    }
  } finally { await browser.close(); }
  return rows;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [a, b, out] = process.argv.slice(2).map(p => p && resolve(p));
  const pairs = (await readdir(a)).sort().map(id => ({ id, a: join(a, id, 'diagram.png'), b: join(b, id, 'diagram.png') }))
    .filter(p => existsSync(p.a) && existsSync(p.b));
  const rows = await comparePngs(pairs);
  rows.forEach(r => console.log(JSON.stringify(r)));
  if (out) await writeFile(out, `${JSON.stringify(rows, null, 2)}\n`);
}
