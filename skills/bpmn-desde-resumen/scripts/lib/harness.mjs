// Drives the TFM headless harness (apps/tfm-lab/index.headless.html) exactly as
// apps/tfm-lab/scripts/render-experiments.mts does: Vite dev server on
// 127.0.0.1, Playwright Chromium, 1600×1200 viewport, window.renderExperiment().
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import os from 'node:os';
import { configureBrowsersPath } from './engine.mjs';
import { DEFAULT_MESSAGE_FLOWS, MESSAGE_FLOWS, stripMessageFlowsInPage } from './message-flows.mjs';

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

/** The TFM harness (layout v0). Other layout versions supply their own app and page. */
export const TFM_HARNESS = Object.freeze({ app: 'apps/tfm-lab', page: HARNESS_PATH });

async function startViteServer(root, app) {
  const { createServer } = await import(pathToFileURL(loadTfmDependencies(root).vitePath).href);
  const appRoot = join(root, app);
  const server = await createServer({ root: appRoot, configFile: join(appRoot, 'vite.config.ts'), logLevel: 'warn',
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

/**
 * Post-layout presentation. With message flows hidden, the BPMN loses its
 * message flows and the SVG/PNG are re-exported from it by the harness's own
 * renderArtifactsFromLayout; the complete layout is kept as fullLayoutXml.
 */
async function applyPresentation(page, output, messageFlows) {
  if (messageFlows !== MESSAGE_FLOWS.HIDDEN || !output.layoutXml) return { output, presentation: { messageFlows, removed: 0 } };
  const stripped = await page.evaluate(stripMessageFlowsInPage, output.layoutXml);
  if (stripped.removed === 0) return { output, presentation: { messageFlows, removed: 0 } };
  const { svg, pngBase64 } = await page.evaluate(xml => window.renderArtifactsFromLayout(xml), stripped.xml);
  return {
    output: { ...output, layoutXml: stripped.xml, svg, pngBase64 },
    presentation: { messageFlows, removed: stripped.removed, fullLayoutXml: output.layoutXml },
  };
}

async function renderOne(browser, url, input, timeoutMs, messageFlows) {
  const page = await browser.newPage({ viewport: VIEWPORT });
  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err.message));
  try {
    await injectFaults(page);
    const work = (async () => {
      await page.goto(url, { waitUntil: 'load', timeout: timeoutMs });
      await page.waitForFunction(() => window.__harnessReady === true, undefined, { timeout: timeoutMs });
      const rendered = await page.evaluate(payload => window.renderExperiment(payload), input);
      const { output, presentation } = await applyPresentation(page, rendered, messageFlows);
      // Re-import the exported BPMN; an SVG back means the import succeeded
      // (PNG availability is checked separately).
      const reimported = output.layoutXml
        ? await page.evaluate(xml => window.renderArtifactsFromLayout(xml).then(x => !!x.svg), output.layoutXml)
        : null;
      return { output, reimported, presentation };
    })();
    return { ...(await withTimeout(work, timeoutMs)), pageErrors };
  } catch (error) {
    return { error, pageErrors };
  } finally {
    await page.close().catch(() => {});
  }
}

/**
 * One Vite server + one Chromium for many renders (fresh page per render).
 * Always close() it; renderWithHarness does so for the one-shot case.
 */
export class HarnessSession {
  constructor(root, harness, vite, browser, runtime) {
    Object.assign(this, { root, harness, vite, browser, runtime });
  }

  static async open(root, harness = TFM_HARNESS) {
    const runtime = runtimeVersions(root);
    let vite; let browser;
    try {
      vite = await startViteServer(root, harness.app);
      browser = await launchChromium(root);
      runtime.chromium = browser.version();
      return new HarnessSession(root, harness, vite, browser, runtime);
    } catch (err) {
      await browser?.close().catch(() => {});
      await vite?.server.close().catch(() => {});
      throw err;
    }
  }

  /** input: RenderExperimentInput of headless/main.ts. Failures come back as { error }. */
  render(input, { timeoutMs = DEFAULT_TIMEOUT_MS, messageFlows = DEFAULT_MESSAGE_FLOWS } = {}) {
    return renderOne(this.browser, `${this.vite.baseUrl}${this.harness.page}`, input, timeoutMs, messageFlows);
  }

  /** Runs fn(page) on a blank page with the pinned viewport; the page is always closed. */
  async withPage(fn) {
    const page = await this.browser.newPage({ viewport: VIEWPORT });
    try {
      return await fn(page);
    } finally {
      await page.close().catch(() => {});
    }
  }

  async close() {
    await this.browser.close().catch(() => {});
    await this.vite.server.close().catch(() => {});
  }
}

/**
 * Renders harness inputs (RenderExperimentInput of headless/main.ts), one fresh
 * page each. Server and browser are always closed. Infrastructure failures
 * before rendering are thrown; per-input failures are returned as { error }.
 */
export async function renderWithHarness(root, inputs, options = {}) {
  const session = await HarnessSession.open(root);
  try {
    const results = [];
    for (const input of inputs) results.push(await session.render(input, options));
    return { runtime: session.runtime, results };
  } finally {
    await session.close();
  }
}
