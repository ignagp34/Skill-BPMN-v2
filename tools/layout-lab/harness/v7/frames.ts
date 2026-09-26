import BpmnModdle from "bpmn-moddle";

import { placeArtifacts as placeArtifactsV6 } from "../v6/artifacts.ts";

/**
 * Layout v7 = v6 + idea E of evidence/layout-review-20260926/REVIEW.md, as the
 * user asked for it (2026-09-26):
 *  - common pool width: every pool, with its lanes, reaches the right edge of
 *    the widest pool (pools already share their left edge);
 *  - lanes fill their pool: the first lane starts at the pool's top line and
 *    the last one ends at its bottom line, with no empty strip (v0 pads the
 *    pool with LANE_PAD_Y = 20 px above and below its lanes). Nested lane sets
 *    fill their parent lane the same way.
 * Frames only grow: shapes, labels and routes keep their coordinates, so the
 * diagram's outer box does not change.
 */
const EPS = 0.5;

interface Bounds { x: number; y: number; width: number; height: number; }

export async function placeArtifacts(layoutXml: string): Promise<string> {
  return tidyFrames(await placeArtifactsV6(layoutXml));
}

export async function tidyFrames(xml: string): Promise<string> {
  const moddle = new BpmnModdle();
  const { rootElement } = await moddle.fromXML(xml);
  const defs = rootElement as any;
  const planeElements: any[] = defs.diagrams?.[0]?.plane?.planeElement ?? [];
  const boundsOf = new Map<string, Bounds>();
  for (const el of planeElements) {
    if (el.$type === "bpmndi:BPMNShape" && el.bpmnElement?.id && el.bounds) boundsOf.set(el.bpmnElement.id, el.bounds);
  }

  const pools = planeElements
    .filter((el) => el.$type === "bpmndi:BPMNShape" && el.bpmnElement?.$type === "bpmn:Participant" && el.isHorizontal !== false)
    .map((el) => ({ bounds: el.bounds as Bounds, lanes: topLanes(el.bpmnElement) }));
  if (pools.length === 0) return xml;

  let changed = false;
  const right = Math.max(...pools.map((p) => p.bounds.x + p.bounds.width));
  for (const pool of pools) {
    const dx = right - (pool.bounds.x + pool.bounds.width);
    if (dx > EPS) {
      pool.bounds.width += dx;
      for (const lane of allLanes(pool.lanes)) {
        const b = boundsOf.get(lane.id);
        if (b) b.width += dx;
      }
      changed = true;
    }
    if (fillVertically(pool.bounds, pool.lanes, boundsOf)) changed = true;
  }
  return changed ? (await moddle.toXML(defs, { format: false })).xml : xml;
}

const topLanes = (participant: any): any[] => participant.processRef?.laneSets?.flatMap((s: any) => s.lanes ?? []) ?? [];
const childLanes = (lane: any): any[] => lane.childLaneSet?.lanes ?? [];
const allLanes = (lanes: any[]): any[] => lanes.flatMap((l) => [l, ...allLanes(childLanes(l))]);

/** First lane up to the container's top, last lane down to its bottom; then the same inside each lane. */
function fillVertically(container: Bounds, lanes: any[], boundsOf: Map<string, Bounds>): boolean {
  const drawn = lanes.map((l) => ({ lane: l, b: boundsOf.get(l.id) })).filter((x): x is { lane: any; b: Bounds } => !!x.b)
    .sort((a, b) => a.b.y - b.b.y);
  if (drawn.length === 0) return false;
  let changed = false;
  const first = drawn[0].b; const last = drawn[drawn.length - 1].b;
  const top = first.y - container.y;
  if (top > EPS) { first.y -= top; first.height += top; changed = true; }
  const bottom = container.y + container.height - (last.y + last.height);
  if (bottom > EPS) { last.height += bottom; changed = true; }
  for (const { lane, b } of drawn) if (fillVertically(b, childLanes(lane), boundsOf)) changed = true;
  return changed;
}
