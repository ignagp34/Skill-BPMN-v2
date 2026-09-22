/**
 * Programmatic Word (.docx) generation from a ProcessDoc, using the `docx`
 * library. The user can pick separate brand colours for headings/titles and
 * for table accents (header shading); an optional logo is placed in the title
 * block, and a three-line footer is repeated on every page.
 */
import {
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type IBorderOptions,
} from "docx";

import type { ActivityLane, ActorGroup, GlossaryEntry, ProcessDoc } from "./contract.js";

export type LogoImage = {
  data: ArrayBuffer;
  type: "png" | "jpg" | "gif" | "bmp";
  /** Display size in pixels (already scaled by the caller to fit the title block). */
  width: number;
  height: number;
};

export type Brand = {
  /** Primary brand hex colour, with or without leading '#'. Used as the
   *  fallback for the more specific colours below and for the title divider. */
  color: string;
  /** Colour for the document title and section/sub headings. Defaults to `color`. */
  titleColor?: string;
  /** Colour for table headers and accents. Defaults to `color`. */
  tableColor?: string;
  logo?: LogoImage;
};

const INK = "1C150E";
const LABEL_INK = "3A2E20";
const HAIRLINE = "D8CFC0";

/** Normalise a hex colour to a 6-digit uppercase string (no '#'). */
function normHex(input: string): string {
  let hex = input.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    hex = hex.split("").map((c) => c + c).join("");
  }
  return /^[0-9a-fA-F]{6}$/.test(hex) ? hex.toUpperCase() : "FF6600";
}

/** Mix a hex colour toward white by `amount` (0..1). Used for soft label cells. */
function tint(hex: string, amount: number): string {
  const n = parseInt(normHex(hex), 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  const mix = (c: number): number => Math.round(c + (255 - c) * amount);
  return [mix(r), mix(g), mix(b)]
    .map((c) => c.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

function cellBorder(color: string): IBorderOptions {
  return { style: BorderStyle.SINGLE, size: 4, color };
}

function allBorders(color: string) {
  return {
    top: cellBorder(color),
    bottom: cellBorder(color),
    left: cellBorder(color),
    right: cellBorder(color),
  };
}

function textCell(
  text: string,
  opts: { bold?: boolean; color?: string; fill?: string; widthPct?: number } = {},
): TableCell {
  const lines = (text.length > 0 ? text : "—").split("\n");
  return new TableCell({
    width: opts.widthPct !== undefined ? { size: opts.widthPct, type: WidthType.PERCENTAGE } : undefined,
    shading: opts.fill ? { type: ShadingType.CLEAR, fill: opts.fill, color: "auto" } : undefined,
    margins: { top: 60, bottom: 60, left: 110, right: 110 },
    borders: allBorders(HAIRLINE),
    children: lines.map(
      (line) =>
        new Paragraph({
          spacing: { after: lines.length > 1 ? 40 : 0 },
          children: [new TextRun({ text: line, bold: opts.bold, color: opts.color ?? INK, size: 20 })],
        }),
    ),
  });
}

function headerRow(labels: string[], brand: string, widths: number[]): TableRow {
  return new TableRow({
    tableHeader: true,
    children: labels.map((label, i) =>
      textCell(label, { bold: true, color: "FFFFFF", fill: brand, widthPct: widths[i] }),
    ),
  });
}

function sectionHeading(text: string, brand: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 140 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: brand, space: 6 } },
    children: [new TextRun({ text, bold: true, color: brand, size: 30 })],
  });
}

function subHeading(text: string, brand: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 100 },
    children: [new TextRun({ text, bold: true, color: brand, size: 24 })],
  });
}

function glossaryTable(entries: GlossaryEntry[], brand: string): Table {
  const sorted = [...entries].sort((a, b) => a.term.localeCompare(b.term, "es"));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: allBorders(HAIRLINE),
    rows: [
      headerRow(["Término", "Definición"], brand, [30, 70]),
      ...sorted.map(
        (e) =>
          new TableRow({
            children: [
              textCell(e.term, { bold: true, widthPct: 30 }),
              textCell(e.definition, { widthPct: 70 }),
            ],
          }),
      ),
    ],
  });
}

function actorsTable(group: ActorGroup, brand: string): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: allBorders(HAIRLINE),
    rows: [
      headerRow(["Actor", "Rol", "Descripción"], brand, [25, 25, 50]),
      ...group.actors.map(
        (a) =>
          new TableRow({
            children: [
              textCell(a.name, { bold: true, widthPct: 25 }),
              textCell(a.role, { widthPct: 25 }),
              textCell(a.description, { widthPct: 50 }),
            ],
          }),
      ),
    ],
  });
}

