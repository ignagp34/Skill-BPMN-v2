import packageJson from "../../package.json";
import {
  emitBpmnXml as defaultEmitBpmnXml,
  parseDsl as defaultParseDsl,
  renderSemanticXml as defaultRenderSemanticXml,
  validateBpmnModel as defaultValidateBpmnModel,
  type BpmnValidationResult,
  type ParseResult,
  type RenderResult,
  type ResolvedModel,
} from "@text-to-bpmn/core";
import {
  evaluateModelChange,
  type ChangeEvaluationResult,
  type ExpectedChangeSpec,
  type ExpectedChangeType,
} from "../experiments/changeDiff.js";
import { digestSha256Hex } from "../experiments/crypto.js";
import {
  buildExperimentBundle,
  buildExperimentResult,
  buildFinalPrompt,
  buildManifestRow,
  classifyDslDiagnostic,
  determineExperimentStatus,
  generateExperimentId,
  normalizeDslOutput,
} from "../experiments/helpers.js";
import { evaluateDslPipeline } from "../experiments/evaluate.js";
import { exportSvg, svgToPngBlob, type ModelerLike } from "../experiments/exporters.js";
import { loadExperimentLibrary } from "../experiments/library.js";
import type {
  DslEvaluationOutcome,
  ExperimentDiagnostic,
  ExperimentDraft,
  ExperimentEvaluationResult,
  ExperimentLibrary,
  ProcessPromptDefinition,
  SystemPromptDefinition,
} from "../experiments/types.js";

const fixtureModules = import.meta.glob("../../fixtures/*.dsl", {
  eager: true,
  import: "default",
  query: "?raw",
}) as Record<string, string>;

type UiState = "idle" | "rendering" | "valid" | "valid-with-warnings" | "invalid";

type SaveFileFn = (filename: string, data: BlobPart, mime: string) => void;

type AppDeps = {
  copyText: (text: string) => Promise<void>;
  createModeler: (container: HTMLElement) => ModelerLike;
  emitBpmnXml: (model: ResolvedModel) => string;
  experimentLibrary: ExperimentLibrary;
  exportPngBlob: (modeler: ModelerLike) => Promise<Blob>;
  exportSvg: (modeler: ModelerLike) => Promise<string>;
  fixtures: Record<string, string>;
  hashText: (text: string) => Promise<string>;
  logWarnings: (warnings: unknown[]) => void;
  parseDsl: (source: string) => ParseResult;
  renderSemanticXml: (
    modeler: ModelerLike,
    semanticXml: string,
    model: ResolvedModel,
  ) => Promise<RenderResult>;
  saveFile: SaveFileFn;
  savePng: (modeler: ModelerLike, filename: string, saveFile: SaveFileFn) => Promise<void>;
  saveSvg: (modeler: ModelerLike, filename: string, saveFile: SaveFileFn) => Promise<void>;
  validateBpmnModel: (model: ResolvedModel, options?: { layoutXml?: string }) => BpmnValidationResult;
};

type MountOptions = {
  deps?: Partial<AppDeps>;
  root?: ParentNode;
};

type AppElements = {
  activeSourceNote: HTMLParagraphElement;
  canvas: HTMLDivElement;
  changeBaseDslInput: HTMLTextAreaElement;
  changeCaseIdInput: HTMLInputElement;
  changeChangedDslInput: HTMLTextAreaElement;
  changeChecksList: HTMLUListElement;
  changeExperimentsTabButton: HTMLButtonElement;
  changeExperimentsView: HTMLElement;
  changeMetrics: HTMLDivElement;
  changeModelNameInput: HTMLInputElement;
  changeNotesInput: HTMLTextAreaElement;
  changePromptVersionInput: HTMLInputElement;
  changeResultJsonInput: HTMLTextAreaElement;
  changeResultSummary: HTMLParagraphElement;
  changeSpecJsonInput: HTMLTextAreaElement;
  changeTypeSelect: HTMLSelectElement;
  copyManifestButton: HTMLButtonElement;
  copyChangeResultButton: HTMLButtonElement;
  copyPromptButton: HTMLButtonElement;
  copyXmlButton: HTMLButtonElement;
  diagnosticsEmpty: HTMLParagraphElement;
  diagnosticsList: HTMLUListElement;
  downloadBpmnButton: HTMLButtonElement;
  downloadChangeResultButton: HTMLButtonElement;
  downloadExperimentFilesButton: HTMLButtonElement;
  downloadPngButton: HTMLButtonElement;
  downloadResultButton: HTMLButtonElement;
  downloadSvgButton: HTMLButtonElement;
  editorTabButton: HTMLButtonElement;
  evaluateOutputButton: HTMLButtonElement;
  experimentIdPreview: HTMLPreElement;
  experimentTabButton: HTMLButtonElement;
  experimentsView: HTMLElement;
  finalPromptPreview: HTMLTextAreaElement;
  fixturePicker: HTMLSelectElement;
  interfaceTypeInput: HTMLInputElement;
  notesInput: HTMLTextAreaElement;
  processCorpusStatus: HTMLParagraphElement;
  processIdInput: HTMLInputElement;
  processMeta: HTMLDivElement;
  processPromptInput: HTMLTextAreaElement;
  processPromptVersionInput: HTMLInputElement;
  processSelect: HTMLSelectElement;
  processSourceInput: HTMLInputElement;
  providerSelect: HTMLSelectElement;
  rawOutputInput: HTMLTextAreaElement;
  resultSummary: HTMLParagraphElement;
  runNumberInput: HTMLInputElement;
  runChangeEvaluationButton: HTMLButtonElement;
  statusBar: HTMLDivElement;
  statusPill: HTMLSpanElement;
  statusSummary: HTMLSpanElement;
  systemPromptInput: HTMLTextAreaElement;
  systemPromptSelect: HTMLSelectElement;
  systemPromptVersionInput: HTMLInputElement;
  textarea: HTMLTextAreaElement;
  toggleMessageFlowsButton: HTMLButtonElement;
  editorView: HTMLElement;
  modelLabelInput: HTMLInputElement;
};

type LastSuccess = {
  layoutXml: string;
  model: ResolvedModel;
  semanticXml: string;
  source: string;
};

type ExperimentArtifacts = {
  pngBlob?: Blob;
  svg?: string;
};

type AppTab = "editor" | "experiments" | "change-experiments";

type ChangeExperimentDraft = {
  activeTab: AppTab;
  baseDsl: string;
  caseId: string;
  changedDsl: string;
  createdAt: string;
  expectedChangeDetailsJson: string;
  expectedChangeType: ExpectedChangeType;
  lastResult?: ChangeExperimentExport;
  modelName: string;
  notes: string;
  promptVersion: string;
};

