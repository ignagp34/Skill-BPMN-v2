// Location and integrity of the frozen TFM engine (this monorepo at the reference commit).
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { SKILL_DIR } from './paths.mjs';
import { sha256 } from './hash.mjs';

export const ENGINE_COMMIT = 'f558eb0e0904c02264d5dccb6ad76164fda22919';
export const SYSTEM_PROMPT_PATH = 'apps/company-web/prompts/system/internal_bpmn_dsl_system_prompt_v5.md';
export const PROMPT_COMPOSITION = 'apps/company-web/src/ui/screens/Handoff.tsx#buildPrompt';

const FROZEN_HASHES = 'smoke/source-hashes.json';
const ENGINE_PREFIXES = ['packages/bpmn-core/src/', 'apps/tfm-lab/src/', 'apps/tfm-lab/index.headless.html',
  'apps/tfm-lab/package.json', 'apps/tfm-lab/vite.config.ts', SYSTEM_PROMPT_PATH, 'pnpm-lock.yaml'];

const isEngineRoot = dir => !!dir && existsSync(join(dir, 'pnpm-workspace.yaml'))
  && existsSync(join(dir, 'apps/tfm-lab/index.headless.html'));

/** BPMN_SKILL_ENGINE_ROOT, else the nearest ancestor of the skill that holds the monorepo. */
export function findEngineRoot() {
  const candidates = [process.env.BPMN_SKILL_ENGINE_ROOT];
  for (let dir = SKILL_DIR; dirname(dir) !== dir; dir = dirname(dir)) candidates.push(dir);
  const root = candidates.find(isEngineRoot);
  if (!root) throw new Error('Engine repository not found. Run the skill from inside the Skill-BPMN-v2 checkout or set BPMN_SKILL_ENGINE_ROOT.');
  return resolve(root);
}

/** PLAYWRIGHT_BROWSERS_PATH, else a `.playwright/` next to or above the engine. */
export function configureBrowsersPath(root) {
  if (process.env.PLAYWRIGHT_BROWSERS_PATH) return process.env.PLAYWRIGHT_BROWSERS_PATH;
  const found = [join(root, '.playwright'), join(dirname(root), '.playwright')].find(existsSync);
  if (found) process.env.PLAYWRIGHT_BROWSERS_PATH = found;
  return found ?? null;
}

/** Compares the engine files with the hashes frozen in stage 1. */
export async function verifyEngine(root) {
  const manifest = join(root, FROZEN_HASHES);
  if (!existsSync(manifest)) return { verified: false, checked: 0, changed: [], reason: `${FROZEN_HASHES} missing` };
  const entries = Object.entries(JSON.parse(await readFile(manifest, 'utf8')))
    .filter(([file]) => ENGINE_PREFIXES.some(prefix => file.startsWith(prefix)));
  const changed = [];
  for (const [file, expected] of entries) {
    const path = join(root, file);
    if (!existsSync(path) || sha256(await readFile(path)) !== expected) changed.push(file);
  }
  return { verified: changed.length === 0, checked: entries.length, changed };
}

export function engineRecord(verification) {
  return { commit: ENGINE_COMMIT, sourceVerified: verification.verified,
    filesChecked: verification.checked, changed: verification.changed };
}
