/**
 * Runs inside the harness page (needs DOMParser): removes the given semantic
 * elements (the TO-BE mark annotations and their associations) and their DI.
 * Must stay self-contained: Playwright serialises it. Returns { xml, removed }.
 */
export function stripElementsInPage({ xml, ids }) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) return { xml, removed: 0 };
  const wanted = new Set(ids);
  let removed = 0;
  for (const el of Array.from(doc.getElementsByTagName('*'))) {
    const own = el.getAttribute('id');
    const ref = el.getAttribute('bpmnElement');
    if ((own && wanted.has(own) && !el.localName.startsWith('BPMN')) || (ref && wanted.has(ref))) {
      if (own && wanted.has(own)) removed += 1;
      el.remove();
    }
  }
  return { xml: new XMLSerializer().serializeToString(doc), removed };
}
