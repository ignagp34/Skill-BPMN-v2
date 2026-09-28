// The generator's prompt: templates/prompt.md filled with the AS-IS process,
// its tasks, the kinds of config/tobe.json and the user's request.
import { readFileSync } from 'node:fs';
import { tobeSkillPath, TOBE_CONFIG } from './config.mjs';

const TEMPLATE = tobeSkillPath('templates', 'prompt.md');

const kindsText = () => Object.entries(TOBE_CONFIG.kinds)
  .map(([name, kind]) => `- \`${name}\` (${kind.label}): ${kind.meaning}.`).join('\n');

const tasksText = tasks => tasks
  .map(t => `- ${t.name}${t.lane ? ` — lane: ${t.lane}` : ''}${t.pool && t.pool !== t.lane ? `, pool: ${t.pool}` : ''}`).join('\n');

export function composeTobePrompt({ summary, dsl, tasks, request }) {
  const values = {
    kinds: kindsText(),
    kindNames: Object.keys(TOBE_CONFIG.kinds).join(' | '),
    narrative: summary?.trim() || '(not available: the diagram was drawn from a DSL, without a narrative)',
    dsl: dsl.trimEnd(),
    tasks: tasksText(tasks),
    request: request.trim(),
  };
  return readFileSync(TEMPLATE, 'utf8').replace(/\{\{(\w+)\}\}/g, (_, key) => values[key]);
}

/** Same prompt + what was wrong with the previous answer. */
export function composeRepairPrompt({ basePrompt, previousAnswer, errors }) {
  return `${basePrompt}

## YOUR PREVIOUS ANSWER WAS REJECTED

${errors.map(e => `- ${e}`).join('\n')}

Previous answer:

${previousAnswer.trim()}

Fix only these problems and reply again with the complete JSON block and nothing else.`;
}