type ChangeExperimentExport = {
  changeExperimentId: string;
  model: string;
  promptVersion: string;
  baseDslHash: string;
  changedDslHash: string;
  expectedChangeSpec: ExpectedChangeSpec;
  changeEvaluation: ChangeEvaluationResult["changeEvaluation"];
  createdAt: string;
  notes: string;
  parseDiagnostics: {
    base: ExperimentDiagnostic[];
    changed: ExperimentDiagnostic[];
  };
};

const DEBOUNCE_MS = 250;
const STORAGE_KEY = "bpmn-sketch-miner.experiments.v1";
const CHANGE_STORAGE_KEY = "bpmn-sketch-miner.change-experiments.v1";
const APP_VERSION = packageJson.version;

export function mountApp(options: MountOptions): { destroy(): void } {
  const root = options.root ?? document;
  const deps = resolveDeps(options.deps);
  const els = getElements(root);
  const modeler = deps.createModeler(els.canvas);

  let debounceTimer: number | undefined;
  let renderToken = 0;
  let currentState: UiState = "idle";
  let baseDiagnostics: ExperimentDiagnostic[] = [];
  let transientDiagnostics: ExperimentDiagnostic[] = [];
  let lastSuccess: LastSuccess | null = null;
  let lastExperimentResult: ExperimentEvaluationResult | null = null;
  let lastExperimentArtifacts: ExperimentArtifacts | null = null;
  let activeEditorSource: "manual" | "fixture" | "experiment" = "manual";
  let activeFixturePath = "";

  const fixtureEntries = Object.entries(deps.fixtures).sort(([a], [b]) =>
    fixtureLabel(a).localeCompare(fixtureLabel(b)),
  );
  const experimentLibrary = deps.experimentLibrary;
  const processMap = new Map(experimentLibrary.processes.map((process) => [process.process_id, process]));
  const systemPromptMap = new Map(experimentLibrary.systemPrompts.map((prompt) => [prompt.id, prompt]));
  let experimentDraft = readStoredDraft(experimentLibrary);
  let changeDraft = readStoredChangeDraft();
  let lastChangeResult: ChangeExperimentExport | null = changeDraft.lastResult ?? null;

  populateFixturePicker(els.fixturePicker, fixtureEntries);
  populateSystemPromptPicker(els.systemPromptSelect, experimentLibrary.systemPrompts);
  populateProcessPicker(els.processSelect, experimentLibrary.processes);
  applyDraftToForm(els, experimentDraft, experimentLibrary);
  applyChangeDraftToForm(els, changeDraft);
  renderProcessMeta(els, processMap.get(experimentDraft.processSelection) ?? null);
  renderCorpusStatus(els, experimentLibrary);
  updateExperimentPreview(els, experimentDraft);
  renderChangeResult(els, lastChangeResult);
  updateEditorSourceNote(els, activeEditorSource, activeFixturePath);
  updateActionState();
  updateExperimentActionState();
  updateChangeActionState();
  setState("idle", "Paste BPMN Sketch Miner DSL to begin.");
  renderDiagnostics();
  updateTabUi(els, changeDraft.activeTab === "change-experiments" ? "change-experiments" : experimentDraft.activeTab);

  if (fixtureEntries.length > 0) {
    const initialPath =
      fixtureEntries.find(([path]) => path.includes("gemini-03"))?.[0] ?? fixtureEntries[0][0];
    activeFixturePath = initialPath;
    els.fixturePicker.value = initialPath;
    els.textarea.value = deps.fixtures[initialPath];
    activeEditorSource = "fixture";
    updateEditorSourceNote(els, activeEditorSource, activeFixturePath);
    void evaluateDsl(els.textarea.value);
  }

  const onFixtureChange = (): void => {
    const source = deps.fixtures[els.fixturePicker.value];
    if (source === undefined) return;
    activeFixturePath = els.fixturePicker.value;
    activeEditorSource = "fixture";
    els.textarea.value = source;
    updateEditorSourceNote(els, activeEditorSource, activeFixturePath);
    void evaluateDsl(source);
  };

  const onEditorInput = (): void => {
    activeEditorSource = "manual";
    updateEditorSourceNote(els, activeEditorSource, activeFixturePath);
    scheduleRender();
  };

  const onCopyXml = async (): Promise<void> => {
    if (lastSuccess === null) return;
    clearTransientDiagnostics();
    try {
      await deps.copyText(lastSuccess.layoutXml);
    } catch (err) {
      setTransientDiagnostics([makeUiDiagnostic("EXPORT-CLIPBOARD", errorMessage(err))]);
    }
  };

  const onDownloadBpmn = (): void => {
    if (lastSuccess === null) return;
    clearTransientDiagnostics();
    try {
      deps.saveFile(
        `${currentExportBaseName(activeFixturePath, activeEditorSource)}.bpmn`,
        lastSuccess.layoutXml,
        "application/xml;charset=utf-8",
      );
    } catch (err) {
      setTransientDiagnostics([makeUiDiagnostic("EXPORT-BPMN", errorMessage(err))]);
    }
  };

  // View-only toggle: hide/show all message-flow connections on the canvas to
  // declutter dense multi-pool collaborations. The class lives on the canvas
  // container, so it persists across live re-renders. Export (BPMN/SVG/PNG)
  // is unaffected — this only changes what is displayed.
  const onToggleMessageFlows = (): void => {
    const hidden = els.canvas.classList.toggle("hide-message-flows");
    els.toggleMessageFlowsButton.textContent = hidden ? "Show message flows" : "Hide message flows";
    els.toggleMessageFlowsButton.setAttribute("aria-pressed", hidden ? "true" : "false");
  };

  const onDownloadSvg = async (): Promise<void> => {
    if (lastSuccess === null) return;
    clearTransientDiagnostics();
    try {
      await deps.saveSvg(
        modeler,
        `${currentExportBaseName(activeFixturePath, activeEditorSource)}.svg`,
        deps.saveFile,
      );
    } catch (err) {
      setTransientDiagnostics([makeUiDiagnostic("EXPORT-SVG", errorMessage(err))]);
    }
  };

  const onDownloadPng = async (): Promise<void> => {
    if (lastSuccess === null) return;
    clearTransientDiagnostics();
    try {
      await deps.savePng(
        modeler,
        `${currentExportBaseName(activeFixturePath, activeEditorSource)}.png`,
        deps.saveFile,
      );
    } catch (err) {
      setTransientDiagnostics([makeUiDiagnostic("EXPORT-PNG", errorMessage(err))]);
    }
  };

  const onEditorTabClick = (): void => {
    experimentDraft.activeTab = "editor";
    changeDraft.activeTab = "editor";
    persistDraft(experimentDraft);
    persistChangeDraft(changeDraft);
    updateTabUi(els, experimentDraft.activeTab);
  };

  const onExperimentTabClick = (): void => {
    experimentDraft.activeTab = "experiments";
    changeDraft.activeTab = "experiments";
    persistDraft(experimentDraft);
    persistChangeDraft(changeDraft);
    updateTabUi(els, experimentDraft.activeTab);
  };

  const onChangeExperimentsTabClick = (): void => {
    experimentDraft.activeTab = "change-experiments";
    changeDraft.activeTab = "change-experiments";
    persistDraft(experimentDraft);
    persistChangeDraft(changeDraft);
    updateTabUi(els, "change-experiments");
  };

  const onSystemPromptChange = (): void => {
    const selected = systemPromptMap.get(els.systemPromptSelect.value);
    if (selected !== undefined) {
      els.systemPromptInput.value = selected.text;
      els.systemPromptVersionInput.value = selected.versionHint;
    }
    syncDraftFromForm();
  };

  const onProcessSelectionChange = (): void => {
    const selected = processMap.get(els.processSelect.value) ?? null;
    if (selected !== null) {
      applyProcessSelection(els, selected);
    }
    renderProcessMeta(els, selected);
    syncDraftFromForm();
  };

  const onExperimentInput = (): void => {
    syncDraftFromForm();
  };

  const onChangeExperimentInput = (): void => {
    syncChangeDraftFromForm();
  };

  const onCopyPrompt = async (): Promise<void> => {
    syncDraftFromForm();
    clearTransientDiagnostics();
    try {
      await deps.copyText(els.finalPromptPreview.value);
    } catch (err) {
      setTransientDiagnostics([makeUiDiagnostic("EXPERIMENT-COPY-PROMPT", errorMessage(err))]);
    }
  };

  const onEvaluateOutput = async (): Promise<void> => {
    syncDraftFromForm();
    clearTransientDiagnostics();
    const finalPrompt = buildFinalPrompt(els.systemPromptInput.value, els.processPromptInput.value);
    const rawOutput = els.rawOutputInput.value;
    const normalizedDsl = normalizeDslOutput(rawOutput);
    const evaluatedAt = new Date().toISOString();

    experimentDraft.activeTab = "experiments";
    persistDraft(experimentDraft);
    updateTabUi(els, experimentDraft.activeTab);

    els.textarea.value = normalizedDsl;
    activeEditorSource = "experiment";
    updateEditorSourceNote(els, activeEditorSource, activeFixturePath);

    const outcome = await evaluateDsl(normalizedDsl);

    const [inputPromptHash, rawOutputHash, normalizedDslHash] = await Promise.all([
      deps.hashText(finalPrompt),
      deps.hashText(rawOutput),
      deps.hashText(normalizedDsl),
    ]);

    let experimentArtifacts: ExperimentArtifacts = {};
    if (outcome.succeeded) {
      try {
        experimentArtifacts = {
          svg: await deps.exportSvg(modeler),
        };
      } catch {
        experimentArtifacts = {};
      }

      if (experimentArtifacts.svg !== undefined) {
        try {
          experimentArtifacts.pngBlob = await deps.exportPngBlob(modeler);
        } catch {
          // Ignore PNG export failures in experiment metadata.
        }
      }
    }

    const parserValid = outcome.parserErrors.length === 0;
    const semanticValid = outcome.semanticErrors.length === 0;
    const renderValid = outcome.renderErrors.length === 0 && outcome.succeeded;
    const status = determineExperimentStatus(
      outcome.parserErrors,
      outcome.semanticErrors,
      outcome.semanticWarnings,
      outcome.renderErrors,
      outcome.bpmnValidation,
    );

    const metadata = {
      experimentId: generateExperimentId({
        modelLabel: els.modelLabelInput.value,
        processId: els.processIdInput.value,
        provider: els.providerSelect.value,
        runNumber: Number.parseInt(els.runNumberInput.value, 10),
        systemPromptVersion: els.systemPromptVersionInput.value,
      }),
      processId: els.processIdInput.value.trim(),
      processSource: els.processSourceInput.value.trim(),
      systemPromptVersion: els.systemPromptVersionInput.value.trim(),
      processPromptVersion: els.processPromptVersionInput.value.trim(),
      provider: els.providerSelect.value,
      modelLabel: els.modelLabelInput.value.trim(),
      interfaceType: "web" as const,
      runNumber: Math.max(0, Number.parseInt(els.runNumberInput.value, 10) || 0),
      createdAt: experimentDraft.createdAt,
      inputPromptHash,
      rawOutputHash,
      normalizedDslHash,
      parserValid,
      semanticValid,
      bpmnImportValid: renderValid,
      renderValid,
      status,
      notes: els.notesInput.value,
    };

    lastExperimentArtifacts = experimentArtifacts;
    lastExperimentResult = buildExperimentResult({
      appVersion: APP_VERSION,
      evaluatedAt,
      inputPrompt: finalPrompt,
      metadata,
      notes: els.notesInput.value,
      normalizedDsl,
      outcome,
      rawOutput,
      svgAvailable: experimentArtifacts.svg !== undefined,
      pngAvailable: experimentArtifacts.pngBlob !== undefined,
    });

    els.resultSummary.textContent =
      `${metadata.experimentId} · ${metadata.status.replace(/_/g, " ")} · ` +
      `${lastExperimentResult.metrics.tasks} tasks, ${lastExperimentResult.metrics.gateways} gateways`;
    updateExperimentActionState();
  };

  const onCopyManifest = async (): Promise<void> => {
    if (lastExperimentResult === null) return;
    clearTransientDiagnostics();
    try {
      await deps.copyText(buildManifestRow(lastExperimentResult.metadata, lastExperimentResult.bpmnValidation));
    } catch (err) {
      setTransientDiagnostics([makeUiDiagnostic("EXPERIMENT-COPY-MANIFEST", errorMessage(err))]);
    }
  };

  const onDownloadResult = (): void => {
    if (lastExperimentResult === null) return;
    clearTransientDiagnostics();
    try {
      deps.saveFile(
        "result.json",
        JSON.stringify(lastExperimentResult, null, 2),
        "application/json;charset=utf-8",
      );
    } catch (err) {
      setTransientDiagnostics([makeUiDiagnostic("EXPERIMENT-DOWNLOAD-RESULT", errorMessage(err))]);
    }
  };

  const onDownloadExperimentFiles = (): void => {
    if (lastExperimentResult === null) return;
    clearTransientDiagnostics();
    try {
      const assets = buildExperimentBundle(lastExperimentResult);
      if (lastExperimentArtifacts?.svg !== undefined) {
        assets.push({
          filename: "diagram.svg",
          data: lastExperimentArtifacts.svg,
          mime: "image/svg+xml;charset=utf-8",
        });
      }
      if (lastExperimentArtifacts?.pngBlob !== undefined) {
        assets.push({
          filename: "diagram.png",
          data: lastExperimentArtifacts.pngBlob,
          mime: "image/png",
        });
      }
      for (const asset of assets) {
        deps.saveFile(asset.filename, asset.data, asset.mime);
      }
    } catch (err) {
      setTransientDiagnostics([makeUiDiagnostic("EXPERIMENT-DOWNLOAD-FILES", errorMessage(err))]);
    }
  };

  const onRunChangeEvaluation = async (): Promise<void> => {
    syncChangeDraftFromForm();
    clearTransientDiagnostics();

    const expectedChangeSpec = readExpectedChangeSpec(els);
    if (expectedChangeSpec instanceof Error) {
      setTransientDiagnostics([makeUiDiagnostic("CHANGE-SPEC-JSON", expectedChangeSpec.message)]);
      return;
    }

    const baseParseResult = deps.parseDsl(els.changeBaseDslInput.value);
    const changedParseResult = deps.parseDsl(els.changeChangedDslInput.value);
    const baseDiagnostics = baseParseResult.errors.map(classifyDslDiagnostic);
    const changedDiagnostics = changedParseResult.errors.map(classifyDslDiagnostic);
    const baseParseable = baseDiagnostics.every((diag) => diag.severity !== "error");
    const changedParseable = changedDiagnostics.every((diag) => diag.severity !== "error");
    const changedValidation = deps.validateBpmnModel(changedParseResult.model);

    const changeEvaluation = evaluateModelChange(
      baseParseResult.model,
      changedParseResult.model,
      expectedChangeSpec,
      {
        baseModelParseable: baseParseable,
        changedBpmnValidation: changedValidation,
        changedModelParseable: changedParseable,
      },
    ).changeEvaluation;

    const [baseDslHash, changedDslHash] = await Promise.all([
      deps.hashText(els.changeBaseDslInput.value),
      deps.hashText(els.changeChangedDslInput.value),
    ]);

    lastChangeResult = {
      changeExperimentId: els.changeCaseIdInput.value.trim() || "CHANGE-EXPERIMENT",
      model: els.changeModelNameInput.value.trim(),
      promptVersion: els.changePromptVersionInput.value.trim(),
      baseDslHash,
      changedDslHash,
      expectedChangeSpec,
      changeEvaluation,
      createdAt: changeDraft.createdAt,
      notes: els.changeNotesInput.value,
      parseDiagnostics: {
        base: baseDiagnostics,
        changed: changedDiagnostics,
      },
    };

    changeDraft.lastResult = lastChangeResult;
    persistChangeDraft(changeDraft);
    renderChangeResult(els, lastChangeResult);
    updateChangeActionState();
  };

  const onCopyChangeResult = async (): Promise<void> => {
    if (lastChangeResult === null) return;
    clearTransientDiagnostics();
    try {
      await deps.copyText(JSON.stringify(lastChangeResult, null, 2));
    } catch (err) {
      setTransientDiagnostics([makeUiDiagnostic("CHANGE-COPY-RESULT", errorMessage(err))]);
    }
  };

  const onDownloadChangeResult = (): void => {
    if (lastChangeResult === null) return;
    clearTransientDiagnostics();
    try {
      deps.saveFile(
        "change-result.json",
        JSON.stringify(lastChangeResult, null, 2),
        "application/json;charset=utf-8",
      );
    } catch (err) {
      setTransientDiagnostics([makeUiDiagnostic("CHANGE-DOWNLOAD-RESULT", errorMessage(err))]);
    }
  };

  els.fixturePicker.addEventListener("change", onFixtureChange);
  els.textarea.addEventListener("input", onEditorInput);
  els.copyXmlButton.addEventListener("click", () => void onCopyXml());
  els.downloadBpmnButton.addEventListener("click", onDownloadBpmn);
  els.toggleMessageFlowsButton.addEventListener("click", onToggleMessageFlows);
  els.downloadSvgButton.addEventListener("click", () => void onDownloadSvg());
  els.downloadPngButton.addEventListener("click", () => void onDownloadPng());
  els.editorTabButton.addEventListener("click", onEditorTabClick);
  els.experimentTabButton.addEventListener("click", onExperimentTabClick);
  els.changeExperimentsTabButton.addEventListener("click", onChangeExperimentsTabClick);
  els.systemPromptSelect.addEventListener("change", onSystemPromptChange);
  els.processSelect.addEventListener("change", onProcessSelectionChange);
  els.systemPromptInput.addEventListener("input", onExperimentInput);
  els.processPromptInput.addEventListener("input", onExperimentInput);
  els.providerSelect.addEventListener("change", onExperimentInput);
  els.modelLabelInput.addEventListener("input", onExperimentInput);
  els.processIdInput.addEventListener("input", onExperimentInput);
  els.processSourceInput.addEventListener("input", onExperimentInput);
  els.systemPromptVersionInput.addEventListener("input", onExperimentInput);
  els.processPromptVersionInput.addEventListener("input", onExperimentInput);
  els.runNumberInput.addEventListener("input", onExperimentInput);
  els.rawOutputInput.addEventListener("input", onExperimentInput);
  els.notesInput.addEventListener("input", onExperimentInput);
  els.copyPromptButton.addEventListener("click", () => void onCopyPrompt());
  els.evaluateOutputButton.addEventListener("click", () => void onEvaluateOutput());
  els.copyManifestButton.addEventListener("click", () => void onCopyManifest());
  els.downloadResultButton.addEventListener("click", onDownloadResult);
  els.downloadExperimentFilesButton.addEventListener("click", onDownloadExperimentFiles);
  els.changeCaseIdInput.addEventListener("input", onChangeExperimentInput);
  els.changeModelNameInput.addEventListener("input", onChangeExperimentInput);
  els.changePromptVersionInput.addEventListener("input", onChangeExperimentInput);
  els.changeTypeSelect.addEventListener("change", onChangeExperimentInput);
  els.changeBaseDslInput.addEventListener("input", onChangeExperimentInput);
  els.changeChangedDslInput.addEventListener("input", onChangeExperimentInput);
  els.changeSpecJsonInput.addEventListener("input", onChangeExperimentInput);
  els.changeNotesInput.addEventListener("input", onChangeExperimentInput);
  els.runChangeEvaluationButton.addEventListener("click", () => void onRunChangeEvaluation());
  els.copyChangeResultButton.addEventListener("click", () => void onCopyChangeResult());
  els.downloadChangeResultButton.addEventListener("click", onDownloadChangeResult);

  return {
    destroy(): void {
      if (debounceTimer !== undefined) {
        window.clearTimeout(debounceTimer);
      }
      els.fixturePicker.removeEventListener("change", onFixtureChange);
      els.textarea.removeEventListener("input", onEditorInput);
      modeler.destroy?.();
    },
  };

  function syncDraftFromForm(): void {
    experimentDraft = {
      activeTab: experimentDraft.activeTab,
      createdAt: experimentDraft.createdAt,
      interfaceType: "web",
      modelLabel: els.modelLabelInput.value,
      notes: els.notesInput.value,
      processId: els.processIdInput.value,
      processPromptText: els.processPromptInput.value,
      processPromptVersion: els.processPromptVersionInput.value,
      processSelection: els.processSelect.value,
      processSource: els.processSourceInput.value,
      provider: asProvider(els.providerSelect.value),
      rawOutput: els.rawOutputInput.value,
      runNumber: Math.max(1, Number.parseInt(els.runNumberInput.value, 10) || 1),
      selectedSystemPrompt: els.systemPromptSelect.value,
      systemPromptText: els.systemPromptInput.value,
      systemPromptVersion: els.systemPromptVersionInput.value,
    };
    persistDraft(experimentDraft);
    updateExperimentPreview(els, experimentDraft);
  }

  function syncChangeDraftFromForm(): void {
    changeDraft = {
      activeTab: changeDraft.activeTab,
      baseDsl: els.changeBaseDslInput.value,
      caseId: els.changeCaseIdInput.value,
      changedDsl: els.changeChangedDslInput.value,
      createdAt: changeDraft.createdAt,
      expectedChangeDetailsJson: els.changeSpecJsonInput.value,
      expectedChangeType: asExpectedChangeType(els.changeTypeSelect.value),
      lastResult: lastChangeResult ?? undefined,
      modelName: els.changeModelNameInput.value,
      notes: els.changeNotesInput.value,
      promptVersion: els.changePromptVersionInput.value,
    };
    persistChangeDraft(changeDraft);
  }

  function scheduleRender(): void {
    if (debounceTimer !== undefined) {
      window.clearTimeout(debounceTimer);
    }
    clearTransientDiagnostics();
    setState("rendering", "Waiting for typing to pause...");
    debounceTimer = window.setTimeout(() => {
      void evaluateDsl(els.textarea.value);
    }, DEBOUNCE_MS);
  }

  async function evaluateDsl(source: string): Promise<DslEvaluationOutcome> {
    const token = ++renderToken;
    clearTransientDiagnostics();
    setState("rendering", "Parsing DSL and refreshing diagram...");

    const outcome = await evaluateDslPipeline(
      {
        emitBpmnXml: deps.emitBpmnXml,
        parseDsl: deps.parseDsl,
        renderSemanticXml: deps.renderSemanticXml,
        validateBpmnModel: deps.validateBpmnModel,
      },
      modeler,
      source,
    );

    // Stale render: a newer evaluateDsl has started, so skip all UI side
    // effects and let the latest one own the screen.
    if (token !== renderToken) {
      return outcome;
    }

    applyOutcomeToUi(outcome, source);
    return outcome;
  }

  /** Reflect a finished pipeline outcome into the editor UI + export state. */
  function applyOutcomeToUi(outcome: DslEvaluationOutcome, source: string): void {
    baseDiagnostics = outcome.diagnostics;

    if (outcome.succeeded && outcome.layoutXml !== undefined && outcome.model !== undefined) {
      lastSuccess = {
        layoutXml: outcome.layoutXml,
        model: outcome.model,
        semanticXml: outcome.semanticXml ?? "",
        source,
      };
      renderDiagnostics();
      if (outcome.rawWarnings.length > 0) {
        deps.logWarnings(outcome.rawWarnings);
      }
      setState(
        outcome.diagnostics.some((diag) => diag.severity === "error" || diag.severity === "warning")
          ? "valid-with-warnings"
          : "valid",
        summarizeModel(outcome.model, outcome.diagnostics.filter((diag) => diag.severity !== "info").length),
      );
      updateActionState();
      return;
    }

    outcome.lastGoodDiagramRetained = lastSuccess !== null;
    renderDiagnostics();
    if (outcome.renderErrors.length > 0) {
      setState(
        "invalid",
        lastSuccess === null
          ? "Render failed. No valid diagram is available yet."
          : "Render failed for the latest input. Showing the last good diagram.",
      );
    } else {
      setState(
        "invalid",
        lastSuccess === null
          ? "Input has errors. No valid diagram is available yet."
          : "Input has errors. Showing the last good diagram.",
      );
    }
    updateActionState();
  }

  function updateActionState(): void {
    const disabled = lastSuccess === null;
    els.copyXmlButton.disabled = disabled;
    els.downloadBpmnButton.disabled = disabled;
    els.downloadSvgButton.disabled = disabled;
    els.downloadPngButton.disabled = disabled;
  }

  function updateExperimentActionState(): void {
    const disabled = lastExperimentResult === null;
    els.copyManifestButton.disabled = disabled;
    els.downloadResultButton.disabled = disabled;
    els.downloadExperimentFilesButton.disabled = disabled;
  }

  function updateChangeActionState(): void {
    const disabled = lastChangeResult === null;
    els.copyChangeResultButton.disabled = disabled;
    els.downloadChangeResultButton.disabled = disabled;
  }

  function clearTransientDiagnostics(): void {
    if (transientDiagnostics.length === 0) return;
    transientDiagnostics = [];
    renderDiagnostics();
  }

  function setTransientDiagnostics(diagnostics: ExperimentDiagnostic[]): void {
    transientDiagnostics = diagnostics;
    renderDiagnostics();
  }

  function renderDiagnostics(): void {
    const diagnostics = [...baseDiagnostics, ...transientDiagnostics];
    els.diagnosticsList.replaceChildren();

    if (diagnostics.length === 0) {
      els.diagnosticsEmpty.hidden = false;
      els.diagnosticsEmpty.textContent = diagnosticsEmptyMessage(currentState, lastSuccess !== null);
      return;
    }

    els.diagnosticsEmpty.hidden = true;
    for (const diag of diagnostics) {
      const item = document.createElement("li");
      item.className = `diagnostic diagnostic-${diag.severity}`;

      const meta = document.createElement("div");
      meta.className = "diagnostic-meta";

      const source = document.createElement("span");
      source.className = "diagnostic-source";
      source.textContent = `${diag.source.toUpperCase()} · ${diag.category.toUpperCase()}`;
      meta.appendChild(source);

      const code = document.createElement("code");
      code.textContent = diag.code;
      meta.appendChild(code);

      if (diag.line !== undefined) {
        const line = document.createElement("span");
        line.textContent = `line ${diag.line}`;
        meta.appendChild(line);
      }

      const message = document.createElement("p");
      message.className = "diagnostic-message";
      message.textContent = diag.message;

      item.appendChild(meta);
      item.appendChild(message);
      els.diagnosticsList.appendChild(item);
    }
  }

  function setState(state: UiState, summary: string): void {
    currentState = state;
    els.statusBar.dataset.state = state;
    els.statusPill.dataset.state = state;
    els.statusPill.textContent = stateLabel(state);
    els.statusSummary.textContent = summary;
    if (baseDiagnostics.length === 0 && transientDiagnostics.length === 0) {
      els.diagnosticsEmpty.textContent = diagnosticsEmptyMessage(state, lastSuccess !== null);
    }
  }
}

