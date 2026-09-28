// render --run <tobeRun> --raw <reply file> --model <m> --effort <e> --host <h> [--evidence <text>]
//        [--message-flows hidden|shown] [--timeout-ms <n>]
// Validates the generator's marks, inserts them in the DSL, renders AS-IS and
// TO-BE with the same layout, colours the TO-BE and checks that the process
// geometry did not move.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { semanticDiff } from '../../../bpmn/scripts/lib/change-report.mjs';
import { requireOption } from '../../../bpmn/scripts/lib/cli-args.mjs';
import { findEngineRoot } from '../../../bpmn/scripts/lib/engine.mjs';
import { declaredGenerator } from '../../../bpmn/scripts/lib/generators.mjs';
import { DEFAULT_TIMEOUT_MS } from '../../../bpmn/scripts/lib/harness.mjs';
import { sha256 } from '../../../bpmn/scripts/lib/hash.mjs';
import { layoutVersion } from '../../../bpmn/scripts/lib/layouts.mjs';
import { MESSAGE_FLOWS, parseMessageFlows } from '../../../bpmn/scripts/lib/message-flows.mjs';
import { writeJson } from '../../../bpmn/scripts/lib/run-store.mjs';
import { exitCodeFor, STATUS } from '../../../bpmn/scripts/lib/status.mjs';
import { displayText } from '../lib/config.mjs';
import { paintList } from '../lib/colors.mjs';
import { insertMarks } from '../lib/dsl-insert.mjs';
import { EnginePair } from '../lib/engine-pair.mjs';
import { parseMarks } from '../lib/marks.mjs';
import { compareGeometry } from '../lib/stability.mjs';
import { taskAnnotations } from '../lib/tasks.mjs';
import { MAX_ATTEMPTS, SIDES, TobeStore } from '../lib/tobe-store.mjs';

export const INVALID_MARKS = 'invalid_marks';
const OK = new Set([STATUS.SUCCESS, STATUS.SUCCESS_WITH_WARNINGS]);
const normalize = text => text.replace(/\s+/g, ' ').trim();

/** Each mark with the annotation the engine attached to its task, or the marks it could not find. */
function attach(marks, toBeSemanticXml) {
  const pool = taskAnnotations(toBeSemanticXml);
  const attached = [];
  const lost = [];
  for (const mark of marks) {
    const i = pool.findIndex(a => a.taskId === mark.taskId && normalize(a.text) === normalize(displayText(mark)));
    if (i < 0) { lost.push(mark); continue; }
    attached.push({ mark, ...pool.splice(i, 1)[0] });
  }
  return { attached, lost };
}

async function writeSide(store, side, files) {
  const dir = store.path(side);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  for (const [name, bytes] of Object.entries(files)) if (bytes != null) await writeFile(join(dir, name), bytes);
}

/** Worst of the two sides: an error on either side wins, then partial exports. */
function overallStatus(...statuses) {
  return statuses.find(s => !OK.has(s) && s !== STATUS.PARTIAL_EXPORT)
    ?? statuses.find(s => s === STATUS.PARTIAL_EXPORT)
    ?? (statuses.includes(STATUS.SUCCESS_WITH_WARNINGS) ? STATUS.SUCCESS_WITH_WARNINGS : STATUS.SUCCESS);
}

/** Hidden message flows are a presentation choice: they are missing from every drawn BPMN on purpose. */
function withoutHiddenFlows(semantic, presentation) {
  if (presentation?.messageFlows !== MESSAGE_FLOWS.HIDDEN) return semantic;
  const keep = item => !item.startsWith('messageFlow:');
  const added = semantic.added.filter(keep);
  const removed = semantic.removed.filter(keep);
  return { identical: added.length === 0 && removed.length === 0, added, removed };
}

const rendered = side => OK.has(side.status) || side.status === STATUS.PARTIAL_EXPORT;

/**
 * no-bands: AS-IS and TO-BE rendered apart (the layout never moves the process).
 * derive-as-is: only the TO-BE is rendered; the AS-IS is that drawing without the
 * marks, and its process must equal the AS-IS run's (semanticIdentical).
 */
async function renderSides(pair, store, toBeDsl, marks) {
  const asIsDsl = await readFile(store.path('as-is.dsl'), 'utf8');
  const asIsSemantic = await readFile(store.path('as-is.semantic.bpmn'), 'utf8');
  const derive = store.info.strategy.name === 'derive-as-is';
  let asIs = derive ? null : await pair.render(store.info.runId, SIDES.asIs, asIsDsl);
  let toBe = await pair.render(store.info.runId, SIDES.toBe, toBeDsl);
  if (!rendered(toBe) || !toBe.layoutXml) {
    return { asIs: asIs ?? { status: toBe.status, files: {}, record: { skipped: 'the TO-BE did not render' } }, toBe, lost: marks };
  }
  const { attached, lost } = attach(marks, toBe.files['semantic.bpmn']);
  if (derive) {
    asIs = await pair.stripAndExport(toBe, attached.flatMap(a => [a.annotationId, a.associationId]));
    const semantic = withoutHiddenFlows(await semanticDiff(asIsSemantic, asIs.layoutXml), toBe.record.presentation);
    asIs.record.semanticIdentical = semantic.identical;
    if (!semantic.identical) Object.assign(asIs, { status: STATUS.RENDER_ERROR, files: {} }, { record: { ...asIs.record, semantic } });
    else asIs.files = { ...asIs.files, 'normalized.dsl': asIsDsl, 'semantic.bpmn': asIsSemantic };
  }
  toBe = await pair.paintAndExport(toBe, paintList(attached));
  return { asIs, toBe, lost };
}

