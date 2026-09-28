// node --test skills/bpmn-tobe/test/
// Unit tests of the pure modules; the end-to-end runs are in evidence/bpmn-tobe/REPORT.md.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { paintList } from '../scripts/lib/colors.mjs';
import { displayText, strategyOf, TOBE_CONFIG } from '../scripts/lib/config.mjs';
import { annotatableTasks, insertMarks } from '../scripts/lib/dsl-insert.mjs';
import { parseMarks } from '../scripts/lib/marks.mjs';
import { compareGeometry } from '../scripts/lib/stability.mjs';

const DSL = [
  'Clerk: (start Order received)',
  'Clerk: Check stock',
  'service Reserve items',
  'Is stock enough?',
  'Yes',
  'Warehouse: Pack order|Clerk: Send invoice',
  '(finish Done)',
  '',
  'Clerk: Check stock',
  'Is stock enough?',
  'No',
  'Warehouse: Check stock',
  '(finish Rejected)',
].join('\n');
const TASKS = [
  { id: 'T1', name: 'Check stock', lane: 'Clerk', pool: 'Shop' },
  { id: 'T2', name: 'Reserve items', lane: 'Clerk', pool: 'Shop' },
  { id: 'T3', name: 'Pack order', lane: 'Warehouse', pool: 'Shop' },
  { id: 'T4', name: 'Send invoice', lane: 'Clerk', pool: 'Shop' },
  { id: 'T5', name: 'Check stock', lane: 'Warehouse', pool: 'Shop' },
];
const answer = annotations => `Here:\n\`\`\`json\n${JSON.stringify({ annotations, notes: ['n'] })}\n\`\`\``;

test('marks: exact names, kinds from the config, ambiguous names need a lane', () => {
  const ok = parseMarks(answer([{ task: 'Reserve items', kind: 'bloqueo', text: '  Slow   batch ' }]), TASKS);
  assert.deepEqual(ok.errors, []);
  assert.deepEqual(ok.marks[0], { task: 'Reserve items', lane: 'Clerk', kind: 'bloqueo', text: 'Slow batch', taskId: 'T2' });
  assert.deepEqual(ok.notes, ['n']);

  const bad = parseMarks(answer([
    { task: 'Reserve item', kind: 'bloqueo', text: 'x' },
    { task: 'Reserve items', kind: 'riesgo', text: 'x' },
    { task: 'Check stock', kind: 'mejora', text: 'x' },
    { task: 'Check stock', lane: 'Warehouse', kind: 'mejora', text: 'x' },
  ]), TASKS);
  assert.equal(bad.errors.length, 3);
  assert.match(bad.errors[2], /several lanes/);
  assert.equal(bad.marks[0].taskId, 'T5');
  assert.match(parseMarks('no json here', TASKS).errors[0], /not valid JSON/);
});

test('insert: one // line right before the first mention, in its lane; parallel lines are skipped', () => {
  const marks = [
    { task: 'Reserve items', lane: 'Clerk', kind: 'bloqueo', text: 'Slow', taskId: 'T2' },
    { task: 'Reserve items', lane: 'Clerk', kind: 'mejora', text: 'Automate', taskId: 'T2' },
    { task: 'Check stock', lane: 'Warehouse', kind: 'mejora', text: 'Scanner', taskId: 'T5' },
  ];
  const { dsl, inserted, errors } = insertMarks(DSL, marks, TASKS);
  assert.deepEqual(errors, []);
  const lines = dsl.split('\n');
  assert.equal(lines[2], `//${displayText(marks[0])}`);
  assert.equal(lines[3], `//${displayText(marks[1])}`);
  assert.equal(lines[4], 'service Reserve items');
  assert.equal(lines[inserted[2].line - 1], `//${displayText(marks[2])}`);
  assert.equal(lines[inserted[2].line], 'Warehouse: Check stock');
  assert.equal(lines.length, DSL.split('\n').length + 3);
  // Only the new lines differ.
  assert.deepEqual(lines.filter(l => !l.startsWith('//')), DSL.split('\n'));

  assert.deepEqual(annotatableTasks(DSL, TASKS).map(t => t.id), ['T1', 'T2', 'T5']);
  assert.match(insertMarks(DSL, [{ ...marks[0], task: 'Pack order', lane: 'Warehouse' }], TASKS).errors[0], /No DSL line/);
});

test('colours: annotation and association in the kind stroke, the task filled by priority', () => {
  const attached = [
    { mark: { kind: 'mejora', taskId: 'T2' }, annotationId: 'A1', associationId: 'S1' },
    { mark: { kind: 'bloqueo', taskId: 'T2' }, annotationId: 'A2', associationId: 'S2' },
  ];
  const paints = paintList(attached);
  const { bloqueo, mejora } = TOBE_CONFIG.kinds;
  assert.deepEqual(paints.find(p => p.elementId === 'A1'), { elementId: 'A1', stroke: mejora.stroke, fill: mejora.fill });
  assert.deepEqual(paints.find(p => p.elementId === 'S2'), { elementId: 'S2', stroke: bloqueo.stroke });
  assert.equal(TOBE_CONFIG.colorTask, true);
  assert.deepEqual(paints.find(p => p.elementId === 'T2'), { elementId: 'T2', stroke: bloqueo.stroke, fill: bloqueo.fill });
});

test('config: strategies resolve their layout', () => {
  assert.equal(strategyOf('no-bands').layout, 'v24-tobe');
  assert.ok(strategyOf('derive-as-is').layout);
  assert.throws(() => strategyOf('nope'), /Unknown strategy/);
});

const bpmn = ({ taskY = 0, flowY = 40, annotation = false } = {}) => `<?xml version="1.0"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="d" xmlns:dc="c" xmlns:di="i" id="D">
<bpmn:process id="P"><bpmn:startEvent id="S"/><bpmn:task id="T" name="Do"/><bpmn:sequenceFlow id="f1" sourceRef="S" targetRef="T"/>
${annotation ? '<bpmn:textAnnotation id="N"><bpmn:text>Bloqueo: x</bpmn:text></bpmn:textAnnotation><bpmn:association id="Association_9" sourceRef="T" targetRef="N"/>' : ''}</bpmn:process>
<bpmndi:BPMNDiagram id="BD"><bpmndi:BPMNPlane id="BP" bpmnElement="P">
<bpmndi:BPMNShape id="S_di" bpmnElement="S"><dc:Bounds x="0" y="22" width="36" height="36"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="T_di" bpmnElement="T"><dc:Bounds x="100" y="${taskY}" width="100" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNEdge id="f1_di" bpmnElement="f1"><di:waypoint x="36" y="40"/><di:waypoint x="100" y="${flowY}"/></bpmndi:BPMNEdge>
${annotation ? '<bpmndi:BPMNShape id="N_di" bpmnElement="N"><dc:Bounds x="300" y="200" width="100" height="40"/></bpmndi:BPMNShape><bpmndi:BPMNEdge id="A_di" bpmnElement="Association_9"><di:waypoint x="150" y="80"/><di:waypoint x="300" y="220"/></bpmndi:BPMNEdge>' : ''}
</bpmndi:BPMNPlane></bpmndi:BPMNDiagram></bpmn:definitions>`;

test('stability: new annotations do not count, a moved task or flow does', () => {
  assert.equal(compareGeometry(bpmn(), bpmn({ annotation: true })).stable, true);
  const moved = compareGeometry(bpmn(), bpmn({ taskY: 30, flowY: 70, annotation: true }));
  assert.equal(moved.stable, false);
  assert.equal(moved.shapesMoved, 1);
  assert.equal(moved.edgesRerouted, 1);
});
