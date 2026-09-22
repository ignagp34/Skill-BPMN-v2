import type { ReactNode } from "react";

import { Arrow } from "../components/icons.js";
import { STARTER_INCIDENT, STARTER_ONBOARD, STARTER_ORDER } from "../sampleData.js";

type DescribeProps = {
  value: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
};

export function Describe({ value, onChange, onBack, onNext }: DescribeProps) {
  const wordCount = value.trim().split(/\s+/).filter(Boolean).length;
  const enoughDetail = wordCount >= 12;

  return (
    <div className="step-screen">
      <ScreenHeader
        eyebrow="Step 1 of 3"
        title={<>Describe your process<br /><em>in plain words.</em></>}
        sub="Write what happens, step by step. Mention the roles (HR, IT, Customer…), the actions, and any decisions. Don't worry about being formal — write it like an email."
      />

      <div className="describe-grid">
        <div className="describe-main">
          <label className="field-wrap">
            <span className="field-label">Process description</span>
            <textarea
              className="describe-textarea"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="A new employee joins the company. HR sends a welcome email…"
              spellCheck
            />
            <div className="field-meta">
              <span className={"count " + (enoughDetail ? "count-ok" : "count-low")}>
                {wordCount} word{wordCount === 1 ? "" : "s"}
              </span>
              <span className="muted">
                {enoughDetail ? "Looks like enough to work with." : "Aim for at least 12 words."}
              </span>
            </div>
          </label>
        </div>

        <aside className="describe-side">
          <h3 className="side-title">Tips for a good description</h3>
          <ul className="tips">
            <li><strong>Name the roles.</strong> "HR sends…", "The customer fills out…"</li>
            <li><strong>Use verbs in present tense.</strong> "Approves" is easier than "would approve".</li>
            <li><strong>Call out decisions.</strong> "If the order is over $1,000, a manager approves."</li>
            <li><strong>End with an outcome.</strong> "…and the case is closed."</li>
          </ul>
          <h3 className="side-title">Starters</h3>
          <div className="starters">
            <button type="button" className="starter" onClick={() => onChange(STARTER_ONBOARD)}>Employee onboarding</button>
            <button type="button" className="starter" onClick={() => onChange(STARTER_ORDER)}>Order fulfillment</button>
            <button type="button" className="starter" onClick={() => onChange(STARTER_INCIDENT)}>Workplace incident report</button>
          </div>
        </aside>
      </div>

      <div className="step-actions">
        <button className="btn-ghost btn-large" onClick={onBack}>Back</button>
        <button className="btn-primary btn-large" onClick={onNext} disabled={!enoughDetail}>
          Continue to AI handoff <Arrow />
        </button>
      </div>
    </div>
  );
}

export function ScreenHeader({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: ReactNode;
  sub?: string;
}) {
  return (
    <header className="screen-header">
      <div className="eyebrow">
        <span className="dot" />
        <span>{eyebrow}</span>
      </div>
      <h1 className="display-sm">{title}</h1>
      {sub !== undefined && <p className="lead">{sub}</p>}
    </header>
  );
}
