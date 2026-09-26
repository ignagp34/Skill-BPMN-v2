// Settings of bpmn-edit, read from config/editor.json (single source of truth).
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Root folder of the skill (the one holding SKILL.md). */
export const EDIT_SKILL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const editSkillPath = (...parts) => join(EDIT_SKILL_DIR, ...parts);

const { _comment, ...settings } = JSON.parse(readFileSync(editSkillPath('config/editor.json'), 'utf8'));
export const EDITOR_CONFIG = Object.freeze(settings);

/** The part of the settings the page needs. */
export const pageConfig = () => ({
  allowedCommands: EDITOR_CONFIG.allowedCommands,
  deniedRules: EDITOR_CONFIG.deniedRules,
  autosaveMs: EDITOR_CONFIG.autosaveMs,
  heartbeatMs: EDITOR_CONFIG.heartbeatMs,
});
