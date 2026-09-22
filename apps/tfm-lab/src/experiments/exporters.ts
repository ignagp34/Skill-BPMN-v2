/**
 * Diagram export helpers shared by the live editor (`ui/app.ts`) and the
 * headless batch renderer (`headless/main.ts`). They depend only on a
 * `bpmn-js` modeler-like object plus the browser SVG/Canvas APIs, so the
 * exact same export path runs in the app and under Playwright.
 */

export type ModelerLike = {
  destroy?: () => void;
  saveSVG?: () => Promise<{ svg: string }>;
};

export async function exportSvg(modeler: ModelerLike): Promise<string> {
  if (typeof modeler.saveSVG !== "function") {
    throw new Error("This BPMN modeler instance cannot export SVG.");
  }
  const result = await modeler.saveSVG();
  return result.svg;
}

export async function svgToPngBlob(svg: string): Promise<Blob> {
  const dimensions = readSvgDimensions(svg);
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil(dimensions.width));
    canvas.height = Math.max(1, Math.ceil(dimensions.height));

    const ctx = canvas.getContext("2d");
    if (ctx === null) {
      throw new Error("Canvas 2D context is unavailable.");
    }

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob === null) {
          reject(new Error("Failed to encode PNG from the current SVG."));
          return;
        }
        resolve(blob);
      }, "image/png");
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function readSvgDimensions(svg: string): { height: number; width: number } {
  const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
  const svgEl = parsed.documentElement;
  const viewBox = svgEl.getAttribute("viewBox");

  if (viewBox !== null) {
    const parts = viewBox
      .trim()
      .split(/\s+/)
      .map((value) => Number(value));
    if (parts.length === 4 && parts.every((value) => Number.isFinite(value))) {
      return { height: parts[3], width: parts[2] };
    }
  }

  const width = Number.parseFloat(svgEl.getAttribute("width") ?? "");
  const height = Number.parseFloat(svgEl.getAttribute("height") ?? "");
  if (Number.isFinite(width) && Number.isFinite(height)) {
    return { height, width };
  }

  return { height: 1080, width: 1600 };
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not decode the exported SVG."));
    image.src = url;
  });
}
