/**
 * Ingest human-pasted direct BPMN XML from EXP-*-ZSXML-*-R* folders.
 *
 * The raw output.bpmn is never overwritten. Python supplies authoritative M1
 * XSD validity; the browser harness only probes import/render behavior and
 * creates visualization artifacts.
 */

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";
import { createServer } from "vite";

const HERE = dirname(fileURLToPath(import.meta.url));
const TFM_ROOT = resolve(HERE, "..");
const REPO_ROOT = resolve(TFM_ROOT, "..", "..");
const HARNESS_PATH = "/index.headless.html";
const TIMEOUT_MS = 120_000;

type Args = {
  experiments: string;
  force: boolean;
  only: string | null;
  python: string;
  schema: string;
};

type UsageMetadata = {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  elapsedSeconds: number | null;
  iterations: number | null;
};

type RunInfo = Partial<UsageMetadata> & {
  representation?: string;
  processId?: string;
  processSource?: string;
  systemPromptVersion?: string;
  processPromptVersion?: string;
  provider?: string;
  modelLabel?: string;
  runNumber?: number;
  createdAt?: string;
  notes?: string;
  postprocessing?: string[];
};

type XsdValidation = { valid: boolean; errors: string[] };

type ZeroShotXmlInput = {
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
  inputPrompt: string;
  rawXml: string;
  inputPromptHash: string;
  rawOutputHash: string;
  xsdValidation: XsdValidation;
  usage: UsageMetadata;
  postprocessing: string[];
};

type IngestOutput = {
  experimentId: string;
  status: string;
  succeeded: boolean;
  resultJson: string;
  layoutXml: string | null;
  svg: string | null;
  pngBase64: string | null;
};

type HarnessWindow = Window & {
  __harnessReady: boolean;
  ingestZeroShotXml: (input: ZeroShotXmlInput) => Promise<IngestOutput>;
};

