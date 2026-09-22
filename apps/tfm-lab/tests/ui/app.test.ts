// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import { mountApp } from "../../src/ui/app.js";
import type {
  BpmnValidationResult,
  FlowNode,
  ParseResult,
  ResolvedModel,
  SequenceFlow,
} from "@text-to-bpmn/core";
import type { ExperimentLibrary } from "../../src/experiments/types.js";

type Deferred<T> = {
  promise: Promise<T>;
  reject: (reason?: unknown) => void;
  resolve: (value: T) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, reject, resolve };
}

function createModel(): ResolvedModel {
  return {
    errors: [],
    flowNodes: new Map([
      [
        "Start_1",
        {
          annotations: [],
          id: "Start_1",
          kind: "startEvent",
          label: "Start",
          pool: "Pool_1",
          sourceLine: 1,
        },
      ],
      [
        "Task_1",
        {
          annotations: ["helpful note"],
          id: "Task_1",
          kind: "task",
          label: "Task",
          pool: "Pool_1",
          sourceLine: 2,
        },
      ],
      [
        "End_1",
        {
          annotations: [],
          id: "End_1",
          kind: "endEvent",
          label: "End",
          pool: "Pool_1",
          sourceLine: 4,
        },
      ],
    ]),
    flows: [
      { id: "Flow_1", sourceId: "Start_1", targetId: "Task_1" },
      { id: "Flow_2", sourceId: "Task_1", targetId: "End_1" },
    ],
    messageFlows: [],
    pools: [{ name: "Pool_1", nodeIds: ["Start_1", "Task_1", "End_1"] }],
  };
}

function createParseResult(source: string): ParseResult {
  if (source.includes("invalid")) {
    return {
      errors: [
        {
          code: "PARSE-1" as const,
          line: 3,
          message: "Unexpected token near fragment marker.",
          severity: "error" as const,
        },
      ],
      model: createModel(),
      program: { errors: [], pools: [], traces: [] },
    };
  }

  if (source.includes("warning")) {
    return {
      errors: [
        {
          code: "INLINE-COMMENT" as const,
          line: 2,
          message: "Inline comment attached to task.",
          severity: "warning" as const,
        },
      ],
      model: createModel(),
      program: { errors: [], pools: [], traces: [] },
    };
  }

  return {
    errors: [],
    model: createModel(),
    program: { errors: [], pools: [], traces: [] },
  };
}

function createValidationWarning(): BpmnValidationResult {
  return {
    status: "warning",
    errors: [],
    warnings: [
      {
        code: "MISSING_EXPLICIT_END_EVENT",
        origin: "model",
        severity: "warning",
        elementId: "Task_1",
        elementName: "Task",
        message: "The model does not contain an explicit end event.",
      },
    ],
    info: [],
    metrics: {
      numActivities: 1,
      numGateways: 0,
      numStartEvents: 1,
      numEndEvents: 0,
      isolatedNodes: 0,
      deadEndNodes: 0,
    },
  };
}

