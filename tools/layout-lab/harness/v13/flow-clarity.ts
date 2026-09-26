import BpmnModdle from "bpmn-moddle";

import { distributeParallelChannels as distributeV0 } from "../../../../packages/bpmn-core/src/render/edge-channels.js";

/**
 * Layout v13 = v7 + a flow-clarity pass after v0's channel distribution, from the
 * user's notes on v12's find-a-job (2026-09-26):
 *
 *  1. one direction per face: a node face where sequence flows both enter and
 *     leave hides where the arrows go. Such a face keeps one direction; a flow of
 *     the other direction is re-routed through a face free of the opposite
 *     direction (the reroute that leaves the diagram best wins);
 *  2. no ambiguous merging: two flows that share a stretch of line without sharing
 *     their source (a fan-out) or their target (a merge) cannot be told apart. An
 *     interior segment of one of them is shifted sideways (12, 24, 36 px); when the
 *     shared stretch touches a node, the flow is re-routed. A crossing is readable,
 *     a merge is not, so reroutes may cross lines but never merge with them.
 *
 * The mini-router proposes orthogonal routes that leave and enter faces
 * perpendicularly, never cross a shape and stay inside the pool, scored by merged
 * length, crossings, bends and length. Only sequence flows are touched (message
 * flows are hidden in what the user receives); later phases (labels, lanes,
 * artifacts, v7 frames) run unchanged.
 */
type Side = "left" | "right" | "top" | "bottom";
interface Pt { x: number; y: number; }
interface Bounds { x: number; y: number; width: number; height: number; }
interface Flow { el: any; id: string; source: string; target: string; points: Pt[]; }

const SIDES: Side[] = ["left", "right", "top", "bottom"];
const STUB = 20;            // straight run out of / into a face before the first bend
const PITCH = 12;           // same pitch as v0's channel distribution
const SHIFTS = [PITCH, -PITCH, 2 * PITCH, -2 * PITCH, 3 * PITCH, -3 * PITCH];
const MERGE_MIN = 5;        // shared length that counts as a merge (same as the metric)
const INSET = 2;            // a route may touch its own ends' borders but not their inside
const CLEARANCE = 8;        // free space kept around every other shape (a line along a border looks attached)
const MAX_SAMPLES = 40;     // corridor positions tried between two ports, per axis
const COST = { shape: 1e6, merge: 60, crossing: 150, bend: 40, mixedFace: 1e5 };

/**
 * What the pass works on. v13's values are neutral; v21 (untangling) also treats a
 * flow that crosses another as troubled, so the same router looks for a route with
 * fewer crossings.
 */
export interface FlowClarityTuning {
  untangle: boolean;
  maxRounds: number;
  /**
   * Cost of a route through the default label box (below the shape) of a named event
   * or gateway, and of a named flow whose own label would land on a shape or a line
   * where v0's placeLabels puts it; 0 = ignored.
   */
  labelZone: number;
  /** Cost of a bend (v13: 40). */
  bend: number;
  /**
   * Two flows sharing neither source nor target that run parallel closer than this
   * (px, above 0) read as one line: that stretch costs as a merge. 0 = only exact overlaps.
   */
  nearGap: number;
  /** Whether a gateway's name box counts (v0's placeLabels puts it at a vertex free of lines, so below is only a guess). */
  zoneGateways: boolean;
  /** Whether the name boxes of the flow's own source and target count (v9 and v21's boundary pass move those names). */
  zoneOwnEnds: boolean;
}
export const V13_TUNING: FlowClarityTuning = { untangle: false, maxRounds: 40, labelZone: 0, bend: COST.bend, nearGap: 0,
  zoneGateways: true, zoneOwnEnds: true };

export async function distributeParallelChannels(layoutXml: string): Promise<string> {
  return clarifyFlows(await distributeV0(layoutXml));
}

export async function clarifyFlows(xml: string): Promise<string> {
  return clarifyFlowsWith(xml, V13_TUNING);
}

