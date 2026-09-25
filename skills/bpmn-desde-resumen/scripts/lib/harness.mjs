// Drives the TFM headless harness (apps/tfm-lab/index.headless.html) exactly as
// apps/tfm-lab/scripts/render-experiments.mts does: Vite dev server on
// 127.0.0.1, Playwright Chromium, 1600×1200 viewport, window.renderExperiment().
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import os from 'node:os';
import { configureBrowsersPath } from './engine.mjs';

export const DEFAULT_TIMEOUT_MS = 120_000;
const HARNESS_PATH = '/index.headless.html';
const VIEWPORT = { width: 1600, height: 1200 };

export class InfrastructureError extends Error {
  constructor(kind, message) { super(message); this.kind = kind; }
}

function loadTfmDependencies(root) {
  const require = createRequire(join(root, 'apps/tfm-lab/package.json'));
  return { require, vitePath: require.resolve('vite'), playwright: require('playwright') };
}

export function runtimeVersions(root) {
  const { require } = loadTfmDependencies(root);
  return { node: process.version, platform: process.platform, arch: process.arch, os: os.release(),
    playwright: require('playwright/package.json').version, vite: require('vite/package.json').version };
}

export async function launchChromium(root) {
  configureBrowsersPath(root);
  const { playwright } = loadTfmDependencies(root);
  try {
    return await playwright.chromium.launch({ headless: true, timeout: 60_000 });
  } catch (err) {
    throw new InfrastructureError('chromium', `Chromium could not be launched (${String(err.message).split('\n')[0]}). `
      + 'Install it with: node apps/tfm-lab/node_modules/playwright/cli.js install chromium');
  }
}

async function startViteServer(root) {
  const { createServer } = await import(pathToFileURL(loadTfmDependencies(root).vitePath).href);
  const tfmRoot = join(root, 'apps/tfm-lab');
  const server = await createServer({ root: tfmRoot, configFile: join(tfmRoot, 'vite.config.ts'), logLevel: 'warn',
    server: { host: '127.0.0.1', port: 0, open: false } });
  await server.listen();
  return { server, baseUrl: `http://127.0.0.1:${server.httpServer.address().port}` };
}

// Test-only fault injection used by tools/skill-parity: the PNG encoder fails,
// exercising the partial-export path without touching the harness.
async function injectFaults(page) {
  if (process.env.BPMN_SKILL_FAULT === 'png') {
    await page.addInitScript(() => { HTMLCanvasElement.prototype.toBlob = function (cb) { cb(null); }; });
  }
}

function withTimeout(promise, timeoutMs) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new InfrastructureError('timeout', `render timeout after ${timeoutMs} ms`)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function renderOne(browser, baseUrl, input, timeoutMs) {
  const page = await browser.newPage({ viewport: VIEWPORT });
  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err.message));
  try {
    await injectFaults(page);
    const work = (async () => {
      await page.goto(`${baseUrl}${HARNESS_PATH}`, { waitUntil: 'load', timeout: timeoutMs });
      await page.waitForFunction(() => window.__harnessReady === true, undefined, { timeout: timeoutMs });
      const output = await page.evaluate(payload => window.renderExperiment(payload), input);
      // Re-import the exported BPMN; an SVG back means the import succeeded
      // (PNG availability is checked separately).
      const reimported = output.layoutXml
        ? await page.evaluate(xml => window.renderArtifactsFromLayout(xml).then(x => !!x.svg), output.layoutXml)
        : null;
      return { output, reimported };
    })();
    return { ...(await withTimeout(work, timeoutMs)), pageErrors };
  } catch (error) {
    return { error, pageErrors };
  } finally {
    await page.close().catch(() => {});
  }
}

/**
 * Renders harness inputs (RenderExperimentInput of headless/main.ts), one fresh
 * page each. Server and browser are always closed. Infrastructure failures
 * before rendering are thrown; per-input failures are returned as { error }.
 */
export async function renderWithHarness(root, inputs, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const runtime = runtimeVersions(root);
  let vite; let browser;
  try {
    vite = await startViteServer(root);
    browser = await launchChromium(root);
    runtime.chromium = browser.version();
    const results = [];
    for (const input of inputs) results.push(await renderOne(browser, vite.baseUrl, input, timeoutMs));
    return { runtime, results };
  } finally {
    await browser?.close().catch(() => {});
    await vite?.server.close().catch(() => {});
  }
}
