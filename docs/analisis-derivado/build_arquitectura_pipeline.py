"""Genera el diagrama de arquitectura real del pipeline texto -> BPMN.

La figura refleja la separación existente en el repositorio:

- apps/company-web y apps/tfm-lab preparan el prompt y reciben la salida de un
  LLM externo mediante un handoff manual.
- packages/bpmn-core implementa el compilador determinista compartido.
- No existe un bucle automático de self-repair, por lo que no se representa.

Salidas:
  docs/imagenes/arquitectura_pipeline.png
  docs/imagenes/arquitectura_pipeline.pdf
"""

from __future__ import annotations

import pathlib

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch


HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE.parent / "imagenes"
OUT.mkdir(parents=True, exist_ok=True)

# Paleta sobria para impresión académica.
INK = "#172536"
MUTED = "#526477"
LINE = "#718397"
APP_BG = "#F5F8FB"
APP_EDGE = "#AAB7C4"
LLM = "#E68A2E"
LLM_EDGE = "#B96518"
DSL = "#E4EFFA"
DSL_EDGE = "#3979B8"
CORE_BG = "#F2F7FC"
CORE_EDGE = "#2F6FAE"
CORE = "#2F6FAE"
CORE_DARK = "#1E527F"
OUTPUT = "#258778"
OUTPUT_EDGE = "#17695D"
WHITE = "#FFFFFF"

plt.rcParams.update(
    {
        "font.family": "DejaVu Sans",
        "font.size": 10,
        "pdf.fonttype": 42,
        "ps.fonttype": 42,
    }
)

fig, ax = plt.subplots(figsize=(16, 7.6))
fig.patch.set_facecolor(WHITE)
ax.set_xlim(0, 16)
ax.set_ylim(0, 7.6)
ax.axis("off")


def rounded_box(
    x: float,
    y: float,
    w: float,
    h: float,
    title: str,
    subtitle: str = "",
    *,
    face: str = WHITE,
    edge: str = LINE,
    title_color: str = INK,
    subtitle_color: str = MUTED,
    title_size: float = 10.8,
    subtitle_size: float = 8.5,
    linewidth: float = 1.5,
    radius: float = 0.12,
    zorder: int = 3,
) -> None:
    ax.add_patch(
        FancyBboxPatch(
            (x, y),
            w,
            h,
            boxstyle=f"round,pad=0.025,rounding_size={radius}",
            facecolor=face,
            edgecolor=edge,
            linewidth=linewidth,
            zorder=zorder,
        )
    )
    center_x = x + w / 2
    if subtitle:
        ax.text(
            center_x,
            y + h * 0.61,
            title,
            ha="center",
            va="center",
            color=title_color,
            fontsize=title_size,
            fontweight="bold",
            zorder=zorder + 1,
        )
        ax.text(
            center_x,
            y + h * 0.31,
            subtitle,
            ha="center",
            va="center",
            color=subtitle_color,
            fontsize=subtitle_size,
            linespacing=1.2,
            zorder=zorder + 1,
        )
    else:
        ax.text(
            center_x,
            y + h / 2,
            title,
            ha="center",
            va="center",
            color=title_color,
            fontsize=title_size,
            fontweight="bold",
            zorder=zorder + 1,
        )


def arrow(
    start: tuple[float, float],
    end: tuple[float, float],
    *,
    color: str = INK,
    linewidth: float = 1.8,
    connectionstyle: str = "arc3",
) -> None:
    ax.add_patch(
        FancyArrowPatch(
            start,
            end,
            arrowstyle="-|>",
            mutation_scale=16,
            linewidth=linewidth,
            color=color,
            connectionstyle=connectionstyle,
            shrinkA=0,
            shrinkB=0,
            zorder=2,
        )
    )


# Título.
ax.text(
    8,
    7.22,
    "Arquitectura del pipeline de generación BPMN",
    ha="center",
    va="center",
    fontsize=17,
    fontweight="bold",
    color=INK,
)
ax.text(
    8,
    6.87,
    "Del lenguaje natural a un modelo BPMN 2.0 renderizable",
    ha="center",
    va="center",
    fontsize=10.5,
    color=MUTED,
)

# Banda de orquestación de las aplicaciones.
ax.add_patch(
    FancyBboxPatch(
        (0.45, 4.65),
        15.1,
        1.75,
        boxstyle="round,pad=0.025,rounding_size=0.14",
        facecolor=APP_BG,
        edgecolor=APP_EDGE,
        linewidth=1.3,
        zorder=0,
    )
)
ax.text(
    0.72,
    6.15,
    "Aplicaciones y handoff con el LLM",
    ha="left",
    va="center",
    fontsize=9.5,
    fontweight="bold",
    color=MUTED,
)
ax.text(
    15.28,
    6.15,
    "apps/company-web · apps/tfm-lab",
    ha="right",
    va="center",
    fontsize=8.5,
    color=MUTED,
)

top_y, top_h = 4.92, 1.05
top_boxes = [
    (0.78, 2.55, "Descripción del proceso", "Lenguaje natural"),
    (3.78, 2.75, "Construcción del prompt", "System prompt + narrativa"),
    (6.98, 2.35, "LLM externo", "ChatGPT · Gemini · Claude · Copilot"),
    (9.78, 2.55, "Respuesta del modelo", "Salida textual copiada y pegada"),
    (12.78, 2.35, "DSL textual interno", "Representación intermedia"),
]

