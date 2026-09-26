// node --test skills/bpmn-edit/test/
// Unit tests of the pure modules, plus one end-to-end test that serves the real
// page, drives it in headless Chromium and checks the session folder.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { UsageError } from '../../bpmn/scripts/lib/cli-args.mjs';
import { configureBrowsersPath, findEngineRoot } from '../../bpmn/scripts/lib/engine.mjs';
import { DEFAULT_LAYOUT } from '../../bpmn/scripts/lib/layouts.mjs';
import { countBends, diffLayouts } from '../scripts/lib/di-diff.mjs';
import { compareSemantics } from '../scripts/lib/semantic-check.mjs';
import { EditSession } from '../scripts/lib/session-store.mjs';
import { resolveSource } from '../scripts/lib/source.mjs';

const CLI = fileURLToPath(new URL('../scripts/bpmn-edit.mjs', import.meta.url));
const ROOT = findEngineRoot();
const FIXTURE = join(ROOT, 'tools/layout-lab/bench/cases/c-syn014-sysv5-claude-opus_4_8_medium-r01.dsl');
const tempDir = () => mkdtemp(join(os.tmpdir(), 'bpmn edit test '));

const diagram = ({ taskX = 100, name = 'Do', refs = ['S', 'T'], waypoints = [[36, 18], [100, 18]] } = {}) => `<?xml version="1.0"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="d" xmlns:dc="c" xmlns:di="i" id="D">
<bpmn:process id="P"><bpmn:laneSet id="LS"><bpmn:lane id="L">${refs.map(r => `<bpmn:flowNodeRef>${r}</bpmn:flowNodeRef>`).join('')}</bpmn:lane></bpmn:laneSet>
<bpmn:startEvent id="S"/><bpmn:task id="T" name="${name}"/><bpmn:sequenceFlow id="f1" sourceRef="S" targetRef="T"/></bpmn:process>
<bpmndi:BPMNDiagram id="BD"><bpmndi:BPMNPlane id="BP" bpmnElement="P">
<bpmndi:BPMNShape id="S_di" bpmnElement="S"><dc:Bounds x="0" y="0" width="36" height="36"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="T_di" bpmnElement="T"><dc:Bounds x="${taskX}" y="-22" width="100" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNEdge id="f1_di" bpmnElement="f1">${waypoints.map(([x, y]) => `<di:waypoint x="${x}" y="${y}"/>`).join('')}</bpmndi:BPMNEdge>
</bpmndi:BPMNPlane></bpmndi:BPMNDiagram></bpmn:definitions>`;

test('semantic check: geometry and lane-ref order do not count, a rename does', () => {
  const base = diagram();
  assert.equal(compareSemantics(base, diagram({ taskX: 300, waypoints: [[36, 18], [60, 18], [60, 60], [300, 60]] })).identical, true);
  assert.equal(compareSemantics(base, diagram({ refs: ['T', 'S'] })).identical, true);
  const renamed = compareSemantics(base, diagram({ name: 'Done' }));
  assert.equal(renamed.identical, false);
  assert.match(renamed.difference.path, /task#T/);
  assert.equal(compareSemantics(base, diagram({ refs: ['S'] })).identical, false);
});

test('di diff: moved shape, rerouted edge with bends', () => {
  assert.equal(countBends([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }]), 0);
  assert.equal(countBends([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }]), 1);
  const diff = diffLayouts(diagram(), diagram({ taskX: 140, waypoints: [[36, 18], [70, 18], [70, 60], [140, 60]] }));
  assert.equal(diff.summary.shapesMoved, 1);
  assert.equal(diff.summary.edgesRerouted, 1);
  assert.equal(diff.summary.bendsAdded, 2);
  assert.deepEqual(diff.changes.find(c => c.id === 'T').dx, 40);
  assert.equal(diffLayouts(diagram(), diagram()).summary.changedElements, 0);
});

test('source: exactly one input, --out required outside a run, run folders resolved', async () => {
  await assert.rejects(resolveSource({}), UsageError);
  await assert.rejects(resolveSource({ dsl: FIXTURE, bpmn: FIXTURE }), UsageError);
  await assert.rejects(resolveSource({ dsl: FIXTURE }), /--out is required/);

  const run = join(await tempDir(), 'bpmn-run with spaces');
  await mkdir(run);
  await writeFile(join(run, 'run-info.json'), JSON.stringify({ runId: 'bpmn-x', status: 'success',
    attempts: [{ n: 1, layout: { version: 'v20', harness: { app: 'a', page: '/p' } }, presentation: { messageFlows: 'shown' } }] }));
  await writeFile(join(run, 'diagram.bpmn'), diagram());
  await writeFile(join(run, 'normalized.dsl'), 'A: Do');
  const source = await resolveSource({ run });
  assert.equal(source.kind, 'run');
  assert.equal(source.startLayout.version, 'v20');
  assert.equal(source.messageFlows, 'shown');
  assert.equal(source.outDir, join(run, 'edits'));
  assert.equal(source.recompileLayout.version, DEFAULT_LAYOUT);
  assert.equal(source.recompileLayout.from, 'default');
});

