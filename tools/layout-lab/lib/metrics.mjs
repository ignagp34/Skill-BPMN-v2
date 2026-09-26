// Layout metrics (plans/layout-iteracion-1.md, fase 2). Geometry from the DI of
// the complete layout (message flows shown); text from the real SVG text boxes.
// Each metric is one registry entry: { key, group, better, unit, compute(ctx) }.
//   group: hard (target 0; any regression rejects a candidate) | legibility | compactness
//   better: 'lower' | 'higher' | 'band' (kept within a range, never optimised alone)
import { backEdges } from './bpmn-model.mjs';
import {
  area, center, coefficientOfVariation, collinearOverlap, contains, inset, intersection, mean, median, overlapArea,
  polylineLength, rectDistance, rectPolylineDistance, segmentHitsRect, segments, segmentsCross, union,
} from './geometry.mjs';

const TITLE_BAND = 30;          // bpmn-js pool/lane header width (horizontal)
const TOL = 1;                  // px tolerance for touching boxes
const LONG_EDGE_FACTOR = 3;     // "long" = > 3 × median sequence-flow length …
const LONG_EDGE_MIN = 200;      // … and longer than this
const TARGET_ASPECT = 16 / 9;   // user decision 2026-09-25
const LANE_MARGIN = 20;         // free space kept above and below lane content before counting slack
const NEAR_ASSOCIATION = 250;   // user note 2026-09-25: a near artifact gets a straight association

// ---------- context ----------

function titleBand(bounds, horizontal = true) {
  return horizontal ? { x: bounds.x, y: bounds.y, width: TITLE_BAND, height: bounds.height }
    : { x: bounds.x, y: bounds.y, width: bounds.width, height: TITLE_BAND };
}

/**
 * messageFlows 'hidden' drops message flows and their labels, i.e. what the user
 * receives by default (skill decision 2026-09-25); the hard constraints are also
 * evaluated in that view (see computeMetrics).
 */
export function buildContext(model, text, { messageFlows = 'shown' } = {}) {
  const hidden = messageFlows === 'hidden';
  const messageIds = new Set(model.edges.filter(e => e.type === 'messageFlow').map(e => e.id));
  const nodes = [...model.nodes.values()].filter(n => n.bounds);
  const expanded = new Set(nodes.filter(n => nodes.some(c => c.parentId === n.id)).map(n => n.id));
  const shapes = nodes.filter(n => !expanded.has(n.id));
  const flowNodes = shapes.filter(n => ['task', 'subprocess', 'event', 'gateway'].includes(n.kind));
  const edges = model.edges.filter(e => e.waypoints.length >= 2 && !(hidden && messageIds.has(e.id))).map(e => ({ ...e, segs: segments(e.waypoints) }));
  const back = backEdges(model);
  const byId = new Map(nodes.map(n => [n.id, n]));
  const edgeById = new Map(edges.map(e => [e.id, e]));
  const leafLanes = model.lanes.filter(l => !l.hasChildren && l.bounds);
  const participants = model.participants.filter(p => p.bounds);
  const bands = [...participants.map(p => ({ id: p.id, rect: titleBand(p.bounds) })),
    ...model.lanes.filter(l => l.bounds).map(l => ({ id: l.id, rect: titleBand(l.bounds) }))];
  // Free-standing text: external labels, plus annotation text (it overflows its bracket freely).
  const isAnnotation = b => byId.get(b.id)?.kind === 'annotation';
  const labels = text.boxes.filter(b => (b.label || isAnnotation(b)) && !(hidden && messageIds.has(b.id))).map(b => ({ ...b, rect: inset(b, TOL) }));
  const inner = text.boxes.filter(b => !b.label);
  return { model, text, nodes, byId, edgeById, shapes, flowNodes, edges, back, leafLanes, participants, bands, labels, inner };
}

/** Elements an edge may legitimately touch: its ends and, for boundary events, their host. */
function endpointsOf(ctx, edge) {
  const ids = new Set([edge.source, edge.target]);
  for (const id of [edge.source, edge.target]) {
    const n = ctx.byId.get(id);
    if (n?.attachedTo) ids.add(n.attachedTo);
    for (const b of ctx.nodes) if (b.attachedTo === id) ids.add(b.id);
  }
  return ids;
}

const edgeFamily = e => (e.type === 'sequenceFlow' ? 'seq' : e.type === 'messageFlow' ? 'msg' : 'other');
const pairKey = (a, b) => [a, b].sort().join('|');

