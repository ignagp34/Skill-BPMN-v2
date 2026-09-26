// Is the semantic part of two BPMN files the same? Everything except BPMN DI
// (bpmndi:BPMNDiagram) is compared in a canonical form: namespace prefixes and
// xmlns declarations ignored, attributes sorted, text trimmed and children
// compared as a set. Order carries no meaning in the semantic part of a BPMN
// file (flow elements, lane refs, incoming/outgoing), and bpmn-js re-appends a
// moved shape at the end of its process.
import { parseXml } from '../../../../tools/layout-lab/lib/xml.mjs';

function canonical(element) {
  const attrs = Object.entries(element.attrs)
    .filter(([name]) => name !== 'xmlns' && !name.startsWith('xmlns:'))
    .sort(([a], [b]) => a.localeCompare(b));
  const children = element.children.filter(child => child.local !== 'BPMNDiagram').map(canonical)
    .map(child => [JSON.stringify(child), child]).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([, child]) => child);
  return { local: element.local, attrs, text: element.text.trim(), children };
}

function definitionsOf(xml) {
  const definitions = parseXml(xml).children.find(c => c.local === 'definitions');
  if (!definitions) throw new Error('Not a BPMN file: no definitions element.');
  return canonical(definitions);
}

const describe = node => `${node.local}${node.attrs.find(([k]) => k === 'id')?.[1] ? `#${node.attrs.find(([k]) => k === 'id')[1]}` : ''}`;

/** First place where two canonical trees differ, as a path such as definitions > process#P > task#T. */
function firstDifference(a, b, path = []) {
  const here = [...path, describe(a)];
  if (a.local !== b.local) return { path: [...path, `${describe(a)} ≠ ${describe(b)}`].join(' > ') };
  if (JSON.stringify(a.attrs) !== JSON.stringify(b.attrs)) return { path: here.join(' > '), what: 'attributes' };
  if (a.text !== b.text) return { path: here.join(' > '), what: 'text' };
  for (let i = 0; i < Math.max(a.children.length, b.children.length); i += 1) {
    if (!a.children[i] || !b.children[i]) return { path: here.join(' > '), what: 'children' };
    const diff = firstDifference(a.children[i], b.children[i], here);
    if (diff) return diff;
  }
  return null;
}

/** { identical, difference } where difference locates the first semantic change (null when identical). */
export function compareSemantics(baseXml, otherXml) {
  const difference = firstDifference(definitionsOf(baseXml), definitionsOf(otherXml));
  return { identical: difference === null, difference };
}
