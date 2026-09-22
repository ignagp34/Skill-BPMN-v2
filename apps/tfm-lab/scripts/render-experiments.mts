/**
 * Batch render runner — fills the missing derived artifacts for tracked
 * experiments without any manual app interaction.
 *
 * It serves the headless harness (`index.headless.html`) with Vite's
 * programmatic dev server and drives it with Playwright Chromium, so every
 * `diagram.bpmn` / `diagram.svg` / `diagram.png` / `result.json` is produced by
 * the exact same engine the live editor uses.
 *
 * Usage:
 *   tsx scripts/render-experiments.mts [--experiments <dir>] [--force] [--only <substr>]
 *
 *   --experiments <dir>  Folder of EXP-* directories. Default: prompts/experiments
 *   --force              Recompute + overwrite all artifacts with the current
 *                        engine (use for the final, version-consistent dataset).
 *   --only <substr>      Only process experiments whose folder name contains <substr>.
 *
 * An experiment is "completed" (eligible) when it has raw_output.txt. Folders
 * with only notes.md (not yet run) are skipped. Runs whose DSL fails to compile
 * get a result.json with the error status but no diagram (none is possible).
 */

import { existsSync } from "node:fs";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";
import { createServer } from "vite";

const HERE = dirname(fileURLToPath(import.meta.url));
const TFM_ROOT = resolve(HERE, "..");
const HARNESS_PATH = "/index.headless.html";
const EVALUATE_TIMEOUT_MS = 120_000;

type Args = { experiments: string; force: boolean; only: string | null };

type ProcessIndexEntry = { process_id: string; process_source?: string };

/** Metadata sidecar written by the agent/subagent generation workflow. */
type RunInfo = {
  processId?: string;
  processSource?: string;
  systemPromptVersion?: string;
  processPromptVersion?: string;
  provider?: string;
  modelLabel?: string;
  runNumber?: number;
  createdAt?: string;
  notes?: string;
};

type RenderExperimentInput = {
  experimentId: string;
  processId: string;
  processSource: string;
  systemPromptVersion: string;
  processPromptVersion: string;
  provider: string;
  modelLabel: string;
  runNumber: number;
  createdAt: string;
  notes: string;
  rawOutput: string;
  inputPrompt?: string;
};

type RenderExperimentOutput = {
  experimentId: string;
  status: string;
  succeeded: boolean;
  resultJson: string;
  normalizedDsl: string;
  inputPrompt: string;
  layoutXml: string | null;
  svg: string | null;
  pngBase64: string | null;
};

type ImageOutput = { svg: string | null; pngBase64: string | null };

/** Shape of the harness functions exposed on the page's `window`. */
type HarnessWindow = Window & {
  __harnessReady: boolean;
  renderExperiment: (input: RenderExperimentInput) => Promise<RenderExperimentOutput>;
  renderArtifactsFromLayout: (layoutXml: string) => Promise<ImageOutput>;
};

const PROVIDER_LABELS: Record<string, string> = {
  CHATGPT: "ChatGPT",
  GEMINI: "Gemini",
  CLAUDE: "Claude",
};

function parseArgs(argv: string[]): Args {
  const args: Args = { experiments: join(TFM_ROOT, "prompts", "experiments"), force: false, only: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--") continue; // pnpm forwards a literal separator; ignore it
    else if (arg === "--force") args.force = true;
    else if (arg === "--experiments") args.experiments = resolve(argv[++i] ?? args.experiments);
    else if (arg === "--only") args.only = argv[++i] ?? null;
    else if (arg === "--help" || arg === "-h") {
      console.log("Usage: tsx scripts/render-experiments.mts [--experiments <dir>] [--force] [--only <substr>]");
      process.exit(0);
    } else {
      console.warn(`Ignoring unknown argument: ${arg}`);
    }
  }
  return args;
}

type Axes = {
  processId: string;
  systemPromptVersion: string;
  provider: string;
  modelLabel: string;
  runNumber: number;
};

/** Inverse of generateExperimentId: EXP-{proc}-{sys}-{prov}-{model}-R{NN}. */
function parseExperimentId(id: string): Axes | null {
  const parts = id.split("-");
  if (parts.length !== 6 || parts[0] !== "EXP") return null;
  const run = Number.parseInt(parts[5].replace(/^R/i, ""), 10);
  if (!Number.isFinite(run)) return null;
  return {
    processId: parts[1],
    systemPromptVersion: parts[2],
    provider: parts[3],
    modelLabel: parts[4],
    runNumber: run,
  };
}