// ---------- hard constraints ----------

function shapeOverlaps(ctx) {
  const pairs = [];
  for (let i = 0; i < ctx.shapes.length; i += 1) {
    for (let j = i + 1; j < ctx.shapes.length; j += 1) {
      const a = ctx.shapes[i]; const b = ctx.shapes[j];
      if (a.attachedTo === b.id || b.attachedTo === a.id) continue;
      if (overlapArea(a.bounds, b.bounds) > TOL) pairs.push([a.id, b.id]);
    }
  }
  return { value: pairs.length, details: pairs };
}

function edgeThroughShape(ctx) {
  const hits = [];
  for (const e of ctx.edges) {
    const allowed = endpointsOf(ctx, e);
    for (const s of ctx.shapes) {
      if (allowed.has(s.id)) continue;
      const r = inset(s.bounds, 3);
      if (e.segs.some(seg => segmentHitsRect(seg, r))) hits.push([e.id, s.id]);
    }
  }
  return { value: hits.length, details: hits };
}

function labelShapeOverlaps(ctx) {
  const hits = [];
  for (const l of ctx.labels) {
    for (const s of ctx.shapes) if (s.id !== l.id && intersection(l.rect, s.bounds)) hits.push([l.id, s.id]);
  }
  return { value: hits.length, details: hits };
}

function labelLabelOverlaps(ctx) {
  const hits = [];
  for (let i = 0; i < ctx.labels.length; i += 1) {
    for (let j = i + 1; j < ctx.labels.length; j += 1) {
      if (intersection(ctx.labels[i].rect, ctx.labels[j].rect)) hits.push([ctx.labels[i].id, ctx.labels[j].id]);
    }
  }
  return { value: hits.length, details: hits };
}

function labelEdgeOverlaps(ctx) {
  const hits = [];
  for (const l of ctx.labels) {
    for (const e of ctx.edges) if (e.id !== l.id && e.segs.some(seg => segmentHitsRect(seg, l.rect))) hits.push([l.id, e.id]);
  }
  return { value: hits.length, details: hits };
}

function labelsOnTitleBand(ctx) {
  const hits = [];
  for (const l of ctx.labels) for (const b of ctx.bands) if (intersection(l.rect, b.rect)) hits.push([l.id, b.id]);
  return { value: hits.length, details: hits };
}

function shapesOnTitleBand(ctx) {
  const hits = [];
  for (const s of ctx.shapes) for (const b of ctx.bands) if (intersection(inset(s.bounds, TOL), b.rect)) hits.push([s.id, b.id]);
  return { value: hits.length, details: hits };
}

function shapesOutsideContainer(ctx) {
  const out = [];
  const laneById = new Map(ctx.leafLanes.map(l => [l.id, l]));
  for (const n of ctx.flowNodes) {
    if (n.type === 'boundaryEvent') continue; // straddles its host's border by design
    const lane = n.laneId && laneById.get(n.laneId);
    const pool = ctx.model.participantOfProcess.get(n.processId);
    if (lane && !contains(lane.bounds, n.bounds, TOL)) out.push([n.id, lane.id]);
    else if (pool?.bounds && !contains(pool.bounds, n.bounds, TOL)) out.push([n.id, pool.id]);
  }
  return { value: out.length, details: out };
}

function clippedText(ctx) {
  const out = [];
  const view = ctx.text.viewBox;
  for (const t of ctx.text.boxes) {
    if (!contains(view, t, TOL)) { out.push([t.id, 'viewBox']); continue; }
    if (t.label) continue;
    const node = ctx.byId.get(t.id);
    if (node && ['task', 'subprocess', 'annotation'].includes(node.kind) && !contains(node.bounds, t, 2)) out.push([t.id, 'shape']);
    const band = ctx.bands.find(b => b.id === t.id);
    if (band && !contains(band.rect, t, 2)) out.push([t.id, 'title-band']);
  }
  return { value: out.length, details: out };
}

// ---------- legibility ----------

