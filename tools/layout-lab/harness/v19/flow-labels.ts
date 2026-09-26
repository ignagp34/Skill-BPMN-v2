import BpmnModdle from "bpmn-moddle";

import { type Bounds, overlaps, type Pt, segmentHitsBox, segmentsOf, textWidth, wrapText } from "../shared/label-geometry.ts";
import { placeArtifacts as placeArtifactsV16 } from "../v16/data-labels.ts";

/**
 * Layout v19 = v16 + proposal H (the user's note on c-syn015-chatgpt, 2026-09-26):
 * a flow label («Critical risk», «Above budget»…) must not run into a task; it
 * is moved back along its line according to the real length of its text.
 *
 * v0's placeLabels sizes a flow label with 6 px per character and anchors it at
 * 75 % of the flow's last straight stretch, so near the end of a short stretch it
 * lands on the target task. bpmn-js draws the text centred on its DI box, top
 * aligned, in 11 px Arial wrapped at 90 px. This final pass measures that text
 * and, when it covers a shape, slides the label along the stretch it belongs to
 * (and tries the other side of the line), keeping its centre on the stretch. The
 * spot that covers the fewest shapes, then labels, then lines, then moves least
 * wins; a label that cannot cover fewer shapes stays where it was.
 */
const FONT = "11px Arial, sans-serif";
const WRAP_W = 90;          // bpmn-js external label wrapping box
const LINE_H = 12;          // measured text box height per line (text-boxes.json)
const CHAR_W = 6;           // estimate without a canvas
const OFFSET = 8;           // v0's EDGE_LABEL_OFFSET: gap between a line and its label
const STEP = 2;             // slide step along the stretch
const PAD = 1;              // collision tolerance
const MARGIN = 4;           // free space wanted between the text and a shape
const MIN_STRETCH = 8;      // shorter stretches cannot carry a label
const COST = { shape: 1000, label: 100, line: 10, sideChange: 5, perPx: 0.01 };
const NOT_OBSTACLES = new Set(["bpmn:Participant", "bpmn:Lane", "bpmn:TextAnnotation"]);

interface Stretch { a: Pt; b: Pt; horizontal: boolean; }

export async function placeArtifacts(layoutXml: string): Promise<string> {
  return nudgeFlowLabels(await placeArtifactsV16(layoutXml));
}

export async function nudgeFlowLabels(xml: string): Promise<string> {
  const moddle = new BpmnModdle();
  const { rootElement } = await moddle.fromXML(xml);
  const defs = rootElement as any;
  const planeElements: any[] = defs.diagrams?.[0]?.plane?.planeElement ?? [];
  const shapes: Bounds[] = planeElements
    .filter((el) => el.$type === "bpmndi:BPMNShape" && el.bounds && !NOT_OBSTACLES.has(el.bpmnElement?.$type))
    .map((el) => el.bounds);
  const edges = planeElements.filter((el) => el.$type === "bpmndi:BPMNEdge");
  const labelled = edges.filter((el) => el.bpmnElement?.$type === "bpmn:SequenceFlow" && el.bpmnElement.name?.trim()
    && el.label?.bounds && (el.waypoint?.length ?? 0) >= 2);

  // Text box of every DI label (flow labels as bpmn-js draws them, others as declared).
  const textBox = new Map<any, Bounds>();
  for (const el of planeElements) {
    if (!el.label?.bounds) continue;
    textBox.set(el, labelled.includes(el) ? drawnText(el.label.bounds, el.bpmnElement.name) : el.label.bounds);
  }

  let changed = false;
  for (const edge of labelled) {
    const name = String(edge.bpmnElement.name);
    const di = edge.label.bounds as Bounds;
    const current = textBox.get(edge)!;
    const others = [...textBox].filter(([el]) => el !== edge).map(([, box]) => box);
    const lines = edges.filter((el) => el !== edge).flatMap((el) => segmentsOf(el.waypoint ?? []));
    const cost = (box: Bounds) => shapes.filter((s) => overlaps(grow(box, MARGIN), s, PAD)).length * COST.shape
      + others.filter((o) => overlaps(box, o, PAD)).length * COST.label
      + lines.filter(([a, b]) => segmentHitsBox(a, b, box, PAD)).length * COST.line;
    const currentCost = cost(current);
    if (currentCost < COST.shape) continue;

    const stretch = nearestStretch(edge.waypoint, current);
    if (!stretch) continue;
    let best = { box: current, score: currentCost };
    for (const candidate of spotsAlong(stretch, current)) {
      const score = cost(candidate.box) + (candidate.sideChanged ? COST.sideChange : 0)
        + (Math.abs(candidate.box.x - current.x) + Math.abs(candidate.box.y - current.y)) * COST.perPx;
      if (score < best.score) best = { box: candidate.box, score };
    }
    if (best.box === current || Math.floor(cost(best.box) / COST.shape) >= Math.floor(currentCost / COST.shape)) continue;
    // Move the DI box so bpmn-js draws the text at the chosen spot (same size, same centre offset).
    di.x = Math.round(best.box.x + best.box.width / 2 - di.width / 2);
    di.y = Math.round(best.box.y);
    textBox.set(edge, drawnText(di, name));
    changed = true;
  }
  return changed ? (await moddle.toXML(defs, { format: false })).xml : xml;
}

