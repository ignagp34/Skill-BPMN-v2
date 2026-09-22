// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import {
  buildExperimentBundle,
  buildExperimentResult,
  buildFinalPrompt,
  buildManifestRow,
  classifyDslDiagnostic,
  determineExperimentStatus,
  generateExperimentId,
  normalizeDslOutput,
} from "../../src/experiments/helpers.js";
import type { BpmnValidationResult } from "@text-to-bpmn/core";

const passedBpmnValidation: BpmnValidationResult = {
  status: "passed",
  errors: [],
  warnings: [],
  info: [],
  metrics: {
    numActivities: 1,
    numGateways: 0,
    numStartEvents: 1,
    numEndEvents: 1,
    isolatedNodes: 0,
    deadEndNodes: 0,
  },
};

describe("experiment helpers", () => {
  it("generates deterministic experiment ids", () => {
    expect(
      generateExperimentId({
        modelLabel: "2_5_PRO",
        processId: "MAD001",
        provider: "Gemini",
        runNumber: 1,
        systemPromptVersion: "SYSv31",
      }),
    ).toBe("EXP-MAD001-SYSV31-GEMINI-2_5_PRO-R01");
  });

  it("builds the final prompt with the DSL-only suffix", () => {
    const prompt = buildFinalPrompt("System prompt", "Process prompt");
    expect(prompt).toContain("System prompt");
    expect(prompt).toContain("Process prompt");
    expect(prompt).toContain("Return only the BPMN Sketch Miner DSL output");
  });

  it("strips surrounding code fences and trims whitespace", () => {
    expect(normalizeDslOutput("```dsl\nTask A\nTask B\n```\n")).toBe("Task A\nTask B");
    expect(normalizeDslOutput("  Task A\nTask B  ")).toBe("Task A\nTask B");
  });

  it("classifies lexer/parser codes as parser diagnostics", () => {
    const diagnostic = classifyDslDiagnostic({
      code: "PARSE-1",
      line: 4,
      message: "Unexpected token",
      severity: "error",
    });
    expect(diagnostic.category).toBe("parser");
    expect(diagnostic.line).toBe(4);
  });

  it("builds a manifest csv row with escaped content", () => {
    const row = buildManifestRow({
      experimentId: "EXP-SYN001-SYSV31-GEMINI-2_5_PRO-R01",
      processId: "SYN001",
      processSource: "synthetic",
      systemPromptVersion: "SYSv31",
      processPromptVersion: "PROCv1",
      provider: "Gemini",
      modelLabel: "2_5_PRO",
      interfaceType: "web",
      runNumber: 1,
      createdAt: "2026-05-10T18:00:00.000Z",
      inputPromptHash: "abc",
      rawOutputHash: "def",
      normalizedDslHash: "ghi",
      parserValid: true,
      semanticValid: true,
      bpmnImportValid: true,
      renderValid: true,
      status: "success",
      notes: "hello",
    });
    expect(row).toContain("EXP-SYN001-SYSV31-GEMINI-2_5_PRO-R01");
    expect(row.split(",")).toHaveLength(17);
    expect(row).toMatch(/,success,,0,0$/);
  });

  it("uses BPMN validation findings to mark otherwise successful experiments as warnings", () => {
    const bpmnValidation: BpmnValidationResult = {
      ...passedBpmnValidation,
      status: "warning",
      warnings: [
        {
          code: "MISSING_EXPLICIT_END_EVENT",
          origin: "model",
          severity: "warning",
          message: "The model does not contain an explicit end event.",
        },
      ],
    };

    expect(determineExperimentStatus([], [], [], [], bpmnValidation)).toBe("success_with_warnings");
  });

  it("does not let layout-only BPMN validation findings change experiment status", () => {
    const bpmnValidation: BpmnValidationResult = {
      ...passedBpmnValidation,
      status: "warning",
      warnings: [
        {
          code: "LAYOUT_ELEMENT_OVERLAP",
          origin: "layout",
          severity: "warning",
          message: "The rendered element overlaps another rendered element.",
        },
      ],
    };

    expect(determineExperimentStatus([], [], [], [], bpmnValidation)).toBe("success");
  });

  it("builds result metadata and bundle assets for a successful evaluation", () => {
    const result = buildExperimentResult({
      appVersion: "0.1.0",
      evaluatedAt: "2026-05-10T18:10:00.000Z",
      inputPrompt: "Prompt body",
      metadata: {
        experimentId: "EXP-SYN001-SYSV31-GEMINI-2_5_PRO-R01",
        processId: "SYN001",
        processSource: "synthetic",
        systemPromptVersion: "SYSv31",
        processPromptVersion: "PROCv1",
        provider: "Gemini",
        modelLabel: "2_5_PRO",
        interfaceType: "web",
        runNumber: 1,
        createdAt: "2026-05-10T18:00:00.000Z",
        inputPromptHash: "abc",
        rawOutputHash: "def",
        normalizedDslHash: "ghi",
        parserValid: true,
        semanticValid: true,
        bpmnImportValid: true,
        renderValid: true,
        status: "success",
        notes: "note",
      },
      notes: "note",
      normalizedDsl: "Task A",
      outcome: {
        bpmnValidation: passedBpmnValidation,
        diagnostics: [],
        errorDiagnostics: [],
        lastGoodDiagramRetained: false,
        layoutXml:
          "<bpmn:definitions xmlns:bpmn=\"bpmn\" xmlns:di=\"di\"><bpmn:lane /><di:waypoint x=\"0\" y=\"0\" /><di:waypoint x=\"20\" y=\"0\" /></bpmn:definitions>",
        model: {
          errors: [],
          flowNodes: new Map([
            [
              "Task_1",
              {
                annotations: ["helpful note"],
                id: "Task_1",
                kind: "task",
                label: "Task A",
                pool: "Pool_1",
                sourceLine: 1,
              },
            ],
          ]),
          flows: [],
          messageFlows: [],
          pools: [{ name: "Pool_1", nodeIds: ["Task_1"] }],
        },
        parserErrors: [],
        parseErrors: [],
        rawWarnings: [],
        renderErrors: [],
        semanticErrors: [],
        semanticWarnings: [],
        semanticXml: "<semantic />",
        succeeded: true,
      },
      rawOutput: "Task A",
      svgAvailable: true,
      pngAvailable: true,
    });

    expect(result.bpmnValidation.status).toBe("passed");
    expect(result.metrics.tasks).toBe(1);
    expect(result.metrics.participants).toBe(1);
    expect(result.metrics.lanes).toBe(1);
    expect(result.exportAvailability.resultJson).toBe(true);
    expect(buildExperimentBundle(result).map((asset) => asset.filename)).toEqual(
      expect.arrayContaining(["input_prompt.md", "raw_output.txt", "normalized_dsl.txt", "result.json", "notes.md", "diagram.bpmn"]),
    );
  });
});
