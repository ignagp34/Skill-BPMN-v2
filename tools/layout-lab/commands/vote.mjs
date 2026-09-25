// vote --batch <batchDir> [--port 0] [--no-open]
// Serves the local A/B voting page until the page's "Terminar" button (or Ctrl+C),
// then prints the batch progress. Votes are already on disk after each key press.
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { requireOption } from '../../../skills/bpmn-desde-resumen/scripts/lib/cli-args.mjs';
import { loadBatch, loadVotes } from '../lib/ab.mjs';
import { startVoteServer } from '../lib/vote-server.mjs';

function openBrowser(url) {
  const [cmd, args] = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]]
    : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  spawn(cmd, args, { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
}

export async function run(options) {
  const batchDir = resolve(requireOption(options, 'batch'));
  let quit;
  const done = new Promise(r => { quit = r; });
  const { server, url, votesFile } = await startVoteServer(batchDir, { port: Number(options.port ?? 0), onQuit: () => quit() });
  process.once('SIGINT', () => quit());
  process.stderr.write(`Votación A/B: ${url}\nVotos: ${votesFile}\n`);
  process.stdout.write(`${JSON.stringify({ url, votesFile })}\n`);
  if (!options['no-open']) openBrowser(url);
  await done;
  server.close();
  const [batch, votes] = [await loadBatch(batchDir), await loadVotes(batchDir)];
  return { exit: 0, payload: { batch: batchDir, voted: Object.keys(votes.votes).length, total: batch.pairs.length, votesFile } };
}