async function loadProcessSources(): Promise<Map<string, string>> {
  const indexPath = join(TFM_ROOT, "prompts", "processes", "index.json");
  const map = new Map<string, string>();
  if (!existsSync(indexPath)) return map;
  try {
    const entries = JSON.parse(await readFile(indexPath, "utf8")) as ProcessIndexEntry[];
    for (const entry of entries) {
      if (entry.process_id) map.set(entry.process_id, entry.process_source ?? "synthetic");
    }
  } catch (err) {
    console.warn(`Could not read process index.json: ${(err as Error).message}`);
  }
  return map;
}

async function safeMtimeIso(path: string): Promise<string | null> {
  try {
    return (await stat(path)).mtime.toISOString();
  } catch {
    return null;
  }
}

async function readRunInfo(path: string): Promise<RunInfo | null> {
  if (!existsSync(path)) return null;
  try {
    // Some run-info.json files are written with a UTF-8 BOM, which JSON.parse
    // rejects — strip it (charCode 0xFEFF) before parsing.
    const raw = await readFile(path, "utf8");
    const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
    return JSON.parse(text) as RunInfo;
  } catch (err) {
    console.warn(`  could not parse ${path}: ${(err as Error).message}`);
    return null;
  }
}

async function writeText(path: string, data: string, force: boolean): Promise<boolean> {
  if (!force && existsSync(path)) return false;
  await writeFile(path, data, "utf8");
  return true;
}

