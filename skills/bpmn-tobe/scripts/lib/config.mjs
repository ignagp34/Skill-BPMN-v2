// Settings of bpmn-tobe, read from config/tobe.json (single source of truth).
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { UsageError } from '../../../bpmn/scripts/lib/cli-args.mjs';
import { DEFAULT_LAYOUT } from '../../../bpmn/scripts/lib/layouts.mjs';

/** Root folder of the skill (the one holding SKILL.md). */
export const TOBE_SKILL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const tobeSkillPath = (...parts) => join(TOBE_SKILL_DIR, ...parts);

const { _comment, ...settings } = JSON.parse(readFileSync(tobeSkillPath('config/tobe.json'), 'utf8'));
export const TOBE_CONFIG = Object.freeze(settings);
export const KINDS = Object.freeze(Object.keys(settings.kinds));

/** { name, layout } of a strategy (config default when omitted); layout "default" = the skill bpmn's default. */
export function strategyOf(name = TOBE_CONFIG.strategy) {
  const strategy = TOBE_CONFIG.strategies[name];
  if (!strategy) throw new UsageError(`Unknown strategy "${name}". Available: ${Object.keys(TOBE_CONFIG.strategies).join(', ')}`);
  return { name, layout: strategy.layout === 'default' ? DEFAULT_LAYOUT : strategy.layout };
}

/** Text shown on the diagram: the kind's prefix + the model's text. */
export const displayText = mark => `${TOBE_CONFIG.kinds[mark.kind].prefix ?? ''}${mark.text}`;

/** When a task carries several kinds, the first one in taskPriority colours it. */
export function taskKind(kinds) {
  return TOBE_CONFIG.taskPriority.find(kind => kinds.includes(kind)) ?? kinds[0];
}