export async function clarifyFlowsWith(xml: string, tuning: FlowClarityTuning): Promise<string> {
  const moddle = new BpmnModdle();
  const { rootElement } = await moddle.fromXML(xml);
  const defs = rootElement as any;
  const planeElements: any[] = defs.diagrams?.[0]?.plane?.planeElement ?? [];
  const shapes = new Map<string, { bounds: Bounds; type: string }>();
  const pools: Bounds[] = [];
  for (const el of planeElements) {
    if (el.$type !== "bpmndi:BPMNShape" || !el.bounds || !el.bpmnElement) continue;
    const type = el.bpmnElement.$type as string;
    if (type === "bpmn:Participant") pools.push(el.bounds);
    else if (type !== "bpmn:Lane") shapes.set(el.bpmnElement.id, { bounds: el.bounds, type });
  }
  const flows: Flow[] = planeElements
    .filter((el) => el.$type === "bpmndi:BPMNEdge" && el.bpmnElement?.$type === "bpmn:SequenceFlow"
      && (el.waypoint?.length ?? 0) >= 2 && shapes.has(el.bpmnElement.sourceRef?.id) && shapes.has(el.bpmnElement.targetRef?.id))
    .map((el) => ({ el, id: el.bpmnElement.id, source: el.bpmnElement.sourceRef.id, target: el.bpmnElement.targetRef.id,
      points: el.waypoint.map((p: any) => ({ x: p.x, y: p.y })) }));
  if (flows.length === 0) return xml;

  const world: World = { shapes, pools, flows, untangle: tuning.untangle, labelZone: tuning.labelZone, bend: tuning.bend, nearGap: tuning.nearGap,
    labelZones: tuning.labelZone ? labelZones(planeElements).filter((z) => tuning.zoneGateways || !z.gateway) : [],
    zoneOwnEnds: tuning.zoneOwnEnds };
  let changed = false;
  for (let round = 0; round < tuning.maxRounds; round += 1) {
    const fix = bestFix(world);
    if (!fix) break;
    fix.flow.points = fix.points;
    changed = true;
  }
  if (!changed) return xml;
  for (const f of flows) f.el.waypoint = f.points.map((p) => moddle.create("dc:Point", { x: Math.round(p.x), y: Math.round(p.y) }));
  return (await moddle.toXML(defs, { format: false })).xml;
}

interface World {
  shapes: Map<string, { bounds: Bounds; type: string }>; pools: Bounds[]; flows: Flow[];
  untangle: boolean; labelZone: number; labelZones: LabelZone[]; bend: number; nearGap: number; zoneOwnEnds: boolean;
}

interface LabelZone { id: string; gateway: boolean; box: Bounds; }

/** Name boxes a route of `flow` should keep clear of. */
const zonesFor = (world: World, flow: Flow): Bounds[] => world.labelZones
  .filter((z) => world.zoneOwnEnds || (z.id !== flow.source && z.id !== flow.target)).map((z) => z.box);

/** The single change (reroute or segment shift) that most reduces the diagram's cost, if any. */
function bestFix(world: World): { flow: Flow; points: Pt[] } | null {
  let best: { flow: Flow; points: Pt[]; gain: number } | null = null;
  for (const flow of troubled(world)) {
    const current = flowCost(world, flow, flow.points, Infinity);
    const consider = (points: Pt[]) => {
      // Branch and bound: stop costing a candidate as soon as it cannot beat the best gain so far.
      const bound = current - Math.max(1, best?.gain ?? 1); // a cost above it gives a gain that cannot win
      const gain = current - flowCost(world, flow, points, bound);
      if (gain > 1 && (!best || gain > best.gain)) best = { flow, points, gain };
    };
    for (const points of segmentShifts(flow)) consider(points);
    for (const points of reroutes(world, flow)) consider(points);
  }
  return best;
}

/**
 * Every term of the diagram's cost that depends on this flow's route (the rest does
 * not change). All terms are non-negative, so once the sum passes `bound` the exact
 * value no longer matters and the partial sum is returned.
 */