function crossingsAndOverlaps(ctx) {
  const byFamily = { 'seq/seq': 0, 'msg/seq': 0, 'msg/msg': 0, other: 0 };
  let overlapLength = 0; const overlapPairs = new Set(); const crossings = [];
  for (let i = 0; i < ctx.edges.length; i += 1) {
    for (let j = i + 1; j < ctx.edges.length; j += 1) {
      const a = ctx.edges[i]; const b = ctx.edges[j];
      let n = 0; let shared = 0;
      for (const sa of a.segs) for (const sb of b.segs) { if (segmentsCross(sa, sb)) n += 1; shared += collinearOverlap(sa, sb); }
      if (n) {
        const fam = [edgeFamily(a), edgeFamily(b)].sort().join('/');
        byFamily[byFamily[fam] === undefined ? 'other' : fam] += n;
        crossings.push([a.id, b.id, n]);
      }
      if (shared > 5) { overlapLength += shared; overlapPairs.add(pairKey(a.id, b.id)); }
    }
  }
  return { byFamily, crossings, overlapLength, overlapPairs: [...overlapPairs] };
}

const memo = (ctx, key, fn) => (ctx[key] ??= fn(ctx));
const crossData = ctx => memo(ctx, '_cross', crossingsAndOverlaps);
const seqFlows = ctx => ctx.edges.filter(e => e.type === 'sequenceFlow');
const forwardSeq = ctx => seqFlows(ctx).filter(e => !ctx.back.has(e.id));
const msgFlows = ctx => ctx.edges.filter(e => e.type === 'messageFlow');
const bends = e => Math.max(0, e.waypoints.length - 2);
const ratio = (num, den) => (den ? num / den : null);
const centerX = (ctx, id, fallback) => { const b = ctx.byId.get(id)?.bounds; return b ? center(b).x : fallback.x; };

function longEdges(ctx) {
  const lengths = forwardSeq(ctx).map(e => [e.id, polylineLength(e.waypoints)]);
  const med = median(lengths.map(([, l]) => l));
  const long = lengths.filter(([, l]) => l > Math.max(LONG_EDGE_MIN, LONG_EDGE_FACTOR * med));
  return { value: long.length, details: long.map(([id, l]) => [id, Math.round(l)]) };
}

// ---------- artifacts (data objects, data stores, annotations) ----------

const ASSOCIATION_TYPES = new Set(['association', 'dataInputAssociation', 'dataOutputAssociation']);
const associations = ctx => ctx.edges.filter(e => ASSOCIATION_TYPES.has(e.type));
const isArtifact = node => node?.kind === 'data' || node?.kind === 'annotation';

/** Associations longer than a "long" sequence flow of the same diagram (same rule as longSeqEdges). */
function longAssociations(ctx) {
  const limit = Math.max(LONG_EDGE_MIN, LONG_EDGE_FACTOR * (median(forwardSeq(ctx).map(e => polylineLength(e.waypoints))) ?? 0));
  const long = associations(ctx).map(e => [e.id, polylineLength(e.waypoints)]).filter(([, l]) => l > limit);
  return { value: long.length, details: long.map(([id, l]) => [id, Math.round(l)]) };
}

function bentNearAssociations(ctx) {
  const hits = associations(ctx).filter(e => bends(e) > 0 && polylineLength(e.waypoints) < NEAR_ASSOCIATION);
  return { value: hits.length, details: hits.map(e => e.id) };
}

/** Pool of an artifact: its process's participant, else (collaboration annotations) the pool holding its centre. */
function poolOf(ctx, node) {
  const own = ctx.model.participantOfProcess.get(node.processId);
  if (own?.bounds) return own;
  const c = center(node.bounds);
  return ctx.participants.find(p => contains(p.bounds, { x: c.x, y: c.y, width: 0, height: 0 }, 0)) ?? null;
}

function artifactTextOutsidePool(ctx) {
  const out = [];
  for (const t of ctx.text.boxes) {
    const node = ctx.byId.get(t.id);
    if (!isArtifact(node)) continue;
    const pool = poolOf(ctx, node);
    if (pool && !contains(pool.bounds, t, TOL)) out.push([t.id, pool.id]);
  }
  return { value: out.length, details: out };
}

function labelDistance(ctx) {
  const ds = [];
  for (const l of ctx.labels) {
    const node = ctx.byId.get(l.id); const edge = ctx.edgeById.get(l.id);
    if (node) ds.push(rectDistance(l, node.bounds));
    else if (edge) ds.push(rectPolylineDistance(l, edge.waypoints));
  }
  return { value: mean(ds) };
}

function poolAlignment(ctx, pick) {
  const pools = ctx.participants;
  if (pools.length < 2) return { value: null };
  return { value: pick(pools.map(p => p.bounds)) };
}

