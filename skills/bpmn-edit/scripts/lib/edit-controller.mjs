// What the page can ask for: the current state, compiling a new DSL and saving
// the edited layout. Operations run one at a time. A save whose semantic XML
// differs from its revision's engine layout is refused: the canvas edits layout only.
import { STATUS } from '../../../bpmn/scripts/lib/status.mjs';
import { pageConfig } from './config.mjs';
import { compareSemantics } from './semantic-check.mjs';

export class SessionStartError extends Error {
  constructor(message, details) { super(message); this.details = details; }
}

export class EditController {
  constructor(session, engine, source) {
    Object.assign(this, { session, engine, source });
    this.queue = Promise.resolve();
    this.dsl = source.dsl;
  }

  enqueue(work) {
    const next = this.queue.then(work, work);
    this.queue = next.catch(() => {});
    return next;
  }

  /** Revision 1 (the source's layout, or the DSL rendered now) and a first save, so the folder is complete from the start. */
  async start() {
    let engineXml = this.source.initialXml;
    let layout = this.source.startLayout;
    let compiled = null;
    if (engineXml === null) {
      compiled = await this.engine.compile(this.source.dsl, { label: this.session.info.sessionId, revision: 1 });
      if (!compiled.succeeded) {
        throw new SessionStartError(`The DSL does not render (${compiled.status}).`,
          { status: compiled.status, diagnostics: compiled.diagnostics, error: compiled.error ?? null });
      }
      engineXml = compiled.layoutXml;
      layout = this.source.recompileLayout;
    }
    const revision = await this.session.addRevision({ dsl: this.source.dsl, engineXml, layout, from: 'initial',
      status: compiled?.status ?? null, diagnostics: compiled?.diagnostics ?? [] });
    this.userXml = engineXml;
    const saved = await this.save({ revision, xml: engineXml, events: [] });
    if (!saved.ok) throw new SessionStartError(`The starting layout could not be exported (${saved.status ?? saved.error}).`, saved);
    return saved;
  }

  state() {
    const { info } = this.session;
    return {
      sessionId: info.sessionId, sessionDir: this.session.dir, revision: info.currentRevision,
      dsl: this.dsl, dslEditable: this.source.dsl !== null, xml: this.userXml,
      messageFlows: this.source.messageFlows, source: { kind: this.source.kind, path: this.source.path },
      layout: info.revisions.find(r => r.n === info.currentRevision)?.layout ?? null,
      recompileLayout: this.source.recompileLayout, lastSave: info.lastSave ?? null,
      config: pageConfig(),
    };
  }

  compile(dsl) {
    return this.enqueue(async () => {
      if (this.source.dsl === null) return { ok: false, httpStatus: 409, error: 'This session has no DSL (it started from a .bpmn).' };
      const next = this.session.info.revisions.length + 1;
      const compiled = await this.engine.compile(dsl, { label: this.session.info.sessionId, revision: next });
      if (!compiled.succeeded) {
        return { ok: false, status: compiled.status, diagnostics: compiled.diagnostics, error: compiled.error ?? null };
      }
      const revision = await this.session.addRevision({ dsl, engineXml: compiled.layoutXml,
        layout: this.source.recompileLayout, from: 'recompile', status: compiled.status, diagnostics: compiled.diagnostics });
      return { ok: true, revision, xml: compiled.layoutXml, status: compiled.status,
        diagnostics: compiled.diagnostics.filter(d => d.severity !== 'error') };
    });
  }

  save({ revision, xml, events = [] }) {
    return this.enqueue(async () => {
      if (!Number.isInteger(revision) || !this.session.hasRevision(revision)) return { ok: false, httpStatus: 400, error: `Unknown revision ${revision}.` };
      if (typeof xml !== 'string' || !xml.includes('BPMNDiagram')) return { ok: false, httpStatus: 400, error: 'No BPMN with DI in the request.' };
      await this.session.appendEvents(Array.isArray(events) ? events : []);
      let semantic;
      try {
        semantic = compareSemantics(await this.session.engineXmlOf(revision), xml);
      } catch (err) {
        return { ok: false, httpStatus: 400, error: `Unreadable BPMN: ${err.message}` };
      }
      if (!semantic.identical) {
        return { ok: false, httpStatus: 409, status: 'semantic_change', error: 'The edit changes the process, not only its layout.',
          difference: semantic.difference };
      }
      const exported = await this.engine.exportLayout(xml, { messageFlows: this.source.messageFlows });
      await this.session.recordSave({ revision, userXml: xml, exported, semantic });
      this.userXml = xml;
      const revisionDsl = await this.session.dslOf(revision);
      if (revisionDsl !== null) this.dsl = revisionDsl;
      const delivered = [STATUS.SUCCESS, STATUS.SUCCESS_WITH_WARNINGS].includes(exported.status);
      return { ok: delivered || exported.status === STATUS.PARTIAL_EXPORT, ...this.session.summary(),
        checks: exported.checks ?? null, error: exported.error ?? null };
    });
  }

  async close() {
    await this.queue;
  }
}
