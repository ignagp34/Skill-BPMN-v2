// Semantic + DI model of a laid-out BPMN file, the input of the bench features
// and of the layout metrics. Geometry only comes from the DI; nothing is
// recomputed or inferred from the engine.
import { childrenNamed, firstChild, parseXml, walk } from './xml.mjs';

const TASK_TYPES = new Set(['task', 'userTask', 'serviceTask', 'sendTask', 'receiveTask', 'manualTask',
  'businessRuleTask', 'scriptTask', 'callActivity']);
const DATA_TYPES = new Set(['dataObjectReference', 'dataStoreReference']);
const EDGE_TYPES = new Set(['sequenceFlow', 'messageFlow', 'association', 'dataInputAssociation', 'dataOutputAssociation']);

export function kindOf(type) {
  if (TASK_TYPES.has(type)) return 'task';
  if (type === 'subProcess' || type === 'transaction' || type === 'adHocSubProcess') return 'subprocess';
  if (type.endsWith('Event')) return 'event';
  if (type.endsWith('Gateway')) return 'gateway';
  if (DATA_TYPES.has(type)) return 'data';
  if (type === 'textAnnotation') return 'annotation';
  return null;
}

const readBounds = el => {
  const b = el && firstChild(el, 'Bounds');
  return b ? { x: +b.attrs.x, y: +b.attrs.y, width: +b.attrs.width, height: +b.attrs.height } : null;
};

function readDi(root) {
  const shapes = new Map();
  const edges = new Map();
  walk(root, el => {
    if (el.local === 'BPMNShape') {
      shapes.set(el.attrs.bpmnElement, { bounds: readBounds(el), label: readBounds(firstChild(el, 'BPMNLabel')),
        horizontal: el.attrs.isHorizontal !== 'false' });
    } else if (el.local === 'BPMNEdge') {
      edges.set(el.attrs.bpmnElement, { waypoints: childrenNamed(el, 'waypoint').map(w => ({ x: +w.attrs.x, y: +w.attrs.y })),
        label: readBounds(firstChild(el, 'BPMNLabel')) });
    }
  });
  return { shapes, edges };
}

function collectLanes(laneSet, processId, parentLaneId, lanes) {
  for (const lane of childrenNamed(laneSet, 'lane')) {
    const refs = childrenNamed(lane, 'flowNodeRef').map(r => r.text.trim());
    const child = firstChild(lane, 'childLaneSet');
    lanes.push({ id: lane.attrs.id, name: lane.attrs.name ?? '', processId, parentLaneId, flowNodeRefs: refs,
      hasChildren: !!child && childrenNamed(child, 'lane').length > 0 });
    if (child) collectLanes(child, processId, lane.attrs.id, lanes);
  }
}

/** Walks a process or expanded sub-process body. */
function collectFlowElements(container, processId, parentId, model) {
  for (const el of container.children) {
    const kind = kindOf(el.local);
    if (kind) {
      model.nodes.set(el.attrs.id, { id: el.attrs.id, type: el.local, kind, name: el.attrs.name ?? (el.text.trim() || ''),
        processId, parentId, attachedTo: el.attrs.attachedToRef ?? null,
        text: kind === 'annotation' ? (firstChild(el, 'text')?.text ?? '') : null });
      if (kind === 'subprocess') collectFlowElements(el, processId, el.attrs.id, model);
      for (const assoc of el.children.filter(c => c.local === 'dataInputAssociation' || c.local === 'dataOutputAssociation')) {
        const ref = local => firstChild(assoc, local)?.text.trim() ?? null;
        const input = assoc.local === 'dataInputAssociation';
        model.edges.push({ id: assoc.attrs.id, type: assoc.local, name: '', processId,
          source: input ? ref('sourceRef') : el.attrs.id, target: input ? el.attrs.id : ref('targetRef') });
      }
    } else if (EDGE_TYPES.has(el.local)) {
      model.edges.push({ id: el.attrs.id, type: el.local, name: el.attrs.name ?? '', processId,
        source: el.attrs.sourceRef, target: el.attrs.targetRef });
    } else if (el.local === 'laneSet') {
      collectLanes(el, processId, null, model.lanes);
    }
  }
}

