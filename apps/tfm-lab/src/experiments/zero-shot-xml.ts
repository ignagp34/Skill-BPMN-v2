import type { ModelerLike } from "./exporters.js";
import { makeRenderDiagnostic, renderWarningToDiagnostic } from "./helpers.js";
import type { ExperimentDiagnostic, ExperimentMetrics } from "./types.js";

export type Representation =
  | "dsl"
  | "zero_shot_xml"
  | "zero_shot_image"
  | "zero_shot_mcp";

export type UsageMetadata = {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  elapsedSeconds: number | null;
  iterations: number | null;
};

export type XsdValidation = {
  valid: boolean;
  errors: string[];
};

export type ZeroShotXmlInput = {
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
  inputPrompt: string;
  rawXml: string;
  inputPromptHash: string;
  rawOutputHash: string;
  xsdValidation: XsdValidation;
  usage: UsageMetadata;
  postprocessing: string[];
};

export type RawXmlRenderOutcome = {
  layoutXml?: string;
  warnings: unknown[];
  usedAutoLayout: boolean;
  renderError?: string;
};

export function collectRawXmlMetrics(
  rawXml: string,
  layoutXml?: string,
): ExperimentMetrics {
  const doc = new DOMParser().parseFromString(rawXml, "application/xml");
  const elements = Array.from(doc.getElementsByTagName("*"));
  const count = (...names: string[]): number =>
    elements.filter((element) => names.includes(element.localName)).length;

  return {
    tasks: count(
      "task",
      "userTask",
      "serviceTask",
      "sendTask",
      "receiveTask",
      "manualTask",
      "businessRuleTask",
      "scriptTask",
      "subProcess",
      "callActivity",
    ),
    events: count(
      "startEvent",
      "endEvent",
      "intermediateThrowEvent",
      "intermediateCatchEvent",
      "boundaryEvent",
    ),
    gateways: count(
      "exclusiveGateway",
      "parallelGateway",
      "inclusiveGateway",
      "eventBasedGateway",
      "complexGateway",
    ),
    participants: count("participant"),
    lanes: count("lane"),
    sequenceFlows: count("sequenceFlow"),
    messageFlows: count("messageFlow"),
    dataObjects: count("dataObjectReference", "dataStoreReference"),
    textAnnotations: count("textAnnotation"),
    diagonalEdgesDetected: detectDiagonalEdges(layoutXml),
  };
}

export function buildZeroShotXmlResult(input: {
  appVersion: string;
  evaluatedAt: string;
  input: ZeroShotXmlInput;
  outcome: RawXmlRenderOutcome;
  svgAvailable: boolean;
  pngAvailable: boolean;
}): Record<string, unknown> {
  const { input: source, outcome } = input;
  const renderErrors: ExperimentDiagnostic[] = outcome.renderError === undefined
    ? []
    : [makeRenderDiagnostic("RENDER-XML-1", `Render failed: ${outcome.renderError}`)];
  const renderWarnings = outcome.warnings.map(renderWarningToDiagnostic);
  const xsdDiagnostics: ExperimentDiagnostic[] = source.xsdValidation.errors.map(
    (message, index) => ({
      category: "bpmn",
      code: `XSD-${index + 1}`,
      message,
      severity: "error",
      source: "validation",
    }),
  );
  const diagnostics = [...xsdDiagnostics, ...renderWarnings, ...renderErrors];
  const renderValid = outcome.layoutXml !== undefined && renderErrors.length === 0;
  const status = !source.xsdValidation.valid
    ? "bpmn_xml_error"
    : renderValid
      ? renderWarnings.length > 0
        ? "success_with_warnings"
        : "success"
      : "render_error";
  const appliedPostprocessing = [...source.postprocessing];
  if (outcome.usedAutoLayout && !appliedPostprocessing.includes("bpmn-auto-layout:render_only")) {
    appliedPostprocessing.push("bpmn-auto-layout:render_only");
  }

  return {
    metadata: {
      experimentId: source.experimentId,
      processId: source.processId,
      processSource: source.processSource,
      systemPromptVersion: source.systemPromptVersion,
      processPromptVersion: source.processPromptVersion,
      provider: source.provider,
      modelLabel: source.modelLabel,
      interfaceType: "web",
      runNumber: source.runNumber,
      createdAt: source.createdAt,
      inputPromptHash: source.inputPromptHash,
      rawOutputHash: source.rawOutputHash,
      normalizedDslHash: "",
      representation: "zero_shot_xml",
      postprocessing: appliedPostprocessing,
      ...source.usage,
      bpmnXmlValid: source.xsdValidation.valid,
      bpmnImportValid: renderValid,
      renderValid,
      status,
      notes: source.notes,
    },
    bpmnValidation: {
      status: source.xsdValidation.valid ? "valid" : "error",
      errors: source.xsdValidation.errors.map((message, index) => ({
        code: `XSD-${index + 1}`,
        origin: "model",
        severity: "error",
        message,
      })),
      warnings: [],
      info: [],
      metrics: {
        numActivities: 0,
        numGateways: 0,
        numStartEvents: 0,
        numEndEvents: 0,
        isolatedNodes: 0,
        deadEndNodes: 0,
      },
    },
    diagnostics,
    parserErrors: [],
    semanticErrors: [],
    semanticWarnings: [],
    renderErrors,
    exportAvailability: {
      bpmn: outcome.layoutXml !== undefined,
      png: input.pngAvailable,
      resultJson: true,
      svg: input.svgAvailable,
    },
    timestamps: {
      createdAt: source.createdAt,
      evaluatedAt: input.evaluatedAt,
    },
    versions: {
      appVersion: input.appVersion,
      parserVersion: input.appVersion,
    },
    metrics: collectRawXmlMetrics(source.rawXml, outcome.layoutXml),
    inputPrompt: source.inputPrompt,
    rawOutput: source.rawXml,
    normalizedDsl: "",
    notes: source.notes,
    semanticXml: source.rawXml,
    layoutXml: outcome.layoutXml,
  };
}

function detectDiagonalEdges(xml: string | undefined): boolean {
  if (xml === undefined) return false;
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const waypoints = Array.from(doc.getElementsByTagNameNS("*", "waypoint"));
  for (let index = 0; index < waypoints.length - 1; index += 1) {
    const current = waypoints[index];
    const next = waypoints[index + 1];
    if (current.parentElement !== next.parentElement) continue;
    const values = [
      Number(current.getAttribute("x")),
      Number(current.getAttribute("y")),
      Number(next.getAttribute("x")),
      Number(next.getAttribute("y")),
    ];
    if (!values.every(Number.isFinite)) continue;
    if (values[0] !== values[2] && values[1] !== values[3]) return true;
  }
  return false;
}

export type RawXmlModeler = ModelerLike;
