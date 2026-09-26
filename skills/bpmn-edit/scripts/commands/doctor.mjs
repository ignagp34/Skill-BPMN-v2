// doctor — can a session start here? Engine, bpmn-js for the page, Chromium, layout.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { configureBrowsersPath, findEngineRoot } from '../../../bpmn/scripts/lib/engine.mjs';
import { launchChromium } from '../../../bpmn/scripts/lib/harness.mjs';
import { DEFAULT_LAYOUT, layoutVersion } from '../../../bpmn/scripts/lib/layouts.mjs';
import { EDITOR_CONFIG } from '../lib/config.mjs';
import { bpmnJsDist } from '../lib/edit-server.mjs';

export async function run() {
  const report = { node: process.version, platform: `${process.platform}-${process.arch}` };
  try {
    const engineRoot = findEngineRoot();
    report.engineRoot = engineRoot;
    report.browsersPath = configureBrowsersPath(engineRoot);
    const dist = bpmnJsDist();
    report.bpmnJs = { dist, modeler: existsSync(join(dist, 'bpmn-modeler.production.min.js')),
      assets: existsSync(join(dist, 'assets/bpmn-js.css')) };
    const layout = layoutVersion(DEFAULT_LAYOUT);
    report.layout = { default: layout.name, harness: layout.harness,
      harnessPresent: existsSync(join(engineRoot, layout.harness.app, 'vite.config.ts')) };
    report.config = { allowedCommands: EDITOR_CONFIG.allowedCommands.length, idleTimeoutMs: EDITOR_CONFIG.idleTimeoutMs };
    const browser = await launchChromium(engineRoot);
    report.chromium = browser.version();
    await browser.close();
  } catch (err) {
    report.error = err.message;
  }
  report.ok = !report.error && report.bpmnJs?.modeler && report.bpmnJs?.assets && report.layout?.harnessPresent && !!report.chromium;
  return { exit: report.ok ? 0 : 1, payload: report };
}
