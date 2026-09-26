import BpmnModdle from "bpmn-moddle";

import { extendOuterLanes, placePoolsAndLanes as placeV2 } from "../v2/pool-order.ts";

export { extendOuterLanes };

/**
 * Layout v22 = v20 + compact lanes (CONTINUAR.md, step 2: v12 leaves tall lanes,
 * e.g. find-a-job).
 *
 * bpmn-auto-layout lays a whole process out on one grid, lanes mixed. v0 then
 * stacks the lanes and gives each one the height between its first and last grid
 * row, so a row used only by other lanes stays inside the lane as empty space
 * (with v12's fixed grid there are many more such rows).
 *
 * Before v0's pool and lane stacking, each lane drops those rows: between two
 * consecutive rows of the lane, a gap wider than one grid row loses the excess
 * from its middle. Everything within half a row of a row centre moves rigidly
 * (boundary events stay on their host); a waypoint inside the removed band goes to
 * its edge. Shapes keep their order and their x; later phases (stacking, routing,
 * labels, artifacts, frames) run unchanged and re-route every flow.
 */
const ROW = 140;             // bpmn-auto-layout's cell height (DEFAULT_CELL_HEIGHT)
const SAME_ROW = 10;         // centres closer than this share a row
const ARTIFACTS = /^bpmn:(DataObjectReference|DataStoreReference|TextAnnotation|Group)$/;

export async function placePoolsAndLanes(layoutXml: string): Promise<string> {
  return placeV2(await collapseEmptyLaneRows(layoutXml));
}

interface Band { lo: number; hi: number; }

export async function collapseEmptyLaneRows(xml: string): Promise<string> {
  const moddle = new BpmnModdle();
  const { rootElement } = await moddle.fromXML(xml);
  const defs = rootElement as any;
  const planeElements: any[] = defs.diagrams?.[0]?.plane?.planeElement ?? [];
  const shapeOf = new Map<string, any>();
  for (const el of planeElements) if (el.$type === "bpmndi:BPMNShape" && el.bounds && el.bpmnElement?.id) shapeOf.set(el.bpmnElement.id, el);

  // One group per lane; a process without lanes is one group.
  const groupOf = new Map<string, number>();
  const groups: string[][] = [];
  for (const process of (defs.rootElements ?? []).filter((r: any) => r.$type === "bpmn:Process")) {
    const lanes = (process.laneSets ?? []).flatMap((ls: any) => ls.lanes ?? []);
    const members: string[][] = lanes.length
      ? lanes.map((lane: any) => (lane.flowNodeRef ?? []).map((r: any) => r.id))
      : [(process.flowElements ?? []).filter((fe: any) => !ARTIFACTS.test(fe.$type)).map((fe: any) => fe.id)];
    for (const ids of members) {
      const present = ids.filter((id) => shapeOf.has(id) && !groupOf.has(id));
      if (present.length === 0) continue;
      for (const id of present) groupOf.set(id, groups.length);
      groups.push(present);
    }
  }

  const bands = groups.map((ids) => emptyBands(ids.map((id) => shapeOf.get(id))));
  if (bands.every((b) => b.length === 0)) return xml;

  const dyOf = (id: string | undefined, y: number) => {
    const g = id === undefined ? undefined : groupOf.get(id);
    return g === undefined ? 0 : map(y, bands[g]) - y;
  };
  for (const [id, shape] of shapeOf) {
    const b = shape.bounds;
    const dy = dyOf(id, b.y + b.height / 2);
    if (!dy) continue;
    b.y += dy;
    if (shape.label?.bounds) shape.label.bounds.y += dy;
  }
  for (const edge of planeElements.filter((el) => el.$type === "bpmndi:BPMNEdge")) {
    const src = edge.bpmnElement?.sourceRef?.id; const tgt = edge.bpmnElement?.targetRef?.id;
    const wps: any[] = edge.waypoint ?? [];
    if (wps.length === 0) continue;
    const g = groupOf.get(src);
    if (g !== undefined && g === groupOf.get(tgt)) {
      for (const wp of wps) wp.y = map(wp.y, bands[g]);   // monotone map: orthogonal segments stay orthogonal
    } else {
      // Across groups, as v0 does across lanes: interpolate between both ends' shifts.
      const dySrc = dyOf(src, centreY(shapeOf.get(src))); const dyTgt = dyOf(tgt, centreY(shapeOf.get(tgt)));
      wps.forEach((wp, i) => { const t = wps.length === 1 ? 0 : i / (wps.length - 1); wp.y += Math.round(dySrc * (1 - t) + dyTgt * t); });
    }
    if (edge.label?.bounds && g !== undefined) edge.label.bounds.y = map(edge.label.bounds.y, bands[g]);
  }
  return (await moddle.toXML(defs, { format: false })).xml;
}

/** Bands to remove inside one group: the middle of every gap wider than a row between consecutive rows. */
function emptyBands(shapes: any[]): Band[] {
  const centres = shapes
    .filter((s) => s.bpmnElement.$type !== "bpmn:BoundaryEvent")
    .map(centreY)
    .sort((a, b) => a - b);
  const rows: number[] = [];
  for (const c of centres) if (rows.length === 0 || c - rows[rows.length - 1] >= SAME_ROW) rows.push(c);
  const bands: Band[] = [];
  for (let i = 0; i < rows.length - 1; i += 1) {
    const gap = rows[i + 1] - rows[i];
    if (gap > ROW + 1) bands.push({ lo: rows[i] + ROW / 2, hi: rows[i + 1] - ROW / 2 });
  }
  return bands;
}

function map(y: number, bands: Band[]): number {
  let out = y;
  for (const b of bands) out -= y >= b.hi ? b.hi - b.lo : y > b.lo ? y - b.lo : 0;
  return out;
}

const centreY = (shape: any) => (shape ? shape.bounds.y + shape.bounds.height / 2 : 0);
