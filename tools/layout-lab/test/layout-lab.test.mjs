// node --test tools/layout-lab/test/*.test.mjs
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { TFM_HARNESS } from '../../../skills/bpmn/scripts/lib/harness.mjs';
import { rng, shuffle, winnerOf } from '../lib/ab.mjs';
import { REPO_ROOT } from '../lib/bench.mjs';
import { LAYOUTS, layoutVersion } from '../lib/layouts.mjs';
import { backEdges, parseBpmn, structuralFeatures } from '../lib/bpmn-model.mjs';
import { collinearOverlap, segmentHitsRect, segmentsCross, rectPolylineDistance } from '../lib/geometry.mjs';
import { computeMetrics } from '../lib/metrics.mjs';
import { decodeEntities, parseXml } from '../lib/xml.mjs';
import { cohenKappa } from '../commands/agreement.mjs';

const P = (x, y) => ({ x, y });

test('segment crossing ignores touching ends and collinear overlap', () => {
  assert.equal(segmentsCross([P(0, 0), P(10, 10)], [P(0, 10), P(10, 0)]), true);
  assert.equal(segmentsCross([P(0, 0), P(10, 0)], [P(10, 0), P(10, 10)]), false);
  assert.equal(segmentsCross([P(0, 0), P(10, 0)], [P(5, 0), P(15, 0)]), false);
  assert.equal(collinearOverlap([P(0, 0), P(10, 0)], [P(5, 0), P(15, 0)]), 5);
});

test('segment vs rect interior (borders do not count)', () => {
  const r = { x: 10, y: 10, width: 10, height: 10 };
  assert.equal(segmentHitsRect([P(0, 15), P(30, 15)], r), true);
  assert.equal(segmentHitsRect([P(0, 10), P(30, 10)], r), false);
  assert.equal(segmentHitsRect([P(0, 0), P(5, 5)], r), false);
  assert.equal(rectPolylineDistance({ x: 0, y: 0, width: 2, height: 2 }, [P(5, 1), P(9, 1)]), 3);
});

test('xml reader: entities, text and nesting', () => {
  const doc = parseXml('<?xml version="1.0"?><a:r x="1 &amp; 2"><b>t&lt;1</b><c/></a:r>');
  const root = doc.children[0];
  assert.equal(root.local, 'r');
  assert.equal(root.attrs.x, '1 & 2');
  assert.equal(root.children[0].text, 't<1');
  assert.equal(decodeEntities('&#x41;&#66;'), 'AB');
  assert.throws(() => parseXml('<a><b></a>'));
});

const LOOP = `<bpmn:definitions xmlns:bpmn="m" xmlns:bpmndi="d" xmlns:dc="c" xmlns:di="i"><bpmn:process id="P">
<bpmn:startEvent id="S"/><bpmn:task id="T" name="Do"/><bpmn:exclusiveGateway id="G"/><bpmn:endEvent id="E"/>
<bpmn:sequenceFlow id="f1" sourceRef="S" targetRef="T"/><bpmn:sequenceFlow id="f2" sourceRef="T" targetRef="G"/>
<bpmn:sequenceFlow id="f3" sourceRef="G" targetRef="T"/><bpmn:sequenceFlow id="f4" sourceRef="G" targetRef="E"/></bpmn:process>
<bpmndi:BPMNDiagram><bpmndi:BPMNPlane>
<bpmndi:BPMNShape bpmnElement="S"><dc:Bounds x="0" y="0" width="36" height="36"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape bpmnElement="T"><dc:Bounds x="100" y="-22" width="100" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape bpmnElement="G"><dc:Bounds x="250" y="-7" width="50" height="50"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape bpmnElement="E"><dc:Bounds x="350" y="0" width="36" height="36"/></bpmndi:BPMNShape>
<bpmndi:BPMNEdge bpmnElement="f1"><di:waypoint x="36" y="18"/><di:waypoint x="100" y="18"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge bpmnElement="f2"><di:waypoint x="200" y="18"/><di:waypoint x="250" y="18"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge bpmnElement="f3"><di:waypoint x="275" y="43"/><di:waypoint x="275" y="90"/><di:waypoint x="150" y="90"/><di:waypoint x="150" y="58"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge bpmnElement="f4"><di:waypoint x="300" y="18"/><di:waypoint x="350" y="18"/></bpmndi:BPMNEdge>
</bpmndi:BPMNPlane></bpmndi:BPMNDiagram></bpmn:definitions>`;

test('model: back edges, features and clean metrics on a tidy loop', () => {
  const model = parseBpmn(LOOP);
  assert.deepEqual([...backEdges(model)], ['f3']);
  const f = structuralFeatures(model);
  assert.equal(f.loops, 1);
  assert.equal(f.flowNodes, 4);
  const text = { viewBox: { x: -10, y: -30, width: 410, height: 130 }, boxes: [
    { id: 'T', label: false, text: 'Do', x: 140, y: 10, width: 20, height: 14 },
    { id: 'E', label: true, text: 'End', x: 355, y: 40, width: 26, height: 12 }] };
  const { values } = computeMetrics(model, text);
  assert.equal(values.shapeOverlaps, 0);
  assert.equal(values.edgeThroughShape, 0);
  assert.equal(values.crossings, 0);
  assert.equal(values.forwardSeqRatio, 1);
  assert.equal(values.straightSeqRatio, 1);
  assert.equal(values.backEdges, 1);
});

