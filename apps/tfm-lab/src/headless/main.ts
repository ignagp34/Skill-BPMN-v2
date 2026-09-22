/**
 * Headless render harness.
 *
 * Served by Vite and driven by Playwright (`scripts/render-experiments.mts`).
 * It mounts a real `bpmn-js` modeler off-screen and exposes two functions on
 * `window` so a batch runner can produce the exact same artifacts the live
 * editor produces — `diagram.bpmn`, `diagram.svg`, `diagram.png`, and
 * `result.json` — without any manual clicking.
 *
 * It deliberately reuses the app's own modules (`evaluateDslPipeline`,
 * `buildExperimentResult`, `exportSvg`/`svgToPngBlob`, `loadExperimentLibrary`)
 * so batch output cannot drift from interactive output.
 */

import BpmnModeler from "bpmn-js/lib/Modeler";

import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn.css";
import "bpmn-js/dist/assets/bpmn-js.css";

import packageJson from "../../package.json";
import {
  emitBpmnXml,
  parseDsl,
  renderRawBpmnXml,
  renderSemanticXml,
  validateBpmnModel,
} from "@text-to-bpmn/core";
import { digestSha256Hex } from "../experiments/crypto.js";
import { evaluateDslPipeline } from "../experiments/evaluate.js";
import { exportSvg, svgToPngBlob, type ModelerLike } from "../experiments/exporters.js";
import {
  buildExperimentResult,
  buildFinalPrompt,
  determineExperimentStatus,
  normalizeDslOutput,
  normalizeExperimentIdSegment,
} from "../experiments/helpers.js";
import { loadExperimentLibrary } from "../experiments/library.js";
import type { ExperimentMetadata } from "../experiments/types.js";
import {
  buildZeroShotXmlResult,
  type RawXmlRenderOutcome,
  type ZeroShotXmlInput,
} from "../experiments/zero-shot-xml.js";

/** Per-experiment input handed over from the Node runner. */
export type RenderExperimentInput = {
  experimentId: string;
  processId: string;
  processSource: string;
  systemPromptVersion: string;
  processPromptVersion: string;
  provider: string;
  modelLabel: string;
  runNumber: number;
  createdAt: string;
  notes: string;
  rawOutput: string;
  /** Exact bytes of an existing input_prompt.md, when present, to keep hashes stable. */
  inputPrompt?: string;
};

export type RenderExperimentOutput = {
  experimentId: string;
  status: string;
  succeeded: boolean;
  resultJson: string;
  normalizedDsl: string;
  inputPrompt: string;
  layoutXml: string | null;
  svg: string | null;
  pngBase64: string | null;
  exportAvailability: { bpmn: boolean; png: boolean; svg: boolean; resultJson: boolean };
};

export type IngestZeroShotXmlOutput = {
  experimentId: string;
  status: string;
  succeeded: boolean;
  resultJson: string;
  layoutXml: string | null;
  svg: string | null;
  pngBase64: string | null;
};

const APP_VERSION = packageJson.version;
const library = loadExperimentLibrary();

const container = document.getElementById("headless-canvas");
if (container === null) {
  throw new Error("headless harness: #headless-canvas container is missing");
}
const modeler = new BpmnModeler({ container });

