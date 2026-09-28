// A TO-BE run folder: run-info.json, the generator's attempts, and the two
// deliverable diagrams in as-is/ and to-be/.
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { UsageError } from '../../../bpmn/scripts/lib/cli-args.mjs';
import { allocateRunDir, DELIVERABLES, nowIso, writeJson } from '../../../bpmn/scripts/lib/run-store.mjs';

const RUN_INFO = 'run-info.json';
export const MAX_ATTEMPTS = 3; // first answer + two repairs of rejected marks
export const SIDES = Object.freeze({ asIs: 'as-is', toBe: 'to-be' });

export class TobeStore {
  constructor(dir, info) {
    this.dir = resolve(dir);
    this.info = info;
  }

  static async create(outDir, label, info) {
    const { runId, dir } = await allocateRunDir(outDir, 'tobe', label);
    const store = new TobeStore(dir, { schema: 'bpmn-tobe-run/1', runId, createdAt: nowIso(), ...info, attempts: [] });
    await store.save();
    return store;
  }

  static async open(dir) {
    const path = join(dir, RUN_INFO);
    if (!existsSync(path)) throw new UsageError(`${dir} is not a bpmn-tobe run (${RUN_INFO} missing).`);
    return new TobeStore(dir, JSON.parse(await readFile(path, 'utf8')));
  }

  path(...parts) { return join(this.dir, ...parts); }
  attemptDir(n) { return this.path('attempts', String(n).padStart(2, '0')); }
  get lastAttempt() { return this.info.attempts.at(-1) ?? null; }
  get nextAttemptNumber() { return this.info.attempts.length + 1; }

  assertCanAttempt() {
    if (this.nextAttemptNumber > MAX_ATTEMPTS) throw new UsageError(`Attempt limit reached (${MAX_ATTEMPTS}).`);
  }

  /** Prompt of attempt n: its repair prompt if one was prepared, else the base prompt. */
  promptPathFor(n) {
    const repair = join(this.attemptDir(n), 'input_prompt.md');
    return existsSync(repair) ? repair : this.path('input_prompt.md');
  }

  async save() {
    this.info.updatedAt = nowIso();
    await writeJson(this.path(RUN_INFO), this.info);
  }

  async recordAttempt(record) {
    this.info.attempts.push(record);
    this.info.status = record.status;
    await writeJson(join(this.attemptDir(record.n), 'attempt.json'), record);
    await this.save();
  }

  /** Absolute paths of the deliverables present on disk, per side. */
  deliverables() {
    return Object.fromEntries(Object.entries(SIDES).map(([key, side]) => [key, Object.fromEntries(DELIVERABLES
      .filter(file => existsSync(this.path(side, file))).map(file => [file.split('.')[1], this.path(side, file)]))]));
  }
}