function activityTable(
  item: ActivityLane["items"][number],
  laneName: string,
  brand: string,
  labelFill: string,
): Table {
  const row = (label: string, value: string): TableRow =>
    new TableRow({
      children: [
        textCell(label, { bold: true, color: LABEL_INK, fill: labelFill, widthPct: 28 }),
        textCell(value, { widthPct: 72 }),
      ],
    });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: allBorders(HAIRLINE),
    rows: [
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 2,
            shading: { type: ShadingType.CLEAR, fill: brand, color: "auto" },
            margins: { top: 70, bottom: 70, left: 110, right: 110 },
            borders: allBorders(brand),
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: `Ficha ${item.number} — ${item.name}`, bold: true, color: "FFFFFF", size: 22 }),
                ],
              }),
            ],
          }),
        ],
      }),
      row("Actividad", item.name),
      row("Lane / Actor", laneName),
      row("Descripción", item.description),
      row("Entrada", item.input),
      row("Salida", item.output),
      row("Indicadores", item.indicators),
      row("Acciones de mejora", item.improvements),
    ],
  });
}

function spacer(after = 160): Paragraph {
  return new Paragraph({ spacing: { after }, children: [] });
}

/** Footer repeated on every page: three lines in Calibri 9, italic. */
function buildFooter(doc: ProcessDoc): Footer {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yyyy = today.getFullYear();
  const lines = [
    "Documentación diagrama BPMN",
    doc.meta.processName || "Proceso",
    `Revisión 01.00 – ${dd}/${mm}/${yyyy}`,
  ];
  return new Footer({
    children: lines.map(
      (line) =>
        new Paragraph({
          spacing: { after: 0 },
          children: [new TextRun({ text: line, italics: true, color: LABEL_INK, size: 18 })],
        }),
    ),
  });
}

export async function buildDocx(doc: ProcessDoc, brand: Brand): Promise<Blob> {
  const brandHex = normHex(brand.color);
  const titleHex = normHex(brand.titleColor ?? brand.color);
  const tableHex = normHex(brand.tableColor ?? brand.color);
  const labelFill = tint(tableHex, 0.86);

  const children: (Paragraph | Table)[] = [];

  // ---- Title block ----
  if (brand.logo) {
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new ImageRun({
            type: brand.logo.type,
            data: brand.logo.data,
            transformation: { width: brand.logo.width, height: brand.logo.height },
          }),
        ],
      }),
    );
  }
  children.push(
    new Paragraph({
      spacing: { before: brand.logo ? 0 : 240, after: 40 },
      children: [new TextRun({ text: doc.meta.title, bold: true, color: titleHex, size: 48 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text: doc.meta.processName, color: INK, size: 26 })],
    }),
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: brandHex, space: 6 } },
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `Documentación de proceso · ${new Date().toLocaleDateString("es-ES")}`,
          color: LABEL_INK,
          size: 18,
        }),
      ],
    }),
  );

  // ---- 1. Glosario ----
  children.push(sectionHeading("1. Glosario de términos", titleHex));
  if (doc.glossary.length > 0) {
    children.push(glossaryTable(doc.glossary, tableHex));
  } else {
    children.push(new Paragraph({ children: [new TextRun({ text: "Sin términos.", italics: true, color: LABEL_INK })] }));
  }

  // ---- 2. Actores ----
  children.push(sectionHeading("2. Actores", titleHex));
  for (const group of doc.actors) {
    children.push(subHeading(group.pool, titleHex));
    if (group.actors.length > 0) {
      children.push(actorsTable(group, tableHex));
    } else {
      children.push(
        new Paragraph({ children: [new TextRun({ text: "Sin actores definidos.", italics: true, color: LABEL_INK })] }),
      );
    }
    children.push(spacer(120));
  }

  // ---- 3. Fichas de actividad ----
  children.push(sectionHeading("3. Fichas de actividad", titleHex));
  doc.activities.forEach((lane, laneIdx) => {
    if (lane.items.length === 0) return;
    children.push(subHeading(`3.${laneIdx + 1}  ${lane.lane}`, titleHex));
    lane.items.forEach((item) => {
      children.push(activityTable(item, lane.lane, tableHex, labelFill));
      children.push(spacer(200));
    });
  });

  const document = new Document({
    creator: "BPMN-DSL · Generador de documentación",
    title: doc.meta.title,
    styles: {
      // Body letter: Calibri 10pt (docx size is in half-points, so 20 = 10pt).
      default: {
        document: { run: { font: "Calibri", size: 20, color: INK } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1100, right: 1100, bottom: 1100, left: 1300 },
          },
        },
        footers: { default: buildFooter(doc) },
        children,
      },
    ],
  });

  return Packer.toBlob(document);
}

/** Trigger a browser download of the generated document. */
export function downloadDocx(blob: Blob, fileName: string): void {
  const safe = fileName.replace(/[^\w\-]+/g, "_").replace(/^_+|_+$/g, "") || "documentacion";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safe}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
