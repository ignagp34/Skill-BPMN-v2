// TO-BE DSL = AS-IS DSL + one `//` line per mark, right before the first line
// that mentions its task (prompt v5 § 13.1: `//` annotates the next task; several
// `//` lines give several annotations). Nothing else is written or reordered.
import { displayText } from './config.mjs';

const TASK_KEYWORD = /^(user|service|rule|manual|receive|send|script)\s+/;

/** Lane of the line (its `Lane:` prefix or the current one) and the element text after it. */
function readLine(line, laneNames, currentLane) {
  const trimmed = line.trim();
  const prefix = trimmed.match(/^([^:]+):\s*(.*)$/);
  if (prefix && laneNames.has(prefix[1].trim())) return { lane: prefix[1].trim(), text: prefix[2].trim() };
  return { lane: currentLane, text: trimmed };
}

/** Index of the first line naming the task, in its lane when the lane is known. */
function findTaskLine(lines, mark, laneNames) {
  let lane = null;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].trim().startsWith('==')) break; // == pools == and later sections hold no tasks
    const read = readLine(lines[i], laneNames, lane);
    lane = read.lane;
    if (read.text.startsWith('//') || read.text.startsWith('(') || read.text.startsWith('[')) continue;
    // A `//` before a parallel line (`A|B`) goes to the parallel gateway, not to a task.
    if (read.text.includes('|')) continue;
    if (read.text.replace(TASK_KEYWORD, '') === mark.task && (!mark.lane || !read.lane || read.lane === mark.lane)) return i;
  }
  return -1;
}

const laneNamesOf = tasks => new Set(tasks.flatMap(t => [t.lane, t.pool]).filter(Boolean));

/** Tasks with a line of their own in the DSL: the only ones a `//` line can reach. */
export function annotatableTasks(dsl, tasks) {
  const lines = dsl.split(/\r?\n/);
  const laneNames = laneNamesOf(tasks);
  return tasks.filter(t => findTaskLine(lines, { task: t.name, lane: t.lane }, laneNames) >= 0);
}

const annotationLine = mark => `//${displayText(mark).replace(/\s+/g, ' ').replace(/^\/+/, '').trim()}`;

/** { dsl, inserted: [{ ...mark, line }], errors } — line is 1-based in the TO-BE DSL. */
export function insertMarks(asIsDsl, marks, tasks) {
  const eol = asIsDsl.includes('\r\n') ? '\r\n' : '\n';
  const lines = asIsDsl.split(/\r?\n/);
  const laneNames = laneNamesOf(tasks);
  const targets = marks.map(mark => ({ mark, index: findTaskLine(lines, mark, laneNames) }));
  const errors = targets.filter(t => t.index < 0).map(t => `No DSL line for task ${JSON.stringify(t.mark.task)}.`);

  const before = new Map();
  for (const { mark, index } of targets) if (index >= 0) before.set(index, [...(before.get(index) ?? []), mark]);
  const out = [];
  const inserted = [];
  lines.forEach((line, i) => {
    for (const mark of before.get(i) ?? []) {
      out.push(annotationLine(mark));
      inserted.push({ ...mark, line: out.length });
    }
    out.push(line);
  });
  return { dsl: out.join(eol), inserted, errors };
}
