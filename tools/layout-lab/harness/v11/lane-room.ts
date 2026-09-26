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

interface Bounds { x: number; y: number; width: number; height: number; }
const CONTAINERS = new Set(["bpmn:Participant", "bpmn:Lane"]);

export async function placeArtifacts(layoutXml: string): Promise<string> {
  let current = layoutXml;
  const helped = new Set<string>();
  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    const report: ArtifactChoice[] = [];
    const placed = await placeArtifactsWith(current, V6_TUNING, report);
    const crowded = report.find((r) => !r.clean && !helped.has(r.artifactId));
    if (!crowded) return finish(placed);
    helped.add(crowded.artifactId);
    const roomier = await openBand(current, crowded);
    if (!roomier) return finish(placed);
    current = roomier;
  }
  return finish(await placeArtifactsWith(current, V6_TUNING));
}

const finish = async (xml: string) => tidyFrames(await clearTitleBands(xml));

/** Opens a band of the artifact's height (plus its name) under the row of its first linked node. */
async function openBand(xml: string, choice: ArtifactChoice): Promise<string | null> {
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
  return (await moddle.toXML(defs, { format: false })).xml;
}

function containsPoint(outer: Bounds, inner: Bounds): boolean {
  const cx = inner.x + inner.width / 2; const cy = inner.y + inner.height / 2;
  return cx >= outer.x && cx <= outer.x + outer.width && cy >= outer.y && cy <= outer.y + outer.height;
}
