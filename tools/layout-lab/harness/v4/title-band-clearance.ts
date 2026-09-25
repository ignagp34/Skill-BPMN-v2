import BpmnModdle from "bpmn-moddle";

import { placeArtifacts as placeArtifactsV0 } from "../../../../packages/bpmn-core/src/render/artifacts.js";

/**
 * Layout v4 = v2 + idea E1 of plans/layout-iteracion-1.md: nothing on the
 * pool/lane title bands.
 *
 * The first element of a lane sits POOL_PAD_X (30 px) after the lane's title
 * band, so its external label (centred under it, up to 90 px wide in bpmn-js)
 * and artifacts placed by placeArtifacts spill onto the band. After the last
 * layout phase this pass measures the deepest intrusion into any band and
 * widens every pool and lane frame to the left by that amount. Nothing else
 * moves: shapes, labels, sequence and message flow routes keep their
 * coordinates, and all frames keep a common left edge.
 */
const TITLE_BAND = 30;            // bpmn-js header strip of a horizontal pool/lane
const MARGIN = 6;                 // free space kept between a band and the content
const EXTERNAL_LABEL_MAX_W = 90;  // bpmn-js default width of an external label
const CHAR_W = 6;                 // same estimate as render/labels.ts

// Elements whose name bpmn-js draws as an external label under the shape.
const EXTERNAL_LABEL = /^bpmn:(StartEvent|EndEvent|IntermediateCatchEvent|IntermediateThrowEvent|BoundaryEvent|\w*Gateway|DataObjectReference|DataStoreReference)$/;
const FRAME_TYPES = new Set(["bpmn:Participant", "bpmn:Lane"]);

interface Bounds { x: number; y: number; width: number; height: number; }

export async function placeArtifacts(layoutXml: string): Promise<string> {
  return clearTitleBands(await placeArtifactsV0(layoutXml));
}

async function clearTitleBands(xml: string): Promise<string> {
  const moddle = new BpmnModdle();
  const { rootElement } = await moddle.fromXML(xml);
  const defs = rootElement as any;
  const planeElements: any[] = defs.diagrams?.[0]?.plane?.planeElement ?? [];

  const frames = planeElements.filter((el) => el.$type === "bpmndi:BPMNShape" && FRAME_TYPES.has(el.bpmnElement?.$type));
  if (frames.length === 0) return xml;

  let dx = 0;
  for (const left of leftEdges(planeElements)) {
    for (const frame of frames.map((f) => f.bounds as Bounds)) {
      if (!insideFrame(left, frame)) continue;
      dx = Math.max(dx, frame.x + TITLE_BAND + MARGIN - left.x);
    }
  }
  dx = Math.ceil(dx);
  if (dx <= 0) return xml;

  for (const frame of frames) {
    frame.bounds.x -= dx;
    frame.bounds.width += dx;
  }
  return (await moddle.toXML(defs, { format: false })).xml;
}

/** Left end (x) and vertical centre (y) of every shape, DI label and estimated external label. */
function leftEdges(planeElements: any[]): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = [];
  for (const el of planeElements) {
    const ref = el.bpmnElement;
    if (!ref || FRAME_TYPES.has(ref.$type)) continue;
    const label = el.label?.bounds as Bounds | undefined;
    if (label) out.push({ x: label.x, y: label.y + label.height / 2 });
    if (el.$type !== "bpmndi:BPMNShape" || !el.bounds) continue;
    const b = el.bounds as Bounds;
    out.push({ x: b.x, y: b.y + b.height / 2 });
    if (!label && ref.name && EXTERNAL_LABEL.test(ref.$type)) {
      const width = Math.min(EXTERNAL_LABEL_MAX_W, String(ref.name).length * CHAR_W);
      out.push({ x: b.x + b.width / 2 - width / 2, y: b.y + b.height });
    }
  }
  return out;
}

/**
 * The point is at the frame's height and not right of it. Points left of the
 * frame's outer edge count too: widening the frame brings them inside.
 */
function insideFrame(p: { x: number; y: number }, f: Bounds): boolean {
  return p.y >= f.y && p.y <= f.y + f.height && p.x < f.x + f.width;
}
