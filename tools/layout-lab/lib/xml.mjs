// Minimal XML reader for the BPMN files the engine writes (no CDATA, DTDs or
// processing instructions beyond the prolog). Zero dependencies, deterministic.
// Elements: { name, local, attrs, children, text }.

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

export function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (match, code) => {
    if (code[0] !== '#') return ENTITIES[code] ?? match;
    return String.fromCodePoint(code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1)));
  });
}

const TOKEN = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[([\s\S]*?)\]\]>|<(\/?)([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
const ATTR = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

const localName = name => name.slice(name.indexOf(':') + 1);

export function parseXml(xml) {
  const root = { name: '#document', local: '#document', attrs: {}, children: [], text: '' };
  const stack = [root];
  for (const m of xml.matchAll(TOKEN)) {
    const top = stack.at(-1);
    if (m[1] !== undefined) { top.text += m[1]; continue; }
    if (m[6] !== undefined) { top.text += decodeEntities(m[6]); continue; }
    if (!m[3]) continue; // comment or processing instruction
    const [, , closing, name, rawAttrs, selfClosing] = m;
    if (closing) {
      if (top.name !== name) throw new Error(`Malformed XML: </${name}> closes <${top.name}>`);
      stack.pop();
      continue;
    }
    const attrs = {};
    for (const a of rawAttrs.matchAll(ATTR)) attrs[a[1]] = decodeEntities(a[2] ?? a[3]);
    const element = { name, local: localName(name), attrs, children: [], text: '' };
    top.children.push(element);
    if (!selfClosing) stack.push(element);
  }
  if (stack.length !== 1) throw new Error(`Malformed XML: <${stack.at(-1).name}> not closed`);
  return root;
}

/** Depth-first walk; visit(element, parent). */
export function walk(element, visit, parent = null) {
  visit(element, parent);
  for (const child of element.children) walk(child, visit, element);
}

export const childrenNamed = (element, local) => element.children.filter(c => c.local === local);
export const firstChild = (element, local) => element.children.find(c => c.local === local) ?? null;
