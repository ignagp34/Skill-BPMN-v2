// Plane geometry for layout metrics. Rects: { x, y, width, height }; points: { x, y }.

export const EPS = 1e-6;

export const right = r => r.x + r.width;
export const bottom = r => r.y + r.height;
export const center = r => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
export const area = r => Math.max(0, r.width) * Math.max(0, r.height);

export function inset(r, d) {
  return { x: r.x + d, y: r.y + d, width: r.width - 2 * d, height: r.height - 2 * d };
}

export function intersection(a, b) {
  const x = Math.max(a.x, b.x); const y = Math.max(a.y, b.y);
  const w = Math.min(right(a), right(b)) - x; const h = Math.min(bottom(a), bottom(b)) - y;
  return w > 0 && h > 0 ? { x, y, width: w, height: h } : null;
}

export const overlapArea = (a, b) => { const i = intersection(a, b); return i ? area(i) : 0; };

/** a fully inside b, with a tolerance. */
export const contains = (b, a, tol = 0) => a.x >= b.x - tol && a.y >= b.y - tol
  && right(a) <= right(b) + tol && bottom(a) <= bottom(b) + tol;

export function union(rects) {
  const list = rects.filter(Boolean);
  if (!list.length) return null;
  const x = Math.min(...list.map(r => r.x)); const y = Math.min(...list.map(r => r.y));
  return { x, y, width: Math.max(...list.map(right)) - x, height: Math.max(...list.map(bottom)) - y };
}

export function segments(points) {
  const out = [];
  for (let i = 1; i < points.length; i += 1) out.push([points[i - 1], points[i]]);
  return out.filter(([p, q]) => Math.hypot(q.x - p.x, q.y - p.y) > EPS);
}

export const segmentLength = ([p, q]) => Math.hypot(q.x - p.x, q.y - p.y);
export const polylineLength = points => segments(points).reduce((s, seg) => s + segmentLength(seg), 0);

const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

/** Proper crossing: the interiors intersect at a single point (touching ends and collinear overlaps excluded). */
export function segmentsCross([p1, p2], [q1, q2]) {
  const d1 = cross(q1, q2, p1); const d2 = cross(q1, q2, p2);
  const d3 = cross(p1, p2, q1); const d4 = cross(p1, p2, q2);
  return ((d1 > EPS && d2 < -EPS) || (d1 < -EPS && d2 > EPS)) && ((d3 > EPS && d4 < -EPS) || (d3 < -EPS && d4 > EPS));
}

/** Length shared by two collinear axis-parallel segments (0 otherwise). */
export function collinearOverlap([p1, p2], [q1, q2], tol = 0.5) {
  const horizontal = s => Math.abs(s[0].y - s[1].y) < tol;
  const vertical = s => Math.abs(s[0].x - s[1].x) < tol;
  const span = (a, b) => [Math.min(a, b), Math.max(a, b)];
  if (horizontal([p1, p2]) && horizontal([q1, q2]) && Math.abs(p1.y - q1.y) < tol) {
    const [a0, a1] = span(p1.x, p2.x); const [b0, b1] = span(q1.x, q2.x);
    return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
  }
  if (vertical([p1, p2]) && vertical([q1, q2]) && Math.abs(p1.x - q1.x) < tol) {
    const [a0, a1] = span(p1.y, p2.y); const [b0, b1] = span(q1.y, q2.y);
    return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
  }
  return 0;
}

/** Liang–Barsky: does the segment pass through the (open) interior of r? */
export function segmentHitsRect([p, q], r) {
  if (r.width <= 0 || r.height <= 0) return false;
  const dx = q.x - p.x; const dy = q.y - p.y;
  let t0 = 0; let t1 = 1;
  const clip = (pp, qq) => {
    if (Math.abs(pp) < EPS) return qq > EPS;
    const t = qq / pp;
    if (pp < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
    return true;
  };
  return clip(-dx, p.x - r.x) && clip(dx, right(r) - p.x) && clip(-dy, p.y - r.y) && clip(dy, bottom(r) - p.y) && t1 - t0 > EPS;
}

export function rectDistance(a, b) {
  const dx = Math.max(0, a.x - right(b), b.x - right(a));
  const dy = Math.max(0, a.y - bottom(b), b.y - bottom(a));
  return Math.hypot(dx, dy);
}

function pointSegmentDistance(pt, [p, q]) {
  const dx = q.x - p.x; const dy = q.y - p.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 < EPS ? 0 : Math.max(0, Math.min(1, ((pt.x - p.x) * dx + (pt.y - p.y) * dy) / len2));
  return Math.hypot(pt.x - (p.x + t * dx), pt.y - (p.y + t * dy));
}

/** Distance from a rect to a polyline (0 when they touch). */
export function rectPolylineDistance(r, points) {
  const segs = segments(points);
  if (segs.some(s => segmentHitsRect(s, r))) return 0;
  const corners = [{ x: r.x, y: r.y }, { x: right(r), y: r.y }, { x: r.x, y: bottom(r) }, { x: right(r), y: bottom(r) }];
  let best = Infinity;
  for (const s of segs) {
    for (const c of corners) best = Math.min(best, pointSegmentDistance(c, s));
    for (const p of s) best = Math.min(best, rectDistance(r, { x: p.x, y: p.y, width: 0, height: 0 }));
  }
  return best;
}

export const mean = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
export function stdev(xs) {
  const m = mean(xs);
  return xs.length > 1 ? Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length) : 0;
}
export const coefficientOfVariation = xs => (xs.length > 1 && mean(xs) > 0 ? stdev(xs) / mean(xs) : 0);
export function median(xs) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
