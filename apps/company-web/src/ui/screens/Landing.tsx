import { useEffect, useState } from "react";

import { Wordmark } from "../components/Wordmark.js";
import { Arrow } from "../components/icons.js";

type LandingProps = {
  onStart: () => void;
  onOpenEditor: () => void;
};

function useScrollReveal(): void {
  useEffect(() => {
    const items = document.querySelectorAll<HTMLElement>(".landing .reveal");
    if (items.length === 0) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      items.forEach((el) => el.classList.add("in-view"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );

    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

export function Landing({ onStart, onOpenEditor }: LandingProps) {
  useScrollReveal();
  return (
    <div className="landing">
      <header className="landing-header">
        <Wordmark />
        <div className="landing-header-right">
          <a className="link-quiet" href="#how">How it works</a>
          <a className="link-quiet" href="#why">Why it's different</a>
          <button className="btn-ghost" onClick={onOpenEditor}>Open editor</button>
          <button className="btn-primary" onClick={onStart}>Start a diagram</button>
        </div>
      </header>

      <section className="hero">
        <div className="hero-left">
          <div className="eyebrow">
            <span className="dot" />
            <span>For process owners, not BPMN experts</span>
          </div>
          <h1 className="display">
            Describe your process<br />
            in plain words.<br />
            <em>We'll draw the diagram.</em>
          </h1>
          <p className="lead">
            Tell us what happens, step by step. Paste the result from your favorite AI -
            ChatGPT, Gemini, Claude, or Copilot - and watch a clean, editable BPMN
            diagram appear. Export it as BPMN, SVG, or PNG when you're done.
          </p>
          <div className="hero-actions">
            <button className="btn-primary btn-large" onClick={onStart}>
              Start a diagram
              <Arrow />
            </button>
            <button className="btn-ghost btn-large" onClick={onOpenEditor}>
              Try the editor with a sample
            </button>
          </div>
          <div className="hero-meta">
            <Meta k="No login" v="Runs in your browser" />
            <Meta k="No subscription" v="Use any AI you already have" />
            <Meta k="Standards-based" v="BPMN 2.0 XML out" />
          </div>
          <div className="hero-flow" aria-label="Process flow">
            <span>Describe</span>
            <span>Prompt</span>
            <span>Render</span>
            <span>Export</span>
          </div>
        </div>

        <div className="hero-right">
          <HeroPreview />
        </div>
      </section>

      <section id="how" className="how">
        <h2 className="section-title">
          <span className="num">01</span> How it works
        </h2>
        <div className="steps reveal-stagger">
          <Step n="1" title="Describe" body="Write your process in plain language. No special syntax - just the steps as you'd explain them to a colleague." />
          <Step n="2" title="Hand off to AI" body="Copy the smart prompt we generate. Paste it into ChatGPT, Gemini, Claude, or Copilot. Copy the response back." />
          <Step n="3" title="Render" body="A clean BPMN diagram appears next to your description. Pools, lanes, gateways, and flows are laid out automatically." />
          <Step n="4" title="Edit & export" body="Drag, rename, reconnect. Download as BPMN 2.0 XML, scalable SVG, or a PNG for your slides." />
        </div>
      </section>

      <section id="why" className="why">
        <h2 className="section-title">
          <span className="num">02</span> Built for ops, not BPMN purists
        </h2>
        <div className="why-grid reveal-stagger">
          <Why title="Plain-language first" body="You shouldn't have to learn a notation to map a process. Describe it, hand it to an LLM you already trust, paste it back. That's it." />
          <Why title="Bring your own AI" body="No model is locked in. The prompt is portable and works in any chat interface. If you change tools next year, your process doesn't change with it." />
          <Why title="Real BPMN, not a sketch" body="The output is valid BPMN 2.0 XML. It opens in Camunda, Signavio, Bizagi, draw.io, or any other modeler. You're never trapped." />
          <Why title="Diagrams that read left-to-right" body="Lanes for each role. Gateways for decisions. Orthogonal routing. No tangled spaghetti, no overlapping labels." />
        </div>
      </section>

      <section className="cta reveal">
        <div className="cta-inner">
          <h2 className="display-sm">Ready to map a process?</h2>
          <p className="lead">Have a description in mind? Start there. Otherwise, open the editor with a sample.</p>
          <div className="hero-actions center">
            <button className="btn-primary btn-large" onClick={onStart}>
              Start a diagram<Arrow />
            </button>
            <button className="btn-ghost btn-large" onClick={onOpenEditor}>Open editor</button>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <Wordmark />
        <span className="muted">BPMN 2.0 generator - Runs locally in your browser - No data leaves your machine.</span>
      </footer>
    </div>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="meta-pair">
      <div className="meta-k">{k}</div>
      <div className="meta-v">{v}</div>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <article className="step reveal">
      <div className="step-head">
        <span className="step-n">{String(n).padStart(2, "0")}</span>
        <h3>{title}</h3>
      </div>
      <p>{body}</p>
    </article>
  );
}

function HeroPreview() {
  const [usePoster, setUsePoster] = useState(false);
  const [softFilter, setSoftFilter] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const connection = navigator as Navigator & { connection?: { saveData?: boolean } };
    if (reducedMotion || connection.connection?.saveData === true) {
      setUsePoster(true);
    }

    const soften = window.setTimeout(() => setSoftFilter(true), 4200);
    const zoom = window.setTimeout(() => setZoomed(true), 4300);
    return () => {
      window.clearTimeout(soften);
      window.clearTimeout(zoom);
    };
  }, []);

  if (usePoster) {
    return (
      <div className="hero-video-shell">
        <img
          className="hero-video hero-poster"
          src="/assets/hero/Hero-poster.png"
          alt="BPMN generator preview"
          loading="eager"
        />
      </div>
    );
  }

  return (
    <div className="hero-video-shell">
      <video
        className={"hero-video" + (softFilter ? " hero-video-soft" : "") + (zoomed ? " hero-video-zoomed" : "")}
        style={{
          filter: softFilter
            ? "brightness(1.045) contrast(1.035) saturate(0.96)"
            : "brightness(1.14) contrast(1.08) saturate(0.9)",
          transform: zoomed
            ? "translate3d(-12%, 0, 0) scale(1.55)"
            : "translate3d(0, 0, 0) scale(1)",
        }}
        src="/assets/hero/Hero.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        onError={() => setUsePoster(true)}
      />
    </div>
  );
}

function Why({ title, body }: { title: string; body: string }) {
  return (
    <article className="why-card reveal">
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  );
}
