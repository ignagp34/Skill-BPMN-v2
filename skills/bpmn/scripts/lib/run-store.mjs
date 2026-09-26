// A run folder: run-info.json, attempts/0N/, and the deliverables of the last attempt at its root.
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { sha256 } from './hash.mjs';
import { UsageError } from './cli-args.mjs';
import { FULL_LAYOUT_FILE } from './message-flows.mjs';
import { isRepairable, MAX_ATTEMPTS } from './status.mjs';

export const DELIVERABLES = ['diagram.bpmn', 'diagram.svg', 'diagram.png'];
const TRACE_FILES = ['raw_output.txt', 'normalized.dsl', 'result.json', 'semantic.bpmn', FULL_LAYOUT_FILE];
const RUN_INFO = 'run-info.json';

export const writeJson = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
export const nowIso = () => new Date().toISOString();
const formatKind = file => file.split('.')[1]; // diagram.png → png

function slugify(text) {
  const slug = text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return slug || 'proceso';
}

/** Creates a new folder <prefix>-<date>-<time>-<slug>[-n]/ under outDir; never reuses an existing one. */
export async function allocateRunDir(outDir, prefix, label) {
  await mkdir(outDir, { recursive: true });
  const stamp = nowIso().replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '-');
  for (let n = 0; n < 100; n += 1) {
    const runId = `${prefix}-${stamp}-${slugify(label)}${n ? `-${n}` : ''}`;
    try {
      await mkdir(join(outDir, runId));
      return { runId, dir: join(outDir, runId) };
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
  }
  throw new Error('Could not allocate a unique run directory.');
}

export class RunStore {
  constructor(dir, info) {
    this.dir = resolve(dir);
    this.info = info;
  }

  /** New unique folder bpmn-<date>-<time>-<slug>/ under outDir; never reuses one. */
  static async create(outDir, label, info) {
    const { runId, dir } = await allocateRunDir(outDir, 'bpmn', label);
    const store = new RunStore(dir, { schema: 'bpmn-skill-run/1', runId, createdAt: nowIso(),
      ...info, attempts: [], deliverables: {} });
    await store.save();
    return store;
  }

  static async open(dir) {
    const path = join(dir, RUN_INFO);
    if (!existsSync(path)) throw new UsageError(`${dir} is not a skill run (${RUN_INFO} missing).`);
    return new RunStore(dir, JSON.parse(await readFile(path, 'utf8')));
  }

  path(...parts) { return join(this.dir, ...parts); }

  get attempts() { return this.info.attempts; }
  get lastAttempt() { return this.info.attempts.at(-1) ?? null; }
  get nextAttemptNumber() { return this.info.attempts.length + 1; }

  attemptDir(n) { return this.path('attempts', String(n).padStart(2, '0')); }

  assertCanAttempt() {
    if (this.nextAttemptNumber > MAX_ATTEMPTS) throw new UsageError(`Attempt limit reached (${MAX_ATTEMPTS}).`);
  }

  /** Prompt for attempt n: a repair prompt if one was prepared, else the base prompt. */
  promptPathFor(n) {
    const repair = join(this.attemptDir(n), 'input_prompt.md');
    return existsSync(repair) ? repair : this.path('input_prompt.md');
  }

  async save() {
    this.info.updatedAt = nowIso();
    await writeJson(this.path(RUN_INFO), this.info);
  }

  /** Appends an attempt, mirrors its files at the root and saves run-info.json. */
  async recordAttempt(record, runtime) {
    this.info.attempts.push(record);
    this.info.status = record.status;
    if (runtime) this.info.runtime = runtime;
    this.info.deliverables = await this.promote(this.attemptDir(record.n));
    await writeJson(join(this.attemptDir(record.n), 'attempt.json'), record);
    await this.save();
  }

  /** The root always reflects the latest attempt: stale files are removed first. */
  async promote(attemptDir) {
    const deliverables = {};
    for (const name of [...DELIVERABLES, ...TRACE_FILES]) {
      await rm(this.path(name), { force: true });
      if (existsSync(join(attemptDir, name))) await copyFile(join(attemptDir, name), this.path(name));
    }
    for (const name of DELIVERABLES) {
      if (!existsSync(this.path(name))) continue;
      const bytes = await readFile(this.path(name));
      deliverables[formatKind(name)] = { file: name, bytes: bytes.length, sha256: sha256(bytes) };
    }
    return deliverables;
  }

  /** The JSON every render-like command prints. */
  summary() {
    const last = this.lastAttempt;
    const delivered = this.info.deliverables ?? {};
    return {
      runDir: this.dir,
      status: this.info.status,
      attempts: this.info.attempts.length,
      canRepair: isRepairable(this.info.status) && this.info.attempts.length < MAX_ATTEMPTS,
      deliverables: Object.fromEntries(Object.entries(delivered).map(([kind, d]) => [kind, this.path(d.file)])),
      missing: DELIVERABLES.filter(file => !delivered[formatKind(file)]),
      diagnostics: (last?.diagnostics ?? []).filter(d => d.severity === 'error').slice(0, 20),
      warnings: (last?.diagnostics ?? []).filter(d => d.severity === 'warning').length,
      error: last?.error ?? null,
      requestedGenerator: this.info.requestedGenerator ?? null,
      generator: last?.generator ?? null,
    };
  }
}
