import packageJson from "../../package.json";
import type { ParseResult, ResolvedModel } from "@text-to-bpmn/core";
import { emitBpmnXml as defaultEmitBpmnXml, parseDsl as defaultParseDsl } from "@text-to-bpmn/core";
import { digestSha256Hex } from "../experiments/crypto.js";
import {
  buildExperimentBundle,
  buildExperimentResult,
  buildFinalPrompt,
  buildManifestRow,
  bpmnValidationToDiagnostics,
  classifyDslDiagnostic,
  determineExperimentStatus,
  generateExperimentId,
  makeRenderDiagnostic,
  normalizeDslOutput,
  renderWarningToDiagnostic,
} from "../experiments/helpers.js";
import { loadExperimentLibrary, pickDefaultSystemPrompt } from "../experiments/library.js";
import type {
  DslEvaluationOutcome,
  ExperimentDiagnostic,
  ExperimentDraft,
  ExperimentEvaluationResult,
  ExperimentLibrary,
  ProcessPromptDefinition,
  SystemPromptDefinition,
} from "../experiments/types.js";
import { renderSemanticXml as defaultRenderSemanticXml, type RenderResult } from "@text-to-bpmn/core";
import {
  validateBpmnModel as defaultValidateBpmnModel,
  type BpmnValidationResult,
} from "@text-to-bpmn/core";

const fixtureModules = import.meta.glob("../fixtures/*.dsl", {
  eager: true,
  import: "default",
  query: "?raw",
}) as Record<string, string>;

type UiState = "idle" | "rendering" | "valid" | "valid-with-warnings" | "invalid";

type ModelerLike = {
  destroy?: () => void;
  saveSVG?: () => Promise<{ svg: string }>;
};

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
  copyManifestButton: HTMLButtonElement;
  copyPromptButton: HTMLButtonElement;
  copyXmlButton: HTMLButtonElement;
  diagnosticsEmpty: HTMLParagraphElement;
  diagnosticsList: HTMLUListElement;
  downloadBpmnButton: HTMLButtonElement;
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
  statusBar: HTMLDivElement;
  statusPill: HTMLSpanElement;
  statusSummary: HTMLSpanElement;
  systemPromptInput: HTMLTextAreaElement;
  systemPromptSelect: HTMLSelectElement;
  systemPromptVersionInput: HTMLInputElement;
  textarea: HTMLTextAreaElement;
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

const DEBOUNCE_MS = 250;
const STORAGE_KEY = "internal-bpmn-dsl.experiments.v1";
const APP_VERSION = packageJson.version;