function resolveDeps(overrides: Partial<AppDeps> | undefined): AppDeps {
  return {
    copyText:
      overrides?.copyText ??
      (async (text: string) => {
        if (navigator.clipboard?.writeText === undefined) {
          throw new Error("Clipboard API is unavailable in this browser.");
        }
        await navigator.clipboard.writeText(text);
      }),
    createModeler:
      overrides?.createModeler ??
      (() => {
        throw new Error("mountApp requires a createModeler dependency.");
      }),
    emitBpmnXml: overrides?.emitBpmnXml ?? defaultEmitBpmnXml,
    experimentLibrary: overrides?.experimentLibrary ?? loadExperimentLibrary(),
    exportPngBlob:
      overrides?.exportPngBlob ??
      (async (modeler: ModelerLike) => svgToPngBlob(await exportSvg(modeler))),
    exportSvg: overrides?.exportSvg ?? exportSvg,
    fixtures: overrides?.fixtures ?? fixtureModules,
    hashText: overrides?.hashText ?? digestSha256Hex,
    logWarnings:
      overrides?.logWarnings ?? ((warnings) => console.warn("bpmn-js import warnings:", warnings)),
    parseDsl: overrides?.parseDsl ?? defaultParseDsl,
    renderSemanticXml:
      overrides?.renderSemanticXml ??
      ((modeler, semanticXml, model) =>
        defaultRenderSemanticXml(modeler as never, semanticXml, model)),
    saveFile: overrides?.saveFile ?? saveFile,
    savePng: overrides?.savePng ?? savePng,
    saveSvg: overrides?.saveSvg ?? saveSvg,
    validateBpmnModel: overrides?.validateBpmnModel ?? defaultValidateBpmnModel,
  };
}

