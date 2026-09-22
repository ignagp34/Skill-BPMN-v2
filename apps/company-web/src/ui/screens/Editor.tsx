import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BpmnModeler from "bpmn-js/lib/Modeler";

import { mountApp } from "../app.js";
import { parseDsl } from "@text-to-bpmn/core";
import { Wordmark } from "../components/Wordmark.js";
import { BackIcon, Check, Copy, DownloadIcon } from "../components/icons.js";

type EditorProps = {
  initialDsl: string;
  onBack: () => void;
  onHome: () => void;
  onDocs: () => void;
};

type Tab = "editor" | "experiments";
type DownloadKind = "BPMN" | "SVG" | "PNG" | "XML copied";

type Counts = {
  lanes: number;
  tasks: number;
  gateways: number;
  events: number;
  flows: number;
};

const ZERO_COUNTS: Counts = { lanes: 0, tasks: 0, gateways: 0, events: 0, flows: 0 };

export function Editor({ initialDsl, onBack, onHome, onDocs }: EditorProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const modelerRef = useRef<BpmnModeler | null>(null);
  const appRef = useRef<ReturnType<typeof mountApp> | null>(null);
  const mountedRef = useRef(false);

  const [tab, setTab] = useState<Tab>("editor");
  const [showDsl, setShowDsl] = useState(true);
  const [fileName, setFileName] = useState("Onboarding process");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [downloadFlash, setDownloadFlash] = useState<DownloadKind | null>(null);
  const [zoom, setZoom] = useState(1);
  const [dslText, setDslText] = useState<string>(initialDsl.trim().length > 0 ? initialDsl : "");
  const [counts, setCounts] = useState<Counts>(ZERO_COUNTS);
  const [hideMessageFlows, setHideMessageFlows] = useState(false);
  /* Mirror of hideMessageFlows readable from the import.done handler, whose
     closure is created once when the modeler is built. */
  const hideMessageFlowsRef = useRef(false);

  /* Mount the existing app pipeline once. */
  useEffect(() => {
    if (mountedRef.current || rootRef.current === null) return;
    mountedRef.current = true;

    const app = mountApp({
      root: rootRef.current,
      deps: {
        createModeler: (container: HTMLElement) => {
          const m = new BpmnModeler({ container });
          modelerRef.current = m;
          /* The diagram is re-imported on every DSL edit, which recreates the
             message-flow graphics. Re-apply the current visibility each time. */
          m.on("import.done", () => setMessageFlowVisibility(m, hideMessageFlowsRef.current));
          return m;
        },
      },
    });
    appRef.current = app;
    app.setHideMessageFlowsOnExport(hideMessageFlowsRef.current);

    /* Preload DSL from the Handoff screen (overrides the default fixture). */
    if (initialDsl.trim().length > 0) {
      const textarea = rootRef.current.querySelector<HTMLTextAreaElement>("#dsl-input");
      if (textarea !== null && textarea.value !== initialDsl) {
        textarea.value = initialDsl;
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }

    /* mountApp may restore the experiments tab from localStorage. */
    const editorView = rootRef.current.querySelector<HTMLElement>("#editor-view");
    if (editorView?.hidden === true) {
      setTab("experiments");
    }

    /* Mirror the textarea's current value into React state so we can compute
       counts and the line-number gutter without controlled-input conflicts. */
    const textarea = rootRef.current.querySelector<HTMLTextAreaElement>("#dsl-input");
    if (textarea !== null) {
      setDslText(textarea.value);
      const onInput = (): void => setDslText(textarea.value);
      textarea.addEventListener("input", onInput);
      const initialPoll = window.setTimeout(() => setDslText(textarea.value), 350);
      return () => {
        window.clearTimeout(initialPoll);
        textarea.removeEventListener("input", onInput);
        app.destroy();
        mountedRef.current = false;
      };
    }

    return () => {
      app.destroy();
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Compute counts from the current DSL text via the real parser. Debounced
     to avoid running on every keystroke; the actual diagram render is
     debounced inside mountApp at 250ms so this matches. */
  useEffect(() => {
    if (dslText.trim().length === 0) {
      setCounts(ZERO_COUNTS);
      return;
    }
    const t = window.setTimeout(() => {
      try {
        const result = parseDsl(dslText);
        const model = result.model;
        let tasks = 0;
        let gateways = 0;
        let events = 0;
        for (const node of model.flowNodes.values()) {
          const k = String(node.kind).toLowerCase();
          if (k.includes("gateway")) gateways += 1;
          else if (k.includes("event")) events += 1;
          else tasks += 1;
        }
        setCounts({
          lanes: Math.max(1, model.pools.length),
          tasks,
          gateways,
          events,
          flows: model.flows.length,
        });
      } catch {
        // Parser errors are shown by mountApp's diagnostics; keep counts steady.
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [dslText]);

  /* Auto-save indicator (purely cosmetic). */
  useEffect(() => {
    const t = window.setTimeout(() => setSavedAt(new Date()), 600);
    return () => window.clearTimeout(t);
  }, [dslText, fileName]);

  /* Zoom controls — drive the bpmn-js Modeler directly. */
  const applyZoom = useCallback((level: number) => {
    const clamped = Math.min(2, Math.max(0.4, level));
    setZoom(clamped);
    const modeler = modelerRef.current;
    if (modeler === null) return;
    try {
      const canvas = modeler.get<{ zoom: (level: number | "fit-viewport") => void }>("canvas");
      canvas.zoom(clamped);
    } catch {
      // Modeler may not be ready yet.
    }
  }, []);
  const zoomIn = useCallback(() => applyZoom(zoom + 0.1), [zoom, applyZoom]);
  const zoomOut = useCallback(() => applyZoom(zoom - 0.1), [zoom, applyZoom]);
  const resetZoom = useCallback(() => applyZoom(1), [applyZoom]);
  const fitView = useCallback(() => {
    const modeler = modelerRef.current;
    if (modeler === null) return;
    try {
      const canvas = modeler.get<{ zoom: (level: number | "fit-viewport") => void; zoom2: () => number }>("canvas");
      canvas.zoom("fit-viewport");
      // After fit, read back the actual zoom level so the indicator matches.
      const after = (modeler.get<{ zoom: () => number }>("canvas")).zoom();
      if (typeof after === "number" && Number.isFinite(after)) {
        setZoom(after);
      }
    } catch {
      // ignore
    }
  }, []);

  /* Toggle visibility of message-flow connections (the dashed cross-pool
     lines) in the rendered diagram without touching the underlying DSL. When
     hidden, message flows are also stripped from exported/copied BPMN so they
     don't reappear in other tools (e.g. Bizagi). */
  const toggleMessageFlows = useCallback(() => {
    setHideMessageFlows((prev) => {
      const next = !prev;
      hideMessageFlowsRef.current = next;
      if (modelerRef.current !== null) {
        setMessageFlowVisibility(modelerRef.current, next);
      }
      appRef.current?.setHideMessageFlowsOnExport(next);
      return next;
    });
  }, []);

  /* Click-delegate to mountApp's hidden export buttons. */
  const triggerDownload = useCallback((kind: DownloadKind, hiddenId: string) => {
    setDownloadFlash(kind);
    const btn = rootRef.current?.querySelector<HTMLButtonElement>(`#${hiddenId}`);
    btn?.click();
    window.setTimeout(() => setDownloadFlash(null), 1600);
  }, []);

  const onDownloadBpmn = () => triggerDownload("BPMN", "download-bpmn");
  const onDownloadSvg = () => triggerDownload("SVG", "download-svg");
  const onDownloadPng = () => triggerDownload("PNG", "download-png");
  const onCopyXml = () => triggerDownload("XML copied", "copy-xml");

  const lineCount = useMemo(() => dslText.split("\n").length, [dslText]);

  return (
    <div ref={rootRef} className="editor-screen" data-tab={tab}>
      <header className="editor-topbar">
        <div className="editor-topbar-left">
          <button className="iconbtn iconbtn-wordmark" onClick={onHome} title="Home">
            <Wordmark />
          </button>
          <span className="topbar-divider" />
          <div className="file-meta">
            <input
              className="file-name"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
            />
            <span className="file-saved">
              <span className="status-dot status-dot-ok" />
              {savedAt ? "Saved" : "Saving…"}
            </span>
          </div>
          <span className="topbar-divider" />
          <div className="editor-tabs">
            <button
              id="tab-editor"
              type="button"
              className="editor-tab"
              data-active={tab === "editor" ? "true" : "false"}
              onClick={() => setTab("editor")}
            >
              Editor
            </button>
            <button
              id="tab-experiments"
              type="button"
              className="editor-tab"
              data-active={tab === "experiments" ? "true" : "false"}
              onClick={() => setTab("experiments")}
            >
              Experiments
            </button>
          </div>
          <span className="topbar-divider" />
          <button type="button" className="btn-primary export-docs" onClick={onDocs}>
            <DownloadIcon /> Documentation
          </button>
        </div>

        <div className="editor-topbar-center">
          <ToolbarChip icon={<Layers />} label={`${counts.lanes} lanes`} />
          <ToolbarChip icon={<Box />} label={`${counts.tasks} tasks`} />
          <ToolbarChip icon={<Diamond />} label={`${counts.gateways} gateways`} />
          <ToolbarChip icon={<Flow />} label={`${counts.flows} flows`} />
        </div>

        <div className="editor-topbar-right">
          <label className="fixture-field">
            <span className="fixture-field-label">Sample</span>
            <select id="fixture-picker" />
          </label>
          <button className="btn-ghost" onClick={onBack}>
            <BackIcon /> Re-prompt
          </button>
          <span className="topbar-divider" />
          <div className="export-group">
            <button type="button" className="export-btn" onClick={onDownloadBpmn}>
              <DownloadIcon /> BPMN
            </button>
            <button type="button" className="export-btn" onClick={onDownloadSvg}>
              <DownloadIcon /> SVG
            </button>
            <button type="button" className="export-btn" onClick={onDownloadPng}>
              <DownloadIcon /> PNG
            </button>
            <button type="button" className="export-btn export-copy" onClick={onCopyXml}>
              <Copy /> XML
            </button>
          </div>
        </div>
      </header>

      <div className="editor-metabar">
        <ToolbarChip icon={<Layers />} label={`${counts.lanes} lanes`} />
        <ToolbarChip icon={<Box />} label={`${counts.tasks} tasks`} />
        <ToolbarChip icon={<Diamond />} label={`${counts.gateways} gateways`} />
        <ToolbarChip icon={<Flow />} label={`${counts.flows} flows`} />
      </div>

      <div className={"editor-body " + (showDsl ? "" : "editor-body-no-dsl")}>
        {showDsl && (
          <aside className="dsl-pane" id="editor-view">
            <div className="dsl-pane-head">
              <div className="pane-eyebrow">PROCESS SYNTAX</div>
              <div className="pane-actions">
                <button
                  type="button"
                  className="iconbtn-small"
                  title="Hide"
                  onClick={() => setShowDsl(false)}
                >
                  <CollapseIcon />
                </button>
              </div>
            </div>
            <div className="dsl-pane-body">
              <DslGutter dsl={dslText} />
              <textarea
                id="dsl-input"
                className="dsl-textarea"
                spellCheck={false}
                placeholder="Paste BPMN textual DSL here, or pick a sample…"
              />
            </div>
            <p id="editor-source-note" hidden />
            <div className="dsl-pane-foot">
              <span id="status-pill" className="diag-pill" data-state="idle">
                <span className="status-dot status-dot-ok" />
                <span id="status-summary">Diagram is up to date</span>
              </span>
              <button
                type="button"
                className="msgflow-toggle"
                onClick={toggleMessageFlows}
                data-active={hideMessageFlows ? "true" : "false"}
                aria-pressed={hideMessageFlows}
                title={hideMessageFlows ? "Show message flow lines" : "Hide message flow lines"}
              >
                <MessageFlowIcon hidden={hideMessageFlows} />
                <span>{hideMessageFlows ? "Show message flows" : "Hide message flows"}</span>
              </button>
              <span className="muted">{lineCount} lines</span>
            </div>
            <div id="status-bar" data-state="idle" hidden />
            <section className="diagnostics-panel" aria-live="polite" aria-atomic="false">
              <h2>Diagnostics</h2>
              <p id="diagnostics-empty">Diagnostics will appear here.</p>
              <ul id="diagnostics-list" />
            </section>
          </aside>
        )}

        <main className="canvas-pane">
          {!showDsl && (
            <button type="button" className="show-dsl-tab" onClick={() => setShowDsl(true)}>
              <ExpandIcon /> <span>Show syntax</span>
            </button>
          )}

          <div className="canvas-zoom">
            <button type="button" className="iconbtn-small" onClick={zoomOut} title="Zoom out">
              <ZoomOut />
            </button>
            <button type="button" className="zoom-pct" onClick={resetZoom}>
              {Math.round(zoom * 100)}%
            </button>
            <button type="button" className="iconbtn-small" onClick={zoomIn} title="Zoom in">
              <ZoomIn />
            </button>
            <div className="palette-sep horiz" />
            <button type="button" className="iconbtn-small" onClick={fitView} title="Fit">
              <FitIcon />
            </button>
          </div>

          <div id="canvas" className="bpmn-host" />

          {downloadFlash !== null && (
            <div className="toast">
              <Check />{" "}
              <span>
                {downloadFlash} {downloadFlash === "XML copied" ? "" : "downloaded"}
              </span>
            </div>
          )}
        </main>

        <ExperimentsView />
      </div>

      {/* Hidden export buttons mountApp wires to; React's visible buttons click these. */}
      <div hidden>
        <button id="download-bpmn" type="button" />
        <button id="download-svg" type="button" />
        <button id="download-png" type="button" />
        <button id="copy-xml" type="button" />
      </div>
    </div>
  );
}

function ToolbarChip({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="toolbar-chip">
      {icon}
      <span>{label}</span>
    </span>
  );
}

function DslGutter({ dsl }: { dsl: string }) {
  const lines = dsl.split("\n");
  return (
    <div className="dsl-gutter" aria-hidden="true">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        const isLane = /:$/.test(trimmed) && !/^\/\//.test(trimmed);
        const isComment = /^\/\//.test(trimmed);
        const isEvent = /^\((start|end|finish|timer|receive|send)/.test(trimmed);
        const cls =
          "dsl-line " +
          (isLane ? "dsl-line-lane" : isComment ? "dsl-line-comment" : isEvent ? "dsl-line-event" : "");
        return (
          <div key={i} className={cls}>
            {String(i + 1).padStart(2, "0")}
          </div>
        );
      })}
    </div>
  );
}

/* Show or hide every message-flow connection in the current diagram by
   toggling the display of its rendered SVG group. Safe to call before a
   diagram is imported (no-op until elements exist). */
function setMessageFlowVisibility(modeler: BpmnModeler, hidden: boolean): void {
  try {
    const registry = modeler.get<{
      getAll: () => Array<{ businessObject?: { $type?: string } }>;
      getGraphics: (element: unknown) => SVGElement | undefined;
    }>("elementRegistry");
    for (const element of registry.getAll()) {
      if (element.businessObject?.$type !== "bpmn:MessageFlow") continue;
      const gfx = registry.getGraphics(element);
      if (gfx) gfx.style.display = hidden ? "none" : "";
    }
  } catch {
    // Modeler service not ready or no diagram imported yet.
  }
}

/* ---------- icons inline (kept here so the editor file is self-contained) ---------- */

function Layers() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 2 7l10 5 10-5-10-5Z" />
      <path d="m2 17 10 5 10-5" />
      <path d="m2 12 10 5 10-5" />
    </svg>
  );
}
function Box() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="12" rx="2" />
    </svg>
  );
}
function Diamond() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 22 12 12 22 2 12 12 2Z" />
    </svg>
  );
}
function Flow() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h6m6 0h6" />
      <path d="M9 12 12 9l3 3-3 3-3-3Z" />
    </svg>
  );
}
function ZoomIn() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3M8 11h6M11 8v6" />
    </svg>
  );
}
function ZoomOut() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3M8 11h6" />
    </svg>
  );
}
function FitIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  );
}
function MessageFlowIcon({ hidden }: { hidden: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {/* Envelope = message flow. Dashed underline echoes the BPMN message-flow line. */}
      <rect x="3" y="5" width="18" height="12" rx="1.5" />
      <path d="m3 7 9 6 9-6" />
      <path d="M4 21h16" strokeDasharray="3 3" />
      {hidden && <path d="M3 3 21 21" />}
    </svg>
  );
}
function CollapseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}
function ExpandIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

