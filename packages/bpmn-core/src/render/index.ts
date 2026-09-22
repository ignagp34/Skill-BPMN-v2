import { layoutProcess } from "bpmn-auto-layout";
import BpmnModdle from "bpmn-moddle";
import type BpmnModeler from "bpmn-js/lib/Modeler";

import type { ResolvedModel } from "../dsl/ast.js";
import { sanitizeForLayout } from "./sanitize.js";
import { layoutMissingProcesses } from "./layout-missing.js";
import { placeArtifacts } from "./artifacts.js";
import { placePoolsAndLanes, extendOuterLanes } from "./pools.js";
import { orthogonalize } from "./orthogonal.js";
import { distributeParallelChannels } from "./edge-channels.js";
import { placeLabels } from "./labels.js";

export interface RenderOptions {
  /** Vertical stride between lane rows. Default 80. */
  laneGrid?: number;
}

export interface RenderResult {
  layoutXml: string;
  warnings: unknown[];
}

export interface RawBpmnRenderResult extends RenderResult {
  usedAutoLayout: boolean;
}

async function applyLayoutPipeline(xml: string): Promise<string> {
  const cleaned = await sanitizeForLayout(xml);
  let layoutXml: string;
  try {
    layoutXml = await layoutProcess(cleaned);
  } catch (err) {
    throw new Error(`bpmn-auto-layout failed: ${(err as Error).message}`);
  }
  layoutXml = await layoutMissingProcesses(layoutXml);
  layoutXml = await placePoolsAndLanes(layoutXml);
  layoutXml = await orthogonalize(layoutXml);
  layoutXml = await distributeParallelChannels(layoutXml);
  layoutXml = await placeLabels(layoutXml);
  layoutXml = await extendOuterLanes(layoutXml);
  return placeArtifacts(layoutXml);
}

async function containsDiagramInterchange(xml: string): Promise<boolean> {
  const moddle = new BpmnModdle();
  const { rootElement } = await moddle.fromXML(xml);
  const definitions = rootElement as { diagrams?: unknown[] };
  return Array.isArray(definitions.diagrams) && definitions.diagrams.length > 0;
}

async function importAndFit(
  modeler: BpmnModeler,
  layoutXml: string,
): Promise<unknown[]> {
  const { warnings } = await modeler.importXML(layoutXml);
  const canvas = modeler.get<{ zoom: (level: string) => void }>("canvas");
  canvas.zoom("fit-viewport");
  return warnings;
}

/**
 * Run the M4 render pipeline:
 *   1. sanitize semantic XML for bpmn-auto-layout
 *   2. bpmn-auto-layout (with degraded fallback on crash)
 *   3. place pool/lane shapes + seed message-flow edges
 *   4. orthogonalize control flow
 *   5. place data refs / annotations in local whitespace near attached nodes
 *   6. importXML into the supplied modeler and zoom to fit
 *
 * Steps 3–5 land in subsequent commits; for now this owns Step 2 (extraction)
 * with Step 3+ as no-op pass-throughs so main.ts becomes a thin shell today.
 */
export async function renderSemanticXml(
  modeler: BpmnModeler,
  semanticXml: string,
  _model: ResolvedModel,
  _opts: RenderOptions = {},
): Promise<RenderResult> {
  const layoutXml = await applyLayoutPipeline(semanticXml);
  const warnings = await importAndFit(modeler, layoutXml);
  return { layoutXml, warnings };
}

/**
 * Import arbitrary model-authored BPMN XML without involving the DSL model.
 *
 * XML that already carries BPMN DI is imported byte-for-byte. XML without DI
 * is sanitized only for the render attempt and passed through the same layout
 * pipeline used by the DSL renderer. Callers must retain and score the original
 * raw XML separately; `layoutXml` is a visualization artifact only.
 */
export async function renderRawBpmnXml(
  modeler: BpmnModeler,
  rawXml: string,
): Promise<RawBpmnRenderResult> {
  const usedAutoLayout = !(await containsDiagramInterchange(rawXml));
  const layoutXml = usedAutoLayout
    ? await applyLayoutPipeline(rawXml)
    : rawXml;
  const warnings = await importAndFit(modeler, layoutXml);
  return { layoutXml, warnings, usedAutoLayout };
}
