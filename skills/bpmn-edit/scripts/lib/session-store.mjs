// An edit session folder (references/contract.md § Carpeta de sesión):
// session.json, engine.bpmn, user.bpmn, edits.json, edit-diff.json, the three
// deliverables and dsl/NN.dsl + dsl/NN-engine.bpmn per DSL revision.
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { writeJsonAtomic } from '../../../../tools/layout-lab/lib/ab.mjs';
import { UsageError } from '../../../bpmn/scripts/lib/cli-args.mjs';
import { sha256 } from '../../../bpmn/scripts/lib/hash.mjs';
import { allocateRunDir, DELIVERABLES, nowIso } from '../../../bpmn/scripts/lib/run-store.mjs';
import { EDITOR_CONFIG } from './config.mjs';

const SESSION = 'session.json';
const EDITS = 'edits.json';
export const ENGINE_FILE = 'engine.bpmn';
export const USER_FILE = 'user.bpmn';
export const DIFF_FILE = 'edit-diff.json';
const pad = n => String(n).padStart(2, '0');
const formatKind = file => file.split('.')[1];

export class EditSession {
  constructor(dir, info, log) {
    this.dir = resolve(dir);
    this.info = info;
    this.log = log;
  }

  /** New folder edit-<date>-<time>-<slug>/ under the source's outDir; never reuses one. */
  static async create(source, info) {
    const { runId, dir } = await allocateRunDir(source.outDir, EDITOR_CONFIG.sessionDirPrefix, source.label);
    await mkdir(join(dir, 'dsl'));
    const session = new EditSession(dir, { schema: 'bpmn-edit-session/1', sessionId: runId, createdAt: nowIso(),
      status: 'open', ...info, revisions: [], currentRevision: null, saves: 0,
      edits: { applied: 0, undone: 0, redone: 0, rejected: 0 }, deliverables: {} },
    { schema: 'bpmn-edit-log/1', sessionId: runId, entries: [] });
    await session.save();
    await writeJsonAtomic(session.path(EDITS), session.log);
    return session;
  }

  static async open(dir) {
    const path = join(dir, SESSION);
    if (!existsSync(path)) throw new UsageError(`${dir} is not a bpmn-edit session (${SESSION} missing).`);
    const read = async file => JSON.parse(await readFile(join(dir, file), 'utf8'));
    return new EditSession(dir, await read(SESSION), await read(EDITS));
  }

  path(...parts) { return join(this.dir, ...parts); }

  async save() {
    this.info.updatedAt = nowIso();
    await writeJsonAtomic(this.path(SESSION), this.info);
  }

  /** Stores a DSL revision and the engine layout it gave; returns its number. */
  async addRevision({ dsl, engineXml, layout, from, status = null, diagnostics = [] }) {
    const n = this.info.revisions.length + 1;
    if (dsl !== null) await writeFile(this.path('dsl', `${pad(n)}.dsl`), dsl);
    await writeFile(this.path('dsl', `${pad(n)}-engine.bpmn`), engineXml);
    this.info.revisions.push({ n, from, createdAt: nowIso(), layout, status,
      warnings: diagnostics.filter(d => d.severity === 'warning').length,
      dslSha256: dsl === null ? null : sha256(dsl), engineSha256: sha256(engineXml) });
    await this.save();
    return n;
  }

  hasRevision(n) { return this.info.revisions.some(r => r.n === n); }

  engineXmlOf(n) { return readFile(this.path('dsl', `${pad(n)}-engine.bpmn`), 'utf8'); }

  async dslOf(n) {
    const file = this.path('dsl', `${pad(n)}.dsl`);
    return existsSync(file) ? readFile(file, 'utf8') : null;
  }

  /** Appends page events (edits, rejections, DSL changes, reverts) to edits.json. */
  async appendEvents(events) {
    if (events.length === 0) return;
    for (const event of events) {
      this.log.entries.push({ ...event, seq: this.log.entries.length + 1, receivedAt: nowIso() });
      if (event.type === 'edit') {
        const key = { execute: 'applied', undo: 'undone', redo: 'redone' }[event.trigger];
        if (key) this.info.edits[key] += 1;
      } else if (event.type === 'rejected') this.info.edits.rejected += 1;
    }
    await writeJsonAtomic(this.path(EDITS), this.log);
  }

  /**
   * One save: engine.bpmn is the revision's engine layout, user.bpmn the page's
   * layout, and the root deliverables are replaced by the new export (stale
   * files removed first, so the three always come from the same save).
   */
  async recordSave({ revision, userXml, exported, semantic }) {
    await writeFile(this.path(ENGINE_FILE), await this.engineXmlOf(revision));
    await writeFile(this.path(USER_FILE), userXml);
    const deliverables = {};
    for (const name of DELIVERABLES) {
      await rm(this.path(name), { force: true });
      const bytes = exported.files?.[name];
      if (bytes == null) continue;
      await writeFile(this.path(name), bytes);
      deliverables[formatKind(name)] = { file: name, bytes: Buffer.byteLength(bytes), sha256: sha256(bytes) };
    }
    Object.assign(this.info, { currentRevision: revision, saves: this.info.saves + 1, status: exported.status,
      deliverables, lastSave: { at: nowIso(), revision, status: exported.status, semanticIdentical: semantic.identical,
        checks: exported.checks ?? null, reimported: exported.reimported ?? null,
        presentation: exported.presentation ?? null, error: exported.error ?? null,
        userSha256: sha256(userXml) } });
    await this.save();
  }

  async finish() {
    const endedAt = nowIso();
    Object.assign(this.info, { endedAt, durationMs: Date.parse(endedAt) - Date.parse(this.info.createdAt),
      open: false });
    if (this.info.status === 'open') this.info.status = 'closed_without_save';
    await this.save();
  }

  /** The JSON every command prints. */
  summary() {
    const delivered = this.info.deliverables ?? {};
    return {
      sessionDir: this.dir,
      status: this.info.status,
      saves: this.info.saves,
      revision: this.info.currentRevision,
      semanticIdentical: this.info.lastSave?.semanticIdentical ?? null,
      edits: this.info.edits,
      layout: this.info.revisions.find(r => r.n === this.info.currentRevision)?.layout ?? null,
      deliverables: Object.fromEntries(Object.entries(delivered).map(([kind, d]) => [kind, this.path(d.file)])),
      missing: DELIVERABLES.filter(file => !delivered[formatKind(file)]),
      error: this.info.lastSave?.error ?? null,
    };
  }
}