test('metrics flag a label on a lane title band and an edge through a shape', () => {
  const xml = LOOP.replace('<bpmn:startEvent id="S"/>', '<bpmn:laneSet><bpmn:lane id="L" name="Lane"><bpmn:flowNodeRef>S</bpmn:flowNodeRef></bpmn:lane></bpmn:laneSet><bpmn:startEvent id="S"/>')
    .replace('<bpmndi:BPMNShape bpmnElement="S">', '<bpmndi:BPMNShape bpmnElement="L"><dc:Bounds x="-40" y="-30" width="450" height="130"/></bpmndi:BPMNShape><bpmndi:BPMNShape bpmnElement="S">')
    .replace('<di:waypoint x="300" y="18"/><di:waypoint x="350" y="18"/>', '<di:waypoint x="300" y="18"/><di:waypoint x="300" y="-60"/><di:waypoint x="150" y="-60"/><di:waypoint x="150" y="18"/><di:waypoint x="350" y="18"/>');
  const text = { viewBox: { x: -50, y: -70, width: 480, height: 180 }, boxes: [
    { id: 'S', label: true, text: 'Start', x: -20, y: 40, width: 40, height: 12 }] };
  const { values } = computeMetrics(parseBpmn(xml), text);
  assert.equal(values.labelsOnTitleBand, 1);
  assert.ok(values.edgeThroughShape >= 1);
});

test('artifact metrics: bent near association, long association, name outside its pool', () => {
  const xml = LOOP
    .replace('<bpmn:definitions xmlns:bpmn="m" xmlns:bpmndi="d" xmlns:dc="c" xmlns:di="i">',
      '<bpmn:definitions xmlns:bpmn="m" xmlns:bpmndi="d" xmlns:dc="c" xmlns:di="i"><bpmn:collaboration><bpmn:participant id="Pool" processRef="P"/></bpmn:collaboration>')
    .replace('<bpmn:task id="T" name="Do"/>', '<bpmn:task id="T" name="Do"><bpmn:dataOutputAssociation id="near"><bpmn:targetRef>D1</bpmn:targetRef></bpmn:dataOutputAssociation>'
      + '<bpmn:dataOutputAssociation id="far"><bpmn:targetRef>D2</bpmn:targetRef></bpmn:dataOutputAssociation></bpmn:task>'
      + '<bpmn:dataObjectReference id="D1" name="Near"/><bpmn:dataObjectReference id="D2" name="Far"/>')
    .replace('<bpmndi:BPMNShape bpmnElement="S">', '<bpmndi:BPMNShape bpmnElement="Pool"><dc:Bounds x="-40" y="-60" width="1500" height="230"/></bpmndi:BPMNShape>'
      + '<bpmndi:BPMNShape bpmnElement="D1"><dc:Bounds x="160" y="90" width="36" height="50"/></bpmndi:BPMNShape>'
      + '<bpmndi:BPMNShape bpmnElement="D2"><dc:Bounds x="1400" y="-40" width="36" height="50"/></bpmndi:BPMNShape><bpmndi:BPMNShape bpmnElement="S">')
    .replace('</bpmndi:BPMNPlane>', '<bpmndi:BPMNEdge bpmnElement="near"><di:waypoint x="150" y="58"/><di:waypoint x="150" y="75"/><di:waypoint x="178" y="75"/><di:waypoint x="178" y="90"/></bpmndi:BPMNEdge>'
      + '<bpmndi:BPMNEdge bpmnElement="far"><di:waypoint x="200" y="-15"/><di:waypoint x="1400" y="-15"/></bpmndi:BPMNEdge></bpmndi:BPMNPlane>');
  const text = { viewBox: { x: -50, y: -70, width: 1520, height: 240 }, boxes: [
    { id: 'D1', label: true, text: 'Near', x: 160, y: 142, width: 30, height: 12 },
    { id: 'D2', label: true, text: 'Far', x: 1440, y: 12, width: 70, height: 12 }] };
  const { values, details } = computeMetrics(parseBpmn(xml), text);
  assert.equal(values.bentNearAssociations, 1);
  assert.deepEqual(details.bentNearAssociations, ['near']);
  assert.equal(values.longAssociations, 1);
  assert.equal(values.artifactTextOutsidePool, 1);
  assert.equal(values.assocBendsPerEdge, 1);
});

test('Cohen kappa and blind A/B helpers', () => {
  assert.equal(cohenKappa([['A', 'A'], ['B', 'B'], ['tie', 'tie']]), 1);
  assert.ok(Math.abs(cohenKappa([['B', 'B'], ['tie', 'tie'], ['B', 'tie'], ['A', 'A'], ['tie', 'tie']]) - 0.6875) < 1e-9);
  assert.deepEqual(shuffle([1, 2, 3, 4, 5], rng('s')), shuffle([1, 2, 3, 4, 5], rng('s')));
  const pair = { sides: { left: 'B', right: 'A' } };
  assert.equal(winnerOf(pair, 'left'), 'B');
  assert.equal(winnerOf(pair, 'tie'), 'tie');
});

test('layout registry: v0 is the TFM harness, candidates bring their own harness files', () => {
  assert.deepEqual(layoutVersion('v0').harness, TFM_HARNESS);
  for (const [name, layout] of Object.entries(LAYOUTS)) {
    if (name === 'v0') continue;
    assert.notEqual(layout.harness.app, TFM_HARNESS.app, `${name} must not reuse the v0 app`);
    for (const file of ['vite.config.ts', layout.harness.page.replace(/^\//, '')]) {
      assert.ok(existsSync(join(REPO_ROOT, layout.harness.app, file)), `${name}: ${file}`);
    }
  }
  assert.throws(() => layoutVersion('nope'), /Unknown layout version/);
});
