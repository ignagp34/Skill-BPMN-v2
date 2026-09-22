// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import {
  buildZeroShotXmlResult,
  collectRawXmlMetrics,
  type ZeroShotXmlInput,
} from "../../src/experiments/zero-shot-xml.js";

const RAW_XML = `<?xml version="1.0"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <process id="P1">
    <startEvent id="S1" />
    <task id="T1" name="Work" />
    <endEvent id="E1" />
    <sequenceFlow id="F1" sourceRef="S1" targetRef="T1" />
    <sequenceFlow id="F2" sourceRef="T1" targetRef="E1" />
  </process>
</definitions>`;

function input(valid = true): ZeroShotXmlInput {
  return {
    experimentId: "EXP-SYN001-ZSXML-CHATGPT-MODEL-R01",
    processId: "SYN001",
    processSource: "synthetic",
    systemPromptVersion: "ZSXML",
    processPromptVersion: "PROCv1",
    provider: "CHATGPT",
    modelLabel: "MODEL",
    runNumber: 1,
    createdAt: "2026-06-18T00:00:00.000Z",
    notes: "",
    inputPrompt: "Generate BPMN XML.",
    rawXml: RAW_XML,
    inputPromptHash: "input-hash",
    rawOutputHash: "output-hash",
    xsdValidation: { valid, errors: valid ? [] : ["schema error"] },
    usage: {
      inputTokens: null,
      outputTokens: 123,
      totalTokens: null,
      elapsedSeconds: 4.5,
      iterations: 1,
    },
    postprocessing: [],
  };
}

describe("zero-shot XML result builder", () => {
  it("counts the untouched raw XML", () => {
    expect(collectRawXmlMetrics(RAW_XML)).toMatchObject({
      tasks: 1,
      events: 2,
      sequenceFlows: 2,
    });
  });

  it("uses authoritative M1 validity and records render-only layout", () => {
    const result = buildZeroShotXmlResult({
      appVersion: "0.1.0",
      evaluatedAt: "2026-06-18T00:01:00.000Z",
      input: input(true),
      outcome: {
        layoutXml: "<definitions />",
        warnings: [],
        usedAutoLayout: true,
      },
      svgAvailable: true,
      pngAvailable: false,
    });
    const metadata = result.metadata as Record<string, unknown>;

    expect(metadata.representation).toBe("zero_shot_xml");
    expect(metadata.bpmnXmlValid).toBe(true);
    expect(metadata.bpmnImportValid).toBe(true);
    expect(metadata).not.toHaveProperty("parserValid");
    expect(metadata).not.toHaveProperty("semanticValid");
    expect(metadata.postprocessing).toEqual(["bpmn-auto-layout:render_only"]);
  });

  it("keeps XSD failure separate from a successful import", () => {
    const result = buildZeroShotXmlResult({
      appVersion: "0.1.0",
      evaluatedAt: "2026-06-18T00:01:00.000Z",
      input: input(false),
      outcome: {
        layoutXml: "<definitions />",
        warnings: [],
        usedAutoLayout: false,
      },
      svgAvailable: false,
      pngAvailable: false,
    });
    const metadata = result.metadata as Record<string, unknown>;

    expect(metadata.bpmnXmlValid).toBe(false);
    expect(metadata.bpmnImportValid).toBe(true);
    expect(metadata.status).toBe("bpmn_xml_error");
  });
});
