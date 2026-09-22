import type { ChangeEvent } from "react";
import { useMemo, useState } from "react";

import { parseDsl } from "@text-to-bpmn/core";

import { ScreenHeader } from "./Describe.js";
import { BackIcon, Check, Copy, Dot, DotIdle, DownloadIcon, ExternalIcon } from "../components/icons.js";
import { Wordmark } from "../components/Wordmark.js";
import { buildSkeleton } from "../doc/skeleton.js";
import { buildDocPrompt } from "../doc/prompt.js";
import { parseProcessDoc } from "../doc/contract.js";
import { buildDocx, downloadDocx, type LogoImage } from "../doc/buildDocx.js";
import { SAMPLE_DOC_JSON } from "../doc/sampleDoc.js";

type DocumentationProps = {
  initialDsl: string;
  onBack: () => void;
  onHome: () => void;
};

const DEFAULT_BRAND = "#FF6600";
const LOGO_MAX_WIDTH = 160;

const MIME_TO_TYPE: Record<string, LogoImage["type"]> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/bmp": "bmp",
};

export function Documentation({ initialDsl, onBack, onHome }: DocumentationProps) {
  const { prompt, activityCount } = useMemo(() => {
    const model = parseDsl(initialDsl).model;
    const skeleton = buildSkeleton(model);
    return { prompt: buildDocPrompt(skeleton), activityCount: skeleton.totalActivities };
  }, [initialDsl]);

  const [promptCopied, setPromptCopied] = useState(false);
  const [json, setJson] = useState("");
  const [brandColor, setBrandColor] = useState(DEFAULT_BRAND);
  const [titleColor, setTitleColor] = useState(DEFAULT_BRAND);
  const [tableColor, setTableColor] = useState(DEFAULT_BRAND);
  const [logo, setLogo] = useState<(LogoImage & { previewUrl: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [generated, setGenerated] = useState(false);

  const pasted = json.trim().length > 0;

  const copyPrompt = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      // Clipboard may be unavailable; the prompt is still selectable.
    }
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 1800);
  };

  const onPaste = (e: ChangeEvent<HTMLTextAreaElement>): void => {
    setJson(e.target.value);
    setError(null);
    setGenerated(false);
  };

  const onLogo = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    const type = MIME_TO_TYPE[file.type];
    if (!type) {
      setError("Unsupported logo format. Use PNG, JPG, GIF or BMP.");
      return;
    }
    const data = await file.arrayBuffer();
    const previewUrl = URL.createObjectURL(file);
    const { width, height } = await imageSize(previewUrl);
    const scale = width > LOGO_MAX_WIDTH ? LOGO_MAX_WIDTH / width : 1;
    if (logo) URL.revokeObjectURL(logo.previewUrl);
    setLogo({
      data,
      type,
      width: Math.round(width * scale),
      height: Math.round(height * scale),
      previewUrl,
    });
    setError(null);
  };

  const removeLogo = (): void => {
    if (logo) URL.revokeObjectURL(logo.previewUrl);
    setLogo(null);
  };

  const onGenerate = async (): Promise<void> => {
    const { doc, error: parseError } = parseProcessDoc(json);
    if (parseError || !doc) {
      setError(parseError ?? "Could not interpret the pasted JSON.");
      setGenerated(false);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const logoArg = logo
        ? { data: logo.data, type: logo.type, width: logo.width, height: logo.height }
        : undefined;
      const blob = await buildDocx(doc, { color: brandColor, titleColor, tableColor, logo: logoArg });
      downloadDocx(blob, doc.meta.processName || "process-documentation");
      setGenerated(true);
    } catch (err) {
      setError(`Could not generate the document. ${err instanceof Error ? err.message : ""}`.trim());
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="step-screen doc-screen">
      <header className="doc-topbar">
        <button className="iconbtn iconbtn-wordmark" onClick={onHome} title="Home">
          <Wordmark />
        </button>
        <button className="btn-ghost" onClick={onBack}>
          <BackIcon /> Back to editor
        </button>
      </header>

      <ScreenHeader
        eyebrow="Documentation"
        title={<>Generate the process <em>documentation</em>.</>}
        sub="Copy the prompt, paste it into your AI, and bring back the JSON. The app builds a Word document with a glossary, actors and activity sheets — with your logo and brand colours. The document is written in the same language as your diagram."
      />

      {activityCount === 0 && (
        <p className="doc-warn">
          The current diagram has no activities (tasks). Go back to the editor and generate a diagram with tasks before documenting.
        </p>
      )}

      <div className="handoff-grid">
        <section className="handoff-card">
          <div className="handoff-card-head">
            <div>
              <div className="card-num">A</div>
              <h3>Copy this prompt</h3>
            </div>
            <button
              className={"btn-primary btn-pill " + (promptCopied ? "btn-copied" : "")}
              onClick={copyPrompt}
            >
              {promptCopied ? (<><Check /> Copied</>) : (<><Copy /> Copy prompt</>)}
            </button>
          </div>

          <div className="ai-launchers">
            <span className="ai-launchers-label">Open your AI:</span>
            <AiLauncher name="ChatGPT" url="https://chatgpt.com/" />
            <AiLauncher name="Gemini" url="https://gemini.google.com/" />
            <AiLauncher name="Claude" url="https://claude.ai/" />
            <AiLauncher name="Copilot" url="https://copilot.microsoft.com/" />
          </div>

          <pre className="prompt-pre">{prompt}</pre>
        </section>

        <section className="handoff-card">
          <div className="handoff-card-head">
            <div>
              <div className="card-num">B</div>
              <h3>Paste the JSON response</h3>
            </div>
            <span className={"paste-status " + (pasted ? "paste-ok" : "paste-waiting")}>
              {pasted ? (<><Dot />Ready</>) : (<><DotIdle />Waiting</>)}
            </span>
          </div>

          <p className="card-hint">
            The AI returns a <strong>JSON</strong> block. Paste the entire response — extra prose around it is fine.
          </p>

          <textarea
            className="paste-textarea"
            value={json}
            onChange={onPaste}
            placeholder="Paste the assistant's JSON here…"
            spellCheck={false}
          />

          <div className="paste-foot">
            <button type="button" className="link-quiet" onClick={() => { setJson(SAMPLE_DOC_JSON); setError(null); setGenerated(false); }}>
              Use example
            </button>
            <button type="button" className="link-quiet" onClick={() => { setJson(""); setError(null); setGenerated(false); }}>
              Clear
            </button>
          </div>
        </section>
      </div>

      <section className="brand-panel">
        <div className="brand-panel-head">
          <div className="card-num">C</div>
          <h3>Branding</h3>
        </div>
        <div className="brand-controls">
          <div className="brand-color-group">
            <ColorField label="Brand colour" value={brandColor} onChange={setBrandColor} />
            <ColorField label="Titles colour" value={titleColor} onChange={setTitleColor} />
            <ColorField label="Tables colour" value={tableColor} onChange={setTableColor} />
          </div>

          <div className="brand-logo-field">
            <span>Logo</span>
            {logo ? (
              <div className="brand-logo-preview">
                <img src={logo.previewUrl} alt="Logo" />
                <button type="button" className="link-quiet" onClick={removeLogo}>Remove</button>
              </div>
            ) : (
              <label className="brand-logo-drop">
                <input type="file" accept="image/png,image/jpeg,image/gif,image/bmp" onChange={onLogo} />
                <span>Upload image (PNG, JPG, GIF, BMP)</span>
              </label>
            )}
          </div>
        </div>
      </section>

      {error && <p className="doc-error">{error}</p>}
      {generated && !error && (
        <p className="doc-ok"><Check /> Document generated and downloaded.</p>
      )}

      <div className="step-actions">
        <button className="btn-ghost btn-large" onClick={onBack}>Back</button>
        <button className="btn-primary btn-large" onClick={onGenerate} disabled={!pasted || busy}>
          {busy ? "Generating…" : (<>Generate Word <DownloadIcon /></>)}
        </button>
      </div>
    </div>
  );
}

function imageSize(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || LOGO_MAX_WIDTH, height: img.naturalHeight || LOGO_MAX_WIDTH });
    img.onerror = () => resolve({ width: LOGO_MAX_WIDTH, height: LOGO_MAX_WIDTH });
    img.src = url;
  });
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="brand-color-field">
      <span>{label}</span>
      <span className="brand-color-row">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
        <code>{value.toUpperCase()}</code>
      </span>
    </label>
  );
}

function AiLauncher({ name, url }: { name: string; url: string }) {
  return (
    <a className="ai-launch" href={url} target="_blank" rel="noopener noreferrer">
      {name}
      <ExternalIcon />
    </a>
  );
}
