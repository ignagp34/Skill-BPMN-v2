/**
 * DSL evaluation pipeline — the single source of truth for turning a DSL
 * string into a {@link DslEvaluationOutcome}.
 *
 * This is the pure compute core (no UI side effects, no stale-render token
 * handling). The live editor (`ui/app.ts`) wraps it with debounce + status
 * updates; the headless batch renderer (`headless/main.ts`) calls it directly.
 * Keeping one implementation guarantees the batch artifacts are byte-identical
 * to what "open the app → evaluate → download" produces.
 */

import type {
  BpmnValidationResult,
  ParseResult,
  RenderResult,
  ResolvedModel,
} from "@text-to-bpmn/core";

import type { ModelerLike } from "./exporters.js";
import {
  bpmnValidationToDiagnostics,
  classifyDslDiagnostic,
  makeRenderDiagnostic,
  renderWarningToDiagnostic,
} from "./helpers.js";
import type { DslEvaluationOutcome, ExperimentDiagnostic } from "./types.js";

/** Engine functions the pipeline needs, injected so tests/harness can swap them. */
export type EvaluateDeps = {
  emitBpmnXml: (model: ResolvedModel) => string;
  parseDsl: (source: string) => ParseResult;
  renderSemanticXml: (
    modeler: ModelerLike,
    semanticXml: string,
    model: ResolvedModel,
  ) => Promise<RenderResult>;
  validateBpmnModel: (model: ResolvedModel, options?: { layoutXml?: string }) => BpmnValidationResult;
};

/**
 * Run parse → validate → emit → render → validate and assemble the outcome.
 * Never throws for malformed DSL or render failures — those become diagnostics
 * on the returned outcome (mirroring the app's resilience).
 */
export async function evaluateDslPipeline(
  deps: EvaluateDeps,
  modeler: ModelerLike,
  source: string,
): Promise<DslEvaluationOutcome> {
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
    return makeEvaluationOutcome({
      bpmnValidation: modelValidation,
      diagnostics: [...dslDiagnostics, ...modelValidationDiagnostics],
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
  } catch (err) {
    const renderErrors = [makeRenderDiagnostic("RENDER-1", `Render failed: ${errorMessage(err)}`)];
    return makeEvaluationOutcome({
      bpmnValidation: modelValidation,
      diagnostics: [...dslDiagnostics, ...renderErrors, ...modelValidationDiagnostics],
      parseResult,
      renderErrors,
      semanticWarnings,
      semanticXml,
    });
  }
}

export function makeEvaluationOutcome(input: {
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

function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message.length > 0) {
    return err.message;
  }
  return String(err);
}