function flowCost(world: World, flow: Flow, points: Pt[], bound: number): number {
  let cost = world.bend * bends(points) + length(points);
  if (!insideAPool(points, world.pools)) cost += COST.shape;
  if (cost > bound) return cost;
  const old = flow.points; flow.points = points;
  try {
    cost += COST.shape * shapeHits(flow, world.shapes);
    if (world.labelZone) cost += world.labelZone * (zoneHits(points, zonesFor(world, flow)) + ownLabelHits(world, flow, points));
    if (cost > bound) return cost;
    for (const dirs of faceUse(world.flows, world.shapes).values()) if (dirs.size === 2) cost += COST.mixedFace;
    if (cost > bound) return cost;
    for (const o of world.flows) {
      if (o === flow) continue;
      if (!bundle(flow, o)) cost += COST.merge * Math.max(0, sharedLength(points, o.points, world.nearGap) - MERGE_MIN);
      cost += COST.crossing * crossings(points, o.points);
      if (cost > bound) return cost;
    }
    return cost;
  } finally {
    flow.points = old;
  }
}

/** Flows on a mixed face or in an ambiguous merge (and, when untangling, flows that cross another). */
function troubled(world: World): Flow[] {
  const out = new Set<Flow>();
  const faces = faceUse(world.flows, world.shapes);
  for (const f of world.flows) {
    const s = world.shapes.get(f.source)!.bounds; const t = world.shapes.get(f.target)!.bounds;
    if (faces.get(`${f.source}|${faceOf(s, f.points[0])}`)?.size === 2) out.add(f);
    if (faces.get(`${f.target}|${faceOf(t, f.points.at(-1)!)}`)?.size === 2) out.add(f);
  }
  for (let i = 0; i < world.flows.length; i += 1) for (let j = i + 1; j < world.flows.length; j += 1) {
    const a = world.flows[i]; const b = world.flows[j];
    if (!bundle(a, b) && sharedLength(a.points, b.points) > MERGE_MIN) { out.add(a); out.add(b); }
    if (world.untangle && crossings(a.points, b.points) > 0) { out.add(a); out.add(b); }
  }
  return [...out];
}

// ---------- cost terms ----------

const bundle = (a: Flow, b: Flow) => a.source === b.source || a.target === b.target;

function faceUse(flows: Flow[], shapes: World["shapes"]): Map<string, Set<"in" | "out">> {
  const faces = new Map<string, Set<"in" | "out">>();
  const mark = (id: string, p: Pt, dir: "in" | "out") => {
    const key = `${id}|${faceOf(shapes.get(id)!.bounds, p)}`;
    (faces.get(key) ?? faces.set(key, new Set()).get(key)!).add(dir);
  };
  for (const f of flows) { mark(f.source, f.points[0], "out"); mark(f.target, f.points.at(-1)!, "in"); }
  return faces;
}

function shapeHits(f: Flow, shapes: World["shapes"]): number {
  let n = 0;
  for (const [id, s] of shapes) {
    const r = id === f.source || id === f.target ? inset(s.bounds, INSET) : inset(s.bounds, -CLEARANCE);
    for (let i = 0; i < f.points.length - 1; i += 1) if (segmentHitsRect(f.points[i], f.points[i + 1], r)) { n += 1; break; }
  }
  return n;
}

/**
 * Where bpmn-js puts the name of an event or gateway before any label pass: centred
 * under the shape, wrapped at 90 px (11 px Arial, ~6 px a character, 14 px a line).
 * Routing runs before the labels are placed, so this is the best guess of where they go.
 */
function labelZones(planeElements: any[]): LabelZone[] {
  const zones: LabelZone[] = [];
  for (const el of planeElements) {
    const type = el.bpmnElement?.$type ?? "";
    const name = (el.bpmnElement?.name ?? "").trim();
    if (el.$type !== "bpmndi:BPMNShape" || !el.bounds || !name || !/Event$|Gateway$/.test(type)) continue;
    const width = Math.min(90, name.length * 6 + 4);
    const lines = Math.ceil((name.length * 6) / 90);
    const b = el.bounds;
    zones.push({ id: el.bpmnElement.id, gateway: /Gateway$/.test(type),
      box: { x: b.x + b.width / 2 - width / 2, y: b.y + b.height + 2, width, height: lines * 14 } });
  }
  return zones;
}

/**
 * What the flow's own name would cover, as v0's placeLabels places it: 6 px a
 * character, 18 px high, above or below the last horizontal stretch at 75 % of it
 * (else beside the last vertical one), whichever covers less.
 */