function reconstructInputPrompt(processId: string, systemPromptVersion: string): string {
  const wantedSys = normalizeExperimentIdSegment(systemPromptVersion);
  const system = library.systemPrompts.find(
    (prompt) => normalizeExperimentIdSegment(prompt.versionHint) === wantedSys,
  );
  const process = library.processes.find((entry) => entry.process_id === processId);
  return buildFinalPrompt(system?.text ?? "", process?.promptText ?? "");
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function exportSvgAndPng(): Promise<{ svg: string | null; pngBase64: string | null }> {
  let svg: string | null = null;
  let pngBase64: string | null = null;
  try {
    svg = await exportSvg(modeler as unknown as ModelerLike);
    try {
      pngBase64 = await blobToBase64(await svgToPngBlob(svg));
    } catch {
      pngBase64 = null;
    }
  } catch {
    svg = null;
  }
  return { svg, pngBase64 };
}

/** Full pipeline: raw LLM output → outcome + result.json + artifacts. */
async function renderExperiment(input: RenderExperimentInput): Promise<RenderExperimentOutput> {
  const normalizedDsl = normalizeDslOutput(input.rawOutput);
  const inputPrompt =
    input.inputPrompt !== undefined && input.inputPrompt.length > 0
      ? input.inputPrompt
      : reconstructInputPrompt(input.processId, input.systemPromptVersion);
  const evaluatedAt = new Date().toISOString();

  const outcome = await evaluateDslPipeline(
    {
      emitBpmnXml,
      parseDsl,
      renderSemanticXml: (target, semanticXml, model) =>
        renderSemanticXml(target as never, semanticXml, model),
      validateBpmnModel,
    },
    modeler as unknown as ModelerLike,
    normalizedDsl,
  );

  const { svg, pngBase64 } = outcome.succeeded
    ? await exportSvgAndPng()
    : { svg: null, pngBase64: null };

  const [inputPromptHash, rawOutputHash, normalizedDslHash] = await Promise.all([
    digestSha256Hex(inputPrompt),
    digestSha256Hex(input.rawOutput),
    digestSha256Hex(normalizedDsl),
  ]);

  const renderValid = outcome.renderErrors.length === 0 && outcome.succeeded;
  const status = determineExperimentStatus(
    outcome.parserErrors,
    outcome.semanticErrors,
    outcome.semanticWarnings,
    outcome.renderErrors,
    outcome.bpmnValidation,
  );

  const metadata: ExperimentMetadata = {
    experimentId: input.experimentId,
    processId: input.processId,
    processSource: input.processSource,
    systemPromptVersion: input.systemPromptVersion,
    processPromptVersion: input.processPromptVersion,
    provider: input.provider,
    modelLabel: input.modelLabel,
    interfaceType: "web",
    runNumber: input.runNumber,
    createdAt: input.createdAt,
    inputPromptHash,
    rawOutputHash,
    normalizedDslHash,
    parserValid: outcome.parserErrors.length === 0,
    semanticValid: outcome.semanticErrors.length === 0,
    bpmnImportValid: renderValid,
    renderValid,
    status,
    notes: input.notes,
  };

  const result = buildExperimentResult({
    appVersion: APP_VERSION,
    evaluatedAt,
    inputPrompt,
    metadata,
    notes: input.notes,
    normalizedDsl,
    outcome,
    rawOutput: input.rawOutput,
    svgAvailable: svg !== null,
    pngAvailable: pngBase64 !== null,
  });

  return {
    experimentId: input.experimentId,
    status,
    succeeded: outcome.succeeded,
    resultJson: JSON.stringify(result, null, 2),
    normalizedDsl,
    inputPrompt,
    layoutXml: outcome.layoutXml ?? null,
    svg,
    pngBase64,
    exportAvailability: result.exportAvailability,
  };
}

async function ingestZeroShotXml(input: ZeroShotXmlInput): Promise<IngestZeroShotXmlOutput> {
  let outcome: RawXmlRenderOutcome;
  try {
    const rendered = await renderRawBpmnXml(modeler, input.rawXml);
    outcome = {
      layoutXml: rendered.layoutXml,
      warnings: rendered.warnings,
      usedAutoLayout: rendered.usedAutoLayout,
    };
  } catch (err) {
    outcome = {
      warnings: [],
      usedAutoLayout: false,
      renderError: err instanceof Error ? err.message : String(err),
    };
  }

  const { svg, pngBase64 } = outcome.layoutXml !== undefined
    ? await exportSvgAndPng()
    : { svg: null, pngBase64: null };
  const evaluatedAt = new Date().toISOString();
  const result = buildZeroShotXmlResult({
    appVersion: APP_VERSION,
    evaluatedAt,
    input,
    outcome,
    svgAvailable: svg !== null,
    pngAvailable: pngBase64 !== null,
  });
  const metadata = result.metadata as { status: string; renderValid: boolean };

  return {
    experimentId: input.experimentId,
    status: metadata.status,
    succeeded: metadata.renderValid,
    resultJson: JSON.stringify(result, null, 2),
    layoutXml: outcome.layoutXml ?? null,
    svg,
    pngBase64,
  };
}

/**
 * Re-export images from an already-rendered diagram.bpmn (layout XML with DI)
 * without recomputing metrics — used to fill a missing diagram.svg/png on an
 * experiment that was already evaluated, avoiding any engine-version drift in
 * its stored result.json / diagram.bpmn.
 */
async function renderArtifactsFromLayout(
  layoutXml: string,
): Promise<{ svg: string | null; pngBase64: string | null }> {
  try {
    await modeler.importXML(layoutXml);
    const canvas = modeler.get<{ zoom: (level: string) => void }>("canvas");
    canvas.zoom("fit-viewport");
    return await exportSvgAndPng();
  } catch {
    return { svg: null, pngBase64: null };
  }
}

declare global {
  interface Window {
    renderExperiment: (input: RenderExperimentInput) => Promise<RenderExperimentOutput>;
    ingestZeroShotXml: (input: ZeroShotXmlInput) => Promise<IngestZeroShotXmlOutput>;
    renderArtifactsFromLayout: (
      layoutXml: string,
    ) => Promise<{ svg: string | null; pngBase64: string | null }>;
    __harnessReady: boolean;
  }
}

window.renderExperiment = renderExperiment;
window.ingestZeroShotXml = ingestZeroShotXml;
window.renderArtifactsFromLayout = renderArtifactsFromLayout;
window.__harnessReady = true;