function createLayoutValidationWarning(): BpmnValidationResult {
  return {
    status: "warning",
    errors: [],
    warnings: [
      {
        code: "LAYOUT_ELEMENT_OVERLAP",
        origin: "layout",
        severity: "warning",
        elementId: "Flow_1",
        message: "The rendered element overlaps another rendered element.",
      },
    ],
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
}

function createValidationPassed(): BpmnValidationResult {
  return {
    status: "passed",
    errors: [],
    warnings: [],
    info: [],
    metrics: {
      numActivities: 2,
      numGateways: 0,
      numStartEvents: 1,
      numEndEvents: 1,
      isolatedNodes: 0,
      deadEndNodes: 0,
    },
  };
}

function changeTask(id: string, label: string, pool = "Lane A"): FlowNode {
  return {
    annotations: [],
    id,
    kind: "task",
    label,
    pool,
    sourceLine: 1,
  };
}

function changeFlow(id: string, sourceId: string, targetId: string): SequenceFlow {
  return { id, sourceId, targetId };
}

function createChangeModel(nodes: FlowNode[], flows: SequenceFlow[]): ResolvedModel {
  return {
    errors: [],
    flowNodes: new Map(nodes.map((node) => [node.id, node])),
    flows,
    messageFlows: [],
    pools: [{ name: "Lane A", nodeIds: nodes.map((node) => node.id) }],
  };
}

function createExperimentLibrary(): ExperimentLibrary {
  return {
    corpusAvailable: true,
    processes: [
      {
        filename: "SYN001.md",
        process_id: "SYN001",
        process_source: "synthetic",
        promptText: "Process description:\nA student requests a certificate.",
        title: "University enrollment certificate",
        difficulty: "easy",
        expected_features: ["sequential_flow", "tasks"],
        short_description: "Registrar office issues a certificate.",
      },
    ],
    systemPrompts: [
      {
        id: "system-v31.md",
        label: "System v3.1",
        text: "You are an expert BPMN modeler.",
        versionHint: "SYSv31",
      },
    ],
  };
}

function renderShell(): void {
  document.body.innerHTML = `
    <div id="app">
      <section id="editor-pane">
        <header class="editor-header">
          <button id="tab-editor" type="button" data-active="true">Editor</button>
          <button id="tab-experiments" type="button" data-active="false">Experiments</button>
          <button id="tab-change-experiments" type="button" data-active="false">Change Experiments</button>
          <select id="fixture-picker"></select>
          <button id="copy-xml" type="button">Copy XML</button>
          <button id="download-bpmn" type="button">Download BPMN</button>
          <button id="download-svg" type="button">Download SVG</button>
          <button id="download-png" type="button">Download PNG</button>
          <button id="toggle-message-flows" type="button">Hide message flows</button>
        </header>
        <div class="editor-main">
          <section id="editor-view">
            <p id="editor-source-note" hidden></p>
            <textarea id="dsl-input"></textarea>
          </section>
          <section id="experiments-view" hidden>
            <p id="process-corpus-status"></p>
            <select id="system-prompt-select"></select>
            <select id="process-select"></select>
            <textarea id="system-prompt"></textarea>
            <textarea id="process-prompt"></textarea>
            <div id="process-meta"></div>
            <select id="provider">
              <option>ChatGPT</option>
              <option>Gemini</option>
              <option>Claude</option>
              <option>Other</option>
            </select>
            <input id="model-label" type="text" />
            <input id="process-id" type="text" />
            <input id="process-source" type="text" />
            <input id="system-prompt-version" type="text" />
            <input id="process-prompt-version" type="text" />
            <input id="run-number" type="number" />
            <input id="interface-type" type="text" />
            <textarea id="experiment-notes"></textarea>
            <pre id="experiment-id-preview"></pre>
            <textarea id="final-prompt-preview"></textarea>
            <textarea id="raw-output"></textarea>
            <button id="copy-prompt" type="button">Copy Prompt</button>
            <button id="evaluate-output" type="button">Evaluate Output</button>
            <button id="copy-manifest-row" type="button" disabled>Copy Manifest Row</button>
            <button id="download-result" type="button" disabled>Download Result</button>
            <button id="download-experiment-files" type="button" disabled>Download Experiment Files</button>
            <p id="result-summary"></p>
          </section>
          <section id="change-experiments-view" hidden>
            <input id="change-case-id" type="text" />
            <input id="change-model-name" type="text" />
            <input id="change-prompt-version" type="text" />
            <select id="change-type">
              <option value="add_activity">Add activity</option>
              <option value="remove_activity">Remove activity</option>
              <option value="move_activity_to_lane">Move activity to lane</option>
              <option value="move_activity_before">Move activity before</option>
              <option value="move_activity_after">Move activity after</option>
              <option value="preserve_unrelated_structure">Preserve unrelated structure</option>
              <option value="rename_activity">Rename activity</option>
            </select>
            <textarea id="change-base-dsl"></textarea>
            <textarea id="change-changed-dsl"></textarea>
            <textarea id="change-spec-json"></textarea>
            <textarea id="change-notes"></textarea>
            <button id="run-change-evaluation" type="button">Run Change Evaluation</button>
            <button id="copy-change-result" type="button" disabled>Copy Result JSON</button>
            <button id="download-change-result" type="button" disabled>Download Result JSON</button>
            <p id="change-result-summary"></p>
            <div id="change-metrics"></div>
            <ul id="change-checks"></ul>
            <textarea id="change-result-json"></textarea>
          </section>
          <section class="diagnostics-panel">
            <p id="diagnostics-empty">Diagnostics will appear here.</p>
            <ul id="diagnostics-list"></ul>
          </section>
        </div>
        <footer id="status-bar">
          <span id="status-pill"></span>
          <span id="status-summary"></span>
        </footer>
      </section>
      <section id="canvas-pane">
        <div id="canvas"></div>
      </section>
    </div>
  `;
}

function getButton(id: string): HTMLButtonElement {
  return document.querySelector<HTMLButtonElement>(`#${id}`)!;
}

function getTextarea(id: string): HTMLTextAreaElement {
  return document.querySelector<HTMLTextAreaElement>(`#${id}`)!;
}

function getInput(id: string): HTMLInputElement {
  return document.querySelector<HTMLInputElement>(`#${id}`)!;
}

function getSelect(id: string): HTMLSelectElement {
  return document.querySelector<HTMLSelectElement>(`#${id}`)!;
}

function getText(id: string): string {
  return document.querySelector<HTMLElement>(`#${id}`)!.textContent ?? "";
}

function getStatusSummary(): string {
  return getText("status-summary");
}

function getStatusPill(): string {
  return getText("status-pill");
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

afterEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
  document.body.innerHTML = "";
});

