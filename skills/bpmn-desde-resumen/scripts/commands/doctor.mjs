// doctor — environment readiness: engine, dependencies, Chromium, generator config.
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import os from 'node:os';
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
    // A project copy overrides the user copy, so every scope must match config.
    // Project copies are optional; the user copy is the one every project falls back to.
    const user = subagentState(os.homedir());
    const projects = [...new Set([engineRoot, process.cwd()])].filter(dir => dir !== os.homedir())
      .map(subagentState).filter(scope => scope.state !== 'missing');
    report.claudeSubagent = [user, ...projects];
    report.claudeSubagentInSync = report.claudeSubagent.every(scope => scope.state === 'in-sync');
    if (report.dependenciesInstalled) Object.assign(report, await chromiumVersion(engineRoot));
  } catch (err) {
    report.error = err.message;
  }
  report.ok = !report.error && report.dependenciesInstalled && !!report.chromium;
  return { exit: report.ok ? 0 : 1, payload: report };
}