function getElements(root: ParentNode): AppElements {
  return {
    activeSourceNote: getRequired(root, "#editor-source-note"),
    canvas: getRequired(root, "#canvas"),
    changeBaseDslInput: getRequired(root, "#change-base-dsl"),
    changeCaseIdInput: getRequired(root, "#change-case-id"),
    changeChangedDslInput: getRequired(root, "#change-changed-dsl"),
    changeChecksList: getRequired(root, "#change-checks"),
    changeExperimentsTabButton: getRequired(root, "#tab-change-experiments"),
    changeExperimentsView: getRequired(root, "#change-experiments-view"),
    changeMetrics: getRequired(root, "#change-metrics"),
    changeModelNameInput: getRequired(root, "#change-model-name"),
    changeNotesInput: getRequired(root, "#change-notes"),
    changePromptVersionInput: getRequired(root, "#change-prompt-version"),
    changeResultJsonInput: getRequired(root, "#change-result-json"),
    changeResultSummary: getRequired(root, "#change-result-summary"),
    changeSpecJsonInput: getRequired(root, "#change-spec-json"),
    changeTypeSelect: getRequired(root, "#change-type"),
    copyManifestButton: getRequired(root, "#copy-manifest-row"),
    copyChangeResultButton: getRequired(root, "#copy-change-result"),
    copyPromptButton: getRequired(root, "#copy-prompt"),
    copyXmlButton: getRequired(root, "#copy-xml"),
    diagnosticsEmpty: getRequired(root, "#diagnostics-empty"),
    diagnosticsList: getRequired(root, "#diagnostics-list"),
    downloadBpmnButton: getRequired(root, "#download-bpmn"),
    downloadChangeResultButton: getRequired(root, "#download-change-result"),
    downloadExperimentFilesButton: getRequired(root, "#download-experiment-files"),
    downloadPngButton: getRequired(root, "#download-png"),
    downloadResultButton: getRequired(root, "#download-result"),
    downloadSvgButton: getRequired(root, "#download-svg"),
    editorTabButton: getRequired(root, "#tab-editor"),
    editorView: getRequired(root, "#editor-view"),
    evaluateOutputButton: getRequired(root, "#evaluate-output"),
    experimentIdPreview: getRequired(root, "#experiment-id-preview"),
    experimentTabButton: getRequired(root, "#tab-experiments"),
    experimentsView: getRequired(root, "#experiments-view"),
    finalPromptPreview: getRequired(root, "#final-prompt-preview"),
    fixturePicker: getRequired(root, "#fixture-picker"),
    interfaceTypeInput: getRequired(root, "#interface-type"),
    modelLabelInput: getRequired(root, "#model-label"),
    notesInput: getRequired(root, "#experiment-notes"),
    processCorpusStatus: getRequired(root, "#process-corpus-status"),
    processIdInput: getRequired(root, "#process-id"),
    processMeta: getRequired(root, "#process-meta"),
    processPromptInput: getRequired(root, "#process-prompt"),
    processPromptVersionInput: getRequired(root, "#process-prompt-version"),
    processSelect: getRequired(root, "#process-select"),
    processSourceInput: getRequired(root, "#process-source"),
    providerSelect: getRequired(root, "#provider"),
    rawOutputInput: getRequired(root, "#raw-output"),
    resultSummary: getRequired(root, "#result-summary"),
    runNumberInput: getRequired(root, "#run-number"),
    runChangeEvaluationButton: getRequired(root, "#run-change-evaluation"),
    statusBar: getRequired(root, "#status-bar"),
    statusPill: getRequired(root, "#status-pill"),
    statusSummary: getRequired(root, "#status-summary"),
    systemPromptInput: getRequired(root, "#system-prompt"),
    systemPromptSelect: getRequired(root, "#system-prompt-select"),
    systemPromptVersionInput: getRequired(root, "#system-prompt-version"),
    textarea: getRequired(root, "#dsl-input"),
    toggleMessageFlowsButton: getRequired(root, "#toggle-message-flows"),
  };
}

