// Ephemeral editing server on 127.0.0.1 (pattern of tools/layout-lab/lib/vote-server.mjs).
// Serves the page, bpmn-js from the engine's own dependencies, and the
// controller's API. POSTs must be JSON, so another site cannot post to it
// without a CORS preflight, which this server never grants. It asks to quit
// when the page says so or when no request arrives for idleTimeoutMs.
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { findEngineRoot } from '../../../bpmn/scripts/lib/engine.mjs';
import { EDITOR_CONFIG, editSkillPath } from './config.mjs';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.eot': 'application/vnd.ms-fontobject',
  '.svg': 'image/svg+xml' };
const PAGE_FILES = { '/': 'index.html', '/editor.js': 'editor.js', '/editor.css': 'editor.css' };

/** bpmn-js dist of the engine (same version as the harness modeler). */
export function bpmnJsDist() {
  const require = createRequire(join(findEngineRoot(), 'apps/tfm-lab/package.json'));
  return join(dirname(require.resolve('bpmn-js/package.json')), 'dist');
}

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

async function readJson(req) {
  if (!String(req.headers['content-type'] ?? '').startsWith('application/json')) throw Object.assign(new Error('JSON only'), { status: 415 });
  let size = 0; const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > EDITOR_CONFIG.maxBodyBytes) throw Object.assign(new Error('body too large'), { status: 413 });
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

/** A file under base, or null (no escaping base with ../). */
function inside(base, relative) {
  const path = resolve(base, relative);
  return path.startsWith(resolve(base) + sep) && existsSync(path) ? path : null;
}

const reply = (res, result) => send(res, result.httpStatus ?? (result.ok ? 200 : 422), result);

export async function startEditServer(controller, { port = 0, onQuit } = {}) {
  const dist = bpmnJsDist();
  let lastSeen = Date.now();

  const handlers = {
    'GET /api/state': async (req, res) => send(res, 200, controller.state()),
    'POST /api/compile': async (req, res) => {
      const { dsl } = await readJson(req);
      if (typeof dsl !== 'string') return send(res, 400, { error: 'dsl required' });
      return reply(res, await controller.compile(dsl));
    },
    'POST /api/save': async (req, res) => reply(res, await controller.save(await readJson(req))),
    'POST /api/heartbeat': async (req, res) => send(res, 200, { ok: true }),
    'POST /api/quit': async (req, res) => {
      await readJson(req);
      send(res, 200, { ok: true });
      setImmediate(() => onQuit?.('page'));
    },
  };

  const server = createServer(async (req, res) => {
    lastSeen = Date.now();
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (req.method === 'GET' && PAGE_FILES[url.pathname]) {
        const file = editSkillPath('web', PAGE_FILES[url.pathname]);
        return send(res, 200, await readFile(file), TYPES[extname(file)]);
      }
      if (req.method === 'GET' && url.pathname === '/vendor/bpmn-modeler.js') {
        return send(res, 200, await readFile(join(dist, 'bpmn-modeler.production.min.js')), TYPES['.js']);
      }
      if (req.method === 'GET' && url.pathname.startsWith('/vendor/assets/')) {
        const file = inside(join(dist, 'assets'), decodeURIComponent(url.pathname.slice('/vendor/assets/'.length)));
        return file ? send(res, 200, await readFile(file), TYPES[extname(file)] ?? 'application/octet-stream')
          : send(res, 404, { error: 'not found' });
      }
      const handler = handlers[`${req.method} ${url.pathname}`];
      return handler ? await handler(req, res) : send(res, 404, { error: 'not found' });
    } catch (err) {
      return send(res, err.status ?? 500, { error: err.message });
    }
  });
  await new Promise((resolveListen, reject) => server.once('error', reject).listen(port, '127.0.0.1', resolveListen));

  const idle = setInterval(() => {
    if (Date.now() - lastSeen > EDITOR_CONFIG.idleTimeoutMs) onQuit?.('idle');
  }, Math.min(EDITOR_CONFIG.heartbeatMs, 5_000));
  idle.unref();

  return {
    server, url: `http://127.0.0.1:${server.address().port}/`,
    close: () => new Promise(done => {
      clearInterval(idle);
      server.close(() => done());
      server.closeAllConnections?.();
    }),
  };
}