export function parseBpmn(xml) {
  const root = parseXml(xml);
  const definitions = root.children.find(c => c.local === 'definitions');
  if (!definitions) throw new Error('Not a BPMN file: no definitions element.');
  const model = { participants: [], lanes: [], nodes: new Map(), edges: [] };

  for (const collaboration of childrenNamed(definitions, 'collaboration')) {
    for (const p of childrenNamed(collaboration, 'participant')) {
      model.participants.push({ id: p.attrs.id, name: p.attrs.name ?? '', processRef: p.attrs.processRef ?? null });
    }
    for (const el of collaboration.children.filter(c => c.local === 'messageFlow' || c.local === 'association')) {
      model.edges.push({ id: el.attrs.id, type: el.local, name: el.attrs.name ?? '', processId: null,
        source: el.attrs.sourceRef, target: el.attrs.targetRef });
    }
    for (const ann of childrenNamed(collaboration, 'textAnnotation')) {
      model.nodes.set(ann.attrs.id, { id: ann.attrs.id, type: 'textAnnotation', kind: 'annotation', name: '',
        processId: null, parentId: null, attachedTo: null, text: firstChild(ann, 'text')?.text ?? '' });
    }
  }
  for (const process of childrenNamed(definitions, 'process')) collectFlowElements(process, process.attrs.id, null, model);

  const di = readDi(definitions);
  const laneOf = new Map();
  for (const lane of model.lanes) if (!lane.hasChildren) for (const ref of lane.flowNodeRefs) laneOf.set(ref, lane.id);
  for (const node of model.nodes.values()) {
    const shape = di.shapes.get(node.id);
    Object.assign(node, { bounds: shape?.bounds ?? null, label: shape?.label ?? null, laneId: laneOf.get(node.id) ?? null });
  }
  for (const p of model.participants) Object.assign(p, { bounds: di.shapes.get(p.id)?.bounds ?? null });
  for (const lane of model.lanes) Object.assign(lane, { bounds: di.shapes.get(lane.id)?.bounds ?? null });
  for (const edge of model.edges) {
    const d = di.edges.get(edge.id);
    Object.assign(edge, { waypoints: d?.waypoints ?? [], label: d?.label ?? null });
  }
  model.participantOfProcess = new Map(model.participants.map(p => [p.processRef, p]));
  return model;
}

/** Sequence flows closing a cycle (DFS back edges from start events, then any unvisited node). */
export function backEdges(model) {
  const flows = model.edges.filter(e => e.type === 'sequenceFlow');
  const out = new Map();
  for (const f of flows) (out.get(f.source) ?? out.set(f.source, []).get(f.source)).push(f);
  const state = new Map(); // 1 = on stack, 2 = done
  const back = new Set();
  const visit = id => {
    state.set(id, 1);
    for (const f of out.get(id) ?? []) {
      const s = state.get(f.target);
      if (s === 1) back.add(f.id);
      else if (!s) visit(f.target);
    }
    state.set(id, 2);
  };
  const nodes = [...model.nodes.values()];
  const starts = nodes.filter(n => n.type === 'startEvent').map(n => n.id);
  for (const id of [...starts, ...nodes.map(n => n.id)]) if (!state.get(id)) visit(id);
  return back;
}

/** Structural features used to stratify the bench (from the semantic part only). */
export function structuralFeatures(model) {
  const nodes = [...model.nodes.values()];
  const flowNodes = nodes.filter(n => ['task', 'subprocess', 'event', 'gateway'].includes(n.kind));
  const count = predicate => model.edges.filter(predicate).length;
  const labels = [...nodes.map(n => n.name), ...nodes.map(n => n.text ?? ''), ...model.edges.map(e => e.name)];
  const processIds = new Set(flowNodes.map(n => n.processId));
  const lanesPerProcess = pid => model.lanes.filter(l => l.processId === pid && !l.hasChildren).length;
  return {
    pools: Math.max(model.participants.length, processIds.size ? 1 : 0),
    lanes: model.lanes.filter(l => !l.hasChildren).length,
    maxLanesInPool: Math.max(0, ...[...processIds].map(lanesPerProcess)),
    flowNodes: flowNodes.length,
    tasks: nodes.filter(n => n.kind === 'task').length,
    gateways: nodes.filter(n => n.kind === 'gateway').length,
    events: nodes.filter(n => n.kind === 'event').length,
    subprocesses: nodes.filter(n => n.kind === 'subprocess').length,
    boundaryEvents: nodes.filter(n => n.type === 'boundaryEvent').length,
    sequenceFlows: count(e => e.type === 'sequenceFlow'),
    messageFlows: count(e => e.type === 'messageFlow'),
    artifacts: nodes.filter(n => n.kind === 'data' || n.kind === 'annotation').length,
    loops: backEdges(model).size,
    maxLabelLength: Math.max(0, ...labels.map(t => t.trim().length)),
  };
}
