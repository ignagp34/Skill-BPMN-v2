"""
Derived-metrics analysis for the BPMN DSL-vs-zero-shot evaluation.

Reads TFM-eval/results/experiments/results.csv and produces:
  - SVG figures in this folder
  - metricas-derivadas.md  (narrative + tables)

Re-run after regenerating results.csv:
  TFM-eval/.venv/Scripts/python.exe docs/analisis-derivado/build_report.py
"""
from __future__ import annotations
import pathlib
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parent.parent
CSV = REPO / "TFM-eval" / "results" / "experiments" / "results.csv"
DIFF_ORDER = ["easy", "medium", "hard", "stress"]
COLORS = {"dsl_v31": "#2c6fbb", "dsl_v5": "#7e57c2", "zs": "#e08a1e", "zs_pen": "#b03a2e"}

df = pd.read_csv(CSV)
# normalize helpers
diff_col = next(c for c in df.columns if "diff" in c.lower())
df["_sem"] = df["semantic_success"].astype(str).str.lower().isin(["true", "1"])
df["_scored"] = pd.to_numeric(df["scored_mean"], errors="coerce")
df["_feat"] = pd.to_numeric(df["feature_coverage"], errors="coerce")
df["_pen"] = df.apply(lambda r: r["_scored"] if (r["_sem"] and pd.notna(r["_scored"])) else 0.0, axis=1)
df["_in"] = pd.to_numeric(df.get("input_tokens"), errors="coerce")
df["_out"] = pd.to_numeric(df.get("output_tokens"), errors="coerce")


def cell(sub: pd.DataFrame) -> dict:
    n = len(sub)
    ok = sub[sub["_sem"]]
    return {
        "n": n,
        "sem": sub["_sem"].mean() if n else float("nan"),
        "scored_ok": ok["_scored"].mean() if len(ok) else float("nan"),
        "scored_pen": sub["_pen"].mean() if n else float("nan"),
        "feat": sub["_feat"].mean() if sub["_feat"].notna().any() else float("nan"),
    }


def by_difficulty(rep, model="GPT_5_5_THINKING", ver=None):
    sub = df[(df["representation"] == rep) & (df["model_label"] == model)]
    if ver:
        sub = sub[sub["system_prompt_version"] == ver]
    return {d: cell(sub[sub[diff_col] == d]) for d in DIFF_ORDER}


dsl = by_difficulty("dsl", ver="SYSV31")
zs = by_difficulty("zero_shot_xml")


def grouped_bars(path, title, ylabel, series, cats, ymax=1.05):
    x = range(len(cats))
    w = 0.8 / len(series)
    fig, ax = plt.subplots(figsize=(7.2, 4.2))
    for i, (label, vals, color) in enumerate(series):
        offs = [xi - 0.4 + w / 2 + i * w for xi in x]
        bars = ax.bar(offs, vals, w, label=label, color=color)
        for b, v in zip(bars, vals):
            if v == v:  # not NaN
                ax.text(b.get_x() + b.get_width() / 2, v + 0.01, f"{v:.2f}",
                        ha="center", va="bottom", fontsize=7.5)
    ax.set_xticks(list(x)); ax.set_xticklabels(cats)
    ax.set_ylim(0, ymax); ax.set_ylabel(ylabel); ax.set_title(title)
    ax.legend(fontsize=8, loc="lower left"); ax.grid(axis="y", alpha=0.3)
    fig.tight_layout(); fig.savefig(path, format="svg"); plt.close(fig)


# Fig 1: success rate by difficulty
grouped_bars(
    HERE / "fig1_success_by_difficulty.svg",
    "GPT-5.5 — Tasa de éxito semántico por dificultad",
    "éxito semántico",
    [("DSL v3.1", [dsl[d]["sem"] for d in DIFF_ORDER], COLORS["dsl_v31"]),
     ("Zero-shot XML", [zs[d]["sem"] for d in DIFF_ORDER], COLORS["zs"])],
    DIFF_ORDER,
)

# Fig 2: scored_mean conditional vs penalized
grouped_bars(
    HERE / "fig2_quality_conditional_vs_penalized.svg",
    "GPT-5.5 — Calidad estructural: condicional vs penalizada",
    "scored_mean",
    [("DSL v3.1 (siempre válido)", [dsl[d]["scored_pen"] for d in DIFF_ORDER], COLORS["dsl_v31"]),
     ("Zero-shot (solo éxitos)", [zs[d]["scored_ok"] for d in DIFF_ORDER], COLORS["zs"]),
     ("Zero-shot (penalizado, fallos=0)", [zs[d]["scored_pen"] for d in DIFF_ORDER], COLORS["zs_pen"])],
    DIFF_ORDER,
)

# Fig 3: prompt-version ablation (feature coverage). All GPT-5.5 batches share the
# GPT_5_5_THINKING label (v4 was relabeled from GPT_5_5_HIGH — same model, high mode),
# so this is a single-variable ablation over the system-prompt version.
def feat_cell(model, ver):
    sub = df[(df["model_label"] == model) & (df["representation"] == "dsl") & (df["system_prompt_version"] == ver)]
    return sub["_feat"].mean() if sub["_feat"].notna().any() else float("nan")

