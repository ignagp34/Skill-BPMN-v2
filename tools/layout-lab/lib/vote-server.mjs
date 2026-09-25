// Ephemeral voting server on 127.0.0.1. The page only ever sees screen sides
// (left/right); the side → variant mapping stays in batch.json on this side.
// Every vote is written to votes.json immediately (atomic rename), so a batch
// can be closed and resumed at any time.
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHOICES, loadBatch, loadVotes, RUBRIC, VOTES_FILE, winnerOf, writeJsonAtomic } from './ab.mjs';

const PAGE = fileURLToPath(new URL('../vote/index.html', import.meta.url));
const MAX_BODY = 16_384;

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

async function readBody(req) {
  let size = 0; const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new Error('body too large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

/** Public view of the batch: no case ids, no variants. */
const sizeOf = image => ({ width: image.width, height: image.height });
const sideView = image => ({ ...sizeOf(image), alt: image.alt ? { view: image.alt.view, ...sizeOf(image.alt) } : null });

const publicState = (batch, votes) => ({
  view: batch.view, rubric: RUBRIC,
  pairs: batch.pairs.map(p => ({ pairId: p.pairId, left: sideView(p.images.left), right: sideView(p.images.right) })),
  votes: Object.fromEntries(Object.entries(votes.votes).map(([id, v]) => [id, { choice: v.choice, tags: v.tags, note: v.note }])),
});

export async function startVoteServer(batchDir, { port = 0, onQuit } = {}) {
  const batch = await loadBatch(batchDir);
  const pairs = new Map(batch.pairs.map(p => [p.pairId, p]));
  let votes = await loadVotes(batchDir);
  let writing = Promise.resolve();

  const handlers = {
    'GET /': async (req, res) => send(res, 200, await readFile(PAGE), 'text/html; charset=utf-8'),
    'GET /api/state': async (req, res) => send(res, 200, publicState(batch, votes)),
    'POST /api/vote': async (req, res) => {
      const { pairId, choice, tags = [], note = '', ms = null, sawAltView = false } = await readBody(req);
      const pair = pairs.get(pairId);
      if (!pair || !CHOICES.includes(choice)) return send(res, 400, { error: 'invalid vote' });
      const cleanTags = tags.filter(t => RUBRIC.some(r => r.key === t));
      const previous = votes.votes[pairId];
      votes.votes[pairId] = { choice, winner: winnerOf(pair, choice), caseId: pair.caseId, tags: cleanTags,
        note: String(note).slice(0, 2000), ms: Number.isFinite(ms) ? ms : null,
        sawAltView: pair.images.left.alt ? { view: pair.images.left.alt.view, seen: sawAltView === true } : null,
        at: new Date().toISOString(),
        revisions: (previous?.revisions ?? 0) + (previous ? 1 : 0) };
      writing = writing.then(() => writeJsonAtomic(join(batchDir, VOTES_FILE), votes));
      await writing;
      return send(res, 200, { ok: true, voted: Object.keys(votes.votes).length, total: pairs.size });
    },
    'POST /api/quit': async (req, res) => { send(res, 200, { ok: true }); setImmediate(() => onQuit?.()); },
  };

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      const image = url.pathname.match(/^\/img\/(p\d+)\/(left|right)(\/alt)?$/);
      if (req.method === 'GET' && image) {
        const side = pairs.get(image[1])?.images[image[2]];
        const file = image[3] ? side?.alt?.file : side?.file;
        return file ? send(res, 200, await readFile(join(batchDir, file)), 'image/png')
          : send(res, 404, { error: 'no such image' });
      }
      const handler = handlers[`${req.method} ${url.pathname}`];
      return handler ? await handler(req, res) : send(res, 404, { error: 'not found' });
    } catch (err) {
      return send(res, 500, { error: err.message });
    }
  });
  await new Promise((resolve, reject) => server.once('error', reject).listen(port, '127.0.0.1', resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}/`, votesFile: join(batchDir, VOTES_FILE),
    reload: async () => { votes = await loadVotes(batchDir); } };
}