function getRequired<T extends Element>(root: ParentNode, selector: string): T {
  const el = root.querySelector<T>(selector);
  if (el === null) {
    throw new Error(`Missing required app element: ${selector}`);
  }
  return el;
}

function populateFixturePicker(select: HTMLSelectElement, entries: Array<[string, string]>): void {
  select.replaceChildren();
  for (const [path] of entries) {
    const option = document.createElement("option");
    option.value = path;
    option.textContent = fixtureLabel(path);
    select.appendChild(option);
  }
}

function populateSystemPromptPicker(
  select: HTMLSelectElement,
  prompts: SystemPromptDefinition[],
): void {
  select.replaceChildren();
  for (const prompt of prompts) {
    const option = document.createElement("option");
    option.value = prompt.id;
    option.textContent = prompt.label;
    select.appendChild(option);
  }
}

function populateProcessPicker(select: HTMLSelectElement, processes: ProcessPromptDefinition[]): void {
  select.replaceChildren();
  const custom = document.createElement("option");
  custom.value = "";
  custom.textContent = "Custom process prompt";
  select.appendChild(custom);
  for (const process of processes) {
    const option = document.createElement("option");
    option.value = process.process_id;
    option.textContent = `${process.process_id} · ${process.title ?? process.filename}`;
    select.appendChild(option);
  }
}

