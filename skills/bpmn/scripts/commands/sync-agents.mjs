// sync-agents [--target <projectRoot>] [--check]
// Writes the Claude Code subagent (.claude/agents/<name>.md) from config/generators.json,
// so changing the Claude model or effort means editing only that JSON.
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { findEngineRoot } from '../lib/engine.mjs';
import { claudeProfile } from '../lib/generators.mjs';
import { skillPath } from '../lib/paths.mjs';

const TEMPLATE = skillPath('templates', 'claude-subagent.md');

export function renderClaudeSubagent(profile = claudeProfile()) {
  const values = { name: profile.subagent, model: profile.model, effort: profile.effort };
  return readFileSync(TEMPLATE, 'utf8').replace(/\{\{(\w+)\}\}/g, (_, key) => values[key]);
}

export function subagentPath(projectRoot, profile = claudeProfile()) {
  return join(projectRoot, '.claude', 'agents', `${profile.subagent}.md`);
}

/** 'in-sync' | 'outdated' | 'missing' for the subagent file of a project. */
export function subagentState(projectRoot) {
  const path = subagentPath(projectRoot);
  if (!existsSync(path)) return { path, state: 'missing' };
  return { path, state: readFileSync(path, 'utf8') === renderClaudeSubagent() ? 'in-sync' : 'outdated' };
}

export async function run(options) {
  const projectRoot = resolve(typeof options.target === 'string' ? options.target : findEngineRoot());
  if (options.check) {
    const status = subagentState(projectRoot);
    return { exit: status.state === 'in-sync' ? 0 : 1, payload: status };
  }
  const path = subagentPath(projectRoot);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, renderClaudeSubagent());
  const { model, effort, subagent } = claudeProfile();
  return { exit: 0, payload: { path, subagent, model, effort,
    note: 'A new .claude/agents folder is only picked up by Claude Code after restarting the session.' } };
}
