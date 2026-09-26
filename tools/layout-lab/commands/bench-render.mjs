// bench-render --layout <v> --out <dir> [--bench <benchDir>] [--only <id,id>] [--timeout-ms n]
// Renders the bench with one layout version into a new folder (never reused).
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { requireOption } from '../../../skills/bpmn/scripts/lib/cli-args.mjs';
import { DEFAULT_BENCH, loadBench } from '../lib/bench.mjs';
import { layoutVersion } from '../lib/layouts.mjs';
import { openSession, renderCase } from '../lib/render-cases.mjs';

export const RENDER_INFO = 'render.json';

export async function run(options) {
  const layout = layoutVersion(requireOption(options, 'layout'));
  const out = resolve(requireOption(options, 'out'));
  if (existsSync(out)) throw new Error(`${out} exists; bench renders always go to a new folder.`);
  const benchDir = resolve(options.bench ?? DEFAULT_BENCH);
  const { cases, manifestSha256 } = await loadBench(benchDir);
  const only = options.only ? new Set(String(options.only).split(',')) : null;
  const selected = only ? cases.filter(c => only.has(c.id)) : cases;

  await mkdir(out, { recursive: true });
  const startedAt = new Date().toISOString();
  const session = await openSession(layout);
  const records = [];
  try {
    for (const c of selected) {
      const record = await renderCase(session, layout, c, out, { timeoutMs: Number(options['timeout-ms'] ?? 120_000) });
      records.push({ id: c.id, status: record.status, width: record.width, height: record.height,
        hidden: record.hidden?.status ?? null, semanticSha256: record.semanticSha256 ?? null });
    }
  } finally {
    await session.close();
  }
  const info = { schema: 'layout-render/1', layout: { name: layout.name, description: layout.description, harness: layout.harness },
    bench: benchDir, benchManifestSha256: manifestSha256, startedAt, finishedAt: new Date().toISOString(),
    runtime: session.runtime, cases: records };
  await writeFile(join(out, RENDER_INFO), `${JSON.stringify(info, null, 2)}\n`);
  const failed = records.filter(r => !['success', 'success_with_warnings'].includes(r.status));
  return { exit: failed.length ? 1 : 0, payload: { out, layout: layout.name, cases: records.length, failed } };
}
