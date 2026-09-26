// A/B batches: blind pairs of the same bench case rendered with two layouts.
// batch.json holds the (secret) side → variant mapping; votes.json the human votes.
import { existsSync } from 'node:fs';
import { readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { sha256 } from '../../../skills/bpmn/scripts/lib/hash.mjs';

export const BATCH_FILE = 'batch.json';
export const VOTES_FILE = 'votes.json';
export const SIDES = ['left', 'right'];
export const CHOICES = ['left', 'right', 'tie'];

/** Rubric of the plan (fase 3); tags are optional "what decided it" marks. */
export const RUBRIC = [
  { key: 'flow', label: 'Se entiende el flujo' },
  { key: 'labels', label: 'Etiquetas legibles, sin solapes' },
  { key: 'lines', label: 'Cruces y líneas confusas' },
  { key: 'alignment', label: 'Alineación y orden' },
  { key: 'pools', label: 'Claridad de pools y carriles' },
  { key: 'compactness', label: 'Compacidad sin agobio' },
];

/** Deterministic PRNG (mulberry32) seeded from any string. */
export function rng(seed) {
  let a = parseInt(sha256(String(seed)).slice(0, 8), 16);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(list, random) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export async function writeJsonAtomic(path, value) {
  const tmp = `${path}.${process.pid}.tmp`;
  await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`);
  await rename(tmp, path);
}

export const loadBatch = async dir => JSON.parse(await readFile(join(dir, BATCH_FILE), 'utf8'));

export async function loadVotes(dir) {
  const path = join(dir, VOTES_FILE);
  return existsSync(path) ? JSON.parse(await readFile(path, 'utf8')) : { schema: 'layout-votes/1', votes: {} };
}

/** Screen choice → variant ('A' | 'B' | 'tie') through the pair's secret mapping. */
export const winnerOf = (pair, choice) => (choice === 'tie' ? 'tie' : pair.sides[choice]);
