import BpmnModdle from "bpmn-moddle";

import { type Bounds, overlaps, type Pt, segmentHitsBox, segmentsOf, textWidth, wrapText } from "../shared/label-geometry.ts";
import { placeArtifacts as placeArtifactsV20 } from "../v19/flow-labels.ts";

/**
 * Last pass of v21: a boundary event's name beside its exit line.
 *
 * bpmn-js draws a boundary event's name under it, centred. When the event's flow
 * leaves through the bottom face (v21 re-routes flows that used to run along the
 * host's bottom edge), the line goes straight through that text, and no route can
 * avoid it. v9 cannot raise it either (above sits on the host task). So, as in v9,
 * the text box below is measured (11 px Arial, wrapped at 90 px) and, when it
 * collides, the same box is tried to the left and to the right of the event, top
 * at the event's bottom; the side covering strictly less wins.
 */
const LABEL_W = 90;
const LINE_H = 13;
const FONT = "11px Arial, sans-serif";
const CHAR_W = 6;
const GAP = 3;
const PAD = 1;
const COUNTED_EDGES = new Set(["bpmn:SequenceFlow", "bpmn:Association", "bpmn:DataInputAssociation", "bpmn:DataOutputAssociation"]);
const CONTAINERS = new Set(["bpmn:Participant", "bpmn:Lane"]);
const DEFAULT_BELOW = /^bpmn:(StartEvent|EndEvent|IntermediateCatchEvent|IntermediateThrowEvent|BoundaryEvent|\w*Gateway|DataObjectReference|DataStoreReference)$/;

export async function placeArtifacts(layoutXml: string): Promise<string> {
  return sideBoundaryLabels(await placeArtifactsV20(layoutXml));
}

export async function sideBoundaryLabels(xml: string): Promise<string> {
  const moddle = new BpmnModdle();
  const { rootElement } = await moddle.fromXML(xml);
  const defs = rootElement as any;
  const planeElements: any[] = defs.diagrams?.[0]?.plane?.planeElement ?? [];
  const shapes = planeElements.filter((el) => el.$type === "bpmndi:BPMNShape" && el.bounds && el.bpmnElement
    && !CONTAINERS.has(el.bpmnElement.$type));
  const segments: Array<[Pt, Pt]> = planeElements
    .filter((el) => el.$type === "bpmndi:BPMNEdge" && COUNTED_EDGES.has(el.bpmnElement?.$type))
    .flatMap((el) => segmentsOf(el.waypoint ?? []));
  const labelBox = new Map<string, Bounds>();
  for (const el of planeElements) {
    const ref = el.bpmnElement;
    if (!ref?.name || ref.$type === "bpmn:MessageFlow") continue;
    if (el.label?.bounds) labelBox.set(ref.id, el.label.bounds);
    else if (el.$type === "bpmndi:BPMNShape" && DEFAULT_BELOW.test(ref.$type)) labelBox.set(ref.id, textBelow(el.bounds, ref.name));
  }

  let changed = false;
  for (const el of shapes) {
    const ref = el.bpmnElement;
    if (ref.$type !== "bpmn:BoundaryEvent" || !ref.name || el.label?.bounds) continue;
    const event = el.bounds as Bounds;
    const below = labelBox.get(ref.id)!;
    const hits = (box: Bounds) => {
      let n = 0;
      for (const s of shapes) if (s !== el && overlaps(box, s.bounds, PAD)) n += 1;
      for (const [a, b] of segments) if (segmentHitsBox(a, b, box, PAD)) n += 1;
      for (const [id, other] of labelBox) if (id !== ref.id && overlaps(box, other, PAD)) n += 1;
      return n;
    };
    const hitsBelow = hits(below);
    if (hitsBelow === 0) continue;
    const sides = [
      { ...below, x: event.x - GAP - below.width },
      { ...below, x: event.x + event.width + GAP },
    ].map((box) => ({ box, n: hits(box) })).sort((a, b) => a.n - b.n);
    if (sides[0].n >= hitsBelow) continue;
    const text = sides[0].box;
    el.label = moddle.create("bpmndi:BPMNLabel", { bounds: moddle.create("dc:Bounds", roundBox(
      { x: text.x + text.width / 2 - LABEL_W / 2, y: text.y, width: LABEL_W, height: text.height })) });
    labelBox.set(ref.id, text);
    changed = true;
  }
  return changed ? (await moddle.toXML(defs, { format: false })).xml : xml;
}

/** Box of the wrapped text bpmn-js draws under a shape (top-aligned at its bottom, centred). */
function textBelow(shape: Bounds, name: string): Bounds {
  const lines = wrapText(String(name), LABEL_W, FONT, CHAR_W);
  const width = Math.min(LABEL_W, Math.max(...lines.map((l) => textWidth(l, FONT, CHAR_W))));
  return { x: shape.x + shape.width / 2 - width / 2, y: shape.y + shape.height, width, height: lines.length * LINE_H };
}

const roundBox = (b: Bounds): Bounds => ({ x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height) });
