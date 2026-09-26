// open (--run <runDir> | --dsl <file> --out <dir> | --bpmn <file> --out <dir>)
//      [--out <dir>] [--layout <version>] [--message-flows hidden|shown] [--port 0] [--no-open]
// Starts a session folder, serves the editing page until "Terminar", Ctrl+C or
// inactivity, then prints the session summary. Every save is already on disk.
import { engineRecord, findEngineRoot, verifyEngine } from '../../../bpmn/scripts/lib/engine.mjs';
import { InfrastructureError } from '../../../bpmn/scripts/lib/harness.mjs';
import { openBrowser } from '../../../bpmn/scripts/lib/open-browser.mjs';
import { exitCodeFor, STATUS } from '../../../bpmn/scripts/lib/status.mjs';
import { EditController, SessionStartError } from '../lib/edit-controller.mjs';
import { startEditServer } from '../lib/edit-server.mjs';
import { EngineSession } from '../lib/engine-session.mjs';
import { EditSession } from '../lib/session-store.mjs';
import { resolveSource, sourceRecord } from '../lib/source.mjs';
import { writeDiff } from './diff.mjs';

async function serveUntilQuit(controller, options) {
  let quit;
  const done = new Promise(resolveQuit => { quit = resolveQuit; });
  const server = await startEditServer(controller, { port: Number(options.port ?? 0), onQuit: reason => quit(reason) });
  const onSigint = () => quit('sigint');
  process.once('SIGINT', onSigint);
  try {
    process.stdout.write(`${JSON.stringify({ url: server.url, sessionDir: controller.session.dir })}\n`);
    process.stderr.write(`Edición BPMN: ${server.url}\nSesión: ${controller.session.dir}\n`);
    if (!options['no-open']) openBrowser(server.url);
    return await done;
  } finally {
    process.off('SIGINT', onSigint);
    await server.close();
  }
}

export async function run(options) {
  const source = await resolveSource(options);
  const engine = await verifyEngine(findEngineRoot());
  const session = await EditSession.create(source, { interfaceType: 'bpmn-edit', source: sourceRecord(source),
    messageFlows: source.messageFlows, recompileLayout: source.recompileLayout, engine: engineRecord(engine) });

  let engineSession;
  let controller;
  try {
    engineSession = await EngineSession.open(source.recompileLayout);
    session.info.runtime = engineSession.runtime;
    controller = new EditController(session, engineSession, source);
    await controller.start();
    session.info.closedBy = await serveUntilQuit(controller, options);
  } catch (err) {
    if (!(err instanceof SessionStartError) && !(err instanceof InfrastructureError)) throw err;
    session.info.status = err.details?.status ?? STATUS.INFRASTRUCTURE_ERROR;
    session.info.startError = { message: err.message, ...(err.details ?? { kind: err.kind }) };
  } finally {
    await controller?.close();
    await engineSession?.close();
  }

  await writeDiff(session);
  await session.finish();
  const payload = { ...session.summary(), closedBy: session.info.closedBy ?? null,
    ...(session.info.startError ? { startError: session.info.startError } : {}) };
  return { exit: exitCodeFor(session.info.status), payload };
}