async function renderPair(store, toBeDsl, marks, options) {
  const layout = layoutVersion(store.info.strategy.layout);
  const pair = await EnginePair.open(findEngineRoot(), layout, {
    timeoutMs: Number(options['timeout-ms'] ?? DEFAULT_TIMEOUT_MS),
    messageFlows: parseMessageFlows(options['message-flows'] ?? store.info.messageFlows ?? undefined) });
  try {
    return { ...(await renderSides(pair, store, toBeDsl, marks)), runtime: pair.runtime, layout };
  } finally {
    await pair.close();
  }
}

export async function run(options) {
  const store = await TobeStore.open(resolve(requireOption(options, 'run')));
  store.assertCanAttempt();
  const n = store.nextAttemptNumber;
  await mkdir(store.attemptDir(n), { recursive: true });
  const raw = await readFile(resolve(requireOption(options, 'raw')), 'utf8');
  await writeFile(join(store.attemptDir(n), 'reply.txt'), raw);
  const generator = declaredGenerator(options, store.info.requestedGenerator);
  const base = { n, kind: n === 1 ? 'initial' : 'repair', generator, rawSha256: sha256(raw),
    inputPromptSha256: sha256(await readFile(store.promptPathFor(n), 'utf8')) };

  const tasks = JSON.parse(await readFile(store.path('tasks.json'), 'utf8'));
  const parsed = raw.trim() ? parseMarks(raw, tasks) : { marks: [], notes: [], errors: ['Empty generator answer.'] };
  const inserted = parsed.errors.length ? null : insertMarks(await readFile(store.path('as-is.dsl'), 'utf8'), parsed.marks, tasks);
  const errors = [...parsed.errors, ...(inserted?.errors ?? [])];
  if (errors.length > 0 || parsed.marks.length === 0) {
    const status = raw.trim() ? INVALID_MARKS : STATUS.GENERATION_ERROR;
    await store.recordAttempt({ ...base, status, errors: errors.length ? errors : ['No annotation in the answer.'], notes: parsed.notes });
    return { exit: status === INVALID_MARKS ? 2 : exitCodeFor(status), payload: summary(store) };
  }

  await writeFile(store.path('to-be.dsl'), inserted.dsl);
  await writeJson(store.path('marks.json'), { marks: inserted.inserted, notes: parsed.notes });
  const started = Date.now();
  const { asIs, toBe, lost, runtime, layout } = await renderPair(store, inserted.dsl, inserted.inserted, options);
  await writeSide(store, SIDES.asIs, asIs.files);
  await writeSide(store, SIDES.toBe, toBe.files);

  const stability = asIs.layoutXml && toBe.layoutXml ? compareGeometry(asIs.layoutXml, toBe.layoutXml) : null;
  if (stability) await writeJson(store.path('stability.json'), stability);
  const status = lost.length > 0 && OK.has(toBe.status) ? STATUS.PARTIAL_EXPORT : overallStatus(asIs.status, toBe.status);
  store.info.runtime = runtime;
  store.info.stability = stability && (({ details, ...rest }) => rest)(stability);
  await store.recordAttempt({ ...base, status, durationMs: Date.now() - started, layout: { version: layout.name, harness: layout.harness },
    marks: inserted.inserted.length, notes: parsed.notes, lostMarks: lost.map(m => m.task),
    asIs: { status: asIs.status, ...asIs.record }, toBe: { status: toBe.status, ...toBe.record } });
  return { exit: exitCodeFor(status), payload: summary(store) };
}

/** The JSON render and repair-prompt print. */
export function summary(store) {
  const last = store.lastAttempt;
  return {
    runDir: store.dir,
    status: store.info.status,
    attempts: store.info.attempts.length,
    canRepair: store.info.status === INVALID_MARKS && store.info.attempts.length < MAX_ATTEMPTS,
    errors: last?.errors ?? [],
    notes: last?.notes ?? [],
    marks: last?.marks ?? 0,
    lostMarks: last?.lostMarks ?? [],
    stability: store.info.stability ?? null,
    deliverables: store.deliverables(),
    requestedGenerator: store.info.requestedGenerator ?? null,
    generator: last?.generator ?? null,
  };
}
