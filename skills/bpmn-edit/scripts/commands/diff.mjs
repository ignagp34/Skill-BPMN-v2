// diff --session <editDir>
// Writes edit-diff.json: per-element difference between engine.bpmn and user.bpmn.
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { writeJsonAtomic } from '../../../../tools/layout-lab/lib/ab.mjs';
import { requireOption } from '../../../bpmn/scripts/lib/cli-args.mjs';
import { diffLayouts } from '../lib/di-diff.mjs';
import { DIFF_FILE, EditSession, ENGINE_FILE, USER_FILE } from '../lib/session-store.mjs';

/** Computes and stores the diff of a session; null when it has no saved layout yet. */
export async function writeDiff(session) {
  if (![ENGINE_FILE, USER_FILE].every(f => existsSync(session.path(f)))) return null;
  const read = file => readFile(session.path(file), 'utf8');
  const diff = { ...diffLayouts(await read(ENGINE_FILE), await read(USER_FILE)),
    sessionId: session.info.sessionId, revision: session.info.currentRevision };
  await writeJsonAtomic(session.path(DIFF_FILE), diff);
  session.info.diff = { file: DIFF_FILE, ...diff.summary };
  await session.save();
  return diff;
}

export async function run(options) {
  const session = await EditSession.open(resolve(requireOption(options, 'session')));
  const diff = await writeDiff(session);
  return { exit: diff ? 0 : 1,
    payload: diff ? { sessionDir: session.dir, file: session.path(DIFF_FILE), summary: diff.summary }
      : { sessionDir: session.dir, error: 'No engine.bpmn/user.bpmn in this session yet.' } };
}
