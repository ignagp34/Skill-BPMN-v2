import BpmnModdle from "bpmn-moddle";

import { extendOuterLanes, placePoolsAndLanes as orderAndStackPools } from "../v2/pool-order.ts";

export { extendOuterLanes };

/**
 * Layout v3 = v2 + idea C of plans/layout-iteracion-1.md: horizontal alignment
 * between pools.
 *
 * After the pools are stacked, each pool's content is shifted right by one
 * amount dx ≥ 0 so that the two ends of its message flows share an x (vertical,
 * short message flows). dx minimises Σ |x(source centre) − x(target centre)|
 * over message flows by coordinate descent: each pool in turn moves to the
 * weighted median of the offsets its message flows ask for, staying put when
 * the median is an interval that already contains it. The pool and lane frames
 * keep their common left edge and grow to the right by dx, so the headers stay
 * aligned. Message flows get fresh straight centre-to-centre waypoints, as
 * pools.ts seeds them; the orthogonal router runs afterwards, as in v0.
 */
const MAX_ROUNDS = 50;

export async function placePoolsAndLanes(layoutXml: string): Promise<string> {
  return alignPools(await orderAndStackPools(layoutXml));
}

async function alignPools(xml: string): Promise<string> {
  const moddle = new BpmnModdle();
  const { rootElement } = await moddle.fromXML(xml);
  const defs = rootElement as any;
  const collaboration = (defs.rootElements ?? []).find((r: any) => r.$type === "bpmn:Collaboration");
  const plane = defs.diagrams?.[0]?.plane;
  if (!collaboration || !plane) return xml;

  const participants: any[] = collaboration.participants ?? [];
  const planeElements: any[] = plane.planeElement ?? [];
  const shapeOf = new Map<string, any>();
  for (const el of planeElements) {
    if (el.$type === "bpmndi:BPMNShape" && el.bpmnElement?.id) shapeOf.set(el.bpmnElement.id, el);
  }
  const poolOf = poolIndexByElement(participants);

  const links = messageLinks(collaboration, poolOf, shapeOf);
  if (links.length === 0) return xml;
  const dx = solveOffsets(participants.length, links);
  if (dx.every((d) => d === 0)) return xml;

  shiftPools(participants, planeElements, poolOf, dx);
  reseedMessageFlows(planeElements, shapeOf, moddle);
  return (await moddle.toXML(defs, { format: false })).xml;
}

interface Link { a: number; b: number; ax: number; bx: number; }

/** Message flows between two different pools whose both ends are flow nodes with a shape. */
function messageLinks(collaboration: any, poolOf: Map<string, number>, shapeOf: Map<string, any>): Link[] {
  const links: Link[] = [];
  for (const mf of collaboration.messageFlows ?? []) {
    const [s, t] = [mf.sourceRef, mf.targetRef];
    if (!s || !t || s.$type === "bpmn:Participant" || t.$type === "bpmn:Participant") continue;
    const [a, b] = [poolOf.get(s.id), poolOf.get(t.id)];
    const [sb, tb] = [shapeOf.get(s.id)?.bounds, shapeOf.get(t.id)?.bounds];
    if (a === undefined || b === undefined || a === b || !sb || !tb) continue;
    links.push({ a, b, ax: sb.x + sb.width / 2, bx: tb.x + tb.width / 2 });
  }
  return links;
}

/** Per-pool offsets, normalised so the smallest is 0. */
function solveOffsets(poolCount: number, links: Link[]): number[] {
  const dx = new Array<number>(poolCount).fill(0);
  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    let moved = false;
    for (let p = 0; p < poolCount; p += 1) {
      const wanted: number[] = [];
      for (const l of links) {
        if (l.a === p) wanted.push(l.bx + dx[l.b] - l.ax);
        else if (l.b === p) wanted.push(l.ax + dx[l.a] - l.bx);
      }
      if (wanted.length === 0) continue;
      const next = Math.round(nearestMedian(wanted, dx[p]));
      if (next !== dx[p]) { dx[p] = next; moved = true; }
    }
    if (!moved) break;
  }
  const min = Math.min(...dx);
  return dx.map((d) => d - min);
}

/** Median of values; for an even count, the point of the median interval closest to current. */
function nearestMedian(values: number[], current: number): number {
  const sorted = [...values].sort((x, y) => x - y);
  const mid = sorted.length >> 1;
  if (sorted.length % 2 === 1) return sorted[mid];
  return Math.min(Math.max(current, sorted[mid - 1]), sorted[mid]);
}

function shiftPools(participants: any[], planeElements: any[], poolOf: Map<string, number>, dx: number[]): void {
  const frameOf = new Map<string, number>();
  participants.forEach((p, i) => {
    frameOf.set(p.id, i);
    for (const ls of p.processRef?.laneSets ?? []) for (const lane of ls.lanes ?? []) frameOf.set(lane.id, i);
  });

  for (const el of planeElements) {
    const ref = el.bpmnElement;
    if (!ref) continue;
    if (el.$type === "bpmndi:BPMNShape") {
      const frame = frameOf.get(ref.id);
      if (frame !== undefined) { el.bounds.width += dx[frame]; continue; }
      const pool = poolOf.get(ref.id);
      if (pool !== undefined) moveX(el, dx[pool]);
    } else if (el.$type === "bpmndi:BPMNEdge" && ref.$type !== "bpmn:MessageFlow") {
      const pool = endIds(ref).map((id) => poolOf.get(id)).find((i) => i !== undefined);
      if (pool !== undefined) moveX(el, dx[pool]);
    }
  }
}

function moveX(di: any, d: number): void {
  if (!d) return;
  if (di.bounds) di.bounds.x += d;
  for (const wp of di.waypoint ?? []) wp.x += d;
  if (di.label?.bounds) di.label.bounds.x += d;
}

/** Ids at the ends of a connection (sequence flow, association, data association). */
function endIds(ref: any): string[] {
  const ids: string[] = [];
  for (const end of [ref.sourceRef, ref.targetRef]) {
    for (const el of Array.isArray(end) ? end : [end]) if (el?.id) ids.push(el.id);
  }
  if (ids.length === 0 && ref.$parent?.id) ids.push(ref.$parent.id); // data association: owned by its activity
  return ids;
}

function reseedMessageFlows(planeElements: any[], shapeOf: Map<string, any>, moddle: any): void {
  for (const el of planeElements) {
    if (el.$type !== "bpmndi:BPMNEdge" || el.bpmnElement?.$type !== "bpmn:MessageFlow") continue;
    const src = shapeOf.get(el.bpmnElement.sourceRef?.id)?.bounds;
    const tgt = shapeOf.get(el.bpmnElement.targetRef?.id)?.bounds;
    if (!src || !tgt) continue;
    el.waypoint = [src, tgt].map((b: any) => moddle.create("dc:Point", { x: b.x + b.width / 2, y: b.y + b.height / 2 }));
  }
}

/** Pool index of every element inside a participant (flow nodes, nested flow elements, artifacts). */
function poolIndexByElement(participants: any[]): Map<string, number> {
  const poolOf = new Map<string, number>();
  const visit = (container: any, index: number) => {
    for (const el of [...(container?.flowElements ?? []), ...(container?.artifacts ?? [])]) {
      poolOf.set(el.id, index);
      visit(el, index);
    }
  };
  participants.forEach((p, index) => visit(p.processRef, index));
  return poolOf;
}
