import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Root folder of the skill (the one holding SKILL.md). */
export const SKILL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export const skillPath = (...parts) => join(SKILL_DIR, ...parts);
