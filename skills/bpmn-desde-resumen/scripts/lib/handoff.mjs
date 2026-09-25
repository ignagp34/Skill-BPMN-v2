// Handoff to the generator by file: the prompt (~70 KB) is never pasted into a
// message. The generator reads promptFile and writes its raw answer to replyFile.
import { readFileSync } from 'node:fs';
import { skillPath } from './paths.mjs';

const TEMPLATE = skillPath('templates', 'handoff.md');

export const replyFileName = n => `reply-${String(n).padStart(2, '0')}.txt`;

export function composeHandoff({ promptFile, replyFile }) {
  const values = { promptFile, replyFile };
  return { promptFile, replyFile,
    message: readFileSync(TEMPLATE, 'utf8').replace(/\{\{(\w+)\}\}/g, (_, key) => values[key]).trim() };
}
