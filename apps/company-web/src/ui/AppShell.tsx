import { useEffect, useState } from "react";

import { Landing } from "./screens/Landing.js";
import { Describe } from "./screens/Describe.js";
import { Handoff } from "./screens/Handoff.js";
import { Editor } from "./screens/Editor.js";
import { Documentation } from "./screens/Documentation.js";
import { Wordmark } from "./components/Wordmark.js";
import { SAMPLE_DSL, STARTER_DESCRIPTION } from "./sampleData.js";

const SCREENS = ["landing", "describe", "handoff", "editor", "documentation"] as const;
type Screen = (typeof SCREENS)[number];

function isScreen(value: string): value is Screen {
  return (SCREENS as readonly string[]).includes(value);
}

const ACCENT = "#FF6600";
const ACCENT_STRONG = "#cc4d00";

export function App() {
  useEffect(() => {
    // Corporate brand: clean white + Roboto + bright orange accent.
    // Matches the BPMN generator (standalone) inspiration: bright #FF6600,
    // Roboto bold display, flat white surfaces.
    const root = document.documentElement;
    root.setAttribute("data-brand", "corporate");
    root.setAttribute("data-theme", "light");
    root.style.setProperty("--accent", ACCENT);
    root.style.setProperty("--accent-strong", ACCENT_STRONG);
  }, []);

  return <AuthedApp />;
}

function AuthedApp() {
  const [screen, setScreen] = useState<Screen>(() => {
    const h = window.location.hash.replace("#", "");
    return isScreen(h) ? h : "landing";
  });

  useEffect(() => {
    window.location.hash = screen;
  }, [screen]);

  useEffect(() => {
    const onHash = (): void => {
      const h = window.location.hash.replace("#", "");
      if (isScreen(h)) setScreen(h);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const [processDesc, setProcessDesc] = useState<string>(STARTER_DESCRIPTION);
  const [dslOutput, setDslOutput] = useState<string>(SAMPLE_DSL);

  const goto = (next: Screen): void => {
    setScreen(next);
    window.scrollTo(0, 0);
  };

  return (
    <div className="app-root">
      {screen === "landing" && (
        <Landing
          onStart={() => goto("describe")}
          onOpenEditor={() => goto("editor")}
        />
      )}
      {screen === "describe" && (
        <Describe
          value={processDesc}
          onChange={setProcessDesc}
          onBack={() => goto("landing")}
          onNext={() => goto("handoff")}
        />
      )}
      {screen === "handoff" && (
        <Handoff
          processDesc={processDesc}
          dsl={dslOutput}
          setDsl={setDslOutput}
          onBack={() => goto("describe")}
          onNext={() => goto("editor")}
        />
      )}
      {screen === "editor" && (
        <Editor
          initialDsl={dslOutput}
          onBack={() => goto("handoff")}
          onHome={() => goto("landing")}
          onDocs={() => goto("documentation")}
        />
      )}
      {screen === "documentation" && (
        <Documentation
          initialDsl={dslOutput}
          onBack={() => goto("editor")}
          onHome={() => goto("landing")}
        />
      )}

      {screen !== "landing" && screen !== "editor" && screen !== "documentation" && (
        <CornerNav screen={screen} goto={goto} />
      )}
    </div>
  );
}

function CornerNav({ screen, goto }: { screen: Screen; goto: (s: Screen) => void }) {
  const indices: Record<Screen, number> = { landing: -1, describe: 0, handoff: 1, editor: 2, documentation: -1 };
  const stepIdx = indices[screen];
  const steps: Array<{ id: Screen; label: string }> = [
    { id: "describe", label: "Describe" },
    { id: "handoff", label: "Generate" },
    { id: "editor", label: "Edit & export" },
  ];
  return (
    <nav className="corner-nav" aria-label="Process steps">
      <button className="corner-nav-home" onClick={() => goto("landing")} title="Home">
        <Wordmark small />
      </button>
      <ol>
        {steps.map((s, i) => (
          <li key={s.id} data-active={i === stepIdx} data-done={i < stepIdx}>
            <button onClick={() => goto(s.id)}>
              <span className="step-num">{String(i + 1).padStart(2, "0")}</span>
              <span className="step-label">{s.label}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