for index, (x, w, title, subtitle) in enumerate(top_boxes):
    if index == 2:
        rounded_box(
            x,
            top_y,
            w,
            top_h,
            title,
            subtitle,
            face=LLM,
            edge=LLM_EDGE,
            title_color=WHITE,
            subtitle_color=WHITE,
        )
    elif index == 4:
        rounded_box(
            x,
            top_y,
            w,
            top_h,
            title,
            subtitle,
            face=DSL,
            edge=DSL_EDGE,
            title_color=INK,
        )
    else:
        rounded_box(x, top_y, w, top_h, title, subtitle)

for left, right in zip(top_boxes, top_boxes[1:]):
    left_x, left_w = left[0], left[1]
    right_x = right[0]
    arrow((left_x + left_w, top_y + top_h / 2), (right_x - 0.16, top_y + top_h / 2))

# Contenedor del motor compartido.
core_x, core_y, core_w, core_h = 0.45, 0.48, 15.1, 3.72
ax.add_patch(
    FancyBboxPatch(
        (core_x, core_y),
        core_w,
        core_h,
        boxstyle="round,pad=0.025,rounding_size=0.14",
        facecolor=CORE_BG,
        edgecolor=CORE_EDGE,
        linewidth=1.7,
        zorder=0,
    )
)
ax.text(
    0.72,
    3.94,
    "Compilador determinista compartido",
    ha="left",
    va="center",
    fontsize=10.5,
    fontweight="bold",
    color=CORE_DARK,
)
ax.text(
    15.28,
    3.94,
    "packages/bpmn-core · @text-to-bpmn/core",
    ha="right",
    va="center",
    fontsize=9,
    color=CORE_DARK,
)

stage_y, stage_h = 1.48, 1.35
stages = [
    (
        0.78,
        2.70,
        "parseDsl",
        "dsl/\nlexer → parser → análisis semántico",
    ),
    (
        3.93,
        2.50,
        "emitBpmnXml",
        "bpmn/\nXML BPMN semántico",
    ),
    (
        6.88,
        3.00,
        "renderSemanticXml",
        "render/\nsaneado → auto-layout → refinamiento",
    ),
    (
        10.33,
        2.65,
        "validateBpmnModel",
        "validation/\nmodelo + layout + diagnósticos",
    ),
]

for x, w, title, subtitle in stages:
    rounded_box(
        x,
        stage_y,
        w,
        stage_h,
        title,
        subtitle,
        face=CORE,
        edge=CORE_DARK,
        title_color=WHITE,
        subtitle_color="#EAF3FB",
        title_size=11,
        subtitle_size=8.4,
    )

for left, right in zip(stages, stages[1:]):
    arrow(
        (left[0] + left[1], stage_y + stage_h / 2),
        (right[0] - 0.16, stage_y + stage_h / 2),
        color=CORE_DARK,
    )

rounded_box(
    13.43,
    stage_y,
    1.82,
    stage_h,
    "BPMN 2.0",
    "XML con DI\n.bpmn · SVG · PNG",
    face=OUTPUT,
    edge=OUTPUT_EDGE,
    title_color=WHITE,
    subtitle_color=WHITE,
    title_size=11.5,
    subtitle_size=8.4,
)
arrow(
    (stages[-1][0] + stages[-1][1], stage_y + stage_h / 2),
    (13.27, stage_y + stage_h / 2),
    color=OUTPUT_EDGE,
)

# Entrada desde el DSL al motor, sin bucle de realimentación.
dsl_center_x = top_boxes[-1][0] + top_boxes[-1][1] / 2
parse_center_x = stages[0][0] + stages[0][1] / 2
handoff_y = 3.48
ax.plot(
    [dsl_center_x, dsl_center_x, parse_center_x],
    [top_y, handoff_y, handoff_y],
    color=DSL_EDGE,
    linewidth=2.1,
    solid_capstyle="round",
    zorder=2,
)
arrow(
    (parse_center_x, handoff_y),
    (parse_center_x, stage_y + stage_h),
    color=DSL_EDGE,
    linewidth=2.1,
)

# Etiquetas de artefactos entre etapas.
artifact_y = 0.98
ax.text(3.70, artifact_y, "ResolvedModel", ha="center", va="center", fontsize=8.1, color=MUTED)
ax.text(6.66, artifact_y, "semanticXml", ha="center", va="center", fontsize=8.1, color=MUTED)
ax.text(10.10, artifact_y, "layoutXml", ha="center", va="center", fontsize=8.1, color=MUTED)

fig.subplots_adjust(left=0.015, right=0.985, top=0.985, bottom=0.02)
fig.savefig(OUT / "arquitectura_pipeline.png", dpi=220, bbox_inches="tight", facecolor=WHITE)
fig.savefig(OUT / "arquitectura_pipeline.pdf", bbox_inches="tight", facecolor=WHITE)
plt.close(fig)

print(f"Generados: {OUT / 'arquitectura_pipeline.png'} y {OUT / 'arquitectura_pipeline.pdf'}")
