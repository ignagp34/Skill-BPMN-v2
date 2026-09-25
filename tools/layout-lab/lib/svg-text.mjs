// Real text boxes of an exported SVG, measured by Chromium with the same fonts
// used to rasterise the PNG. Output: [{ id, label, text, x, y, width, height }]
// in diagram (SVG user) coordinates; `label` is true for external labels
// (bpmn-js "<id>_label" elements), false for text drawn inside a shape.

/** Runs in the page; must stay self-contained. */
function measureInPage() {
  const svg = document.querySelector('svg');
  const toUser = svg.getScreenCTM().inverse();
  const boxes = [];
  for (const element of svg.querySelectorAll('[data-element-id]')) {
    const visual = element.querySelector(':scope > .djs-visual');
    if (!visual) continue;
    const id = element.getAttribute('data-element-id');
    for (const text of visual.querySelectorAll('text')) {
      if (!text.textContent.trim()) continue;
      const b = text.getBBox();
      const m = toUser.multiply(text.getScreenCTM());
      const corners = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]]
        .map(([x, y]) => new DOMPoint(x, y).matrixTransform(m));
      const xs = corners.map(p => p.x); const ys = corners.map(p => p.y);
      const x = Math.min(...xs); const y = Math.min(...ys);
      boxes.push({ id: id.replace(/_label$/, ''), label: id.endsWith('_label'), text: text.textContent,
        x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y });
    }
  }
  const [vx, vy, vw, vh] = svg.getAttribute('viewBox').split(/\s+/).map(Number);
  return { viewBox: { x: vx, y: vy, width: vw, height: vh }, boxes };
}

export async function measureSvgText(session, svg) {
  const markup = svg.slice(svg.indexOf('<svg'));
  return session.withPage(async page => {
    await page.setContent(`<!doctype html><html><body style="margin:0">${markup}</body></html>`);
    return page.evaluate(measureInPage);
  });
}