test('session folders are new every time, also under paths with spaces', async () => {
  const outDir = join(await tempDir(), 'out dir');
  const source = { outDir, label: 'Mi proceso' };
  const [a, b] = [await EditSession.create(source, {}), await EditSession.create(source, {})];
  assert.notEqual(a.dir, b.dir);
  assert.match(a.info.sessionId, /^edit-\d{8}-\d{6}-mi-proceso/);
  assert.ok(existsSync(join(a.dir, 'edits.json')));
});

/** Starts `open`, resolves with { url, sessionDir } and a promise of the final summary. */
function startOpen(args) {
  const child = spawn(process.execPath, [CLI, 'open', ...args, '--no-open'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = ''; let err = '';
  child.stderr.on('data', d => { err += d; });
  const finished = new Promise(resolveExit => child.on('exit', code => resolveExit({ code, out, err })));
  const ready = new Promise((resolveReady, reject) => {
    child.stdout.on('data', d => {
      out += d;
      const line = out.split('\n')[0];
      if (out.includes('\n') && line.startsWith('{"url"')) resolveReady(JSON.parse(line));
      else if (out.includes('\n') && !line.startsWith('{"url"')) reject(new Error(`open did not start: ${out}${err}`));
    });
    child.on('exit', code => reject(new Error(`open exited with ${code}: ${out}${err}`)));
  });
  return { ready, finished, child };
}

/** A run of the bpmn skill (render-dsl, default layout, message flows hidden) to start from. */
async function bpmnRun(outDir) {
  const bpmnCli = join(ROOT, 'skills/bpmn/scripts/bpmn.mjs');
  const child = spawn(process.execPath, [bpmnCli, 'render-dsl', '--dsl', FIXTURE, '--out', outDir], { stdio: ['ignore', 'pipe', 'inherit'] });
  let out = '';
  child.stdout.on('data', d => { out += d; });
  const code = await new Promise(r => child.on('exit', r));
  assert.equal(code, 0, out);
  return JSON.parse(out).runDir;
}

test('end to end from a bpmn run: move a task and a bend, save, refuse structure changes, change DSL, revert, quit', { timeout: 300_000 }, async () => {
  const runDir = await bpmnRun(join(await tempDir(), 'ejecuciones con espacios'));
  const { ready, finished, child } = startOpen(['--run', runDir]);
  const { url, sessionDir } = await ready;
  assert.ok(sessionDir.startsWith(join(runDir, 'edits')), sessionDir);
  assert.equal(await readFile(join(sessionDir, 'engine.bpmn'), 'utf8'), await readFile(join(runDir, 'layout-full.bpmn'), 'utf8'));
  configureBrowsersPath(ROOT);
  const { chromium } = createRequire(join(ROOT, 'apps/tfm-lab/package.json'))('playwright');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    const pageErrors = [];
    page.on('pageerror', e => pageErrors.push(e.message));
    await page.goto(url);
    await page.waitForFunction(() => !!window.bpmnEdit, undefined, { timeout: 60_000 });
    const engineXml = await readFile(join(sessionDir, 'engine.bpmn'), 'utf8');
    const firstPng = await readFile(join(sessionDir, 'diagram.png'));

    // Two layout edits: a task 60 px down and a new bend on a sequence flow.
    await page.evaluate(() => {
      const { modeler } = window.bpmnEdit;
      const registry = modeler.get('elementRegistry');
      const modeling = modeler.get('modeling');
      modeling.moveShape(registry.get('Task_Agency_Issue_ticket'), { x: 0, y: 60 });
      const flow = registry.getAll().find(e => e.businessObject?.$type === 'bpmn:SequenceFlow' && e.waypoints.length === 2);
      window.__flowId = flow.id;
      const [a, b] = flow.waypoints;
      const midX = Math.round((a.x + b.x) / 2);
      modeling.updateWaypoints(flow, [a, { x: midX, y: a.y }, { x: midX, y: a.y + 40 }, { x: b.x, y: a.y + 40 }, b]);
    });
    const saved = await page.evaluate(() => window.bpmnEdit.save());
    assert.equal(saved.status, 'success', JSON.stringify(saved));
    assert.equal(saved.semanticIdentical, true);

    const log = JSON.parse(await readFile(join(sessionDir, 'edits.json'), 'utf8'));
    assert.deepEqual(log.entries.map(e => [e.type, e.command]), [['edit', 'shape.move'], ['edit', 'connection.updateWaypoints']]);
    const user = await readFile(join(sessionDir, 'user.bpmn'), 'utf8');
    assert.equal(compareSemantics(engineXml, user).identical, true);
    const delivered = await readFile(join(sessionDir, 'diagram.bpmn'), 'utf8');
    assert.equal(compareSemantics(engineXml, delivered).identical, false, 'message flows are hidden in the deliverable');
    assert.ok(!delivered.includes('messageFlow'));
    assert.notDeepEqual(await readFile(join(sessionDir, 'diagram.png')), firstPng);
    const flowId = await page.evaluate(() => window.__flowId);
    const diffBefore = diffLayouts(engineXml, user);
    assert.equal(diffBefore.changes.find(c => c.id === 'Task_Agency_Issue_ticket').dy, 60);
    assert.ok(diffBefore.changes.find(c => c.id === flowId).bendsAdded >= 2);

    // Structure changes are refused and undone.
    const refused = await page.evaluate(async () => {
      const { modeler } = window.bpmnEdit;
      const registry = modeler.get('elementRegistry');
      const rules = modeler.get('rules');
      const task = registry.get('Task_Traveler_Pay_booking');
      const allowedDelete = rules.allowed('elements.delete', { elements: [task] });
      modeler.get('modeling').removeShape(task);                     // bypasses rules: undone as non-layout
      await new Promise(r => setTimeout(r, 50));
      const moving = registry.get('Task_Traveler_Pay_booking');
      const other = registry.get('Task_Agency_Create_reservation');
      modeler.get('modeling').moveShape(moving, { x: 0, y: other.y - moving.y },
        registry.get('Participant_Agency'));                              // dropped into the other pool
      await new Promise(r => setTimeout(r, 50));
      const bo = registry.get('Task_Traveler_Pay_booking')?.businessObject;
      return { allowedDelete, exists: !!bo, pool: bo?.$parent?.id,
        events: window.bpmnEdit.events().map(e => [e.type, e.command, e.reason ?? null]) };
    });
    assert.equal(refused.allowedDelete, false);
    assert.equal(refused.exists, true);
    assert.equal(refused.pool, 'Process_Traveler');
    assert.deepEqual(refused.events, [['rejected', 'shape.delete', 'not-layout'], ['rejected', 'shape.move', 'semantic']]);

    // A new DSL redraws from the engine and says how many edits were lost; revert brings them back.
    const renamed = (await readFile(FIXTURE, 'utf8')).replace('Agency: Issue ticket', 'Agency: Issue e-ticket');
    const applied = await page.evaluate(async dsl => {
      document.getElementById('dsl').value = dsl;
      const result = await window.bpmnEdit.applyDsl();
      return { ...result, banner: document.getElementById('banner').textContent, revision: window.bpmnEdit.revision() };
    }, renamed);
    assert.equal(applied.revision, 2);
    assert.equal(applied.status, 'success');
    assert.ok(applied.lostEdits >= 2);
    assert.match(applied.banner, /se han perdido/);
    assert.ok((await readFile(join(sessionDir, 'user.bpmn'), 'utf8')).includes('Issue e-ticket'));

    const reverted = await page.evaluate(async () => ({ ...(await window.bpmnEdit.revertDsl()), revision: window.bpmnEdit.revision() }));
    assert.equal(reverted.revision, 1);
    assert.equal(reverted.semanticIdentical, true);
    const userAfterRevert = await readFile(join(sessionDir, 'user.bpmn'), 'utf8');
    assert.equal(diffLayouts(engineXml, userAfterRevert).changes.find(c => c.id === 'Task_Agency_Issue_ticket').dy, 60);

    await page.evaluate(() => window.bpmnEdit.quit());
    assert.deepEqual(pageErrors, []);
  } catch (err) {
    child.kill();
    throw err;
  } finally {
    await browser.close();
  }

  const { code, out } = await finished;
  assert.equal(code, 0, out);
  const summary = JSON.parse(out.slice(out.indexOf('\n') + 1));
  assert.equal(summary.status, 'success');
  assert.equal(summary.closedBy, 'page');
  assert.equal(summary.revision, 1);
  assert.deepEqual(summary.missing, []);
  const info = JSON.parse(await readFile(join(sessionDir, 'session.json'), 'utf8'));
  assert.equal(info.revisions.length, 2);
  assert.equal(info.revisions[0].layout.version, DEFAULT_LAYOUT);
  assert.equal(info.edits.applied, 2);
  assert.equal(info.edits.rejected, 2);
  assert.ok(info.durationMs > 0);
  assert.ok(existsSync(join(sessionDir, 'edit-diff.json')));
  await assert.rejects(fetch(url), 'server closed');
  assert.equal(child.exitCode, 0);
});

test('end to end with the mouse: drag a task, a segment, a label, resize a pool; structure changes do nothing', { timeout: 300_000 }, async () => {
  const outDir = join(await tempDir(), 'raton');
  const { ready, finished, child } = startOpen(['--dsl', FIXTURE, '--out', outDir]);
  const { url } = await ready;
  configureBrowsersPath(ROOT);
  const { chromium } = createRequire(join(ROOT, 'apps/tfm-lab/package.json'))('playwright');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    await page.goto(url);
    await page.waitForFunction(() => !!window.bpmnEdit, undefined, { timeout: 60_000 });
    const center = selector => page.evaluate(sel => {
      const r = document.querySelector(sel).getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, selector);
    const element = id => `.djs-element[data-element-id="${id}"] .djs-hit`;
    const drag = async (from, dx, dy) => {
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      for (let i = 1; i <= 10; i += 1) await page.mouse.move(from.x + dx * i / 10, from.y + dy * i / 10);
      await page.mouse.up();
      await page.waitForTimeout(150);
    };
    const select = id => page.evaluate(i => {
      const { modeler } = window.bpmnEdit;
      modeler.get('selection').select(modeler.get('elementRegistry').get(i));
    }, id);

    await drag(await center(element('Task_Agency_Issue_ticket')), 0, 40);
    const flow = await page.evaluate(() => window.bpmnEdit.modeler.get('elementRegistry').getAll()
      .find(e => e.businessObject?.$type === 'bpmn:SequenceFlow' && e.waypoints.length === 2
        && Math.abs(e.waypoints[0].y - e.waypoints[1].y) < 1 && Math.abs(e.waypoints[0].x - e.waypoints[1].x) > 60).id);
    await drag(await center(element(flow)), 0, 30);
    const label = await page.evaluate(() => window.bpmnEdit.modeler.get('elementRegistry').getAll().find(e => e.type === 'label').id);
    await drag(await center(element(label)), 25, 10);
    await select('Participant_Traveler');
    await drag(await center('.djs-resizer-s .djs-resizer-hit'), 0, 40);
    const target = await center(element('Task_Agency_Create_reservation'));
    const from = await center(element('Task_Traveler_Pay_booking'));
    await drag(from, target.x + 150 - from.x, target.y - from.y);
    await page.waitForTimeout(200);
    await select('Task_Agency_Create_reservation');
    await page.keyboard.press('Delete');
    const task = await center(element('Task_Agency_Create_reservation'));
    await page.mouse.dblclick(task.x, task.y);

    const result = await page.evaluate(() => {
      const { modeler } = window.bpmnEdit;
      const registry = modeler.get('elementRegistry');
      return { events: window.bpmnEdit.events().map(e => [e.type, e.command, e.reason ?? null]),
        stillThere: !!registry.get('Task_Agency_Create_reservation'),
        pool: registry.get('Task_Traveler_Pay_booking').businessObject.$parent.id,
        editing: !!document.querySelector('.djs-direct-editing-content:focus'),
        canRedo: modeler.get('commandStack').canRedo() };
    });
    assert.deepEqual(result.events, [['edit', 'elements.move', null], ['edit', 'connection.updateWaypoints', null],
      ['edit', 'elements.move', null], ['edit', 'lane.resize', null], ['rejected', 'elements.move', 'semantic']]);
    assert.equal(result.stillThere, true);
    assert.equal(result.pool, 'Process_Traveler');
    assert.equal(result.editing, false);
    assert.equal(result.canRedo, false, 'a refused command is not redoable');
    const saved = await page.evaluate(() => window.bpmnEdit.save());
    assert.equal(saved.status, 'success');
    assert.equal(saved.semanticIdentical, true);
    await page.evaluate(() => window.bpmnEdit.quit());
  } catch (err) {
    child.kill();
    throw err;
  } finally {
    await browser.close();
  }
  assert.equal((await finished).code, 0);
});
