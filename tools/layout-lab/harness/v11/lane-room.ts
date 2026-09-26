import BpmnModdle from "bpmn-moddle";

import { clearTitleBands } from "../v4/title-band-clearance.ts";
import { type ArtifactChoice, placeArtifactsWith } from "../v5/label-aware-artifacts.ts";
import { V6_TUNING } from "../v6/artifacts.ts";
import { tidyFrames } from "../v7/frames.ts";

/**
 * Layout v11 = v7 + proposal B of evidence/layout-review-20260926/REVIEW.md: make
 * room for an artifact instead of putting it on a pool line, a title strip or
 * another element.
 *
 * v6's placement is run with a report. While some artifact has no clean spot (no
 * strict candidate inside its pool, or the chosen one covers a label or crosses a
 * shape or a label), a horizontal band is opened right under the row of its first
 * linked node: everything below the cut (shapes, labels, waypoints, lanes, pools)
 * moves down, and the lanes and pools that span the cut grow. Then the placement
 * runs again on the roomier layout. One band per round and per artifact, at most
 * MAX_ROUNDS rounds; artifacts still without a clean spot keep v6's choice.
 */
const MAX_ROUNDS = 6;
const LABEL_ROOM = 40;    // artifact name under the shape plus clearance
const ROW_MARGIN = 10;    // free space kept under the row before the band
const ROW_REACH = 40;     // how far under the node its row's labels may hang
const EPS = 0.5;

interface Bounds { x: number; y: number; width: number; height: number; }
const CONTAINERS = new Set(["bpmn:Participant", "bpmn:Lane"]);

export interface RoomOptions {
  /** v15: a band stays only if it changes where some artifact goes; otherwise it is undone. */
  keepOnlyHelpfulBands: boolean;
}
export const V11_ROOM: RoomOptions = { keepOnlyHelpfulBands: false };

export function placeArtifacts(layoutXml: string): Promise<string> {
  return placeArtifactsWithRoom(layoutXml, V11_ROOM);
}

export async function placeArtifactsWithRoom(layoutXml: string, options: RoomOptions): Promise<string> {
  let current = layoutXml;
  let report: ArtifactChoice[] = [];
  let placed = await placeArtifactsWith(current, V6_TUNING, report);
  const helped = new Set<string>();
  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    const crowded = report.find((r) => !r.clean && !helped.has(r.artifactId));
    if (!crowded) return finish(placed);
    helped.add(crowded.artifactId);
    const opened = await openBand(current, crowded);
    if (!opened) return finish(placed);
    const roomierReport: ArtifactChoice[] = [];
    const roomierPlaced = await placeArtifactsWith(opened.xml, V6_TUNING, roomierReport);
    if (options.keepOnlyHelpfulBands && samePlacement(report, roomierReport, opened.band)) continue;
    current = opened.xml; report = roomierReport; placed = roomierPlaced;
  }
  return finish(options.keepOnlyHelpfulBands ? placed : await placeArtifactsWith(current, V6_TUNING));
}

/**
 * Every artifact at the spot it had before the band, or at that spot moved down
 * with the band (an artifact follows its node, which may sit on either side of the cut).
 */
function samePlacement(before: ArtifactChoice[], after: ArtifactChoice[], band: Bounds): boolean {
  const spotAfter = new Map(after.map((r) => [r.artifactId, r.bounds]));
  return before.length === after.length && before.every(({ artifactId, bounds: b }) => {
    const a = spotAfter.get(artifactId);
    const sameBox = (y: number) => !!a && Math.abs(a.x - b.x) < EPS && Math.abs(a.y - y) < EPS
      && Math.abs(a.width - b.width) < EPS && Math.abs(a.height - b.height) < EPS;
    return sameBox(b.y) || sameBox(b.y + band.height);
  });
}

const finish = async (xml: string) => tidyFrames(await clearTitleBands(xml));

/** Opens a band of the artifact's height (plus its name) under the row of its first linked node; returns it with its lane's width. */
async function openBand(xml: string, choice: ArtifactChoice): Promise<{ xml: string; band: Bounds } | null> {
  const moddle = new BpmnModdle();
  const { rootElement } = await moddle.fromXML(xml);
  const defs = rootElement as any;
  const planeElements: any[] = defs.diagrams?.[0]?.plane?.planeElement ?? [];
  const shapes = planeElements.filter((el) => el.$type === "bpmndi:BPMNShape" && el.bounds && el.bpmnElement);
  const node = shapes.find((el) => choice.attachedIds.includes(el.bpmnElement.id));
  if (!node) return null;
  const nb = node.bounds as Bounds;
  const lane = shapes.filter((el) => CONTAINERS.has(el.bpmnElement.$type) && containsPoint(el.bounds, nb))
    .sort((a, b) => a.bounds.width * a.bounds.height - b.bounds.width * b.bounds.height)[0];
  if (!lane) return null;
  const lb = lane.bounds as Bounds;

  // The row: everything in the lane that overlaps the node's height (and labels hanging under it).
  const rowTop = nb.y; const rowBottom = nb.y + nb.height + ROW_REACH;
  let cut = nb.y + nb.height;
  for (const el of shapes) {
    if (CONTAINERS.has(el.bpmnElement.$type) || !containsPoint(lb, el.bounds)) continue;
    for (const b of [el.bounds, el.label?.bounds].filter(Boolean) as Bounds[]) {
      if (b.y < rowBottom && b.y + b.height > rowTop) cut = Math.max(cut, b.y + b.height);
    }
  }
  cut = Math.min(cut + ROW_MARGIN, lb.y + lb.height);
  const dy = Math.ceil(choice.height + LABEL_ROOM);

  for (const el of planeElements) {
    if (el.$type === "bpmndi:BPMNShape" && el.bounds) {
      const b = el.bounds as Bounds;
      if (b.y >= cut) b.y += dy;
      else if (CONTAINERS.has(el.bpmnElement?.$type) && b.y + b.height > cut) b.height += dy;
    }
    if (el.$type === "bpmndi:BPMNEdge") for (const p of el.waypoint ?? []) if (p.y >= cut) p.y += dy;
    const label = el.label?.bounds as Bounds | undefined;
    if (label && label.y >= cut) label.y += dy;
  }
  return { xml: (await moddle.toXML(defs, { format: false })).xml, band: { x: lb.x, y: cut, width: lb.width, height: dy } };
}

function containsPoint(outer: Bounds, inner: Bounds): boolean {
  const cx = inner.x + inner.width / 2; const cy = inner.y + inner.height / 2;
  return cx >= outer.x && cx <= outer.x + outer.width && cy >= outer.y && cy <= outer.y + outer.height;
}