/** The text box bpmn-js draws for a DI label box: centred, top aligned, wrapped at WRAP_W. */
function drawnText(di: Bounds, name: string): Bounds {
  const rows = wrapText(name, WRAP_W, FONT, CHAR_W);
  const width = Math.min(WRAP_W, Math.max(...rows.map((r) => textWidth(r, FONT, CHAR_W))));
  return { x: di.x + di.width / 2 - width / 2, y: di.y, width, height: rows.length * LINE_H };
}

/** The straight stretch of the flow nearest to the label's centre. */
function nearestStretch(points: Pt[], box: Bounds): Stretch | undefined {
  const c = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  let best: Stretch | undefined; let bestD = Infinity;
  for (const [a, b] of segmentsOf(points)) {
    const horizontal = Math.abs(a.y - b.y) <= 1; const vertical = Math.abs(a.x - b.x) <= 1;
    if (!horizontal && !vertical) continue;
    if (Math.abs(horizontal ? b.x - a.x : b.y - a.y) < MIN_STRETCH) continue;
    const d = horizontal
      ? Math.abs(c.y - a.y) + Math.max(0, Math.min(a.x, b.x) - c.x, c.x - Math.max(a.x, b.x))
      : Math.abs(c.x - a.x) + Math.max(0, Math.min(a.y, b.y) - c.y, c.y - Math.max(a.y, b.y));
    if (d < bestD) { bestD = d; best = { a, b, horizontal }; }
  }
  return best;
}

/** Text positions beside the stretch, on both sides, with the centre anywhere on it. */
function* spotsAlong(s: Stretch, text: Bounds): Generator<{ box: Bounds; sideChanged: boolean }> {
  const { width: w, height: h } = text;
  if (s.horizontal) {
    const y = s.a.y; const lo = Math.min(s.a.x, s.b.x); const hi = Math.max(s.a.x, s.b.x);
    const above = text.y + h / 2 < y;
    for (const side of [true, false]) {
      const top = side ? y - OFFSET - h : y + OFFSET;
      for (let cx = lo; cx <= hi; cx += STEP) yield { box: { x: cx - w / 2, y: top, width: w, height: h }, sideChanged: side !== above };
    }
  } else {
    const x = s.a.x; const lo = Math.min(s.a.y, s.b.y); const hi = Math.max(s.a.y, s.b.y);
    const right = text.x + w / 2 > x;
    for (const side of [true, false]) {
      const left = side ? x + OFFSET : x - OFFSET - w;
      for (let cy = lo; cy <= hi; cy += STEP) yield { box: { x: left, y: cy - h / 2, width: w, height: h }, sideChanged: side !== right };
    }
  }
}

const grow = (b: Bounds, m: number): Bounds => ({ x: b.x - m, y: b.y - m, width: b.width + 2 * m, height: b.height + 2 * m });
