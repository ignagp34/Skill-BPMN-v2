import { layoutProcess } from "bpmn-auto-layout";
import BpmnModdle from "bpmn-moddle";

import { sanitizeForLayout } from "../../../../packages/bpmn-core/src/render/sanitize.js";
import { layoutMissingProcesses as strideLayout } from "../../../../packages/bpmn-core/src/render/layout-missing.js";

/**
 * Layout v1, idea A of plans/layout-iteracion-1.md: every pool gets its own
 * bpmn-auto-layout pass.
 *
 * bpmn-auto-layout 0.5.0 lays out only the first process of a collaboration;
 * v0 fills the other pools with layout-missing.ts's single horizontal row in
 * topological order. This module replaces that step (same signature, loaded in
 * its place by harness/v1/vite.config.ts): each process that has no DI at all
 * is extracted into temporary definitions, sanitized and laid out on its own,
 * and its shapes/edges are copied into the collaboration's plane. Every later
 * phase (pools and lanes, orthogonal routing, channels, labels, artifacts) is
 * v0's, unchanged.
 *
 * Anything the per-pool pass still leaves without DI (nodes unreachable from a
 * start, e.g. a cycle with no entry) falls back to v0's stride layout, exactly
 * as v0 does for the first process. Single-pool diagrams are therefore
 * byte-identical to v0.
 */
export async function layoutMissingProcesses(layoutXml: string): Promise<string> {
  return strideLayout(await layoutUnplacedProcesses(layoutXml));
}

async function layoutUnplacedProcesses(layoutXml: string): Promise<string> {
  const moddle = new BpmnModdle();
  const { rootElement, elementsById } = (await moddle.fromXML(layoutXml)) as any;
  const defs = rootElement as any;
  const plane = defs.diagrams?.[0]?.plane;
  if (!plane) return layoutXml;

  const planeElements: any[] = Array.isArray(plane.planeElement) ? plane.planeElement : [];
  const placed = new Set<string>(planeElements.map((el) => el.bpmnElement?.id).filter(Boolean));
  const additions: any[] = [];

  for (const process of defs.rootElements ?? []) {
    if (process.$type !== "bpmn:Process") continue;
    const nodes = layoutNodes(process);
    if (nodes.length === 0 || nodes.some((n) => placed.has(n.id))) continue;

    const isolated = await layoutProcess(await sanitizeForLayout(await isolateProcess(layoutXml, process.id)));
    for (const di of await processDi(isolated, process.id)) {
      const target = elementsById[di.bpmnElement?.id];
      if (!target || placed.has(target.id)) continue;
      additions.push(copyDi(moddle, di, target));
      placed.add(target.id);
    }
  }

  if (additions.length === 0) return layoutXml;
  plane.planeElement = [...planeElements, ...additions];
  return (await moddle.toXML(defs, { format: false })).xml;
}

/** Same node set layout-missing.ts places: everything but sequence flows and (invisible) data objects. */
function layoutNodes(process: any): any[] {
  return (process.flowElements ?? []).filter(
    (e: any) => e.$type !== "bpmn:SequenceFlow" && e.$type !== "bpmn:DataObject",
  );
}

/** Definitions holding only this process (plus shared messages/signals/errors), without DI. */
async function isolateProcess(xml: string, processId: string): Promise<string> {
  const moddle = new BpmnModdle();
  const { rootElement } = await moddle.fromXML(xml);
  const defs = rootElement as any;
  defs.rootElements = (defs.rootElements ?? []).filter(
    (root: any) =>
      root.id === processId || (root.$type !== "bpmn:Process" && root.$type !== "bpmn:Collaboration"),
  );
  defs.diagrams = [];
  return (await moddle.toXML(defs, { format: false })).xml;
}

/** Plane elements of the diagram bpmn-auto-layout produced for this process. */
async function processDi(xml: string, processId: string): Promise<any[]> {
  const { rootElement } = await new BpmnModdle().fromXML(xml);
  const diagram = ((rootElement as any).diagrams ?? []).find(
    (d: any) => d.plane?.bpmnElement?.id === processId,
  );
  return diagram?.plane?.planeElement ?? [];
}

function copyDi(moddle: any, di: any, target: any): any {
  const label = di.label?.bounds
    ? moddle.create("bpmndi:BPMNLabel", { bounds: moddle.create("dc:Bounds", pickBounds(di.label.bounds)) })
    : undefined;
  if (di.$type === "bpmndi:BPMNEdge") {
    return moddle.create("bpmndi:BPMNEdge", {
      id: di.id,
      bpmnElement: target,
      waypoint: (di.waypoint ?? []).map((p: any) => moddle.create("dc:Point", { x: p.x, y: p.y })),
      ...(label ? { label } : {}),
    });
  }
  const attrs: Record<string, unknown> = {};
  for (const key of ["isExpanded", "isHorizontal", "isMarkerVisible"]) {
    if (di[key] !== undefined) attrs[key] = di[key];
  }
  return moddle.create("bpmndi:BPMNShape", {
    id: di.id,
    bpmnElement: target,
    bounds: moddle.create("dc:Bounds", pickBounds(di.bounds)),
    ...attrs,
    ...(label ? { label } : {}),
  });
}

const pickBounds = (b: any) => ({ x: b.x, y: b.y, width: b.width, height: b.height });
