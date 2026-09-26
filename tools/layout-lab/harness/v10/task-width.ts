import BpmnModdle from "bpmn-moddle";

import { layoutMissingProcesses as perPoolLayout } from "../v1/per-pool-layout.ts";

/**
 * Layout v10 = v7 + proposal D of evidence/layout-review-20260926/REVIEW.md: a task
 * is as wide as its longest word needs, so bpmn-js never splits a word
 * ("hiperparámetro/s", "recommendati/on").
 *
 * bpmn-js draws a task name in 12 px Arial inside the task minus 7 px padding per
 * side (86 px of a 100 px task) and breaks a word that does not fit. Right after
 * the per-pool auto-layout (before pools, routing and labels), each task whose
 * longest word needs more room grows to the right, rounded up to 10 px, and every
 * shape, label and waypoint of the same process right of the task's centre moves
 * right by the same amount. Later phases (pools, routing, labels, artifacts, v7
 * frames) run unchanged on the wider layout.
 */
const FONT = "12px Arial, sans-serif";
const PADDING = 7;        // bpmn-js embedded label padding
const MARGIN = 4;         // spare room so a word never touches the padding
const STEP = 10;
const CHAR_W = 7;         // fallback estimate without a canvas
const TASKS = /^bpmn:(Task|UserTask|ServiceTask|SendTask|ReceiveTask|ManualTask|BusinessRuleTask|ScriptTask|CallActivity)$/;

interface Bounds { x: number; y: number; width: number; height: number; }

export async function layoutMissingProcesses(layoutXml: string): Promise<string> {
  return widenTasks(await perPoolLayout(layoutXml));
}

export async function widenTasks(xml: string): Promise<string> {
  const moddle = new BpmnModdle();
  const { rootElement } = await moddle.fromXML(xml);
  const defs = rootElement as any;
  const planeElements: any[] = defs.diagrams?.[0]?.plane?.planeElement ?? [];
  const processOf = (ref: any): any => ref?.$parent;

  let changed = false;
  const tasks = planeElements.filter((el) => el.$type === "bpmndi:BPMNShape" && el.bounds && TASKS.test(el.bpmnElement?.$type ?? "")
    && el.bpmnElement.name);
  for (const task of tasks) {
    const needed = Math.ceil((longestWord(task.bpmnElement.name) + 2 * PADDING + MARGIN) / STEP) * STEP;
    const dw = needed - task.bounds.width;
    if (dw <= 0) continue;
    const process = processOf(task.bpmnElement);
    const cut = task.bounds.x + task.bounds.width / 2;
    for (const el of planeElements) {
      if (el === task || processOf(el.bpmnElement) !== process) continue;
      if (el.$type === "bpmndi:BPMNShape" && el.bounds && el.bounds.x > cut) el.bounds.x += dw;
      if (el.$type === "bpmndi:BPMNEdge") for (const p of el.waypoint ?? []) if (p.x > cut) p.x += dw;
      const label = el.label?.bounds as Bounds | undefined;
      if (label && label.x > cut) label.x += dw;
    }
    task.bounds.width += dw;
    changed = true;
  }
  return changed ? (await moddle.toXML(defs, { format: false })).xml : xml;
}

let context: CanvasRenderingContext2D | null | undefined;
function longestWord(text: string): number {
  if (context === undefined) {
    context = typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
    if (context) context.font = FONT;
  }
  return Math.max(0, ...String(text).split(/\s+/).filter(Boolean)
    .map((w) => (context ? context.measureText(w).width : w.length * CHAR_W)));
}
