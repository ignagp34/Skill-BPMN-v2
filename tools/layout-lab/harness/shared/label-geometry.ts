// Text and collision helpers shared by the label passes of the layout candidates
// (v9 event names, v16 data names, v19 flow labels). Text is measured with a
// canvas in the harness page, as bpmn-js draws it; without a canvas (tests) a
// per-character estimate is used.

export interface Bounds { x: number; y: number; width: number; height: number; }
export interface Pt { x: number; y: number; }

const contexts = new Map<string, CanvasRenderingContext2D | null>();

/** Width of `text` in `font`; `charW` per character when there is no canvas. */
export function textWidth(text: string, font: string, charW: number): number {
  let context = contexts.get(font);
  if (context === undefined) {
    context = typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
    if (context) context.font = font;
    contexts.set(font, context);
  }
  return context ? context.measureText(text).width : text.length * charW;
}

/** Greedy word wrap at `maxWidth`, as bpmn-js does; a word longer than the box is its own line. */
export function wrapText(text: string, maxWidth: number, font: string, charW: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && textWidth(candidate, font, charW) > maxWidth) { lines.push(line); line = word; } else line = candidate;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

/** Interiors overlap by more than `pad` on both axes. */
export const overlaps = (a: Bounds, b: Bounds, pad: number) => a.x < b.x + b.width - pad && b.x < a.x + a.width - pad
  && a.y < b.y + b.height - pad && b.y < a.y + a.height - pad;

export const segmentsOf = (points: Pt[]): Array<[Pt, Pt]> => points.slice(1).map((p, i) => [points[i], p]);

/** Segment vs rectangle interior shrunk by `pad` (Liang–Barsky clip). */
export function segmentHitsBox(a: Pt, b: Pt, r: Bounds, pad: number): boolean {
  const x0 = r.x + pad; const y0 = r.y + pad; const x1 = r.x + r.width - pad; const y1 = r.y + r.height - pad;
  if (x1 <= x0 || y1 <= y0) return false;
  let t0 = 0; let t1 = 1; const dx = b.x - a.x; const dy = b.y - a.y;
  for (const [p, q] of [[-dx, a.x - x0], [dx, x1 - a.x], [-dy, a.y - y0], [dy, y1 - a.y]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const t = q / p;
    if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
  }
  return t0 < t1;
}