function ownLabelHits(world: World, flow: Flow, points: Pt[]): number {
  const name = String(flow.el.bpmnElement.name ?? "").trim();
  if (!name) return 0;
  const w = Math.max(24, name.length * 6 + 4); const h = 18; const off = 8;
  let boxes: Bounds[] = [];
  for (let i = points.length - 2; i >= 0 && boxes.length === 0; i -= 1) {
    const [a, b] = [points[i], points[i + 1]];
    if (Math.abs(a.y - b.y) <= 1 && Math.abs(a.x - b.x) > 8) {
      const x = (a.x + b.x) / 2 + (b.x - a.x) * 0.25;
      boxes = [{ x: x - w / 2, y: a.y - h - off, width: w, height: h }, { x: x - w / 2, y: a.y + off, width: w, height: h }];
    }
  }
  for (let i = points.length - 2; i >= 0 && boxes.length === 0; i -= 1) {
    const [a, b] = [points[i], points[i + 1]];
    if (Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) > 8) {
      const y = (a.y + b.y) / 2 + (b.y - a.y) * 0.25;
      boxes = [{ x: a.x + off, y: y - h / 2, width: w, height: h }, { x: a.x - w - off, y: y - h / 2, width: w, height: h }];
    }
  }
  if (boxes.length === 0) return 0;
  const hits = (box: Bounds) => {
    let n = 0;
    for (const s of world.shapes.values()) if (rectsOverlap(box, s.bounds)) n += 1;
    for (const o of world.flows) if (o !== flow) for (let i = 0; i < o.points.length - 1; i += 1) if (segmentHitsRect(o.points[i], o.points[i + 1], box)) { n += 1; break; }
    for (const z of zonesFor(world, flow)) if (rectsOverlap(box, z)) n += 1;
    return n;
  };
  return Math.min(...boxes.map(hits));
}

const rectsOverlap = (a: Bounds, b: Bounds) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

function zoneHits(points: Pt[], zones: Bounds[]): number {
  let n = 0;
  for (const z of zones) for (let i = 0; i < points.length - 1; i += 1) if (segmentHitsRect(points[i], points[i + 1], z)) { n += 1; break; }
  return n;
}

// ---------- candidate changes ----------

/** Shift an interior segment (both ends are bends) sideways; its neighbours stretch, so the route stays orthogonal. */
function segmentShifts(f: Flow): Pt[][] {
  const out: Pt[][] = [];
  const p = f.points;
  for (let i = 1; i < p.length - 2; i += 1) {
    const horizontal = Math.abs(p[i].y - p[i + 1].y) < 1;
    const vertical = Math.abs(p[i].x - p[i + 1].x) < 1;
    if (!horizontal && !vertical) continue;
    for (const d of SHIFTS) {
      const q = p.map((pt) => ({ ...pt }));
      if (horizontal) { q[i].y += d; q[i + 1].y += d; } else { q[i].x += d; q[i + 1].x += d; }
      out.push(q);
    }
  }
  return out;
}

/** Orthogonal routes between every allowed pair of faces (a face may not take the opposite direction). */
function reroutes(world: World, f: Flow): Pt[][] {
  const s = world.shapes.get(f.source)!.bounds; const t = world.shapes.get(f.target)!.bounds;
  const others = world.flows.filter((o) => o !== f);
  const faces = faceUse(others, world.shapes);
  const allowed = (id: string, side: Side, dir: "in" | "out") => !faces.get(`${id}|${side}`)?.has(dir === "in" ? "out" : "in");
  const routes: Pt[][] = [];
  for (const fs of SIDES) {
    if (!allowed(f.source, fs, "out")) continue;
    for (const ft of SIDES) {
      if (!allowed(f.target, ft, "in")) continue;
      routes.push(...routesBetween(port(s, fs), fs, port(t, ft), ft, s, t));
    }
  }
  return routes;
}

