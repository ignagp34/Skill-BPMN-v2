// doctor — environment readiness: engine, dependencies, Chromium, generator config.
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { configureBrowsersPath, findEngineRoot, SYSTEM_PROMPT_PATH, verifyEngine } from '../lib/engine.mjs';
import { loadGeneratorConfig } from '../lib/generators.mjs';
import { launchChromium } from '../lib/harness.mjs';
import { sha256 } from '../lib/hash.mjs';
import { subagentState } from './sync-agents.mjs';

async function chromiumVersion(engineRoot) {
  try {
    const browser = await launchChromium(engineRoot);
    const version = browser.version();
    await browser.close();
    return { chromium: version };
  } catch (err) {
    return { chromium: null, chromiumError: err.message };
  }
}

export async function run() {
  const report = { node: process.version, platform: `${process.platform}-${process.arch}` };
  try {
    const engineRoot = findEngineRoot();
    report.engineRoot = engineRoot;
    report.dependenciesInstalled = existsSync(join(engineRoot, 'apps/tfm-lab/node_modules/playwright'));
    report.browsersPath = configureBrowsersPath(engineRoot);
    report.engine = await verifyEngine(engineRoot);
    report.systemPromptSha256 = sha256(await readFile(join(engineRoot, SYSTEM_PROMPT_PATH)));
    report.generators = loadGeneratorConfig().profiles;
    report.claudeSubagent = subagentState(engineRoot);
    if (report.dependenciesInstalled) Object.assign(report, await chromiumVersion(engineRoot));
  } catch (err) {
    report.error = err.message;
  }
  report.ok = !report.error && report.dependenciesInstalled && !!report.chromium;
  return { exit: report.ok ? 0 : 1, payload: report };
}