export function mountApp(options: MountOptions): {
  destroy(): void;
  setHideMessageFlowsOnExport(hidden: boolean): void;
} {
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
  // When true, message flows are stripped from exported/copied BPMN XML so they
  // don't show up in external tools (e.g. Bizagi). Driven by the editor's
  // "hide message flows" toggle via setHideMessageFlowsOnExport().
  let hideMessageFlowsOnExport = false;
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

  populateFixturePicker(els.fixturePicker, fixtureEntries);
  populateSystemPromptPicker(els.systemPromptSelect, experimentLibrary.systemPrompts);
  populateProcessPicker(els.processSelect, experimentLibrary.processes);
  applyDraftToForm(els, experimentDraft, experimentLibrary);
  renderProcessMeta(els, processMap.get(experimentDraft.processSelection) ?? null);
  renderCorpusStatus(els, experimentLibrary);
  updateExperimentPreview(els, experimentDraft);
  updateEditorSourceNote(els, activeEditorSource, activeFixturePath);
  updateActionState();
  updateExperimentActionState();
  setState("idle", "Paste BPMN textual DSL to begin.");
  renderDiagnostics();
  updateTabUi(els, experimentDraft.activeTab);

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

  const exportXml = (): string =>
    hideMessageFlowsOnExport ? stripMessageFlows(lastSuccess!.layoutXml) : lastSuccess!.layoutXml;

  const onCopyXml = async (): Promise<void> => {
    if (lastSuccess === null) return;
    clearTransientDiagnostics();
    try {
      await deps.copyText(exportXml());
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
        exportXml(),
        "application/xml;charset=utf-8",
      );
    } catch (err) {
      setTransientDiagnostics([makeUiDiagnostic("EXPORT-BPMN", errorMessage(err))]);
    }
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
    persistDraft(experimentDraft);
    updateTabUi(els, experimentDraft.activeTab);
  };

  const onExperimentTabClick = (): void => {
    experimentDraft.activeTab = "experiments";
    persistDraft(experimentDraft);
    updateTabUi(els, experimentDraft.activeTab);
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

  els.fixturePicker.addEventListener("change", onFixtureChange);
  els.textarea.addEventListener("input", onEditorInput);
  els.copyXmlButton.addEventListener("click", () => void onCopyXml());
  els.downloadBpmnButton.addEventListener("click", onDownloadBpmn);
  els.downloadSvgButton.addEventListener("click", () => void onDownloadSvg());
  els.downloadPngButton.addEventListener("click", () => void onDownloadPng());
  els.editorTabButton.addEventListener("click", onEditorTabClick);
  els.experimentTabButton.addEventListener("click", onExperimentTabClick);
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

  return {
    destroy(): void {
      if (debounceTimer !== undefined) {
        window.clearTimeout(debounceTimer);
      }
      els.fixturePicker.removeEventListener("change", onFixtureChange);
      els.textarea.removeEventListener("input", onEditorInput);
      modeler.destroy?.();
    },
    /** Strip message flows from exported/copied BPMN XML when enabled. */
    setHideMessageFlowsOnExport(hidden: boolean): void {
      hideMessageFlowsOnExport = hidden;
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

    const parseResult = deps.parseDsl(source);
    const dslDiagnostics = parseResult.errors.map(classifyDslDiagnostic);
    const modelValidation = deps.validateBpmnModel(parseResult.model);
    const modelValidationDiagnostics = bpmnValidationToDiagnostics(modelValidation, { origins: ["model"] });
    const parserErrors = dslDiagnostics.filter(
      (diag) => diag.category === "parser" && diag.severity === "error",
    );
    const semanticErrors = dslDiagnostics.filter(
      (diag) => diag.category === "semantic" && diag.severity === "error",
    );
    const semanticWarnings = dslDiagnostics.filter((diag) => diag.severity === "warning");

    if (parserErrors.length > 0 || semanticErrors.length > 0) {
      if (token !== renderToken) {
        return makeEvaluationOutcome({
          bpmnValidation: modelValidation,
          diagnostics: [...dslDiagnostics, ...modelValidationDiagnostics],
          parserErrors,
          parseResult,
          semanticErrors,
          semanticWarnings,
        });
      }
      baseDiagnostics = [...dslDiagnostics, ...modelValidationDiagnostics];
      renderDiagnostics();
      setState(
        "invalid",
        lastSuccess === null
          ? "Input has errors. No valid diagram is available yet."
          : "Input has errors. Showing the last good diagram.",
      );
      updateActionState();
      return makeEvaluationOutcome({
        bpmnValidation: modelValidation,
        diagnostics: [...dslDiagnostics, ...modelValidationDiagnostics],
        lastGoodDiagramRetained: lastSuccess !== null,
        parserErrors,
        parseResult,
        semanticErrors,
        semanticWarnings,
      });
    }

    const semanticXml = deps.emitBpmnXml(parseResult.model);

    try {
      const { layoutXml, warnings } = await deps.renderSemanticXml(modeler, semanticXml, parseResult.model);
      const bpmnValidation = deps.validateBpmnModel(parseResult.model, { layoutXml });
      const bpmnDiagnostics = bpmnValidationToDiagnostics(bpmnValidation, { origins: ["model"] });
      if (token !== renderToken) {
        return makeEvaluationOutcome({
          bpmnValidation,
          diagnostics: [...dslDiagnostics, ...warnings.map(renderWarningToDiagnostic), ...bpmnDiagnostics],
          layoutXml,
          model: parseResult.model,
          parseResult,
          rawWarnings: warnings,
          semanticWarnings,
          semanticXml,
          succeeded: true,
        });
      }

      lastSuccess = {
        layoutXml,
        model: parseResult.model,
        semanticXml,
        source,
      };

      const renderWarnings = warnings.map(renderWarningToDiagnostic);
      const diagnostics = [...dslDiagnostics, ...renderWarnings, ...bpmnDiagnostics];

      baseDiagnostics = diagnostics;
      renderDiagnostics();
      if (warnings.length > 0) {
        deps.logWarnings(warnings);
      }

      setState(
        diagnostics.some((diag) => diag.severity === "error" || diag.severity === "warning")
          ? "valid-with-warnings"
          : "valid",
        summarizeModel(parseResult.model, diagnostics.filter((diag) => diag.severity !== "info").length),
      );
      updateActionState();

      return makeEvaluationOutcome({
        bpmnValidation,
        diagnostics,
        layoutXml,
        model: parseResult.model,
        parseResult,
        rawWarnings: warnings,
        semanticWarnings,
        semanticXml,
        succeeded: true,
      });
    } catch (err) {
      const renderErrors = [makeRenderDiagnostic("RENDER-1", `Render failed: ${errorMessage(err)}`)];
      const diagnostics = [...dslDiagnostics, ...renderErrors, ...modelValidationDiagnostics];

      if (token === renderToken) {
        baseDiagnostics = diagnostics;
        renderDiagnostics();
        setState(
          "invalid",
          lastSuccess === null
            ? "Render failed. No valid diagram is available yet."
            : "Render failed for the latest input. Showing the last good diagram.",
        );
        updateActionState();
      }

      return makeEvaluationOutcome({
        bpmnValidation: modelValidation,
        diagnostics,
        lastGoodDiagramRetained: lastSuccess !== null,
        parseResult,
        renderErrors,
        semanticWarnings,
        semanticXml,
      });
    }
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
    copyManifestButton: getRequired(root, "#copy-manifest-row"),
    copyPromptButton: getRequired(root, "#copy-prompt"),
    copyXmlButton: getRequired(root, "#copy-xml"),
    diagnosticsEmpty: getRequired(root, "#diagnostics-empty"),
    diagnosticsList: getRequired(root, "#diagnostics-list"),
    downloadBpmnButton: getRequired(root, "#download-bpmn"),
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
    statusBar: getRequired(root, "#status-bar"),
    statusPill: getRequired(root, "#status-pill"),
    statusSummary: getRequired(root, "#status-summary"),
    systemPromptInput: getRequired(root, "#system-prompt"),
    systemPromptSelect: getRequired(root, "#system-prompt-select"),
    systemPromptVersionInput: getRequired(root, "#system-prompt-version"),
    textarea: getRequired(root, "#dsl-input"),
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

  const preferred = pickDefaultSystemPrompt(library.systemPrompts);
  if (draft.systemPromptText.length === 0 && preferred !== undefined) {
    els.systemPromptSelect.value = preferred.id;
    els.systemPromptInput.value = preferred.text;
    els.systemPromptVersionInput.value = preferred.versionHint;
  }
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
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

function createDefaultDraft(library: ExperimentLibrary): ExperimentDraft {
  const firstSystem = pickDefaultSystemPrompt(library.systemPrompts);
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

function persistDraft(draft: ExperimentDraft): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
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

function updateTabUi(els: AppElements, activeTab: "editor" | "experiments"): void {
  const editorActive = activeTab === "editor";
  els.editorTabButton.dataset.active = String(editorActive);
  els.experimentTabButton.dataset.active = String(!editorActive);
  els.editorView.hidden = !editorActive;
  els.experimentsView.hidden = editorActive;
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

function makeEvaluationOutcome(input: {
  bpmnValidation: BpmnValidationResult;
  diagnostics: ExperimentDiagnostic[];
  layoutXml?: string;
  lastGoodDiagramRetained?: boolean;
  model?: ResolvedModel;
  parseResult: ParseResult;
  parserErrors?: ExperimentDiagnostic[];
  rawWarnings?: unknown[];
  renderErrors?: ExperimentDiagnostic[];
  semanticErrors?: ExperimentDiagnostic[];
  semanticWarnings?: ExperimentDiagnostic[];
  semanticXml?: string;
  succeeded?: boolean;
}): DslEvaluationOutcome {
  return {
    bpmnValidation: input.bpmnValidation,
    diagnostics: input.diagnostics,
    errorDiagnostics: input.diagnostics.filter((diag) => diag.severity === "error"),
    lastGoodDiagramRetained: input.lastGoodDiagramRetained ?? false,
    layoutXml: input.layoutXml,
    model: input.model,
    parserErrors: input.parserErrors ?? [],
    parseErrors: input.parseResult.errors,
    rawWarnings: input.rawWarnings ?? [],
    renderErrors: input.renderErrors ?? [],
    semanticErrors: input.semanticErrors ?? [],
    semanticWarnings: input.semanticWarnings ?? [],
    semanticXml: input.semanticXml,
    succeeded: input.succeeded ?? false,
  };
}

function asProvider(value: string): ExperimentDraft["provider"] {
  if (value === "Gemini" || value === "Claude" || value === "Other") return value;
  return "ChatGPT";
}

function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message.length > 0) {
    return err.message;
  }
  return String(err);
}

/**
 * Remove every `<bpmn:messageFlow>` and its matching DI `<bpmndi:BPMNEdge>` from
 * a BPMN XML string so message-flow lines don't appear when the exported file is
 * opened in another tool (e.g. Bizagi). Matching is by local name so it is
 * independent of the namespace prefixes the emitter happens to use. If the XML
 * fails to parse, the original string is returned unchanged.
 */
function stripMessageFlows(xml: string): string {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) return xml;

  const messageFlowIds = new Set<string>();
  for (const flow of Array.from(doc.getElementsByTagNameNS("*", "messageFlow"))) {
    const id = flow.getAttribute("id");
    if (id) messageFlowIds.add(id);
    flow.remove();
  }
  if (messageFlowIds.size === 0) return xml;

  for (const edge of Array.from(doc.getElementsByTagNameNS("*", "BPMNEdge"))) {
    const ref = edge.getAttribute("bpmnElement");
    if (ref && messageFlowIds.has(ref)) edge.remove();
  }
  return new XMLSerializer().serializeToString(doc);
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

async function exportSvg(modeler: ModelerLike): Promise<string> {
  if (typeof modeler.saveSVG !== "function") {
    throw new Error("This BPMN modeler instance cannot export SVG.");
  }
  const result = await modeler.saveSVG();
  return result.svg;
}

async function svgToPngBlob(svg: string): Promise<Blob> {
  const dimensions = readSvgDimensions(svg);
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil(dimensions.width));
    canvas.height = Math.max(1, Math.ceil(dimensions.height));

    const ctx = canvas.getContext("2d");
    if (ctx === null) {
      throw new Error("Canvas 2D context is unavailable.");
    }

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob === null) {
          reject(new Error("Failed to encode PNG from the current SVG."));
          return;
        }
        resolve(blob);
      }, "image/png");
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function readSvgDimensions(svg: string): { height: number; width: number } {
  const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
  const svgEl = parsed.documentElement;
  const viewBox = svgEl.getAttribute("viewBox");

  if (viewBox !== null) {
    const parts = viewBox
      .trim()
      .split(/\s+/)
      .map((value) => Number(value));
    if (parts.length === 4 && parts.every((value) => Number.isFinite(value))) {
      return { height: parts[3], width: parts[2] };
    }
  }

  const width = Number.parseFloat(svgEl.getAttribute("width") ?? "");
  const height = Number.parseFloat(svgEl.getAttribute("height") ?? "");
  if (Number.isFinite(width) && Number.isFinite(height)) {
    return { height, width };
  }

  return { height: 1080, width: 1600 };
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not decode the exported SVG."));
    image.src = url;
  });
}