/* ---------- experiments view (rendered next to canvas, toggled by tab) ---------- */
function ExperimentsView() {
  return (
    <section
      id="experiments-view"
      className="experiments-view"
      hidden
      style={{ gridColumn: "1 / -1" }}
    >
      <div className="experiment-block">
        <h2>Prompt Builder</h2>
        <p id="process-corpus-status" />
        <div className="experiment-grid">
          <label className="field" htmlFor="system-prompt-select">
            <span>System prompt</span>
            <select id="system-prompt-select" />
          </label>
          <label className="field" htmlFor="process-select">
            <span>Curated process</span>
            <select id="process-select" />
          </label>
        </div>
        <label className="field" htmlFor="system-prompt">
          <span>System prompt text</span>
          <textarea id="system-prompt" className="short" spellCheck={false} />
        </label>
        <label className="field" htmlFor="process-prompt">
          <span>Process prompt text</span>
          <textarea id="process-prompt" className="short" spellCheck={false} />
        </label>
        <div id="process-meta" className="field-help" />
      </div>

      <div className="experiment-block">
        <h2>Experiment Metadata</h2>
        <div className="experiment-grid">
          <label className="field" htmlFor="provider">
            <span>Provider</span>
            <select id="provider">
              <option>ChatGPT</option>
              <option>Gemini</option>
              <option>Claude</option>
              <option>Other</option>
            </select>
          </label>
          <label className="field" htmlFor="model-label">
            <span>Model label</span>
            <input id="model-label" type="text" />
          </label>
          <label className="field" htmlFor="process-id">
            <span>Process ID</span>
            <input id="process-id" type="text" />
          </label>
          <label className="field" htmlFor="process-source">
            <span>Process source</span>
            <input id="process-source" type="text" />
          </label>
          <label className="field" htmlFor="system-prompt-version">
            <span>System prompt version</span>
            <input id="system-prompt-version" type="text" />
          </label>
          <label className="field" htmlFor="process-prompt-version">
            <span>Process prompt version</span>
            <input id="process-prompt-version" type="text" />
          </label>
          <label className="field" htmlFor="run-number">
            <span>Run number</span>
            <input id="run-number" type="number" min={1} step={1} />
          </label>
          <label className="field" htmlFor="interface-type">
            <span>Interface</span>
            <input id="interface-type" type="text" readOnly />
          </label>
        </div>
        <label className="field" htmlFor="experiment-notes">
          <span>Notes</span>
          <textarea id="experiment-notes" className="short" spellCheck={false} />
        </label>
        <label className="field">
          <span>Experiment ID</span>
          <pre id="experiment-id-preview" />
        </label>
      </div>

      <div className="experiment-block">
        <h2>Prompt Preview</h2>
        <label className="field" htmlFor="final-prompt-preview">
          <span>Final prompt</span>
          <textarea id="final-prompt-preview" readOnly spellCheck={false} />
        </label>
        <div className="action-row">
          <button id="copy-prompt" type="button" className="primary">Copy Prompt</button>
        </div>
      </div>

      <div className="experiment-block">
        <h2>Ingest Output</h2>
        <label className="field" htmlFor="raw-output">
          <span>Raw model output</span>
          <textarea id="raw-output" spellCheck={false} />
        </label>
        <div className="action-row">
          <button id="evaluate-output" type="button" className="primary">Evaluate Output</button>
          <button id="copy-manifest-row" type="button" disabled>Copy Manifest Row</button>
          <button id="download-result" type="button" disabled>Download Result</button>
          <button id="download-experiment-files" type="button" disabled>Download Experiment Files</button>
        </div>
        <p id="result-summary">No experiment has been evaluated yet.</p>
      </div>
    </section>
  );
}
