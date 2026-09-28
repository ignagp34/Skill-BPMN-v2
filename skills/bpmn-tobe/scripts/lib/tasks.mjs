// The tasks of an AS-IS process, the only elements a TO-BE mark can target
// (the DSL attaches `//` annotations to the next task, prompt v5 § 13.1).
import { parseBpmn } from '../../../../tools/layout-lab/lib/bpmn-model.mjs';

/** [{ id, name, lane, pool }] in document order, from a semantic or laid-out BPMN. */
export function listTasks(xml) {
  const model = parseBpmn(xml);
  const laneName = new Map(model.lanes.map(l => [l.id, l.name]));
  const laneOf = new Map();
  for (const lane of model.lanes) if (!lane.hasChildren) for (const ref of lane.flowNodeRefs) laneOf.set(ref, lane.id);
  return [...model.nodes.values()].filter(n => n.kind === 'task').map(n => ({
    id: n.id, name: n.name, lane: laneName.get(laneOf.get(n.id)) ?? null,
    pool: model.participantOfProcess.get(n.processId)?.name ?? null,
  }));
}

/** Associations task → annotation of a BPMN, as { taskId, annotationId, associationId, text }. */
export function taskAnnotations(xml) {
  const model = parseBpmn(xml);
  const annotations = new Map([...model.nodes.values()].filter(n => n.kind === 'annotation').map(n => [n.id, n]));
  return model.edges.filter(e => e.type === 'association').flatMap(e => {
    const [taskId, annotationId] = annotations.has(e.target) ? [e.source, e.target] : [e.target, e.source];
    const annotation = annotations.get(annotationId);
    return annotation ? [{ taskId, annotationId, associationId: e.id, text: (annotation.text ?? '').trim() }] : [];
  });
}