gpt = [feat_cell("GPT_5_5_THINKING", v) for v in ["SYSV31", "SYSV4", "SYSV5"]]
gem = [feat_cell("GEMINI_3_5_FLASH_THINKING", v) for v in ["SYSV31", "SYSV4", "SYSV5"]]
grouped_bars(
    HERE / "fig3_promptversion_feature_coverage.svg",
    "RQ5 — Cobertura de features por versión de system prompt (DSL)",
    "cobertura media de features",
    [("GPT-5.5", gpt, COLORS["dsl_v31"]),
     ("Gemini 3.5", gem, COLORS["dsl_v5"])],
    ["v3.1", "v4", "v5"],
)

# Fig 5: token-cost asymmetry (input vs output), log scale.
def tok_cell(model, ver, rep="dsl"):
    sub = df[(df["model_label"] == model) & (df["system_prompt_version"] == ver) & (df["representation"] == rep)]
    return sub["_in"].mean(), sub["_out"].mean()

tok_labels = ["DSL v3.1", "DSL v4", "DSL v5", "Zero-shot"]
tok_specs = [("GPT_5_5_THINKING", "SYSV31", "dsl"), ("GPT_5_5_THINKING", "SYSV4", "dsl"),
             ("GPT_5_5_THINKING", "SYSV5", "dsl"), ("GPT_5_5_THINKING", "ZSXML", "zero_shot_xml")]
ins = [tok_cell(*s)[0] for s in tok_specs]
outs = [tok_cell(*s)[1] for s in tok_specs]
figt, axt = plt.subplots(figsize=(7.4, 4.3))
xt = range(len(tok_labels)); wt = 0.38
axt.bar([i - wt / 2 for i in xt], ins, wt, label="tokens entrada (system + proceso)", color=COLORS["dsl_v31"])
axt.bar([i + wt / 2 for i in xt], outs, wt, label="tokens salida", color=COLORS["zs"])
axt.set_yscale("log"); axt.set_xticks(list(xt)); axt.set_xticklabels(tok_labels)
axt.set_ylabel("tokens (escala log)")
axt.set_title("GPT-5.5 — Asimetría de coste en tokens (entrada vs salida)")
for i, (a, b) in enumerate(zip(ins, outs)):
    if a == a:
        axt.text(i - wt / 2, a * 1.05, f"{a:.0f}", ha="center", va="bottom", fontsize=7.5)
    if b == b:
        axt.text(i + wt / 2, b * 1.05, f"{b:.0f}", ha="center", va="bottom", fontsize=7.5)
axt.legend(fontsize=8); axt.grid(axis="y", alpha=0.3)
figt.tight_layout(); figt.savefig(HERE / "fig5_token_asymmetry.svg", format="svg"); plt.close(figt)
print("\nTokens (input / output):")
for lbl, a, b in zip(tok_labels, ins, outs):
    print(f"  {lbl:<14} in={a:.0f}  out={b:.0f}")

# Fig 4: robustness vs effective quality (overall, GPT-5.5)
def overall(rep, ver=None):
    sub = df[(df["representation"] == rep) & (df["model_label"] == "GPT_5_5_THINKING")]
    if ver:
        sub = sub[sub["system_prompt_version"] == ver]
    return cell(sub)

o_dsl, o_dsl5, o_zs = overall("dsl", "SYSV31"), overall("dsl", "SYSV5"), overall("zero_shot_xml")
grouped_bars(
    HERE / "fig4_robustness_vs_effective_quality.svg",
    "GPT-5.5 — Robustez vs calidad efectiva (global)",
    "valor [0–1]",
    [("Éxito semántico", [o_dsl["sem"], o_dsl5["sem"], o_zs["sem"]], COLORS["dsl_v31"]),
     ("Calidad condicional", [o_dsl["scored_ok"], o_dsl5["scored_ok"], o_zs["scored_ok"]], COLORS["zs"]),
     ("Calidad efectiva (penalizada)", [o_dsl["scored_pen"], o_dsl5["scored_pen"], o_zs["scored_pen"]], COLORS["zs_pen"])],
    ["DSL v3.1", "DSL v5", "Zero-shot"],
)

print("Figures written to", HERE)
# expose tables for the .md (printed so they can be pasted/inspected)
for name, data in [("DSL v3.1", dsl), ("Zero-shot", zs)]:
    print(f"\n{name}")
    for d in DIFF_ORDER:
        c = data[d]
        print(f"  {d:<8} n={c['n']:>2} sem={c['sem']:.2f} ok={c['scored_ok']:.3f} pen={c['scored_pen']:.3f}")
print("\nOverall GPT-5.5:")
for nm, o in [("DSL v3.1", o_dsl), ("DSL v5", o_dsl5), ("Zero-shot", o_zs)]:
    print(f"  {nm:<10} sem={o['sem']:.3f} ok={o['scored_ok']:.3f} pen={o['scored_pen']:.3f} feat={o['feat']:.3f}")
print("feat by version GPT (v3.1 / v4-HIGH / v5):", [round(x, 3) for x in gpt])
print("feat by version GEM (v3.1 / v4 / v5):", [round(x, 3) for x in gem])