function parseArgs(argv: string[]): Args {
  const defaultPython = join(REPO_ROOT, "TFM-eval", ".venv", "Scripts", "python.exe");
  const args: Args = {
    experiments: join(TFM_ROOT, "prompts", "experiments"),
    force: false,
    only: null,
    python: defaultPython,
    schema: join(REPO_ROOT, "TFM-eval", "schemas", "BPMN20.xsd"),
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") continue;
    if (arg === "--force") args.force = true;
    else if (arg === "--experiments") args.experiments = resolve(argv[++index] ?? args.experiments);
    else if (arg === "--only") args.only = argv[++index] ?? null;
    else if (arg === "--python") args.python = resolve(argv[++index] ?? args.python);
    else if (arg === "--schema") args.schema = resolve(argv[++index] ?? args.schema);
    else if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: tsx scripts/ingest-zero-shot-xml.mts " +
        "[--experiments <dir>] [--python <exe>] [--schema <BPMN20.xsd>] " +
        "[--force] [--only <substr>]",
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function parseAxes(name: string): {
  processId: string;
  provider: string;
  modelLabel: string;
  runNumber: number;
} | null {
  const parts = name.split("-");
  if (parts.length !== 6 || parts[0] !== "EXP" || parts[2] !== "ZSXML") return null;
  const runNumber = Number.parseInt(parts[5].replace(/^R/i, ""), 10);
  if (!Number.isFinite(runNumber)) return null;
  return {
    processId: parts[1],
    provider: parts[3],
    modelLabel: parts[4],
    runNumber,
  };
}

async function readJson(path: string): Promise<RunInfo | null> {
  if (!existsSync(path)) return null;
  const raw = await readFile(path, "utf8");
  const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  return JSON.parse(text) as RunInfo;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function validateRawXml(python: string, xmlPath: string, schema: string): XsdValidation {
  const result = spawnSync(
    python,
    ["-m", "bpmn_eval.cli_validate_raw", xmlPath, "--schema", schema],
    { encoding: "utf8", cwd: join(REPO_ROOT, "TFM-eval") },
  );
  if (result.status !== 0) {
    throw new Error(
      `XSD validation failed to run: ${(result.stderr || result.stdout).trim()}`,
    );
  }
  const payload = JSON.parse(result.stdout) as {
    valid?: boolean;
    errors?: unknown[];
  };
  return {
    valid: payload.valid === true,
    errors: Array.isArray(payload.errors)
      ? payload.errors.map((error) => String(error))
      : [],
  };
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function writeText(path: string, value: string, force: boolean): Promise<void> {
  if (!force && existsSync(path)) return;
  await writeFile(path, value, "utf8");
}

async function writeBinary(path: string, base64: string, force: boolean): Promise<void> {
  if (!force && existsSync(path)) return;
  await writeFile(path, Buffer.from(base64, "base64"));
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!existsSync(args.experiments)) throw new Error(`Experiments directory not found: ${args.experiments}`);
  if (!existsSync(args.python)) throw new Error(`Python executable not found: ${args.python}`);
  if (!existsSync(args.schema)) throw new Error(`BPMN schema not found: ${args.schema}`);

  const folders = (await readdir(args.experiments, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && parseAxes(entry.name) !== null)
    .map((entry) => entry.name)
    .filter((name) => args.only === null || name.includes(args.only))
    .sort();

  const server = await createServer({
    root: TFM_ROOT,
    configFile: join(TFM_ROOT, "vite.config.ts"),
    logLevel: "warn",
    server: { open: false, port: 0, host: "127.0.0.1" },
  });
  await server.listen();
  const address = server.httpServer?.address() as AddressInfo | null;
  if (address === null) throw new Error("Vite did not expose a server address");
  const browser = await chromium.launch();
  let failures = 0;

  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
    await page.goto(`http://127.0.0.1:${address.port}${HARNESS_PATH}`, {
      waitUntil: "load",
      timeout: TIMEOUT_MS,
    });
    await page.waitForFunction(
      () => (window as unknown as HarnessWindow).__harnessReady === true,
      undefined,
      { timeout: TIMEOUT_MS },
    );

    for (const name of folders) {
      const axes = parseAxes(name);
      if (axes === null) continue;
      const dir = join(args.experiments, name);
      const outputPath = join(dir, "output.bpmn");
      if (!existsSync(outputPath)) {
        console.log(`· ${name}: skipped (no output.bpmn)`);
        continue;
      }
      if (!args.force && existsSync(join(dir, "result.json"))) {
        console.log(`· ${name}: already ingested`);
        continue;
      }

      try {
        const rawXml = await readFile(outputPath, "utf8");
        const runInfo = await readJson(join(dir, "run-info.json"));
        if (runInfo?.representation !== "zero_shot_xml") {
          throw new Error('run-info.json must contain representation: "zero_shot_xml"');
        }
        const inputPrompt = existsSync(join(dir, "input.md"))
          ? await readFile(join(dir, "input.md"), "utf8")
          : "";
        const notes = existsSync(join(dir, "notes.md"))
          ? (await readFile(join(dir, "notes.md"), "utf8")).trim()
          : (runInfo.notes ?? "");
        const createdAt = runInfo.createdAt
          ?? (await stat(outputPath)).mtime.toISOString();
        const xsdValidation = validateRawXml(args.python, outputPath, args.schema);
        const payload: ZeroShotXmlInput = {
          experimentId: name,
          processId: runInfo.processId ?? axes.processId,
          processSource: runInfo.processSource ?? "synthetic",
          systemPromptVersion: runInfo.systemPromptVersion ?? "ZSXML",
          processPromptVersion: runInfo.processPromptVersion ?? "PROCv1",
          provider: runInfo.provider ?? axes.provider,
          modelLabel: runInfo.modelLabel ?? axes.modelLabel,
          runNumber: runInfo.runNumber ?? axes.runNumber,
          createdAt,
          notes,
          inputPrompt,
          rawXml,
          inputPromptHash: hash(inputPrompt),
          rawOutputHash: hash(rawXml),
          xsdValidation,
          usage: {
            inputTokens: nullableNumber(runInfo.inputTokens),
            outputTokens: nullableNumber(runInfo.outputTokens),
            totalTokens: nullableNumber(runInfo.totalTokens),
            elapsedSeconds: nullableNumber(runInfo.elapsedSeconds),
            iterations: nullableNumber(runInfo.iterations),
          },
          postprocessing: Array.isArray(runInfo.postprocessing)
            ? runInfo.postprocessing.filter((item): item is string => typeof item === "string")
            : [],
        };

        const output = await page.evaluate(
          (input) => (window as unknown as HarnessWindow).ingestZeroShotXml(input),
          payload,
        );
        await writeText(join(dir, "result.json"), output.resultJson, args.force);
        if (output.layoutXml !== null) {
          await writeText(join(dir, "diagram.bpmn"), output.layoutXml, args.force);
        }
        if (output.svg !== null) {
          await writeText(join(dir, "diagram.svg"), output.svg, args.force);
        }
        if (output.pngBase64 !== null) {
          await writeBinary(join(dir, "diagram.png"), output.pngBase64, args.force);
        }
        console.log(`✓ ${name}: ${output.status} (raw M1=${xsdValidation.valid ? 1 : 0})`);
      } catch (error) {
        failures += 1;
        console.error(`✗ ${name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } finally {
    await browser.close();
    await server.close();
  }
  if (failures > 0) process.exitCode = 1;
}

await main();
