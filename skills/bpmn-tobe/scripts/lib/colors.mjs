// Colours of the TO-BE marks, written after the layout: the annotation, its
// association and (config colorTask) the annotated task. Three vocabularies,
// so other modellers read them too:
// - in the DI: BPMN in Color (color:background-color / color:border-color, OMG
//   non-normative) and bpmn.io's bioc:fill / bioc:stroke. bpmn-js draws a text
//   annotation without fill; its bracket and text take the stroke colour.
// - in the semantic element: Bizagi's extension (bizagi:BizagiProperty bgColor,
//   borderColor, textColor), the only one Bizagi Modeler 4.2 reads (checked by
//   exporting a shape coloured by hand, evidence/bpmn-tobe/REPORT.md).
import { taskKind, TOBE_CONFIG } from './config.mjs';

export const COLOR_NS = 'http://www.omg.org/spec/BPMN/non-normative/color/1.0';
export const BIOC_NS = 'http://bpmn.io/schema/bpmn/biocolor/1.0';
export const BIZAGI_NS = 'http://www.bizagi.com/bpmn20';

/** [{ elementId, stroke, fill? }] for the page, from the marks attached in the BPMN. */
export function paintList(attached) {
  const paints = [];
  const kindsOfTask = new Map();
  for (const { mark, annotationId, associationId } of attached) {
    const { stroke, fill } = TOBE_CONFIG.kinds[mark.kind];
    paints.push({ elementId: annotationId, stroke, fill }, { elementId: associationId, stroke });
    kindsOfTask.set(mark.taskId, [...(kindsOfTask.get(mark.taskId) ?? []), mark.kind]);
  }
  if (TOBE_CONFIG.colorTask) {
    for (const [taskId, kinds] of kindsOfTask) {
      const { stroke, fill } = TOBE_CONFIG.kinds[taskKind(kinds)];
      paints.push({ elementId: taskId, stroke, fill });
    }
  }
  return paints;
}

/**
 * Runs inside the harness page (needs DOMParser). Must stay self-contained:
 * Playwright serialises it. Returns { xml, painted, missing }.
 */
export function paintInPage({ xml, paints, colorNs, biocNs, bizagiNs }) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) return { xml, painted: 0, missing: paints.map(p => p.elementId) };
  const root = doc.documentElement;
  const XMLNS = 'http://www.w3.org/2000/xmlns/';
  root.setAttributeNS(XMLNS, 'xmlns:color', colorNs);
  root.setAttributeNS(XMLNS, 'xmlns:bioc', biocNs);
  root.setAttributeNS(XMLNS, 'xmlns:bizagi', bizagiNs);

  const diOf = new Map();
  const semanticOf = new Map();
  for (const el of Array.from(doc.getElementsByTagName('*'))) {
    if (el.localName === 'BPMNShape' || el.localName === 'BPMNEdge') diOf.set(el.getAttribute('bpmnElement'), el);
    else if (el.getAttribute('id') && !el.localName.startsWith('BPMN')) semanticOf.set(el.getAttribute('id'), el);
  }

  /** Bizagi: <extensionElements><bizagi:BizagiExtensions><bizagi:BizagiProperties><bizagi:BizagiProperty …/> first in the element (after documentation). */
  const bizagiColours = (el, properties) => {
    const bpmn = (local) => doc.createElementNS(el.namespaceURI, el.prefix ? `${el.prefix}:${local}` : local);
    let ext = Array.from(el.children).find(c => c.localName === 'extensionElements');
    if (!ext) {
      ext = bpmn('extensionElements');
      const after = Array.from(el.children).filter(c => c.localName === 'documentation').pop();
      el.insertBefore(ext, after ? after.nextSibling : el.firstChild);
    }
    const extensions = doc.createElementNS(bizagiNs, 'bizagi:BizagiExtensions');
    const list = doc.createElementNS(bizagiNs, 'bizagi:BizagiProperties');
    for (const [name, value] of properties) {
      const property = doc.createElementNS(bizagiNs, 'bizagi:BizagiProperty');
      property.setAttribute('name', name);
      property.setAttribute('value', value);
      list.appendChild(property);
    }
    extensions.appendChild(list);
    ext.appendChild(extensions);
  };

  let painted = 0;
  const missing = [];
  for (const { elementId, stroke, fill } of paints) {
    const di = diOf.get(elementId);
    const semantic = semanticOf.get(elementId);
    if (!di || !semantic) { missing.push(elementId); continue; }
    di.setAttributeNS(colorNs, 'color:border-color', stroke);
    di.setAttributeNS(biocNs, 'bioc:stroke', stroke);
    if (fill) {
      di.setAttributeNS(colorNs, 'color:background-color', fill);
      di.setAttributeNS(biocNs, 'bioc:fill', fill);
    }
    bizagiColours(semantic, [...(fill ? [['bgColor', fill]] : []), ['borderColor', stroke], ['textColor', stroke]]);
    painted += 1;
  }
  return { xml: new XMLSerializer().serializeToString(doc), painted, missing };
}