function renderProcessMeta(els: AppElements, process: ProcessPromptDefinition | null): void {
  if (process === null) {
    els.processMeta.textContent = "Manual process entry is active.";
    return;
  }
  const features = process.expected_features?.join(", ") ?? "n/a";
  els.processMeta.textContent =
    `${process.title ?? process.process_id} · ${process.difficulty ?? "unknown"} · ` +
    `${process.short_description ?? "No description."} · Expected: ${features}`;
}

function renderCorpusStatus(els: AppElements, library: ExperimentLibrary): void {
  els.processCorpusStatus.textContent = library.corpusAvailable
    ? `Curated corpus loaded: ${library.processes.length} processes available.`
    : "Curated corpus not found. Manual prompt entry is still available.";
}

function applyDraftToForm(
  els: AppElements,
  draft: ExperimentDraft,
  library: ExperimentLibrary,
): void {
  els.systemPromptSelect.value = draft.selectedSystemPrompt;
  els.systemPromptInput.value = draft.systemPromptText;
  els.providerSelect.value = draft.provider;
  els.modelLabelInput.value = draft.modelLabel;
  els.processSelect.value = draft.processSelection;
  els.processIdInput.value = draft.processId;
  els.processSourceInput.value = draft.processSource;
  els.processPromptInput.value = draft.processPromptText;
  els.systemPromptVersionInput.value = draft.systemPromptVersion;
  els.processPromptVersionInput.value = draft.processPromptVersion;
  els.runNumberInput.value = String(draft.runNumber);
  els.interfaceTypeInput.value = draft.interfaceType;
  els.rawOutputInput.value = draft.rawOutput;
  els.notesInput.value = draft.notes;

  if (draft.systemPromptText.length === 0 && library.systemPrompts.length > 0) {
    const first = library.systemPrompts[0];
    els.systemPromptSelect.value = first.id;
    els.systemPromptInput.value = first.text;
    els.systemPromptVersionInput.value = first.versionHint;
  }
}

