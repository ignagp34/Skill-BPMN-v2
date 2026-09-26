// bpmn-edit page. The canvas edits layout only: palette and context pad are
// gone, the denied rules refuse creating, deleting, reconnecting or renaming,
// and any top-level command outside config.allowedCommands, or any change of
// lane, pool or attachment, is undone at once. Every command is logged with
// the geometry it changed and sent to the server with the next save; the
// server exports with the bpmn skill's own exporters (plans/bpmn-edit.md).
/* global BpmnJS */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const ui = {
    status: $('status'), layout: $('layout'), banner: $('banner'), dsl: $('dsl'), diagnostics: $('diagnostics'),
    apply: $('apply'), revert: $('revert'), undo: $('undo'), redo: $('redo'), flows: $('flows'),
    save: $('save'), quit: $('quit'), paths: $('paths'),
  };

  let config;
  let modeler;
  let revision;
  let appliedDsl = '';
  let baseline = '';          // semantic signature of the revision
  let engineSnapshot = {};    // geometry of the revision's engine layout
  let snapshot = {};          // geometry now
  let pendingTop = null;      // top-level command of the current execution
  let autoUndo = null;        // reason while undoing a refused command
  let lastUndoRedo = null;
  let loading = false;
  let flowsHidden = false;
  let saveTimer = null;
  let saving = null;
  let dirty = false;
  let closed = false;
  const pending = [];         // events not yet sent
  const history = [];         // earlier DSL revisions: { revision, dsl, xml, engineSnapshot }

  // ---------- server ----------

  async function api(path, body) {
    const init = body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
    const res = await fetch(path, init);
    let data = {};
    try { data = await res.json(); } catch { /* empty body */ }
    return { httpStatus: res.status, ...data };
  }

  // ---------- geometry and semantics ----------

  const round = v => Math.round(v * 100) / 100;

  function geometryOf(element) {
    if (element.waypoints) return { waypoints: element.waypoints.map(p => [round(p.x), round(p.y)]) };
    if (typeof element.x !== 'number') return null;
    return { x: round(element.x), y: round(element.y), width: round(element.width), height: round(element.height) };
  }

  function takeSnapshot() {
    const out = {};
    for (const element of modeler.get('elementRegistry').getAll()) {
      if (!element.parent && !element.waypoints && element.type !== 'label') continue; // canvas root
      const geometry = geometryOf(element);
      if (geometry) out[element.id] = geometry;
    }
    return out;
  }

  function changesBetween(before, after) {
    const ids = new Set([...Object.keys(before), ...Object.keys(after)]);
    const changes = [];
    for (const id of ids) {
      const [a, b] = [before[id] ?? null, after[id] ?? null];
      if (JSON.stringify(a) !== JSON.stringify(b)) changes.push({ id, before: a, after: b });
    }
    return changes;
  }

  /** What the canvas must never change: parents, lanes, attachments and flow ends. */
  function semanticSignature() {
    const parts = [];
    for (const element of modeler.get('elementRegistry').getAll()) {
      const bo = element.businessObject;
      if (!bo || element.type === 'label') continue;
      parts.push(`${bo.id}<${bo.$parent?.id ?? ''}`);
      if (bo.attachedToRef) parts.push(`${bo.id}@${bo.attachedToRef.id}`);
      if (bo.sourceRef) parts.push(`${bo.id}:${bo.sourceRef.id}>${bo.targetRef?.id}`);
      if (bo.$type === 'bpmn:Lane') parts.push(`${bo.id}[${(bo.flowNodeRef ?? []).map(r => r.id).sort().join(',')}]`);
    }
    return parts.sort().join('|');
  }

  const editedElements = () => changesBetween(engineSnapshot, snapshot).map(c => c.id.replace(/_label$/, ''))
    .filter((id, i, all) => all.indexOf(id) === i).length;

  // ---------- modeler ----------

  function LayoutOnly(eventBus) {
    for (const rule of config.deniedRules) eventBus.on(`commandStack.${rule}.canExecute`, 10000, () => false);
  }
  LayoutOnly.$inject = ['eventBus'];

  function createModeler() {
    modeler = new BpmnJS({
      container: $('canvas'),
      additionalModules: [{
        __init__: ['layoutOnly'],
        layoutOnly: ['type', LayoutOnly],
        paletteProvider: ['value', {}],
        contextPadProvider: ['value', {}],
        labelEditingProvider: ['value', {}],
      }],
    });
    // The top-level command of each execution: nested commands also go through
    // execute(), so only the outermost call counts. (Generic preExecute events
    // are not reliable: a behavior that returns a value stops their propagation.)
    const commandStack = modeler.get('commandStack');
    const execute = commandStack.execute.bind(commandStack);
    let depth = 0;
    commandStack.execute = (command, context) => {
      if (depth === 0) pendingTop = command;
      depth += 1;
      try { return execute(command, context); } finally { depth -= 1; }
    };
    modeler.get('eventBus').on('commandStack.changed', event => onChanged(event.trigger));
  }

  function refuse(command, reason) {
    const stack = modeler.get('commandStack');
    autoUndo = { command, reason };
    try { stack.undo(); } finally { autoUndo = null; }
    // A refused command must not come back with «Rehacer» (diagram-js 14 keeps the redo actions after _stackIdx).
    if (Array.isArray(stack._stack)) stack._stack.length = stack._stackIdx + 1;
    updateButtons();
    const text = reason === 'semantic'
      ? 'Ese cambio movía un elemento a otro carril o pool, o cambiaba una conexión; se ha deshecho. La estructura se cambia en el DSL.'
      : `«${command}» no es una edición de layout; se ha deshecho.`;
    showBanner(text, 'warn');
  }

  function onChanged(trigger) {
    if (loading || trigger === 'clear' || !trigger) return;
    const next = takeSnapshot();
    const changes = changesBetween(snapshot, next);
    snapshot = next;

    if (trigger === 'execute') {
      const command = pendingTop;
      pendingTop = null;
      const reason = !config.allowedCommands.includes(command) ? 'not-layout'
        : semanticSignature() !== baseline ? 'semantic' : null;
      if (reason) { setTimeout(() => refuse(command, reason)); return; }
      record({ type: 'edit', trigger, command, changes });
    } else if (autoUndo) {
      record({ type: 'rejected', command: autoUndo.command, reason: autoUndo.reason, changes });
    } else {
      record({ type: 'edit', trigger, command: lastUndoRedo, changes });
      lastUndoRedo = null;
    }
    updateButtons();
    scheduleSave();
  }

  function record(event) {
    pending.push({ ...event, revision, at: new Date().toISOString() });
  }

  async function load(xml) {
    loading = true;
    try {
      await modeler.importXML(xml);
      fit();
      applyFlowVisibility();
      snapshot = takeSnapshot();
      baseline = semanticSignature();
    } finally {
      loading = false;
    }
  }

  /** Whole diagram in view; skipped while the canvas has no size (zoom would not be finite). */
  function fit() {
    const box = $('canvas').getBoundingClientRect();
    if (box.width > 0 && box.height > 0) modeler.get('canvas').zoom('fit-viewport', 'auto');
  }

  function applyFlowVisibility() {
    const registry = modeler.get('elementRegistry');
    for (const element of registry.getAll()) {
      if (element.businessObject?.$type !== 'bpmn:MessageFlow') continue;
      const gfx = registry.getGraphics(element);
      if (gfx) gfx.style.display = flowsHidden ? 'none' : '';
    }
    ui.flows.setAttribute('aria-pressed', String(!flowsHidden));
  }

  function undoRedo(kind) {
    const stack = modeler.get('commandStack');
    const action = kind === 'undo' ? stack._getUndoAction?.() : stack._getRedoAction?.();
    lastUndoRedo = action?.command ?? null;
    if (kind === 'undo') stack.undo(); else stack.redo();
  }

  // ---------- saving ----------

  function scheduleSave() {
    dirty = true;
    setStatus('Cambios sin guardar…');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => save(), config.autosaveMs);
  }

  async function save() {
    clearTimeout(saveTimer);
    if (saving) { await saving; if (!dirty && pending.length === 0) return lastResult; }
    saving = doSave();
    try { return await saving; } finally { saving = null; }
  }

  let lastResult = null;
  async function doSave() {
    const events = pending.splice(0);
    dirty = false;
    setStatus('Guardando…');
    const { xml } = await modeler.saveXML({ format: true });
    let result;
    try {
      result = await api('/api/save', { revision, xml, events });
    } catch (err) {
      pending.unshift(...events);
      dirty = true;
      setStatus(`No se pudo guardar: ${err.message}`, 'err');
      return null;
    }
    lastResult = result;
    showSaveResult(result);
    return result;
  }

  function showSaveResult(result) {
    if (result.httpStatus === 409) {
      setStatus('Guardado rechazado: el cambio altera el proceso.', 'err');
      showBanner(`${result.error} (${result.difference?.path ?? ''})`, 'err');
      return;
    }
    const time = new Date().toLocaleTimeString();
    const cls = result.status === 'success' || result.status === 'success_with_warnings' ? 'ok'
      : result.status === 'partial_export' ? 'warn' : 'err';
    const missing = result.missing?.length ? ` · falta ${result.missing.join(', ')}` : '';
    setStatus(`Guardado ${time} · ${result.status}${missing}`, cls);
    ui.paths.textContent = result.sessionDir ?? '';
  }

  // ---------- DSL ----------

  function showDiagnostics(list) {
    ui.diagnostics.replaceChildren(...(list ?? []).map(d => {
      const li = document.createElement('li');
      li.className = d.severity ?? '';
      li.textContent = `${d.line ? `línea ${d.line}${d.column ? `:${d.column}` : ''} · ` : ''}${d.message}`;
      return li;
    }));
  }

  async function applyDsl() {
    const dsl = ui.dsl.value;
    if (dsl === appliedDsl) { showBanner('El DSL no ha cambiado.', 'warn'); return null; }
    await save();
    setStatus('Dibujando el DSL con el motor…');
    ui.apply.disabled = true;
    let result;
    try {
      result = await api('/api/compile', { dsl });
    } finally {
      ui.apply.disabled = false;
    }
    if (!result.ok) {
      setStatus(`El DSL no se puede dibujar: ${result.status ?? result.error}`, 'err');
      showDiagnostics(result.diagnostics?.length ? result.diagnostics : [{ severity: 'error', message: result.error ?? result.status }]);
      return result;
    }
    const lost = editedElements();
    const { xml: previousXml } = await modeler.saveXML({ format: true });
    history.push({ revision, dsl: appliedDsl, xml: previousXml, engineSnapshot });
    const from = revision;
    revision = result.revision;
    appliedDsl = dsl;
    await load(result.xml);
    engineSnapshot = snapshot;
    record({ type: 'dsl', fromRevision: from, toRevision: revision, lostEdits: lost });
    showDiagnostics(result.diagnostics);
    if (lost > 0) {
      showBanner(`Diagrama rehecho con el DSL nuevo: se han perdido las ediciones a mano de ${lost} elemento(s). «Volver al DSL anterior» las recupera.`, 'warn');
    } else hideBanner();
    updateButtons();
    dirty = true;
    return { ...(await save()), lostEdits: lost };
  }

  async function revertDsl() {
    const previous = history.pop();
    if (!previous) return null;
    await save();
    const from = revision;
    revision = previous.revision;
    appliedDsl = previous.dsl;
    ui.dsl.value = previous.dsl;
    await load(previous.xml);
    engineSnapshot = previous.engineSnapshot;
    record({ type: 'revert', fromRevision: from, toRevision: revision });
    showDiagnostics([]);
    showBanner(`Recuperado el DSL de la revisión ${revision} con su geometría.`, 'warn');
    updateButtons();
    dirty = true;
    return save();
  }

  // ---------- page ----------

  function setStatus(text, cls = '') {
    ui.status.textContent = text;
    ui.status.className = `status ${cls}`;
  }
  function showBanner(text, cls) {
    ui.banner.textContent = text;
    ui.banner.className = `banner ${cls === 'err' ? 'err' : ''}`;
    ui.banner.hidden = false;
  }
  function hideBanner() { ui.banner.hidden = true; }

  function updateButtons() {
    const stack = modeler.get('commandStack');
    ui.undo.disabled = closed || !stack.canUndo();
    ui.redo.disabled = closed || !stack.canRedo();
    ui.revert.disabled = closed || history.length === 0;
  }

  async function quit() {
    await save();
    await api('/api/quit', {});
    closed = true;
    document.body.classList.add('closed');
    ui.dsl.disabled = true;
    for (const button of document.querySelectorAll('button')) button.disabled = true;
    setStatus('Sesión cerrada: los archivos están guardados. Ya puedes cerrar esta pestaña.', 'ok');
  }

  function bindKeys() {
    document.addEventListener('keydown', event => {
      if (closed) return;
      const key = event.key.toLowerCase();
      const typing = event.target === ui.dsl;
      if (typing && (event.ctrlKey || event.metaKey) && key === 'enter') { event.preventDefault(); applyDsl(); return; }
      if ((event.ctrlKey || event.metaKey) && key === 's') { event.preventDefault(); save(); return; }
      if (typing) return;
      if ((event.ctrlKey || event.metaKey) && key === 'z' && !event.shiftKey) { event.preventDefault(); undoRedo('undo'); }
      else if ((event.ctrlKey || event.metaKey) && (key === 'y' || (key === 'z' && event.shiftKey))) { event.preventDefault(); undoRedo('redo'); }
      else if (key === 'm' && !ui.flows.hidden) { flowsHidden = !flowsHidden; applyFlowVisibility(); }
    });
    ui.undo.onclick = () => undoRedo('undo');
    ui.redo.onclick = () => undoRedo('redo');
    ui.save.onclick = () => save();
    ui.apply.onclick = () => applyDsl();
    ui.revert.onclick = () => revertDsl();
    ui.quit.onclick = () => quit();
    ui.flows.onclick = () => { flowsHidden = !flowsHidden; applyFlowVisibility(); };
    window.addEventListener('beforeunload', event => {
      if (!closed && (dirty || pending.length)) { save(); event.preventDefault(); }
    });
  }

  async function init() {
    const state = await api('/api/state');
    config = state.config;
    revision = state.revision;
    appliedDsl = state.dsl ?? '';
    ui.dsl.value = appliedDsl;
    if (!state.dslEditable) {
      ui.dsl.disabled = true;
      ui.dsl.value = '(Esta sesión parte de un .bpmn sin DSL: solo se puede editar el layout.)';
      ui.apply.disabled = true;
    }
    ui.layout.textContent = `layout ${state.layout?.version ?? '?'}`;
    ui.layout.title = `Revisión ${revision}; al aplicar un DSL nuevo se usa ${state.recompileLayout.version}.`;
    flowsHidden = state.messageFlows === 'hidden';
    createModeler();
    await load(state.xml);
    engineSnapshot = snapshot;
    ui.flows.hidden = !state.xml.includes('messageFlow');
    applyFlowVisibility();
    bindKeys();
    updateButtons();
    if (state.lastSave) showSaveResult({ ...state.lastSave, sessionDir: state.sessionDir });
    setInterval(() => { if (!closed) api('/api/heartbeat', {}).catch(() => {}); }, config.heartbeatMs);
    // Hooks for the automated end-to-end test (skills/bpmn-edit/test).
    window.bpmnEdit = { modeler, save, applyDsl, revertDsl, quit, events: () => pending.slice(), revision: () => revision };
  }

  init().catch(err => setStatus(`Error al cargar: ${err.message}`, 'err'));
})();
