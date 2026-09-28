// Engine side of a TO-BE run: the AS-IS and the TO-BE DSL through the same
// harness session (layout of config/tobe.json), then the colours on the TO-BE
// and its re-export with the skill bpmn's exporters and checks.
import { attemptFiles, classifyRender, extractDiagnostics, inspectArtifacts } from '../../../bpmn/scripts/lib/artifacts.mjs';
import { HarnessSession } from '../../../bpmn/scripts/lib/harness.mjs';
import { nowIso } from '../../../bpmn/scripts/lib/run-store.mjs';
import { STATUS } from '../../../bpmn/scripts/lib/status.mjs';
import { BIOC_NS, BIZAGI_NS, COLOR_NS, paintInPage } from './colors.mjs';
import { stripElementsInPage } from './strip-marks.mjs';

/** RenderExperimentInput of apps/tfm-lab/src/headless/main.ts. */
const harnessInput = (runId, side, dsl) => ({
  experimentId: `${runId}-${side}`, processId: 'TOBE', processSource: `bpmn-tobe:${side}.dsl`,
  systemPromptVersion: 'NONE', processPromptVersion: 'none', provider: 'bpmn-tobe', modelLabel: 'none',
  runNumber: 1, createdAt: nowIso(), notes: `bpmn-tobe run ${runId}, ${side}.`, inputPrompt: '', rawOutput: dsl,
});

/** One side's outcome: status, files to write and the record for run-info.json. */
function outcomeOf(rendered, extra = {}) {
  if (rendered.error) {
    return { status: STATUS.INFRASTRUCTURE_ERROR, files: {}, record: { error: rendered.error.message, pageErrors: rendered.pageErrors } };
  }
  const { output, reimported, presentation } = rendered;
  const inspected = inspectArtifacts(output);
  const { fullLayoutXml, ...presentationRecord } = presentation;
  return {
    status: classifyRender(output, inspected, reimported), layoutXml: output.layoutXml ?? null,
    files: attemptFiles(output, inspected, reimported),
    record: { harnessStatus: output.status, reimported, checks: inspected.checks, presentation: presentationRecord,
      diagnostics: extractDiagnostics(output.resultJson), pageErrors: rendered.pageErrors, ...extra },
  };
}

export class EnginePair {
  constructor(session, options) {
    this.session = session;
    this.options = options; // { timeoutMs, messageFlows }
  }

  static async open(root, layout, options) {
    return new EnginePair(await HarnessSession.open(root, layout.harness), options);
  }

  get runtime() { return this.session.runtime; }

  async render(runId, side, dsl) {
    return outcomeOf(await this.session.render(harnessInput(runId, side, dsl), this.options));
  }

  /**
   * Colours the laid-out TO-BE and exports it again. The semantic files and the
   * status come from the render; the drawings from the painted export.
   */
  async paintAndExport(rendered, paints) {
    const painted = await this.session.withPage(page => page.evaluate(paintInPage,
      { xml: rendered.layoutXml, paints, colorNs: COLOR_NS, biocNs: BIOC_NS, bizagiNs: BIZAGI_NS }));
    const exported = await this.session.exportLayout(painted.xml, this.options);
    if (exported.error) {
      return { ...rendered, status: STATUS.INFRASTRUCTURE_ERROR, files: {},
        record: { ...rendered.record, export: { error: exported.error.message, pageErrors: exported.pageErrors } } };
    }
    const inspected = inspectArtifacts(exported.output);
    const drawings = attemptFiles({ ...exported.output, resultJson: '{}' }, inspected, exported.reimported);
    const complete = classifyRender({ succeeded: true, status: rendered.status }, inspected, exported.reimported) === rendered.status;
    const status = complete && painted.missing.length === 0 ? rendered.status : STATUS.PARTIAL_EXPORT;
    return { ...rendered, status,
      files: { ...rendered.files, ...Object.fromEntries(['diagram.bpmn', 'diagram.svg', 'diagram.png'].map(f => [f, drawings[f]])) },
      record: { ...rendered.record, export: { reimported: exported.reimported, checks: inspected.checks,
        painted: painted.painted, paintMissing: painted.missing, pageErrors: exported.pageErrors } } };
  }

  /**
   * The AS-IS drawn from the laid-out TO-BE without its marks: same geometry by
   * construction. Only the drawings come from here; its semantic files are the
   * AS-IS run's (the caller checks that both processes are the same).
   */
  async stripAndExport(rendered, ids) {
    const stripped = await this.session.withPage(page => page.evaluate(stripElementsInPage, { xml: rendered.layoutXml, ids }));
    const exported = await this.session.exportLayout(stripped.xml, this.options);
    if (exported.error) {
      return { status: STATUS.INFRASTRUCTURE_ERROR, layoutXml: null, files: {},
        record: { error: exported.error.message, pageErrors: exported.pageErrors } };
    }
    const inspected = inspectArtifacts(exported.output);
    const drawings = attemptFiles({ ...exported.output, resultJson: '{}' }, inspected, exported.reimported);
    const status = classifyRender({ succeeded: true, status: rendered.status }, inspected, exported.reimported);
    return { status, layoutXml: stripped.xml,
      files: Object.fromEntries(['diagram.bpmn', 'diagram.svg', 'diagram.png'].map(f => [f, drawings[f]])),
      record: { derivedFrom: 'to-be', removed: stripped.removed, reimported: exported.reimported, checks: inspected.checks,
        pageErrors: exported.pageErrors } };
  }

  close() { return this.session.close(); }
}