async function writeBase64(path: string, base64: string, force: boolean): Promise<boolean> {
  if (!force && existsSync(path)) return false;
  await writeFile(path, Buffer.from(base64, "base64"));
  return true;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (!existsSync(args.experiments)) {
    console.error(`Experiments directory not found: ${args.experiments}`);
    process.exit(1);
  }

  const processSources = await loadProcessSources();

  const allDirs = (await readdir(args.experiments, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("EXP-"))
    .map((entry) => entry.name)
    .filter((name) => (args.only === null ? true : name.includes(args.only)))
    .sort();

  console.log(
    `Scanning ${args.experiments}\n` +
      `Found ${allDirs.length} experiment folder(s)${args.only ? ` matching "${args.only}"` : ""}. ` +
      `Mode: ${args.force ? "force (recompute all)" : "fill missing"}.\n`,
  );

  const server = await createServer({
    root: TFM_ROOT,
    configFile: join(TFM_ROOT, "vite.config.ts"),
    logLevel: "warn",
    server: { open: false, port: 0, host: "127.0.0.1" },
  });
  await server.listen();
  const address = server.httpServer?.address() as AddressInfo | null;
  if (address === null) throw new Error("Vite dev server did not expose an address");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const browser = await chromium.launch();
  const stats = {
    rendered: 0,
    imagesFilled: 0,
    alreadyComplete: 0,
    failedToCompile: 0,
    stubsSkipped: 0,
    badId: 0,
    errors: 0,
  };

  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
    page.on("pageerror", (err) => console.warn(`  [page error] ${err.message}`));
    await page.goto(`${baseUrl}${HARNESS_PATH}`, { waitUntil: "load", timeout: 120_000 });
    await page.waitForFunction(
      () => (window as unknown as HarnessWindow).__harnessReady === true,
      undefined,
      { timeout: 120_000 },
    );

    for (const name of allDirs) {
      const dir = join(args.experiments, name);
      const has = (file: string): boolean => existsSync(join(dir, file));

      // A run is eligible once it has model output, in either convention:
      //   app convention:   raw_output.txt
      //   agent convention: output.dsl (+ run-info.json metadata)
      const outputFile = has("raw_output.txt")
        ? "raw_output.txt"
        : has("output.dsl")
          ? "output.dsl"
          : null;
      if (outputFile === null) {
        stats.stubsSkipped += 1;
        continue;
      }

      const axes = parseExperimentId(name);
      if (axes === null) {
        console.warn(`! ${name}: cannot parse experiment id — skipped`);
        stats.badId += 1;
        continue;
      }

      const needFull = args.force || !has("result.json") || !has("normalized_dsl.txt");

      try {
        if (needFull) {
          const rawOutput = await readFile(join(dir, outputFile), "utf8");
          const runInfo = await readRunInfo(join(dir, "run-info.json"));
          const notesText = has("notes.md")
            ? (await readFile(join(dir, "notes.md"), "utf8")).trim()
            : "";
          const notes = notesText.length > 0 ? notesText : (runInfo?.notes ?? "");
          // input.md is the agent convention; input_prompt.md is the app's.
          const inputPrompt = has("input_prompt.md")
            ? await readFile(join(dir, "input_prompt.md"), "utf8")
            : has("input.md")
              ? await readFile(join(dir, "input.md"), "utf8")
              : undefined;
          const createdAt =
            runInfo?.createdAt ??
            (await safeMtimeIso(join(dir, outputFile))) ??
            new Date().toISOString();

          const processId = runInfo?.processId ?? axes.processId;
          const input: RenderExperimentInput = {
            experimentId: name,
            processId,
            processSource: runInfo?.processSource ?? processSources.get(processId) ?? "synthetic",
            systemPromptVersion: runInfo?.systemPromptVersion ?? axes.systemPromptVersion,
            processPromptVersion: runInfo?.processPromptVersion ?? "PROCv1",
            provider: runInfo?.provider ?? PROVIDER_LABELS[axes.provider] ?? axes.provider,
            modelLabel: runInfo?.modelLabel ?? axes.modelLabel,
            runNumber: runInfo?.runNumber ?? axes.runNumber,
            createdAt,
            notes,
            rawOutput,
            inputPrompt,
          };

          const out = await withTimeout(
            page.evaluate(
              (payload) => (window as unknown as HarnessWindow).renderExperiment(payload),
              input,
            ),
            EVALUATE_TIMEOUT_MS,
            `renderExperiment(${name})`,
          ) as RenderExperimentOutput;

          await writeText(join(dir, "normalized_dsl.txt"), out.normalizedDsl, args.force);
          // Only write input_prompt.md when no input file exists yet, so we don't
          // duplicate the agent convention's input.md.
          if (!has("input.md")) {
            await writeText(join(dir, "input_prompt.md"), out.inputPrompt, args.force);
          }
          await writeText(join(dir, "result.json"), out.resultJson, args.force);
          if (out.layoutXml !== null) await writeText(join(dir, "diagram.bpmn"), out.layoutXml, args.force);
          if (out.svg !== null) await writeText(join(dir, "diagram.svg"), out.svg, args.force);
          if (out.pngBase64 !== null) await writeBase64(join(dir, "diagram.png"), out.pngBase64, args.force);

          if (out.succeeded) {
            stats.rendered += 1;
            console.log(`✓ ${name}: ${out.status}${out.pngBase64 === null ? " (no PNG)" : ""}`);
          } else {
            stats.failedToCompile += 1;
            console.log(`· ${name}: ${out.status} — no diagram (DSL did not compile)`);
          }
        } else if (has("diagram.bpmn") && (!has("diagram.svg") || !has("diagram.png"))) {
          const layoutXml = await readFile(join(dir, "diagram.bpmn"), "utf8");
          const imgs = (await withTimeout(
            page.evaluate(
              (xml) => (window as unknown as HarnessWindow).renderArtifactsFromLayout(xml),
              layoutXml,
            ),
            EVALUATE_TIMEOUT_MS,
            `renderArtifactsFromLayout(${name})`,
          )) as ImageOutput;
          let wroteAny = false;
          if (imgs.svg !== null && !has("diagram.svg")) {
            wroteAny = (await writeText(join(dir, "diagram.svg"), imgs.svg, false)) || wroteAny;
          }
          if (imgs.pngBase64 !== null && !has("diagram.png")) {
            wroteAny = (await writeBase64(join(dir, "diagram.png"), imgs.pngBase64, false)) || wroteAny;
          }
          if (wroteAny) {
            stats.imagesFilled += 1;
            console.log(`✓ ${name}: filled missing image(s)`);
          } else {
            stats.alreadyComplete += 1;
          }
        } else {
          stats.alreadyComplete += 1;
        }
      } catch (err) {
        stats.errors += 1;
        console.error(`✗ ${name}: ${(err as Error).message}`);
      }
    }
  } finally {
    await browser.close();
    await server.close();
  }

  console.log(
    `\nDone.\n` +
      `  rendered (new/forced):   ${stats.rendered}\n` +
      `  images filled:           ${stats.imagesFilled}\n` +
      `  already complete:        ${stats.alreadyComplete}\n` +
      `  failed to compile:       ${stats.failedToCompile}\n` +
      `  stubs skipped (no output): ${stats.stubsSkipped}\n` +
      `  unparseable id:          ${stats.badId}\n` +
      `  errors:                  ${stats.errors}`,
  );

  if (stats.errors > 0) process.exitCode = 1;
}

await main();