describe("M5 app shell", () => {
  it("loads the default fixture immediately and enables export actions after the first successful render", async () => {
    renderShell();
    const pendingRender = deferred<{ layoutXml: string; warnings: unknown[] }>();

    const app = mountApp({
      deps: {
        copyText: vi.fn(async () => undefined),
        createModeler: vi.fn(() => ({ destroy: vi.fn(), saveSVG: vi.fn(async () => ({ svg: "<svg />" })) })),
        emitBpmnXml: vi.fn(() => "<semantic />"),
        experimentLibrary: createExperimentLibrary(),
        exportPngBlob: vi.fn(async () => new Blob(["png"], { type: "image/png" })),
        exportSvg: vi.fn(async () => "<svg />"),
        fixtures: {
          "../../fixtures/gemini-03.dsl": "valid fixture source",
        },
        hashText: vi.fn(async (value: string) => `hash:${value.length}`),
        logWarnings: vi.fn(),
        parseDsl: vi.fn((source: string) => createParseResult(source)),
        renderSemanticXml: vi.fn(() => pendingRender.promise),
        saveFile: vi.fn(),
        savePng: vi.fn(async () => undefined),
        saveSvg: vi.fn(async () => undefined),
      },
    });

    expect(getTextarea("dsl-input").value).toBe("valid fixture source");
    expect(getButton("download-bpmn").disabled).toBe(true);
    expect(getButton("copy-xml").disabled).toBe(true);

    pendingRender.resolve({ layoutXml: "<bpmn />", warnings: [] });
    await flushPromises();

    expect(getButton("download-bpmn").disabled).toBe(false);
    expect(getButton("copy-xml").disabled).toBe(false);
    expect(getStatusPill()).toBe("Live");
    app.destroy();
  });

  it("debounces textarea edits before rerendering", async () => {
    vi.useFakeTimers();
    renderShell();

    const renderSemanticXml = vi.fn(async () => ({ layoutXml: "<bpmn />", warnings: [] as unknown[] }));

    const app = mountApp({
      deps: {
        copyText: vi.fn(async () => undefined),
        createModeler: vi.fn(() => ({ destroy: vi.fn(), saveSVG: vi.fn(async () => ({ svg: "<svg />" })) })),
        emitBpmnXml: vi.fn(() => "<semantic />"),
        experimentLibrary: createExperimentLibrary(),
        exportPngBlob: vi.fn(async () => new Blob(["png"], { type: "image/png" })),
        exportSvg: vi.fn(async () => "<svg />"),
        fixtures: {
          "../../fixtures/gemini-03.dsl": "initial valid source",
        },
        hashText: vi.fn(async (value: string) => `hash:${value.length}`),
        logWarnings: vi.fn(),
        parseDsl: vi.fn((source: string) => createParseResult(source)),
        renderSemanticXml,
        saveFile: vi.fn(),
        savePng: vi.fn(async () => undefined),
        saveSvg: vi.fn(async () => undefined),
      },
    });

    await flushPromises();
    expect(renderSemanticXml).toHaveBeenCalledTimes(1);

    const textarea = getTextarea("dsl-input");
    textarea.value = "valid change 1";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.value = "valid change 2";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));

    vi.advanceTimersByTime(249);
    await flushPromises();
    expect(renderSemanticXml).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);
    await flushPromises();
    expect(renderSemanticXml).toHaveBeenCalledTimes(2);
    app.destroy();
  });

  it("keeps the last good diagram exportable when the latest input is invalid", async () => {
    vi.useFakeTimers();
    renderShell();

    const app = mountApp({
      deps: {
        copyText: vi.fn(async () => undefined),
        createModeler: vi.fn(() => ({ destroy: vi.fn(), saveSVG: vi.fn(async () => ({ svg: "<svg />" })) })),
        emitBpmnXml: vi.fn(() => "<semantic />"),
        experimentLibrary: createExperimentLibrary(),
        exportPngBlob: vi.fn(async () => new Blob(["png"], { type: "image/png" })),
        exportSvg: vi.fn(async () => "<svg />"),
        fixtures: {
          "../../fixtures/gemini-03.dsl": "valid starter source",
        },
        hashText: vi.fn(async (value: string) => `hash:${value.length}`),
        logWarnings: vi.fn(),
        parseDsl: vi.fn((source: string) => createParseResult(source)),
        renderSemanticXml: vi.fn(async () => ({ layoutXml: "<bpmn />", warnings: [] as unknown[] })),
        saveFile: vi.fn(),
        savePng: vi.fn(async () => undefined),
        saveSvg: vi.fn(async () => undefined),
      },
    });

    await flushPromises();
    expect(getButton("download-bpmn").disabled).toBe(false);

    const textarea = getTextarea("dsl-input");
    textarea.value = "invalid latest source";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));

    vi.advanceTimersByTime(250);
    await flushPromises();

    expect(getStatusPill()).toBe("Needs Attention");
    expect(getStatusSummary()).toContain("last good diagram");
    expect(document.querySelector("#diagnostics-list")?.textContent).toContain("PARSE-1");
    expect(getButton("download-bpmn").disabled).toBe(false);
    app.destroy();
  });

  it("shows warnings while still enabling exports", async () => {
    renderShell();

    const app = mountApp({
      deps: {
        copyText: vi.fn(async () => undefined),
        createModeler: vi.fn(() => ({ destroy: vi.fn(), saveSVG: vi.fn(async () => ({ svg: "<svg />" })) })),
        emitBpmnXml: vi.fn(() => "<semantic />"),
        experimentLibrary: createExperimentLibrary(),
        exportPngBlob: vi.fn(async () => new Blob(["png"], { type: "image/png" })),
        exportSvg: vi.fn(async () => "<svg />"),
        fixtures: {
          "../../fixtures/gemini-03.dsl": "warning source",
        },
        hashText: vi.fn(async (value: string) => `hash:${value.length}`),
        logWarnings: vi.fn(),
        parseDsl: vi.fn((source: string) => createParseResult(source)),
        renderSemanticXml: vi.fn(async () => ({ layoutXml: "<bpmn />", warnings: [] as unknown[] })),
        saveFile: vi.fn(),
        savePng: vi.fn(async () => undefined),
        saveSvg: vi.fn(async () => undefined),
      },
    });

    await flushPromises();

    expect(getStatusPill()).toBe("Warnings");
    expect(document.querySelector("#diagnostics-list")?.textContent).toContain("INLINE-COMMENT");
    expect(getButton("download-bpmn").disabled).toBe(false);
    app.destroy();
  });

  it("downloads the last successful layout as a .bpmn file", async () => {
    renderShell();

    const saveFile = vi.fn();

    const app = mountApp({
      deps: {
        copyText: vi.fn(async () => undefined),
        createModeler: vi.fn(() => ({ destroy: vi.fn(), saveSVG: vi.fn(async () => ({ svg: "<svg />" })) })),
        emitBpmnXml: vi.fn(() => "<semantic />"),
        experimentLibrary: createExperimentLibrary(),
        exportPngBlob: vi.fn(async () => new Blob(["png"], { type: "image/png" })),
        exportSvg: vi.fn(async () => "<svg />"),
        fixtures: {
          "../../fixtures/gemini-03.dsl": "valid fixture source",
        },
        hashText: vi.fn(async (value: string) => `hash:${value.length}`),
        logWarnings: vi.fn(),
        parseDsl: vi.fn((source: string) => createParseResult(source)),
        renderSemanticXml: vi.fn(async () => ({ layoutXml: "<bpmn id=\"ok\" />", warnings: [] as unknown[] })),
        saveFile,
        savePng: vi.fn(async () => undefined),
        saveSvg: vi.fn(async () => undefined),
      },
    });

    await flushPromises();
    getButton("download-bpmn").click();

    expect(saveFile).toHaveBeenCalledWith(
      "gemini-03.bpmn",
      "<bpmn id=\"ok\" />",
      "application/xml;charset=utf-8",
    );
    app.destroy();
  });
});

