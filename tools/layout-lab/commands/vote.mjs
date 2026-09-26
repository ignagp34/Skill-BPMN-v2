// vote --batch <batchDir> [--port 0] [--no-open]
// Serves the local A/B voting page until the page's "Terminar" button (or Ctrl+C),
// then prints the batch progress. Votes are already on disk after each key press.
import { resolve } from 'node:path';
import { requireOption } from '../../../skills/bpmn/scripts/lib/cli-args.mjs';
import { openBrowser } from '../../../skills/bpmn/scripts/lib/open-browser.mjs';
import { loadBatch, loadVotes } from '../lib/ab.mjs';
import { startVoteServer } from '../lib/vote-server.mjs';

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
