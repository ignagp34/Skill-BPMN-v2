// doctor — can a TO-BE run start here? Engine, TO-BE layout harness, Chromium, config.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { configureBrowsersPath, findEngineRoot } from '../../../bpmn/scripts/lib/engine.mjs';
import { launchChromium } from '../../../bpmn/scripts/lib/harness.mjs';
import { layoutVersion } from '../../../bpmn/scripts/lib/layouts.mjs';
import { KINDS, strategyOf, TOBE_CONFIG } from '../lib/config.mjs';

export async function run() {
  const report = { node: process.version, platform: `${process.platform}-${process.arch}` };
  try {
    const engineRoot = findEngineRoot();
    report.engineRoot = engineRoot;
    report.browsersPath = configureBrowsersPath(engineRoot);
    const layout = layoutVersion(strategyOf().layout);
    report.layout = { strategy: TOBE_CONFIG.strategy, version: layout.name, harness: layout.harness,
      harnessPresent: existsSync(join(engineRoot, layout.harness.app, 'vite.config.ts')) };
    report.kinds = KINDS;
    report.colorTask = TOBE_CONFIG.colorTask;
    const browser = await launchChromium(engineRoot);
    report.chromium = browser.version();
    await browser.close();
  } catch (err) {
    report.error = err.message;
  }
  report.ok = !report.error && report.layout?.harnessPresent && !!report.chromium && report.kinds?.length > 0;
  return { exit: report.ok ? 0 : 1, payload: report };
}