describe("Experiment Manager", () => {
  it("selecting a curated process fills process metadata and prompt text", async () => {
    renderShell();

    const app = mountApp({
      deps: {
        copyText: vi.fn(async () => undefined),
        createModeler: vi.fn(() => ({ destroy: vi.fn(), saveSVG: vi.fn(async () => ({ svg: "<svg />" })) })),
        emitBpmnXml: vi.fn(() => "<semantic />"),
        experimentLibrary: createExperimentLibrary(),
        exportPngBlob: vi.fn(async () => new Blob(["png"], { type: "image/png" })),
        exportSvg: vi.fn(async () => "<svg />"),
        fixtures: {
          "../../fixtures/gemini-03.dsl": "valid fixture source",
        },
        hashText: vi.fn(async (value: string) => `hash:${value.length}`),
        logWarnings: vi.fn(),
        parseDsl: vi.fn((source: string) => createParseResult(source)),
        renderSemanticXml: vi.fn(async () => ({ layoutXml: "<bpmn />", warnings: [] as unknown[] })),
        saveFile: vi.fn(),
        savePng: vi.fn(async () => undefined),
        saveSvg: vi.fn(async () => undefined),
      },
    });

    await flushPromises();

    getButton("tab-experiments").click();
    const processSelect = getSelect("process-select");
    processSelect.value = "SYN001";
    processSelect.dispatchEvent(new Event("change", { bubbles: true }));

    expect(getInput("process-id").value).toBe("SYN001");
    expect(getInput("process-source").value).toBe("synthetic");
    expect(getTextarea("process-prompt").value).toContain("student requests a certificate");
    expect(getText("process-meta")).toContain("University enrollment certificate");
    app.destroy();
  });

  it("manual process entry still works without a curated selection", async () => {
    renderShell();

    const app = mountApp({
      deps: {
        copyText: vi.fn(async () => undefined),
        createModeler: vi.fn(() => ({ destroy: vi.fn(), saveSVG: vi.fn(async () => ({ svg: "<svg />" })) })),
        emitBpmnXml: vi.fn(() => "<semantic />"),
        experimentLibrary: createExperimentLibrary(),
        exportPngBlob: vi.fn(async () => new Blob(["png"], { type: "image/png" })),
        exportSvg: vi.fn(async () => "<svg />"),
        fixtures: {
          "../../fixtures/gemini-03.dsl": "valid fixture source",
        },
        hashText: vi.fn(async (value: string) => `hash:${value.length}`),
        logWarnings: vi.fn(),
        parseDsl: vi.fn((source: string) => createParseResult(source)),
        renderSemanticXml: vi.fn(async () => ({ layoutXml: "<bpmn />", warnings: [] as unknown[] })),
        saveFile: vi.fn(),
        savePng: vi.fn(async () => undefined),
        saveSvg: vi.fn(async () => undefined),
      },
    });

    await flushPromises();
    getButton("tab-experiments").click();

    getSelect("process-select").value = "";
    getSelect("process-select").dispatchEvent(new Event("change", { bubbles: true }));
    getInput("process-id").value = "CUSTOM001";
    getInput("process-id").dispatchEvent(new Event("input", { bubbles: true }));
    getTextarea("process-prompt").value = "Custom process prompt";
    getTextarea("process-prompt").dispatchEvent(new Event("input", { bubbles: true }));

    expect(getInput("process-id").value).toBe("CUSTOM001");
    expect(getTextarea("process-prompt").value).toBe("Custom process prompt");
    app.destroy();
  });

  it("evaluates experiment output through the shared pipeline and enables result actions", async () => {
    renderShell();

    const copyText = vi.fn(async () => undefined);
    const renderSemanticXml = vi.fn(async () => ({ layoutXml: "<bpmn><bpmn:lane /></bpmn>", warnings: [] as unknown[] }));
    const saveFile = vi.fn();

    const app = mountApp({
      deps: {
        copyText,
        createModeler: vi.fn(() => ({ destroy: vi.fn(), saveSVG: vi.fn(async () => ({ svg: "<svg viewBox=\"0 0 100 100\"></svg>" })) })),
        emitBpmnXml: vi.fn(() => "<semantic />"),
        experimentLibrary: createExperimentLibrary(),
        exportPngBlob: vi.fn(async () => new Blob(["png"], { type: "image/png" })),
        exportSvg: vi.fn(async () => "<svg viewBox=\"0 0 100 100\"></svg>"),
        fixtures: {
          "../../fixtures/gemini-03.dsl": "valid fixture source",
        },
        hashText: vi.fn(async (value: string) => `hash:${value.length}`),
        logWarnings: vi.fn(),
        parseDsl: vi.fn((source: string) => createParseResult(source)),
        renderSemanticXml,
        saveFile,
        savePng: vi.fn(async () => undefined),
        saveSvg: vi.fn(async () => undefined),
      },
    });

    await flushPromises();
    getButton("tab-experiments").click();

    getInput("model-label").value = "2_5_PRO";
    getInput("model-label").dispatchEvent(new Event("input", { bubbles: true }));
    getSelect("provider").value = "Gemini";
    getSelect("provider").dispatchEvent(new Event("change", { bubbles: true }));
    getSelect("process-select").value = "SYN001";
    getSelect("process-select").dispatchEvent(new Event("change", { bubbles: true }));
    getTextarea("raw-output").value = "```dsl\nvalid experiment source\n```";
    getTextarea("raw-output").dispatchEvent(new Event("input", { bubbles: true }));

    getButton("evaluate-output").click();
    await flushPromises();
    await flushPromises();

    expect(renderSemanticXml).toHaveBeenCalledTimes(2);
    expect(getTextarea("dsl-input").value).toBe("valid experiment source");
    expect(getText("editor-source-note")).toContain("latest evaluated experiment output");
    expect(getButton("copy-manifest-row").disabled).toBe(false);
    expect(getButton("download-result").disabled).toBe(false);
    expect(getButton("download-experiment-files").disabled).toBe(false);
    expect(getText("result-summary")).toContain("EXP-SYN001-SYSV31-GEMINI-2_5_PRO-R01");

    getButton("copy-manifest-row").click();
    await flushPromises();
    expect(copyText).toHaveBeenCalledWith(expect.stringContaining("EXP-SYN001-SYSV31-GEMINI-2_5_PRO-R01"));

    getButton("download-result").click();
    expect(saveFile).toHaveBeenCalledWith(
      "result.json",
      expect.stringContaining("\"bpmnValidation\""),
      "application/json;charset=utf-8",
    );
    app.destroy();
  });

  it("shows BPMN validation diagnostics without disabling exports", async () => {
    renderShell();

    const saveFile = vi.fn();
    const app = mountApp({
      deps: {
        copyText: vi.fn(async () => undefined),
        createModeler: vi.fn(() => ({ destroy: vi.fn(), saveSVG: vi.fn(async () => ({ svg: "<svg />" })) })),
        emitBpmnXml: vi.fn(() => "<semantic />"),
        experimentLibrary: createExperimentLibrary(),
        exportPngBlob: vi.fn(async () => new Blob(["png"], { type: "image/png" })),
        exportSvg: vi.fn(async () => "<svg />"),
        fixtures: {
          "../../fixtures/gemini-03.dsl": "valid fixture source",
        },
        hashText: vi.fn(async (value: string) => `hash:${value.length}`),
        logWarnings: vi.fn(),
        parseDsl: vi.fn((source: string) => createParseResult(source)),
        renderSemanticXml: vi.fn(async () => ({ layoutXml: "<bpmn />", warnings: [] as unknown[] })),
        saveFile,
        savePng: vi.fn(async () => undefined),
        saveSvg: vi.fn(async () => undefined),
        validateBpmnModel: vi.fn(() => createValidationWarning()),
      },
    });

    await flushPromises();

    expect(getStatusPill()).toBe("Warnings");
    expect(document.querySelector("#diagnostics-list")?.textContent).toContain("MISSING_EXPLICIT_END_EVENT");
    expect(getButton("download-bpmn").disabled).toBe(false);
    expect(getButton("download-svg").disabled).toBe(false);
    app.destroy();
  });

  it("keeps layout-only BPMN validation diagnostics out of the app diagnostics panel", async () => {
    renderShell();

    const app = mountApp({
      deps: {
        copyText: vi.fn(async () => undefined),
        createModeler: vi.fn(() => ({ destroy: vi.fn(), saveSVG: vi.fn(async () => ({ svg: "<svg />" })) })),
        emitBpmnXml: vi.fn(() => "<semantic />"),
        experimentLibrary: createExperimentLibrary(),
        exportPngBlob: vi.fn(async () => new Blob(["png"], { type: "image/png" })),
        exportSvg: vi.fn(async () => "<svg />"),
        fixtures: {
          "../../fixtures/gemini-03.dsl": "valid fixture source",
        },
        hashText: vi.fn(async (value: string) => `hash:${value.length}`),
        logWarnings: vi.fn(),
        parseDsl: vi.fn((source: string) => createParseResult(source)),
        renderSemanticXml: vi.fn(async () => ({ layoutXml: "<bpmn />", warnings: [] as unknown[] })),
        saveFile: vi.fn(),
        savePng: vi.fn(async () => undefined),
        saveSvg: vi.fn(async () => undefined),
        validateBpmnModel: vi.fn(() => createLayoutValidationWarning()),
      },
    });

    await flushPromises();

    expect(getStatusPill()).toBe("Live");
    expect(document.querySelector("#diagnostics-list")?.textContent).not.toContain("LAYOUT_ELEMENT_OVERLAP");
    expect(getButton("download-bpmn").disabled).toBe(false);
    app.destroy();
  });

  it("invalid experiment output preserves the last good render behavior", async () => {
    renderShell();

    const app = mountApp({
      deps: {
        copyText: vi.fn(async () => undefined),
        createModeler: vi.fn(() => ({ destroy: vi.fn(), saveSVG: vi.fn(async () => ({ svg: "<svg />" })) })),
        emitBpmnXml: vi.fn(() => "<semantic />"),
        experimentLibrary: createExperimentLibrary(),
        exportPngBlob: vi.fn(async () => new Blob(["png"], { type: "image/png" })),
        exportSvg: vi.fn(async () => "<svg />"),
        fixtures: {
          "../../fixtures/gemini-03.dsl": "valid fixture source",
        },
        hashText: vi.fn(async (value: string) => `hash:${value.length}`),
        logWarnings: vi.fn(),
        parseDsl: vi.fn((source: string) => createParseResult(source)),
        renderSemanticXml: vi.fn(async () => ({ layoutXml: "<bpmn />", warnings: [] as unknown[] })),
        saveFile: vi.fn(),
        savePng: vi.fn(async () => undefined),
        saveSvg: vi.fn(async () => undefined),
      },
    });

    await flushPromises();
    getButton("tab-experiments").click();
    getTextarea("raw-output").value = "```dsl\ninvalid experiment source\n```";
    getTextarea("raw-output").dispatchEvent(new Event("input", { bubbles: true }));

    getButton("evaluate-output").click();
    await flushPromises();

    expect(getStatusPill()).toBe("Needs Attention");
    expect(getStatusSummary()).toContain("last good diagram");
    expect(getButton("download-bpmn").disabled).toBe(false);
    app.destroy();
  });
});

