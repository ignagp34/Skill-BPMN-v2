import BpmnModdle from "bpmn-moddle";

import { type Bounds, overlaps, type Pt, segmentHitsBox, segmentsOf, textWidth, wrapText } from "../shared/label-geometry.ts";
import { placeArtifacts as placeArtifactsV7 } from "../v7/frames.ts";

/**
 * Layout v9 = v7 + proposal G of evidence/layout-review-20260926/REVIEW.md (the
 * user's idea after the v4–v5 vote): an event's name goes above the event when
 * below it collides and above it does not collide as much.
 *
 * bpmn-js draws an event name without DI label under the event, top-aligned at
 * its bottom edge, wrapped at 90 px in 11 px Arial. This final pass measures that
 * text (canvas in the harness page), counts what the box below would cover
 * (shapes, sequence flows, associations, other labels; message flows are hidden in
 * what the user receives, so they do not count) and, when the box above covers
 * strictly less and stays inside the event's lane, writes an explicit DI label
 * above. Boundary events keep their label (above would sit on the host task).
 */
const LABEL_W = 90;       // bpmn-js DEFAULT_LABEL_SIZE.width: wrapping box
const LINE_H = 13;        // 11 px Arial line, measured in the bench text boxes
const FONT = "11px Arial, sans-serif";
const GAP_ABOVE = 3;      // free space between the text and the event's top
const PAD = 1;            // collision tolerance
const CHAR_W = 6;         // fallback estimate without a canvas
const EVENT = /^bpmn:(StartEvent|EndEvent|IntermediateCatchEvent|IntermediateThrowEvent)$/;
const DEFAULT_BELOW = /^bpmn:(StartEvent|EndEvent|IntermediateCatchEvent|IntermediateThrowEvent|BoundaryEvent|\w*Gateway|DataObjectReference|DataStoreReference)$/;
const COUNTED_EDGES = new Set(["bpmn:SequenceFlow", "bpmn:Association", "bpmn:DataInputAssociation", "bpmn:DataOutputAssociation"]);
const CONTAINERS = new Set(["bpmn:Participant", "bpmn:Lane"]);

export async function placeArtifacts(layoutXml: string): Promise<string> {
  return raiseEventLabels(await placeArtifactsV7(layoutXml));
}

export function raiseEventLabels(xml: string): Promise<string> {
  return raiseLabels(xml, EVENT);
}

/**
 * The same pass for any element type whose name bpmn-js draws below it without a
 * DI label (v16 uses it for data objects and stores). `raised` picks the elements.
 */
export async function raiseLabels(xml: string, raised: RegExp): Promise<string> {
  const moddle = new BpmnModdle();
  const { rootElement } = await moddle.fromXML(xml);
  const defs = rootElement as any;
  const planeElements: any[] = defs.diagrams?.[0]?.plane?.planeElement ?? [];
  const shapes = planeElements.filter((el) => el.$type === "bpmndi:BPMNShape" && el.bounds && el.bpmnElement);
  const flowShapes = shapes.filter((el) => !CONTAINERS.has(el.bpmnElement.$type));
  const containers = shapes.filter((el) => CONTAINERS.has(el.bpmnElement.$type)).map((el) => el.bounds as Bounds);
  const segments: Array<[Pt, Pt]> = planeElements
    .filter((el) => el.$type === "bpmndi:BPMNEdge" && COUNTED_EDGES.has(el.bpmnElement?.$type))
    .flatMap((el) => pairs(el.waypoint ?? []));

  // Current text box of every labelled element: its DI label or bpmn-js's default below.
  const labelBox = new Map<string, Bounds>();
  for (const el of planeElements) {
    const ref = el.bpmnElement;
    if (!ref?.name || ref.$type === "bpmn:MessageFlow") continue;
    if (el.label?.bounds) labelBox.set(ref.id, el.label.bounds);
    else if (el.$type === "bpmndi:BPMNShape" && DEFAULT_BELOW.test(ref.$type)) labelBox.set(ref.id, textBelow(el.bounds, ref.name));
  }

  let changed = false;
  for (const el of flowShapes) {
    const ref = el.bpmnElement;
    if (!raised.test(ref.$type) || !ref.name || el.label?.bounds) continue;
    const shape = el.bounds as Bounds;
    const below = labelBox.get(ref.id)!;
    const above = { ...below, y: shape.y - GAP_ABOVE - below.height };
    const lane = smallestContaining(containers, shape);
    if (lane && !inside(above, lane)) continue;
    const hits = (box: Bounds) => collisions(box, ref.id, flowShapes, segments, labelBox);
    const hitsBelow = hits(below);
    if (hitsBelow === 0 || hits(above) >= hitsBelow) continue;
    el.label = moddle.create("bpmndi:BPMNLabel", { bounds: moddle.create("dc:Bounds", roundBox(labelBounds(shape, above))) });
    labelBox.set(ref.id, above);
    changed = true;
  }
  return changed ? (await moddle.toXML(defs, { format: false })).xml : xml;
}

/** Box of the wrapped text bpmn-js draws under a shape (top-aligned at its bottom, centred). */
function textBelow(shape: Bounds, name: string): Bounds {
  const lines = wrap(String(name));
  const width = Math.min(LABEL_W, Math.max(...lines.map(measure)));
  return { x: shape.x + shape.width / 2 - width / 2, y: shape.y + shape.height, width, height: lines.length * LINE_H };
}

/** DI label bounds that make bpmn-js draw the text at `text`: the 90 px wrapping box, same top. */
const labelBounds = (shape: Bounds, text: Bounds): Bounds =>
  ({ x: shape.x + shape.width / 2 - LABEL_W / 2, y: text.y, width: LABEL_W, height: text.height });

const measure = (text: string) => textWidth(text, FONT, CHAR_W);
const wrap = (text: string) => wrapText(text, LABEL_W, FONT, CHAR_W);

function collisions(box: Bounds, ownId: string, shapes: any[], segments: Array<[Pt, Pt]>, labels: Map<string, Bounds>): number {
  const own = shapes.find((s) => s.bpmnElement.id === ownId);
  let n = 0;
  for (const s of shapes) {
    if (s === own || s.bpmnElement.attachedToRef?.id === ownId) continue;
    if (overlap(box, s.bounds)) n += 1;
  }
  for (const [a, b] of segments) if (segmentHits(a, b, box)) n += 1;
  for (const [id, other] of labels) if (id !== ownId && overlap(box, other)) n += 1;
  return n;
}

function smallestContaining(containers: Bounds[], shape: Bounds): Bounds | undefined {
  const c = { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2 };
  return containers.filter((b) => c.x >= b.x && c.x <= b.x + b.width && c.y >= b.y && c.y <= b.y + b.height)
    .sort((a, b) => a.width * a.height - b.width * b.height)[0];
}

const inside = (a: Bounds, b: Bounds) => a.x >= b.x && a.y >= b.y && a.x + a.width <= b.x + b.width && a.y + a.height <= b.y + b.height;
const overlap = (a: Bounds, b: Bounds) => overlaps(a, b, PAD);
const pairs = segmentsOf;
const roundBox = (b: Bounds): Bounds => ({ x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height) });

const segmentHits = (a: Pt, b: Pt, r: Bounds) => segmentHitsBox(a, b, r, PAD);
