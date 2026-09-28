// Did the TO-BE keep the AS-IS geometry? Shapes are matched by id (the engine
// builds node ids from lane and name, so they do not depend on the annotations);
// connections by type, source and target (association ids are counters that
// shift when annotations are added). The TO-BE's own annotations are ignored.
import { parseBpmn } from '../../../../tools/layout-lab/lib/bpmn-model.mjs';

const TOL = 0.5;
const differs = (a, b) => Math.abs(a - b) > TOL;
const boxMoved = (a, b) => !!a !== !!b || (!!a && (differs(a.x, b.x) || differs(a.y, b.y) || differs(a.width, b.width) || differs(a.height, b.height)));
const pathMoved = (a, b) => a.length !== b.length || a.some((p, i) => differs(p.x, b[i].x) || differs(p.y, b[i].y));
const edgeKey = e => `${e.type}:${e.source}->${e.target}`;

function index(model) {
  const shapes = new Map();
  for (const n of model.nodes.values()) shapes.set(n.id, { kind: n.kind, name: n.name, bounds: n.bounds, label: n.label });
  for (const p of model.participants) shapes.set(p.id, { kind: 'participant', name: p.name, bounds: p.bounds });
  for (const l of model.lanes) shapes.set(l.id, { kind: 'lane', name: l.name, bounds: l.bounds });
  const edges = new Map();
  const seen = new Map();
  for (const e of model.edges) {
    const n = seen.get(edgeKey(e)) ?? 0;
    seen.set(edgeKey(e), n + 1);
    edges.set(`${edgeKey(e)}#${n}`, e);
  }
  return { shapes, edges };
}

/**
 * { stable, shapesMoved, framesResized, labelsMoved, edgesRerouted, missing, details }.
 * stable: no process shape moved and no connection of the AS-IS was re-routed.
 * Pools and lanes that only grew and labels that moved are reported apart.
 */
export function compareGeometry(asIsXml, toBeXml) {
  const before = index(parseBpmn(asIsXml));
  const after = index(parseBpmn(toBeXml));
  const details = { shapes: [], frames: [], labels: [], edges: [], missing: [] };

  for (const [id, a] of before.shapes) {
    const b = after.shapes.get(id);
    if (!b) { details.missing.push(id); continue; }
    const frame = a.kind === 'participant' || a.kind === 'lane';
    if (boxMoved(a.bounds, b.bounds)) (frame ? details.frames : details.shapes).push({ id, name: a.name, before: a.bounds, after: b.bounds });
    if (!frame && boxMoved(a.label, b.label)) details.labels.push({ id, name: a.name, before: a.label, after: b.label });
  }
  for (const [key, a] of before.edges) {
    const b = after.edges.get(key);
    if (!b) { details.missing.push(key); continue; }
    if (pathMoved(a.waypoints, b.waypoints)) details.edges.push({ id: a.id, key, before: a.waypoints, after: b.waypoints });
    else if (boxMoved(a.label, b.label)) details.labels.push({ id: a.id, name: a.name, before: a.label, after: b.label });
  }
  return {
    stable: details.shapes.length === 0 && details.edges.length === 0 && details.missing.length === 0,
    shapesMoved: details.shapes.length, framesResized: details.frames.length, labelsMoved: details.labels.length,
    edgesRerouted: details.edges.length, missing: details.missing.length, details,
  };
}
