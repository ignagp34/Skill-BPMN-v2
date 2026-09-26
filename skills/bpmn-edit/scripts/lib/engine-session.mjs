// The engine side of an edit session: one HarnessSession of the bpmn skill
// (Vite + headless Chromium) kept open while the page is in use. Compiling a
// DSL runs the same pipeline as `bpmn render-dsl`; exporting an edited layout
// uses the same exporters, message-flow presentation and checks. Calls are
// queued: the harness renders one page at a time.
import { classifyRender, extractDiagnostics, inspectArtifacts } from '../../../bpmn/scripts/lib/artifacts.mjs';
import { findEngineRoot } from '../../../bpmn/scripts/lib/engine.mjs';
import { HarnessSession } from '../../../bpmn/scripts/lib/harness.mjs';
import { MESSAGE_FLOWS } from '../../../bpmn/scripts/lib/message-flows.mjs';
import { nowIso } from '../../../bpmn/scripts/lib/run-store.mjs';
import { STATUS } from '../../../bpmn/scripts/lib/status.mjs';
import { EDITOR_CONFIG } from './config.mjs';

/** RenderExperimentInput of apps/tfm-lab/src/headless/main.ts for a DSL typed by the user. */
const harnessInput = (dsl, label, n) => ({
  experimentId: `EDIT-${label}-r${n}`, processId: 'EDIT', processSource: 'bpmn-edit:dsl',
  systemPromptVersion: 'NONE', processPromptVersion: 'none', provider: 'bpmn-edit', modelLabel: 'none',
  runNumber: n, createdAt: nowIso(), notes: `bpmn-edit DSL revision ${n}.`, inputPrompt: '', rawOutput: dsl,
});

const infrastructure = error => ({ status: STATUS.INFRASTRUCTURE_ERROR, error: error.message, infra: error.kind ?? 'harness' });

export class EngineSession {
  constructor(session, layout) {
    this.session = session;
    this.layout = layout;
    this.queue = Promise.resolve();
  }

  /** layout: { version, harness } — the harness every compile and export runs on. */
  static async open(layout) {
    return new EngineSession(await HarnessSession.open(findEngineRoot(), layout.harness), layout);
  }

  get runtime() { return this.session.runtime; }

  enqueue(work) {
    const next = this.queue.then(work, work);
    this.queue = next.catch(() => {});
    return next;
  }

  /** DSL → complete layout (message flows kept; they are hidden at export). */
  compile(dsl, { label, revision }) {
    return this.enqueue(async () => {
      const result = await this.session.render(harnessInput(dsl, label, revision),
        { timeoutMs: EDITOR_CONFIG.renderTimeoutMs, messageFlows: MESSAGE_FLOWS.SHOWN });
      if (result.error) return { ...infrastructure(result.error), pageErrors: result.pageErrors };
      const { output } = result;
      const status = output.succeeded ? classifyRender(output, inspectArtifacts(output), result.reimported) : output.status;
      return { status, succeeded: output.succeeded && !!output.layoutXml,
        layoutXml: output.succeeded ? output.layoutXml : null, normalizedDsl: output.normalizedDsl,
        diagnostics: extractDiagnostics(output.resultJson), pageErrors: result.pageErrors };
    });
  }

  /** Complete layout XML → deliverables, with the run's message-flow presentation. */
  exportLayout(layoutXml, { messageFlows }) {
    return this.enqueue(async () => {
      const result = await this.session.exportLayout(layoutXml, { timeoutMs: EDITOR_CONFIG.renderTimeoutMs, messageFlows });
      if (result.error) return { ...infrastructure(result.error), pageErrors: result.pageErrors };
      const inspected = inspectArtifacts(result.output);
      const { checks } = inspected;
      const status = !checks.svg && result.reimported !== true ? STATUS.RENDER_ERROR
        : classifyRender({ succeeded: true, status: STATUS.SUCCESS }, inspected, result.reimported);
      const { fullLayoutXml, ...presentation } = result.presentation;
      return { status, checks, reimported: result.reimported, presentation, pageErrors: result.pageErrors,
        files: {
          'diagram.bpmn': checks.bpmn && result.reimported === true ? inspected.layoutXml : null,
          'diagram.svg': checks.svg ? inspected.svg : null,
          'diagram.png': checks.png ? inspected.png : null,
        } };
    });
  }

  async close() {
    await this.queue;
    await this.session.close();
  }
}