// ---------- compactness ----------

const diagramBox = ctx => ctx.text.viewBox;

function laneSlack(ctx) {
  let slack = 0; let total = 0;
  for (const lane of ctx.leafLanes) {
    const content = union([
      ...ctx.flowNodes.filter(n => n.laneId === lane.id).map(n => n.bounds),
      ...ctx.labels.filter(l => ctx.byId.get(l.id)?.laneId === lane.id),
    ]);
    const needed = content ? content.height + 2 * LANE_MARGIN : 2 * LANE_MARGIN;
    slack += Math.max(0, lane.bounds.height - needed);
    total += lane.bounds.height;
  }
  return { value: ratio(slack, total) };
}

// ---------- registry ----------

export const METRICS = [
  { key: 'shapeOverlaps', group: 'hard', better: 'lower', compute: shapeOverlaps },
  { key: 'edgeThroughShape', group: 'hard', better: 'lower', compute: edgeThroughShape },
  { key: 'labelShapeOverlaps', group: 'hard', better: 'lower', compute: labelShapeOverlaps },
  { key: 'labelLabelOverlaps', group: 'hard', better: 'lower', compute: labelLabelOverlaps },
  { key: 'labelEdgeOverlaps', group: 'hard', better: 'lower', compute: labelEdgeOverlaps },
  { key: 'labelsOnTitleBand', group: 'hard', better: 'lower', compute: labelsOnTitleBand },
  { key: 'shapesOnTitleBand', group: 'hard', better: 'lower', compute: shapesOnTitleBand },
  { key: 'shapesOutsideContainer', group: 'hard', better: 'lower', compute: shapesOutsideContainer },
  { key: 'clippedText', group: 'hard', better: 'lower', compute: clippedText },

  { key: 'crossings', group: 'legibility', better: 'lower',
    compute: ctx => { const c = crossData(ctx); return { value: Object.values(c.byFamily).reduce((a, b) => a + b, 0), details: c.crossings }; } },
  { key: 'crossingsSeqSeq', group: 'legibility', better: 'lower', compute: ctx => ({ value: crossData(ctx).byFamily['seq/seq'] }) },
  { key: 'crossingsSeqMsg', group: 'legibility', better: 'lower', compute: ctx => ({ value: crossData(ctx).byFamily['msg/seq'] }) },
  { key: 'crossingsMsgMsg', group: 'legibility', better: 'lower', compute: ctx => ({ value: crossData(ctx).byFamily['msg/msg'] }) },
  { key: 'edgeOverlaps', group: 'legibility', better: 'lower',
    compute: ctx => ({ value: crossData(ctx).overlapPairs.length, details: crossData(ctx).overlapPairs }) },
  { key: 'bendsPerEdge', group: 'legibility', better: 'lower',
    compute: ctx => ({ value: mean([...seqFlows(ctx), ...msgFlows(ctx)].map(bends)) }) },
  { key: 'straightSeqRatio', group: 'legibility', better: 'higher',
    compute: ctx => ({ value: ratio(forwardSeq(ctx).filter(e => bends(e) === 0).length, forwardSeq(ctx).length) }) },
  { key: 'forwardSeqRatio', group: 'legibility', better: 'higher',
    compute: ctx => ({ value: ratio(forwardSeq(ctx).filter(e => centerX(ctx, e.target, e.waypoints.at(-1))
      >= centerX(ctx, e.source, e.waypoints[0]) - TOL).length, forwardSeq(ctx).length) }) },
  { key: 'backEdges', group: 'legibility', better: 'info', compute: ctx => ({ value: ctx.back.size }) },
  { key: 'seqEdgeLengthMean', group: 'legibility', better: 'lower',
    compute: ctx => ({ value: mean(forwardSeq(ctx).map(e => polylineLength(e.waypoints))) }) },
  { key: 'seqEdgeLengthCV', group: 'legibility', better: 'lower',
    compute: ctx => ({ value: coefficientOfVariation(forwardSeq(ctx).map(e => polylineLength(e.waypoints))) }) },
  { key: 'longSeqEdges', group: 'legibility', better: 'lower', compute: longEdges },
  { key: 'msgFlowLengthMean', group: 'legibility', better: 'lower',
    compute: ctx => ({ value: mean(msgFlows(ctx).map(e => polylineLength(e.waypoints))) }) },
  { key: 'msgFlowDxMean', group: 'legibility', better: 'lower',
    compute: ctx => ({ value: mean(msgFlows(ctx).map(e => Math.abs(e.waypoints.at(-1).x - e.waypoints[0].x))) }) },
  { key: 'labelDistanceMean', group: 'legibility', better: 'lower', compute: labelDistance },
  // Artifacts (added 2026-09-26 after the v5–v6 votes; legibility, so the hard gate is unchanged).
  { key: 'assocLengthMean', group: 'legibility', better: 'lower',
    compute: ctx => ({ value: mean(associations(ctx).map(e => polylineLength(e.waypoints))) }) },
  { key: 'assocBendsPerEdge', group: 'legibility', better: 'lower',
    compute: ctx => ({ value: mean(associations(ctx).map(bends)) }) },
  { key: 'bentNearAssociations', group: 'legibility', better: 'lower', compute: bentNearAssociations },
  { key: 'longAssociations', group: 'legibility', better: 'lower', compute: longAssociations },
  { key: 'artifactTextOutsidePool', group: 'legibility', better: 'lower', compute: artifactTextOutsidePool },
  { key: 'poolWidthCV', group: 'legibility', better: 'lower',
    compute: ctx => poolAlignment(ctx, bs => coefficientOfVariation(bs.map(b => b.width))) },
  { key: 'poolEdgeSpread', group: 'legibility', better: 'lower',
    compute: ctx => poolAlignment(ctx, bs => Math.max(...bs.map(b => b.x)) - Math.min(...bs.map(b => b.x))
      + Math.max(...bs.map(b => b.x + b.width)) - Math.min(...bs.map(b => b.x + b.width))) },

  { key: 'width', group: 'compactness', better: 'band', compute: ctx => ({ value: diagramBox(ctx).width }) },
  { key: 'height', group: 'compactness', better: 'band', compute: ctx => ({ value: diagramBox(ctx).height }) },
  { key: 'area', group: 'compactness', better: 'band', compute: ctx => ({ value: area(diagramBox(ctx)) }) },
  { key: 'areaPerNode', group: 'compactness', better: 'band',
    compute: ctx => ({ value: ratio(area(diagramBox(ctx)), ctx.flowNodes.length) }) },
  { key: 'aspectRatio', group: 'compactness', better: 'band',
    compute: ctx => ({ value: ratio(diagramBox(ctx).width, diagramBox(ctx).height) }) },
  { key: 'aspectDeviation16x9', group: 'compactness', better: 'band',
    compute: ctx => ({ value: Math.abs(Math.log((diagramBox(ctx).width / diagramBox(ctx).height) / TARGET_ASPECT)) }) },
  { key: 'fillRatio', group: 'compactness', better: 'band',
    compute: ctx => ({ value: ratio(ctx.shapes.reduce((s, n) => s + area(n.bounds), 0), area(diagramBox(ctx))) }) },
  { key: 'laneSlackRatio', group: 'compactness', better: 'lower', compute: laneSlack },
];

