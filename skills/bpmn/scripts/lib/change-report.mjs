// What an edit run changed with respect to its parent: a line diff of the
// normalized DSL and a name-based inventory diff of the semantic XML. Element
// ids are not compared, so the report does not depend on how the engine numbers
// them. Written as dsl-change.json at the run root when the last attempt compiled.
import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { findEngineRoot } from './engine.mjs';
import { writeJson } from './run-store.mjs';

export const CHANGE_FILE = 'dsl-change.json';
export const BASE_DSL = 'base.dsl';
export const BASE_SEMANTIC = 'base-semantic.bpmn';
const BPMN_MODEL = 'tools/layout-lab/lib/bpmn-model.mjs';

const lines = text => text.replace(/\r\n/g, '\n').replace(/\n+$/, '').split('\n');

/** Changed lines of b against a (longest common subsequence), with their line numbers. */
export function diffLines(a, b) {
  const x = lines(a);
  const y = lines(b);
  const lcs = Array.from({ length: x.length + 1 }, () => new Uint32Array(y.length + 1));
  for (let i = x.length - 1; i >= 0; i -= 1) {
    for (let j = y.length - 1; j >= 0; j -= 1) {
      lcs[i][j] = x[i] === y[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const changes = [];
  let i = 0;
  let j = 0;
  while (i < x.length || j < y.length) {
    if (i < x.length && j < y.length && x[i] === y[j]) { i += 1; j += 1; } else if (j < y.length && (i === x.length || lcs[i][j + 1] >= lcs[i + 1][j])) {
      changes.push({ op: '+', line: j + 1, text: y[j] }); j += 1;
    } else {
      changes.push({ op: '-', line: i + 1, text: x[i] }); i += 1;
    }
  }
  return changes;
}

/** Every participant, lane, node and connection described by names instead of ids. */
function inventory(model) {
  const poolOf = processId => model.participantOfProcess.get(processId)?.name ?? '';
  const laneName = new Map(model.lanes.map(l => [l.id, l.name]));
  const where = node => [poolOf(node.processId), laneName.get(node.laneId)].filter(Boolean).join(' / ');
  const label = id => {
    const node = model.nodes.get(id) ?? model.participants.find(p => p.id === id);
    return node ? (node.name || node.text?.trim() || node.type || 'participant') : id;
  };
  const items = [
    ...model.participants.map(p => `participant: ${p.name}`),
    ...model.lanes.map(l => `lane: ${poolOf(l.processId)} / ${l.name}`),
    ...[...model.nodes.values()].map(n => `${n.type}: ${n.kind === 'annotation' ? n.text?.trim() : n.name}${where(n) ? ` (${where(n)})` : ''}`),
    ...model.edges.map(e => `${e.type}: ${label(e.source)} → ${label(e.target)}${e.name ? ` [${e.name}]` : ''}`),
  ];
  return items;
}

/** Items of b missing from a, counting repeats (unnamed gateways, parallel flows). */
function minus(a, b) {
  const left = new Map();
  for (const item of b) left.set(item, (left.get(item) ?? 0) + 1);
  for (const item of a) if (left.get(item)) left.set(item, left.get(item) - 1);
  return [...left].flatMap(([item, n]) => Array(n).fill(item));
}

export async function semanticDiff(baseXml, newXml) {
  const { parseBpmn } = await import(pathToFileURL(join(findEngineRoot(), BPMN_MODEL)).href);
  const before = inventory(parseBpmn(baseXml));
  const after = inventory(parseBpmn(newXml));
  const added = minus(before, after);
  const removed = minus(after, before);
  return { identical: added.length === 0 && removed.length === 0, added, removed };
}

/** Rewrites dsl-change.json for an edit run; removes a stale one when the last attempt left no DSL. */
export async function writeChangeReport(store) {
  const file = store.path(CHANGE_FILE);
  await rm(file, { force: true });
  const needed = [BASE_DSL, BASE_SEMANTIC, 'normalized.dsl', 'semantic.bpmn'].map(name => store.path(name));
  if (!needed.every(existsSync)) return null;
  const [baseDsl, baseXml, newDsl, newXml] = await Promise.all(needed.map(path => readFile(path, 'utf8')));

  const dsl = diffLines(baseDsl, newDsl);
  const semantic = await semanticDiff(baseXml, newXml);
  await writeJson(file, { schema: 'bpmn-dsl-change/1', parentRun: store.info.edit.parentRun,
    request: store.info.edit.request, dsl: { linesAdded: dsl.filter(c => c.op === '+').length,
      linesRemoved: dsl.filter(c => c.op === '-').length, changes: dsl }, semantic });
  return { file, dslLinesAdded: dsl.filter(c => c.op === '+').length, dslLinesRemoved: dsl.filter(c => c.op === '-').length,
    semanticIdentical: semantic.identical, added: semantic.added, removed: semantic.removed };
}
