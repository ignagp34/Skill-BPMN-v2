// The generator's answer: which task gets which mark. It never touches the DSL,
// so the TO-BE process cannot differ from the AS-IS by construction.
import { KINDS } from './config.mjs';

const MAX_TEXT = 200;

/** The JSON inside the answer: a ```json fence, else the first {...} block. */
function extractJson(raw) {
  const fenced = raw.match(/```(?:json)?\s*\n([\s\S]*?)```/);
  const text = fenced ? fenced[1] : raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
  return JSON.parse(text);
}

/**
 * { marks: [{ task, lane, kind, text, taskId }], notes, errors }. Every error
 * names the offending entry so a repair prompt can quote it.
 */
export function parseMarks(raw, tasks) {
  let answer;
  try {
    answer = extractJson(raw);
  } catch (err) {
    return { marks: [], notes: [], errors: [`The answer is not valid JSON (${err.message}).`] };
  }
  const entries = Array.isArray(answer) ? answer : answer?.annotations;
  if (!Array.isArray(entries)) return { marks: [], notes: [], errors: ['The JSON has no "annotations" array.'] };

  const errors = [];
  const marks = [];
  entries.forEach((entry, i) => {
    const where = `annotations[${i}]`;
    const text = typeof entry?.text === 'string' ? entry.text.replace(/\s+/g, ' ').trim() : '';
    if (!KINDS.includes(entry?.kind)) { errors.push(`${where}: kind must be one of ${KINDS.join(', ')} (got ${JSON.stringify(entry?.kind)}).`); return; }
    if (!text) { errors.push(`${where}: empty text.`); return; }
    if (text.length > MAX_TEXT) { errors.push(`${where}: text longer than ${MAX_TEXT} characters.`); return; }
    const candidates = tasks.filter(t => t.name === entry.task && (!entry.lane || t.lane === entry.lane));
    if (candidates.length === 0) { errors.push(`${where}: no task named ${JSON.stringify(entry.task)}${entry.lane ? ` in lane ${JSON.stringify(entry.lane)}` : ''}.`); return; }
    const lanes = new Set(candidates.map(t => t.lane));
    if (lanes.size > 1) { errors.push(`${where}: task ${JSON.stringify(entry.task)} exists in several lanes (${[...lanes].join(', ')}); add "lane".`); return; }
    marks.push({ task: entry.task, lane: candidates[0].lane, kind: entry.kind, text, taskId: candidates[0].id });
  });
  const notes = Array.isArray(answer?.notes) ? answer.notes.filter(n => typeof n === 'string') : [];
  return { marks, notes, errors };
}
