// Deterministic smoke wrapper. Uses the original browser harness without edits.
import './verify-source.mjs';
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import os from 'node:os';

const home = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = home;
const require = createRequire(join(repo, 'apps/tfm-lab/package.json'));
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
const { chromium } = require('playwright');
const output = resolve(process.argv[2] ?? join(home, 'smoke-output'));
await mkdir(output, { recursive: false }); // Never overwrite a baseline.
const manifest = JSON.parse(await readFile(join(home, 'smoke/cases.json'), 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const summary = { environment: { node: process.version, platform: process.platform,
  os: os.release(), arch: process.arch, playwright: require('playwright/package.json').version,
  engineCommit: 'f558eb0e0904c02264d5dccb6ad76164fda22919',
  lockSha256: sha(await readFile(join(repo, 'pnpm-lock.yaml'))),
  modelCalls: 0, workWebValidated: false }, cases: [] };
let server, browser;
try {
  server = await createServer({ root: join(repo, 'apps/tfm-lab'),
    configFile: join(repo, 'apps/tfm-lab/vite.config.ts'), logLevel: 'warn',
    server: { host: '127.0.0.1', port: 0, open: false } });
  await server.listen();
  browser = await chromium.launch({ timeout: 60000 });
  summary.environment.chromium = browser.version();
  for (const item of manifest) {
    const dir = join(output, item.id);
    await mkdir(dir);
    const raw = await readFile(join(home, 'smoke/inputs', item.id + '.dsl'), 'utf8');
    await writeFile(join(dir, 'raw_output.txt'), raw);
    const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    let timer;
    try {
      await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/index.headless.html`, { timeout: 120000 });
      await page.waitForFunction(() => window.__harnessReady === true, undefined, { timeout: 120000 });
      const out = await Promise.race([
        page.evaluate(input => window.renderExperiment(input), {
          experimentId: item.id, processId: 'FIXTURE', processSource: item.source,
          systemPromptVersion: 'BASELINE', processPromptVersion: 'fixture', provider: 'none',
          modelLabel: 'none', runNumber: 1, createdAt: '2026-09-22T00:00:00Z',
          notes: 'Deterministic existing fixture. No model generation. interfaceType web is inherited harness metadata, not Work evidence.',
          inputPrompt: 'Existing fixture; no generation prompt used.', rawOutput: raw
        }),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('render timeout 120s')), 120000); })
      ]);
      const result = JSON.parse(out.resultJson);
      const files = { 'normalized.dsl': out.normalizedDsl, 'result.json': out.resultJson,
        'semantic.bpmn': result.semanticXml, 'diagram.bpmn': out.layoutXml,
        'diagram.svg': out.svg, 'diagram.png': out.pngBase64 ? Buffer.from(out.pngBase64, 'base64') : null };
      const hashes = {};
      for (const [name, bytes] of Object.entries(files)) {
        if (bytes == null) continue;
        await writeFile(join(dir, name), bytes);
        hashes[name] = sha(bytes);
      }
      const png = files['diagram.png'];
      const checks = { bpmnDI: /BPMNShape/.test(out.layoutXml ?? '') && /BPMNEdge/.test(out.layoutXml ?? ''),
        svg: /<svg[\s>]/.test(out.svg ?? ''), png: !!png && png.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')),
        width: png?.readUInt32BE(16), height: png?.readUInt32BE(20) };
      const reimport = out.layoutXml ? await page.evaluate(xml => window.renderArtifactsFromLayout(xml).then(x => !!x.svg && !!x.pngBase64), out.layoutXml) : null;
      const passed = item.invalid ? !out.succeeded && !out.layoutXml && !out.svg && !png
        : out.succeeded && checks.bpmnDI && checks.svg && checks.png && checks.width > 0 && checks.height > 0 && reimport;
      const entry = { ...item, status: out.status, passed, checks, reimport, hashes, errors };
      summary.cases.push(entry);
      await writeFile(join(dir, 'checks.json'), JSON.stringify(entry, null, 2));
      console.log(`${item.id}: ${out.status}; checks=${passed}`);
    } catch (err) {
      summary.cases.push({ ...item, passed: false, error: String(err), errors });
      console.error(item.id, err);
    } finally { clearTimeout(timer); await page.close(); }
  }
} catch (err) { summary.fatal = String(err); process.exitCode = 1; }
finally {
  await browser?.close();
  await server?.close();
  await writeFile(join(output, 'summary.json'), JSON.stringify(summary, null, 2));
}
if (summary.cases.length !== manifest.length || summary.cases.some(x => !x.passed)) process.exitCode = 1;
