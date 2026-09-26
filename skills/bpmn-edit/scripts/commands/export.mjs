// export --session <editDir>
// Exports the session's user.bpmn again, without the page: same semantic check,
// exporters and presentation as a save from the page. For scripted edits and
// to redo the deliverables after an interrupted save.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { requireOption, UsageError } from '../../../bpmn/scripts/lib/cli-args.mjs';
import { exitCodeFor } from '../../../bpmn/scripts/lib/status.mjs';
import { EditController } from '../lib/edit-controller.mjs';
import { EngineSession } from '../lib/engine-session.mjs';
import { EditSession, USER_FILE } from '../lib/session-store.mjs';
import { writeDiff } from './diff.mjs';

export async function run(options) {
  const session = await EditSession.open(resolve(requireOption(options, 'session')));
  const revision = session.info.currentRevision;
  if (!revision) throw new UsageError('This session has no saved revision.');
  const { info } = session;
  const source = { kind: info.source.kind, path: info.source.path, dsl: await session.dslOf(revision),
    messageFlows: info.messageFlows, recompileLayout: info.recompileLayout };

  const engine = await EngineSession.open(info.recompileLayout);
  let saved;
  try {
    saved = await new EditController(session, engine, source)
      .save({ revision, xml: await readFile(session.path(USER_FILE), 'utf8'), events: [] });
  } finally {
    await engine.close();
  }
  if (saved.httpStatus && saved.httpStatus !== 200) return { exit: 2, payload: saved };
  await writeDiff(session);
  return { exit: exitCodeFor(session.info.status), payload: { ...session.summary(), checks: saved.checks } };
}