function applyChangeDraftToForm(els: AppElements, draft: ChangeExperimentDraft): void {
  els.changeCaseIdInput.value = draft.caseId;
  els.changeModelNameInput.value = draft.modelName;
  els.changePromptVersionInput.value = draft.promptVersion;
  els.changeTypeSelect.value = draft.expectedChangeType;
  els.changeBaseDslInput.value = draft.baseDsl;
  els.changeChangedDslInput.value = draft.changedDsl;
  els.changeSpecJsonInput.value = draft.expectedChangeDetailsJson;
  els.changeNotesInput.value = draft.notes;
}

function applyProcessSelection(els: AppElements, process: ProcessPromptDefinition): void {
  els.processIdInput.value = process.process_id;
  els.processSourceInput.value = process.process_source ?? "";
  els.processPromptInput.value = process.promptText;
}

function readStoredDraft(library: ExperimentLibrary): ExperimentDraft {
  const fallback = createDefaultDraft(library);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw) as Partial<ExperimentDraft>;
    return { ...fallback, ...parsed, activeTab: asAppTab(parsed.activeTab) };
  } catch {
    return fallback;
  }
}

function readStoredChangeDraft(): ChangeExperimentDraft {
  const fallback = createDefaultChangeDraft();
  try {
    const raw = window.localStorage.getItem(CHANGE_STORAGE_KEY);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw) as Partial<ChangeExperimentDraft>;
    return {
      ...fallback,
      ...parsed,
      activeTab: asAppTab(parsed.activeTab),
      expectedChangeType: asExpectedChangeType(parsed.expectedChangeType),
    };
  } catch {
    return fallback;
  }
}

function createDefaultDraft(library: ExperimentLibrary): ExperimentDraft {
  const firstSystem = library.systemPrompts[0];
  return {
    activeTab: "editor",
    createdAt: new Date().toISOString(),
    interfaceType: "web",
    modelLabel: "",
    notes: "",
    processId: "",
    processPromptText: "",
    processPromptVersion: "PROCv1",
    processSelection: "",
    processSource: "",
    provider: "ChatGPT",
    rawOutput: "",
    runNumber: 1,
    selectedSystemPrompt: firstSystem?.id ?? "",
    systemPromptText: firstSystem?.text ?? "",
    systemPromptVersion: firstSystem?.versionHint ?? "SYSv1",
  };
}

function createDefaultChangeDraft(): ChangeExperimentDraft {
  return {
    activeTab: "editor",
    baseDsl: "",
    caseId: "",
    changedDsl: "",
    createdAt: new Date().toISOString(),
    expectedChangeDetailsJson: JSON.stringify(
      {
        activity: "Check documentation",
        mustBeAfter: "Receive request",
        mustBeBefore: "Review request",
      },
      null,
      2,
    ),
    expectedChangeType: "add_activity",
    modelName: "",
    notes: "",
    promptVersion: "",
  };
}

function persistDraft(draft: ExperimentDraft): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Ignore persistence failures.
  }
}

