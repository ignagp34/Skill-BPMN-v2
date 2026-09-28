// Generation prompts. The base prompt is the TFM web handoff, byte for byte.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SYSTEM_PROMPT_PATH } from './engine.mjs';
import { sha256 } from './hash.mjs';

export const readSystemPrompt = engineRoot => readFile(join(engineRoot, SYSTEM_PROMPT_PATH), 'utf8');

/**
 * Equivalent of Handoff.tsx buildPrompt(): the raw v5 file (Vite `?raw` keeps
 * its bytes) followed by the template literal (always LF).
 */
export async function composeBasePrompt(engineRoot, summary) {
  const systemPrompt = await readSystemPrompt(engineRoot);
  const narrative = summary.trim().length > 0 ? summary.trim() : '<paste your process description here>';
  const prompt = `${systemPrompt}

---

## USER NARRATIVE

${narrative}

---

Generate the BPMN textual DSL for the narrative above. Follow §16 (Authoring Workflow), apply the §19 BPMN modeling best practices, and run the §18 checklist before emitting. Reply with the DSL inside a single fenced code block and nothing else.`;
  return { prompt, systemPromptSha256: sha256(systemPrompt) };
}

const formatDiagnostic = d => `- [${d.code ?? d.category}]${d.line ? ` line ${d.line}${d.column ? `:${d.column}` : ''}` : ''} ${d.message}`;

/** Base prompt unchanged + the engine's diagnostics and the rejected DSL. */
export function composeRepairPrompt({ basePrompt, status, diagnostics, previousDsl }) {
  const lines = diagnostics.map(formatDiagnostic).join('\n') || '- (no detailed diagnostic available)';
  return `${basePrompt}

---

## ENGINE DIAGNOSTICS FOR YOUR PREVIOUS ANSWER

Your previous DSL was rejected by the engine with status \`${status}\`:

${lines}

Previous DSL:

\`\`\`
${previousDsl}
\`\`\`

Fix only what these diagnostics require, keeping the process described in the narrative. Reply with the complete corrected DSL inside a single fenced code block and nothing else.`;
}

const bulletList = items => items.map((item, i) => `${i + 1}. ${item.trim()}`).join('\n');

/**
 * v5 system prompt unchanged + the original narrative, the changes already
 * applied, the DSL the user is looking at and the change they ask for. The
 * model rewrites the whole DSL but is told to keep every untouched line.
 */
export function composeEditPrompt({ systemPrompt, summary, history, currentDsl, request }) {
  const narrative = summary?.trim() || '(not available: the current DSL was provided directly, without a narrative)';
  const applied = history.length > 0 ? `## CHANGES ALREADY APPLIED TO THE NARRATIVE

${bulletList(history)}

---

` : '';
  return `${systemPrompt}

---

## ORIGINAL NARRATIVE

${narrative}

---

${applied}## CURRENT DSL

This DSL compiles and is the diagram the user is looking at:

\`\`\`
${currentDsl.trimEnd()}
\`\`\`

---

## REQUESTED CHANGE

${request.trim()}

---

Apply only the requested change to the current DSL. Keep every other line exactly as it is: same names, order, pools, lanes, data and annotations. Where the requested change contradicts the narrative, the requested change wins. Run the §18 checklist on the result. Reply with the complete updated DSL inside a single fenced code block and nothing else.`;
}