function routesBetween(a: Pt, fa: Side, b: Pt, fb: Side, s: Bounds, t: Bounds): Pt[][] {
  const a1 = step(a, fa, STUB); const b1 = step(b, fb, STUB);
  const xs = new Set<number>([a1.x, b1.x, (a1.x + b1.x) / 2]);
  const ys = new Set<number>([a1.y, b1.y, (a1.y + b1.y) / 2]);
  for (const k of [1, 2, 3, 4, 6, 8]) {
    for (const x of [Math.min(s.x, t.x) - k * PITCH, Math.max(s.x + s.width, t.x + t.width) + k * PITCH]) xs.add(x);
    for (const y of [Math.min(s.y, t.y) - k * PITCH, Math.max(s.y + s.height, t.y + t.height) + k * PITCH]) ys.add(y);
  }
  const lo = Math.min(a1.x, b1.x); const hi = Math.max(a1.x, b1.x);
  for (let x = lo + PITCH; x < hi; x += Math.max(PITCH, (hi - lo) / MAX_SAMPLES)) xs.add(x);
  const loY = Math.min(a1.y, b1.y); const hiY = Math.max(a1.y, b1.y);
  for (let y = loY + PITCH; y < hiY; y += Math.max(PITCH, (hiY - loY) / MAX_SAMPLES)) ys.add(y);

  const out: Pt[][] = [];
  const push = (mid: Pt[]) => {
    const route = compact([a, a1, ...mid, b1, b]);
    if (orthogonal(route) && leaves(route, fa) && enters(route, fb)) out.push(route);
  };
  push([{ x: b1.x, y: a1.y }]);
  push([{ x: a1.x, y: b1.y }]);
  for (const x of xs) push([{ x, y: a1.y }, { x, y: b1.y }]);
  for (const y of ys) push([{ x: a1.x, y }, { x: b1.x, y }]);
  return out;
}

// ---------- geometry ----------

function port(b: Bounds, side: Side): Pt {
  const cx = b.x + b.width / 2; const cy = b.y + b.height / 2;
  return side === "left" ? { x: b.x, y: cy } : side === "right" ? { x: b.x + b.width, y: cy }
    : side === "top" ? { x: cx, y: b.y } : { x: cx, y: b.y + b.height };
}

function step(p: Pt, side: Side, d: number): Pt {
  return side === "left" ? { x: p.x - d, y: p.y } : side === "right" ? { x: p.x + d, y: p.y }
    : side === "top" ? { x: p.x, y: p.y - d } : { x: p.x, y: p.y + d };
}

function faceOf(b: Bounds, p: Pt): Side {
  const d: Array<[Side, number]> = [["left", Math.abs(p.x - b.x)], ["right", Math.abs(p.x - b.x - b.width)],
    ["top", Math.abs(p.y - b.y)], ["bottom", Math.abs(p.y - b.y - b.height)]];
  return d.sort((u, v) => u[1] - v[1])[0][0];
}

/** First segment goes out of face `side` (away from the shape). */
function leaves(r: Pt[], side: Side): boolean {
  const [p, q] = r;
  return side === "left" ? q.x < p.x && q.y === p.y : side === "right" ? q.x > p.x && q.y === p.y
    : side === "top" ? q.y < p.y && q.x === p.x : q.y > p.y && q.x === p.x;
}

/** Last segment comes into face `side` from outside. */
function enters(r: Pt[], side: Side): boolean {
  const p = r[r.length - 2]; const q = r[r.length - 1];
  return side === "left" ? p.x < q.x && p.y === q.y : side === "right" ? p.x > q.x && p.y === q.y
    : side === "top" ? p.y < q.y && p.x === q.x : p.y > q.y && p.x === q.x;
}

function compact(points: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.x - p.x) < 0.5 && Math.abs(last.y - p.y) < 0.5) continue;
    if (out.length >= 2) {
      const prev = out[out.length - 2];
      const collinear = (Math.abs(prev.x - last.x) < 0.5 && Math.abs(last.x - p.x) < 0.5)
        || (Math.abs(prev.y - last.y) < 0.5 && Math.abs(last.y - p.y) < 0.5);
      const backtracks = collinear && ((last.x - prev.x) * (p.x - last.x) < 0 || (last.y - prev.y) * (p.y - last.y) < 0);
      if (collinear && !backtracks) { out[out.length - 1] = p; continue; }
    }
    out.push(p);
  }
  return out;
}