function persistChangeDraft(draft: ChangeExperimentDraft): void {
  try {
    window.localStorage.setItem(CHANGE_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Ignore persistence failures.
  }
}

function updateExperimentPreview(els: AppElements, draft: ExperimentDraft): void {
  els.experimentIdPreview.textContent = generateExperimentId({
    modelLabel: draft.modelLabel,
    processId: draft.processId,
    provider: draft.provider,
    runNumber: draft.runNumber,
    systemPromptVersion: draft.systemPromptVersion,
  });
  els.finalPromptPreview.value = buildFinalPrompt(draft.systemPromptText, draft.processPromptText);
}

function readExpectedChangeSpec(els: AppElements): ExpectedChangeSpec | Error {
  try {
    const details =
      els.changeSpecJsonInput.value.trim().length === 0
        ? {}
        : (JSON.parse(els.changeSpecJsonInput.value) as Record<string, unknown>);
    if (typeof details !== "object" || details === null || Array.isArray(details)) {
      return new Error("Expected change details must be a JSON object.");
    }
    return {
      ...details,
      type: asExpectedChangeType(els.changeTypeSelect.value),
    };
  } catch (err) {
    return new Error(`Expected change details JSON is invalid: ${errorMessage(err)}`);
  }
}

function renderChangeResult(els: AppElements, result: ChangeExperimentExport | null): void {
  els.changeMetrics.replaceChildren();
  els.changeChecksList.replaceChildren();

  if (result === null) {
    els.changeResultSummary.textContent = "No change evaluation has been run yet.";
    els.changeResultJsonInput.value = "";
    return;
  }

  const evaluation = result.changeEvaluation;
  els.changeResultSummary.textContent =
    `${result.changeExperimentId} - ${evaluation.status} - score ${evaluation.score.toFixed(3)} - ` +
    `${evaluation.metrics.unexpectedChangeCount} unexpected change(s)`;
  els.changeResultJsonInput.value = JSON.stringify(result, null, 2);

  const metricEntries = [
    ["Score", evaluation.score.toFixed(3)],
    ["Status", evaluation.status],
    ["Target applied", String(evaluation.metrics.targetChangeApplied)],
    ["Added", String(evaluation.metrics.addedActivities.length)],
    ["Removed", String(evaluation.metrics.removedActivities.length)],
    ["Preservation", evaluation.metrics.preservationRate.toFixed(3)],
  ];

  for (const [label, value] of metricEntries) {
    const chip = document.createElement("div");
    chip.className = "metric-chip";
    const valueEl = document.createElement("strong");
    valueEl.textContent = value;
    const labelEl = document.createElement("span");
    labelEl.textContent = label;
    chip.append(valueEl, labelEl);
    els.changeMetrics.appendChild(chip);
  }

  for (const check of evaluation.checks) {
    const item = document.createElement("li");
    item.className = `diagnostic diagnostic-${check.passed ? "info" : check.severity}`;

    const meta = document.createElement("div");
    meta.className = "diagnostic-meta";
    const status = document.createElement("span");
    status.className = "diagnostic-source";
    status.textContent = `${check.passed ? "PASS" : "FAIL"} - ${check.severity.toUpperCase()}`;
    const code = document.createElement("code");
    code.textContent = check.name;
    meta.append(status, code);

    const message = document.createElement("p");
    message.className = "diagnostic-message";
    message.textContent = check.message;
    item.append(meta, message);
    els.changeChecksList.appendChild(item);
  }
}

function updateTabUi(els: AppElements, activeTab: AppTab): void {
  const editorActive = activeTab === "editor";
  const experimentsActive = activeTab === "experiments";
  const changeActive = activeTab === "change-experiments";
  els.editorTabButton.dataset.active = String(editorActive);
  els.experimentTabButton.dataset.active = String(experimentsActive);
  els.changeExperimentsTabButton.dataset.active = String(changeActive);
  els.editorView.hidden = !editorActive;
  els.experimentsView.hidden = !experimentsActive;
  els.changeExperimentsView.hidden = !changeActive;
}

function updateEditorSourceNote(
  els: AppElements,
  source: "manual" | "fixture" | "experiment",
  fixturePath: string,
): void {
  if (source === "experiment") {
    els.activeSourceNote.hidden = false;
    els.activeSourceNote.textContent = "Editor is showing the latest evaluated experiment output.";
    return;
  }
  if (source === "fixture" && fixturePath.length > 0) {
    els.activeSourceNote.hidden = false;
    els.activeSourceNote.textContent = `Editor is showing fixture: ${fixtureLabel(fixturePath)}.`;
    return;
  }
  els.activeSourceNote.hidden = true;
  els.activeSourceNote.textContent = "";
}

function fixtureLabel(path: string): string {
  return path.split("/").pop() ?? path;
}

function currentExportBaseName(
  path: string,
  activeSource: "manual" | "fixture" | "experiment",
): string {
  if (activeSource === "experiment") {
    return "experiment-output";
  }
  const raw = fixtureLabel(path).replace(/\.dsl$/i, "").trim();
  const sanitized = raw.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return sanitized.length > 0 ? sanitized : "bpmn-diagram";
}

function summarizeModel(model: ResolvedModel, warningCount: number): string {
  const base =
    `${model.flowNodes.size} nodes, ${model.flows.length} flows, ` +
    `${model.pools.length} participant(s), ${model.messageFlows.length} message flow(s)`;
  if (warningCount === 0) {
    return `${base}. Diagram is up to date.`;
  }
  return `${base}. ${warningCount} warning(s) surfaced in diagnostics.`;
}

function diagnosticsEmptyMessage(state: UiState, hasLastSuccess: boolean): string {
  switch (state) {
    case "rendering":
      return "Rendering the latest input...";
    case "valid":
      return "Diagram is up to date.";
    case "valid-with-warnings":
      return "Warnings are listed below.";
    case "invalid":
      return hasLastSuccess
        ? "The latest input is invalid. The last good diagram stays on screen."
        : "No valid diagram has been rendered yet.";
    case "idle":
    default:
      return "Diagnostics will appear here.";
  }
}

function stateLabel(state: UiState): string {
  switch (state) {
    case "idle":
      return "Idle";
    case "rendering":
      return "Rendering";
    case "valid":
      return "Live";
    case "valid-with-warnings":
      return "Warnings";
    case "invalid":
      return "Needs Attention";
  }
}

function makeUiDiagnostic(code: string, message: string): ExperimentDiagnostic {
  return {
    category: "ui",
    code,
    message,
    severity: "error",
    source: "ui",
  };
}

function asProvider(value: string): ExperimentDraft["provider"] {
  if (value === "Gemini" || value === "Claude" || value === "Other") return value;
  return "ChatGPT";
}

function asAppTab(value: unknown): AppTab {
  if (value === "experiments" || value === "change-experiments") return value;
  return "editor";
}

function asExpectedChangeType(value: unknown): ExpectedChangeType {
  switch (value) {
    case "remove_activity":
    case "move_activity_to_lane":
    case "move_activity_before":
    case "move_activity_after":
    case "move_activity_to_branch":
    case "add_branch_condition":
    case "rename_activity":
    case "preserve_unrelated_structure":
      return value;
    case "add_activity":
    default:
      return "add_activity";
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message.length > 0) {
    return err.message;
  }
  return String(err);
}

function saveFile(filename: string, data: BlobPart, mime: string): void {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function saveSvg(modeler: ModelerLike, filename: string, writeFile: SaveFileFn): Promise<void> {
  const svg = await exportSvg(modeler);
  writeFile(filename, svg, "image/svg+xml;charset=utf-8");
}

async function savePng(modeler: ModelerLike, filename: string, writeFile: SaveFileFn): Promise<void> {
  const svg = await exportSvg(modeler);
  const pngBlob = await svgToPngBlob(svg);
  writeFile(filename, pngBlob, "image/png");
}