const round = v => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 1e4) / 1e4 : v ?? null);

/**
 * { values, details, counts, hardVisible, hardVisibleDetails } for one laid-out
 * diagram. values: complete layout (message flows shown). hardVisible: the hard
 * constraints with message flows hidden, as delivered.
 */
export function computeMetrics(model, text) {
  const ctx = buildContext(model, text);
  const values = {}; const details = {};
  for (const m of METRICS) {
    const { value, details: d } = m.compute(ctx);
    values[m.key] = round(value);
    if (d?.length) details[m.key] = d;
  }
  const visibleCtx = buildContext(model, text, { messageFlows: 'hidden' });
  const hardVisible = {}; const hardVisibleDetails = {};
  for (const m of METRICS.filter(m => m.group === 'hard')) {
    const { value, details: d } = m.compute(visibleCtx);
    hardVisible[m.key] = round(value);
    if (d?.length) hardVisibleDetails[m.key] = d;
  }
  const counts = { flowNodes: ctx.flowNodes.length, shapes: ctx.shapes.length, edges: ctx.edges.length,
    sequenceFlows: seqFlows(ctx).length, messageFlows: msgFlows(ctx).length, labels: ctx.labels.length,
    pools: ctx.participants.length, lanes: ctx.leafLanes.length };
  return { values, details, counts, hardVisible, hardVisibleDetails };
}