describe("Change Experiment Manager", () => {
  it("shows the third tab and persists it as the active tab", async () => {
    renderShell();

    const app = mountApp({
      deps: {
        copyText: vi.fn(async () => undefined),
        createModeler: vi.fn(() => ({ destroy: vi.fn(), saveSVG: vi.fn(async () => ({ svg: "<svg />" })) })),
        emitBpmnXml: vi.fn(() => "<semantic />"),
        experimentLibrary: createExperimentLibrary(),
        exportPngBlob: vi.fn(async () => new Blob(["png"], { type: "image/png" })),
        exportSvg: vi.fn(async () => "<svg />"),
        fixtures: {
          "../../fixtures/gemini-03.dsl": "valid fixture source",
        },
        hashText: vi.fn(async (value: string) => `hash:${value.length}`),
        logWarnings: vi.fn(),
        parseDsl: vi.fn((source: string) => createParseResult(source)),
        renderSemanticXml: vi.fn(async () => ({ layoutXml: "<bpmn />", warnings: [] as unknown[] })),
        saveFile: vi.fn(),
        savePng: vi.fn(async () => undefined),
        saveSvg: vi.fn(async () => undefined),
      },
    });

    await flushPromises();
    getButton("tab-change-experiments").click();

    expect(document.querySelector<HTMLElement>("#change-experiments-view")?.hidden).toBe(false);
    expect(getButton("tab-change-experiments").dataset.active).toBe("true");
    expect(window.localStorage.getItem("bpmn-sketch-miner.change-experiments.v1")).toContain("change-experiments");
    app.destroy();
  });

  it("runs a successful change evaluation and supports copy/download JSON", async () => {
    renderShell();

    const baseModel = createChangeModel(
      [changeTask("a", "Receive request"), changeTask("c", "Review request")],
      [changeFlow("f1", "a", "c")],
    );
    const changedModel = createChangeModel(
      [changeTask("a", "Receive request"), changeTask("b", "Check documentation"), changeTask("c", "Review request")],
      [changeFlow("f1", "a", "b"), changeFlow("f2", "b", "c")],
    );
    const copyText = vi.fn(async () => undefined);
    const saveFile = vi.fn();

    const app = mountApp({
      deps: {
        copyText,
        createModeler: vi.fn(() => ({ destroy: vi.fn(), saveSVG: vi.fn(async () => ({ svg: "<svg />" })) })),
        emitBpmnXml: vi.fn(() => "<semantic />"),
        experimentLibrary: createExperimentLibrary(),
        exportPngBlob: vi.fn(async () => new Blob(["png"], { type: "image/png" })),
        exportSvg: vi.fn(async () => "<svg />"),
        fixtures: {
          "../../fixtures/gemini-03.dsl": "valid fixture source",
        },
        hashText: vi.fn(async (value: string) => `hash:${value.length}`),
        logWarnings: vi.fn(),
        parseDsl: vi.fn((source: string) => ({
          errors: [],
          model: source.includes("changed") ? changedModel : baseModel,
          program: { errors: [], pools: [], traces: [] },
        })),
        renderSemanticXml: vi.fn(async () => ({ layoutXml: "<bpmn />", warnings: [] as unknown[] })),
        saveFile,
        savePng: vi.fn(async () => undefined),
        saveSvg: vi.fn(async () => undefined),
        validateBpmnModel: vi.fn(() => createValidationPassed()),
      },
    });

    await flushPromises();
    getButton("tab-change-experiments").click();
    getInput("change-case-id").value = "CHG-001";
    getInput("change-case-id").dispatchEvent(new Event("input", { bubbles: true }));
    getInput("change-model-name").value = "Gemini 2.5 Pro";
    getInput("change-model-name").dispatchEvent(new Event("input", { bubbles: true }));
    getInput("change-prompt-version").value = "SYSv31";
    getInput("change-prompt-version").dispatchEvent(new Event("input", { bubbles: true }));
    getTextarea("change-base-dsl").value = "base dsl";
    getTextarea("change-base-dsl").dispatchEvent(new Event("input", { bubbles: true }));
    getTextarea("change-changed-dsl").value = "changed dsl";
    getTextarea("change-changed-dsl").dispatchEvent(new Event("input", { bubbles: true }));
    getTextarea("change-spec-json").value = JSON.stringify({
      activity: "Check documentation",
      mustBeAfter: "Receive request",
      mustBeBefore: "Review request",
    });
    getTextarea("change-spec-json").dispatchEvent(new Event("input", { bubbles: true }));

    getButton("run-change-evaluation").click();
    await flushPromises();

    expect(getText("change-result-summary")).toContain("CHG-001");
    expect(getTextarea("change-result-json").value).toContain("\"status\": \"passed\"");
    expect(getButton("copy-change-result").disabled).toBe(false);
    expect(getButton("download-change-result").disabled).toBe(false);

    getButton("copy-change-result").click();
    await flushPromises();
    expect(copyText).toHaveBeenCalledWith(expect.stringContaining("\"changeExperimentId\": \"CHG-001\""));

    getButton("download-change-result").click();
    expect(saveFile).toHaveBeenCalledWith(
      "change-result.json",
      expect.stringContaining("\"changeEvaluation\""),
      "application/json;charset=utf-8",
    );
    app.destroy();
  });

  it("surfaces invalid expected change JSON without producing a result", async () => {
    renderShell();

    const app = mountApp({
      deps: {
        copyText: vi.fn(async () => undefined),
        createModeler: vi.fn(() => ({ destroy: vi.fn(), saveSVG: vi.fn(async () => ({ svg: "<svg />" })) })),
        emitBpmnXml: vi.fn(() => "<semantic />"),
        experimentLibrary: createExperimentLibrary(),
        exportPngBlob: vi.fn(async () => new Blob(["png"], { type: "image/png" })),
        exportSvg: vi.fn(async () => "<svg />"),
        fixtures: {
          "../../fixtures/gemini-03.dsl": "valid fixture source",
        },
        hashText: vi.fn(async (value: string) => `hash:${value.length}`),
        logWarnings: vi.fn(),
        parseDsl: vi.fn((source: string) => createParseResult(source)),
        renderSemanticXml: vi.fn(async () => ({ layoutXml: "<bpmn />", warnings: [] as unknown[] })),
        saveFile: vi.fn(),
        savePng: vi.fn(async () => undefined),
        saveSvg: vi.fn(async () => undefined),
      },
    });

    await flushPromises();
    getButton("tab-change-experiments").click();
    getTextarea("change-spec-json").value = "{ invalid";
    getTextarea("change-spec-json").dispatchEvent(new Event("input", { bubbles: true }));
    getButton("run-change-evaluation").click();
    await flushPromises();

    expect(document.querySelector("#diagnostics-list")?.textContent).toContain("CHANGE-SPEC-JSON");
    expect(getTextarea("change-result-json").value).toBe("");
    app.destroy();
  });

  it("marks change evaluation failed when either DSL has parser errors", async () => {
    renderShell();

    const app = mountApp({
      deps: {
        copyText: vi.fn(async () => undefined),
        createModeler: vi.fn(() => ({ destroy: vi.fn(), saveSVG: vi.fn(async () => ({ svg: "<svg />" })) })),
        emitBpmnXml: vi.fn(() => "<semantic />"),
        experimentLibrary: createExperimentLibrary(),
        exportPngBlob: vi.fn(async () => new Blob(["png"], { type: "image/png" })),
        exportSvg: vi.fn(async () => "<svg />"),
        fixtures: {
          "../../fixtures/gemini-03.dsl": "valid fixture source",
        },
        hashText: vi.fn(async (value: string) => `hash:${value.length}`),
        logWarnings: vi.fn(),
        parseDsl: vi.fn((source: string) => createParseResult(source)),
        renderSemanticXml: vi.fn(async () => ({ layoutXml: "<bpmn />", warnings: [] as unknown[] })),
        saveFile: vi.fn(),
        savePng: vi.fn(async () => undefined),
        saveSvg: vi.fn(async () => undefined),
        validateBpmnModel: vi.fn(() => createValidationPassed()),
      },
    });

    await flushPromises();
    getButton("tab-change-experiments").click();
    getTextarea("change-base-dsl").value = "invalid base";
    getTextarea("change-base-dsl").dispatchEvent(new Event("input", { bubbles: true }));
    getTextarea("change-changed-dsl").value = "valid changed";
    getTextarea("change-changed-dsl").dispatchEvent(new Event("input", { bubbles: true }));
    getTextarea("change-spec-json").value = JSON.stringify({ activity: "Task" });
    getTextarea("change-spec-json").dispatchEvent(new Event("input", { bubbles: true }));

    getButton("run-change-evaluation").click();
    await flushPromises();

    expect(getTextarea("change-result-json").value).toContain("\"status\": \"failed\"");
    expect(getTextarea("change-result-json").value).toContain("\"base_model_parseable\"");
    expect(getTextarea("change-result-json").value).toContain("\"PARSE-1\"");
    app.destroy();
  });
});
