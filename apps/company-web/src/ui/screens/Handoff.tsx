import type { ChangeEvent } from "react";
import { useMemo, useState } from "react";

import { ScreenHeader } from "./Describe.js";
import { Arrow, Check, Copy, Dot, DotIdle, ExternalIcon } from "../components/icons.js";
import { SAMPLE_DSL } from "../sampleData.js";
import systemPromptV5 from "../../../prompts/system/internal_bpmn_dsl_system_prompt_v5.md?raw";

type HandoffProps = {
  processDesc: string;
  dsl: string;
  setDsl: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
};

export function Handoff({ processDesc, dsl, setDsl, onBack, onNext }: HandoffProps) {
  const prompt = useMemo(() => buildPrompt(processDesc), [processDesc]);
  const [promptCopied, setPromptCopied] = useState(false);
  const [pasted, setPasted] = useState(dsl !== SAMPLE_DSL && dsl.trim().length > 0);

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
    const v = e.target.value;
    setDsl(v);
    setPasted(v.trim().length > 0);
  };

  return (
    <div className="step-screen">
      <ScreenHeader
        eyebrow="Step 2 of 3"
        title={<>Hand it off to <em>your AI.</em></>}
        sub="Copy the prompt on the left. Paste it into any AI chat — ChatGPT, Gemini, Claude, Copilot. Copy the response back into the right-hand box."
      />

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
              {promptCopied ? (
                <><Check /> Copied</>
              ) : (
                <><Copy /> Copy prompt</>
              )}
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
              <h3>Paste the response</h3>
            </div>
            <span className={"paste-status " + (pasted ? "paste-ok" : "paste-waiting")}>
              {pasted ? (<><Dot />Looks good</>) : (<><DotIdle />Waiting for paste</>)}
            </span>
          </div>

          <p className="card-hint">
            The AI will return a block of text in our process syntax. Paste the <strong>entire</strong>{" "}
            response — extra prose around it is fine.
          </p>

          <textarea
            className="paste-textarea"
            value={dsl}
            onChange={onPaste}
            placeholder="Paste the AI's response here…"
            spellCheck={false}
          />

          <div className="paste-foot">
            <button
              type="button"
              className="link-quiet"
              onClick={() => { setDsl(SAMPLE_DSL); setPasted(true); }}
            >
              Use sample response instead
            </button>
            <button
              type="button"
              className="link-quiet"
              onClick={() => { setDsl(""); setPasted(false); }}
            >
              Clear
            </button>
          </div>
        </section>
      </div>

      <div className="step-actions">
        <button className="btn-ghost btn-large" onClick={onBack}>Back</button>
        <button className="btn-primary btn-large" onClick={onNext} disabled={!pasted}>
          Render diagram <Arrow />
        </button>
      </div>
    </div>
  );
}

function buildPrompt(processDesc: string): string {
  const narrative = processDesc.trim().length > 0
    ? processDesc.trim()
    : "<paste your process description here>";

  return `${systemPromptV5}

---

## USER NARRATIVE

${narrative}

---

Generate the BPMN textual DSL for the narrative above. Follow §16 (Authoring Workflow), apply the §19 BPMN modeling best practices, and run the §18 checklist before emitting. Reply with the DSL inside a single fenced code block and nothing else.`;
}

function AiLauncher({ name, url }: { name: string; url: string }) {
  return (
    <a className="ai-launch" href={url} target="_blank" rel="noopener noreferrer">
      {name}
      <ExternalIcon />
    </a>
  );
}
