// Per-element difference between two layouts of the same process (engine DI →
// user DI). It only reads the two files, so it does not depend on how the edit
// was made. Format: references/edits-format.md § edit-diff.json.
import { parseBpmn } from '../../../../tools/layout-lab/lib/bpmn-model.mjs';

const TOLERANCE = 0.5; // px; bpmn-js rounds coordinates

const moved = (a, b) => Math.abs(a - b) > TOLERANCE;
const center = r => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });

/** Interior waypoints where the line actually turns. */
export function countBends(points) {
  let bends = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const [a, b, c] = [points[i - 1], points[i], points[i + 1]];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(cross) > TOLERANCE) bends += 1;
  }
  return bends;
}

function labelChange(before, after) {
  if (!before && !after) return null;
  if (!before || !after) return { before, after };
  const d = { dx: after.x - before.x, dy: after.y - before.y };
  return moved(d.dx, 0) || moved(d.dy, 0) || moved(before.width, after.width) || moved(before.height, after.height)
    ? { ...d, before, after } : null;
}

function shapeChange(kind, before, after) {
  if (!before.bounds || !after.bounds) return null;
  const [c0, c1] = [center(before.bounds), center(after.bounds)];
  const change = { id: before.id, kind, type: before.type ?? kind, name: before.name ?? '',
    dx: Math.round((c1.x - c0.x) * 100) / 100, dy: Math.round((c1.y - c0.y) * 100) / 100,
    dWidth: after.bounds.width - before.bounds.width, dHeight: after.bounds.height - before.bounds.height,
    label: labelChange(before.label, after.label), before: before.bounds, after: after.bounds };
  const changed = moved(change.dx, 0) || moved(change.dy, 0) || moved(change.dWidth, 0) || moved(change.dHeight, 0)
    || change.label;
  return changed ? change : null;
}

function edgeChange(before, after) {
  const same = before.waypoints.length === after.waypoints.length
    && before.waypoints.every((p, i) => !moved(p.x, after.waypoints[i].x) && !moved(p.y, after.waypoints[i].y));
  const label = labelChange(before.label, after.label);
  if (same && !label) return null;
  const [bendsBefore, bendsAfter] = [countBends(before.waypoints), countBends(after.waypoints)];
  return { id: before.id, kind: 'edge', type: before.type, source: before.source, target: before.target,
    waypointsChanged: !same, bendsBefore, bendsAfter, bendsAdded: Math.max(0, bendsAfter - bendsBefore),
    bendsRemoved: Math.max(0, bendsBefore - bendsAfter), label,
    before: before.waypoints, after: after.waypoints };
}

function pairs(beforeList, afterList) {
  const after = new Map(afterList.map(x => [x.id, x]));
  return beforeList.filter(x => after.has(x.id)).map(x => [x, after.get(x.id)]);
}

/** engineXml → userXml: changed elements and a summary by kind. */
export function diffLayouts(engineXml, userXml) {
  const [a, b] = [parseBpmn(engineXml), parseBpmn(userXml)];
  const changes = [
    ...pairs(a.participants, b.participants).map(([x, y]) => shapeChange('participant', x, y)),
    ...pairs(a.lanes, b.lanes).map(([x, y]) => shapeChange('lane', x, y)),
    ...pairs([...a.nodes.values()], [...b.nodes.values()]).map(([x, y]) => shapeChange(x.kind, x, y)),
    ...pairs(a.edges, b.edges).map(([x, y]) => edgeChange(x, y)),
  ].filter(Boolean);

  const summary = { changedElements: changes.length, byKind: {}, shapesMoved: 0, shapesResized: 0,
    labelsMoved: 0, edgesRerouted: 0, bendsAdded: 0, bendsRemoved: 0 };
  for (const c of changes) {
    summary.byKind[c.kind] = (summary.byKind[c.kind] ?? 0) + 1;
    if (c.kind === 'edge') {
      if (c.waypointsChanged) summary.edgesRerouted += 1;
      summary.bendsAdded += c.bendsAdded;
      summary.bendsRemoved += c.bendsRemoved;
    } else {
      if (moved(c.dx, 0) || moved(c.dy, 0)) summary.shapesMoved += 1;
      if (moved(c.dWidth, 0) || moved(c.dHeight, 0)) summary.shapesResized += 1;
    }
    if (c.label) summary.labelsMoved += 1;
  }
  const missing = {
    inUser: [...a.nodes.keys()].filter(id => !b.nodes.has(id)),
    inEngine: [...b.nodes.keys()].filter(id => !a.nodes.has(id)),
  };
  return { schema: 'bpmn-edit-diff/1', summary, missing, changes };
}