const orthogonal = (r: Pt[]) => r.slice(1).every((p, i) => Math.abs(p.x - r[i].x) < 0.5 || Math.abs(p.y - r[i].y) < 0.5)
  && !r.slice(2).some((p, i) => (r[i + 1].x - r[i].x) * (p.x - r[i + 1].x) < 0 || (r[i + 1].y - r[i].y) * (p.y - r[i + 1].y) < 0);
const bends = (r: Pt[]) => Math.max(0, r.length - 2);
const length = (r: Pt[]) => r.slice(1).reduce((s, p, i) => s + Math.abs(p.x - r[i].x) + Math.abs(p.y - r[i].y), 0);
const inset = (b: Bounds, d: number): Bounds => ({ x: b.x + d, y: b.y + d, width: b.width - 2 * d, height: b.height - 2 * d });
const insideAPool = (r: Pt[], pools: Bounds[]) => pools.length === 0 || pools.some((b) => r.every((p) => p.x >= b.x + 30 && p.x <= b.x + b.width && p.y >= b.y && p.y <= b.y + b.height));

/** Length two orthogonal polylines share along the same line (or, with `near` > 0, closer than `near` px apart). */
function sharedLength(a: Pt[], b: Pt[], near = 0): number {
  const tol = Math.max(0.5, near);
  let total = 0;
  for (let i = 0; i < a.length - 1; i += 1) for (let j = 0; j < b.length - 1; j += 1) {
    const [p, q] = [a[i], a[i + 1]]; const [u, v] = [b[j], b[j + 1]];
    if (Math.abs(p.y - q.y) < 0.5 && Math.abs(u.y - v.y) < 0.5 && Math.abs(p.y - u.y) < tol) {
      total += Math.max(0, Math.min(Math.max(p.x, q.x), Math.max(u.x, v.x)) - Math.max(Math.min(p.x, q.x), Math.min(u.x, v.x)));
    } else if (Math.abs(p.x - q.x) < 0.5 && Math.abs(u.x - v.x) < 0.5 && Math.abs(p.x - u.x) < tol) {
      total += Math.max(0, Math.min(Math.max(p.y, q.y), Math.max(u.y, v.y)) - Math.max(Math.min(p.y, q.y), Math.min(u.y, v.y)));
    }
  }
  return total;
}

/** Proper crossings between a horizontal and a vertical segment (touching ends do not count). */
function crossings(a: Pt[], b: Pt[]): number {
  let n = 0;
  for (let i = 0; i < a.length - 1; i += 1) for (let j = 0; j < b.length - 1; j += 1) {
    const [p, q] = [a[i], a[i + 1]]; const [u, v] = [b[j], b[j + 1]];
    const h1 = Math.abs(p.y - q.y) < 0.5; const h2 = Math.abs(u.y - v.y) < 0.5;
    if (h1 === h2) continue;
    const [h, hv] = h1 ? [[p, q], [u, v]] : [[u, v], [p, q]];
    const y = h[0].y; const x = hv[0].x;
    if (x > Math.min(h[0].x, h[1].x) + 0.5 && x < Math.max(h[0].x, h[1].x) - 0.5
      && y > Math.min(hv[0].y, hv[1].y) + 0.5 && y < Math.max(hv[0].y, hv[1].y) - 0.5) n += 1;
  }
  return n;
}

function segmentHitsRect(a: Pt, b: Pt, r: Bounds): boolean {
  if (r.width <= 0 || r.height <= 0) return false;
  const minX = Math.min(a.x, b.x); const maxX = Math.max(a.x, b.x);
  const minY = Math.min(a.y, b.y); const maxY = Math.max(a.y, b.y);
  if (Math.abs(a.y - b.y) < 0.5) return a.y > r.y && a.y < r.y + r.height && maxX > r.x && minX < r.x + r.width;
  if (Math.abs(a.x - b.x) < 0.5) return a.x > r.x && a.x < r.x + r.width && maxY > r.y && minY < r.y + r.height;
  return maxX > r.x && minX < r.x + r.width && maxY > r.y && minY < r.y + r.height; // diagonal: bounding box
}
