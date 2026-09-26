// Checks on the harness output: each deliverable individually, and that the
// three belong to the same render.
import { STATUS } from './status.mjs';

const PNG_SIGNATURE = Buffer.from('89504e470d0a1a0a', 'hex');

const matchAll = (text, pattern) => [...(text ?? '').matchAll(pattern)].map(m => m[1]);
const count = (text, pattern) => (text?.match(pattern) ?? []).length;

/** Same precedence as exporters.ts readSvgDimensions: viewBox, then width/height. */
function svgSize(svg) {
  const viewBox = svg?.match(/<svg\b[^>]*\bviewBox="([^"]+)"/)?.[1]?.trim().split(/\s+/).map(Number);
  if (viewBox?.length === 4 && viewBox.every(Number.isFinite)) return { width: viewBox[2], height: viewBox[3] };
  const attribute = name => Number(svg?.match(new RegExp(`<svg\\b[^>]*\\b${name}="([\\d.]+)"`))?.[1]);
  return { width: attribute('width'), height: attribute('height') };
}

function pngSize(png) {
  const valid = !!png && png.length > 24 && png.subarray(0, 8).equals(PNG_SIGNATURE);
  return valid ? { valid, width: png.readUInt32BE(16), height: png.readUInt32BE(20) } : { valid, width: null, height: null };
}

export function inspectArtifacts(output) {
  const layoutXml = output.layoutXml ?? null;
  const svg = output.svg ?? null;
  const png = output.pngBase64 ? Buffer.from(output.pngBase64, 'base64') : null;

  const diIds = new Set(matchAll(layoutXml, /<bpmndi:BPMN(?:Shape|Edge)\b[^>]*\bbpmnElement="([^"]+)"/g));
  // No filtering of "*_label" ids: a real element can end in "_label" (e.g. "Print visit label").
  const svgIds = new Set(matchAll(svg, /data-element-id="([^"]+)"/g));
  const missingInSvg = [...diIds].filter(id => !svgIds.has(id));
  const svgDims = svgSize(svg);
  const pngDims = pngSize(png);

  const checks = {
    bpmn: !!layoutXml && /<bpmndi:BPMNDiagram\b/.test(layoutXml) && diIds.size > 0,
    bpmnShapes: count(layoutXml, /<bpmndi:BPMNShape\b/g),
    bpmnEdges: count(layoutXml, /<bpmndi:BPMNEdge\b/g),
    svg: !!svg && /<svg[\s>]/.test(svg) && svgDims.width > 0 && svgDims.height > 0,
    svgWidth: svgDims.width || null,
    svgHeight: svgDims.height || null,
    png: pngDims.valid && pngDims.width > 0 && pngDims.height > 0,
    pngWidth: pngDims.width,
    pngHeight: pngDims.height,
    // Same run: every DI element is drawn in the SVG, and the PNG is that SVG
    // rasterised (the harness sizes the canvas with Math.ceil of the SVG size).
    svgMatchesBpmn: !!svg && diIds.size > 0 && missingInSvg.length === 0,
    pngMatchesSvg: pngDims.valid && pngDims.width === Math.ceil(svgDims.width) && pngDims.height === Math.ceil(svgDims.height),
    missingInSvg: missingInSvg.slice(0, 20),
  };
  return { layoutXml, svg, png, checks };
}

export function classifyRender(output, { checks }, reimported) {
  if (!output.succeeded) return output.status; // parser_error / semantic_error / render_error
  const complete = checks.bpmn && checks.svg && checks.png && checks.svgMatchesBpmn && checks.pngMatchesSvg && reimported === true;
  return complete ? output.status : STATUS.PARTIAL_EXPORT;
}

export function extractDiagnostics(resultJson) {
  try {
    return (JSON.parse(resultJson).diagnostics ?? []).map(({ severity, category, code, message, line, column }) =>
      ({ severity, category, code, message, line, column }));
  } catch {
    return [];
  }
}

/** Files of one attempt; a deliverable is null unless it passed its own check. */
export function attemptFiles(output, inspected, reimported) {
  const { checks } = inspected;
  return {
    'normalized.dsl': output.normalizedDsl,
    'result.json': output.resultJson,
    'semantic.bpmn': JSON.parse(output.resultJson).semanticXml ?? null,
    'diagram.bpmn': checks.bpmn && reimported === true ? inspected.layoutXml : null,
    'diagram.svg': checks.svg ? inspected.svg : null,
    'diagram.png': checks.png ? inspected.png : null,
  };
}
