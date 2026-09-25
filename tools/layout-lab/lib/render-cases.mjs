// Renders bench cases with one layout version through the skill's harness
// driver (same inputs, presentation step and artifact checks as render-dsl),
// one browser session for the whole batch.
//
// Per case folder:
//   diagram.bpmn/.svg/.png  complete layout, message flows shown (TFM output; metrics)
//   hidden.bpmn/.svg/.png   message flows hidden (skill default), only when the case has them
//   semantic.bpmn, normalized.dsl, text-boxes.json, case.json
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { classifyRender, inspectArtifacts } from '../../../skills/bpmn-desde-resumen/scripts/lib/artifacts.mjs';
import { findEngineRoot } from '../../../skills/bpmn-desde-resumen/scripts/lib/engine.mjs';
import { HarnessSession } from '../../../skills/bpmn-desde-resumen/scripts/lib/harness.mjs';
import { sha256 } from '../../../skills/bpmn-desde-resumen/scripts/lib/hash.mjs';
import { MESSAGE_FLOWS } from '../../../skills/bpmn-desde-resumen/scripts/lib/message-flows.mjs';
import { measureSvgText } from './svg-text.mjs';

export const openSession = layout => HarnessSession.open(findEngineRoot(), layout.harness);

function harnessInput(id, dsl, layout) {
  return {
    experimentId: `BENCH-${id}`, processId: 'BENCH', processSource: `layout-bench:${id}`,
    systemPromptVersion: 'NONE', processPromptVersion: 'none', provider: 'layout-bench', modelLabel: layout.name,
    runNumber: 1, createdAt: new Date().toISOString(), notes: `layout-lab ${layout.name}`, inputPrompt: '', rawOutput: dsl,
  };
}

async function writeAll(dir, files) {
  const hashes = {};
  for (const [name, bytes] of Object.entries(files)) {
    if (bytes == null) continue;
    await writeFile(join(dir, name), bytes);
    hashes[name] = sha256(bytes);
  }
  return hashes;
}

const semanticOf = output => { try { return JSON.parse(output.resultJson).semanticXml ?? null; } catch { return null; } };

/** Renders one case into outDir/<id>/ and returns its record (also written as case.json). */
export async function renderCase(session, layout, { id, dsl }, outDir, { timeoutMs = 120_000 } = {}) {
  const dir = join(outDir, id);
  await mkdir(dir, { recursive: true });
  const input = harnessInput(id, dsl, layout);
  const started = Date.now();
  const shown = await session.render(input, { timeoutMs, messageFlows: MESSAGE_FLOWS.SHOWN });
  if (shown.error) {
    const record = { id, layout: layout.name, status: 'infrastructure_error', error: shown.error.message };
    await writeFile(join(dir, 'case.json'), `${JSON.stringify(record, null, 2)}\n`);
    return record;
  }
  const { output, reimported } = shown;
  const inspected = inspectArtifacts(output);
  const status = classifyRender(output, inspected, reimported);
  const semantic = semanticOf(output);
  const hashes = await writeAll(dir, {
    'normalized.dsl': output.normalizedDsl, 'semantic.bpmn': semantic,
    'diagram.bpmn': inspected.layoutXml, 'diagram.svg': inspected.svg, 'diagram.png': inspected.png,
  });

  let textBoxes = null;
  if (inspected.svg) {
    textBoxes = await measureSvgText(session, inspected.svg);
    await writeFile(join(dir, 'text-boxes.json'), `${JSON.stringify(textBoxes)}\n`);
  }

  let hidden = null;
  if (/<bpmn:messageFlow\b/.test(inspected.layoutXml ?? '')) {
    const res = await session.render(input, { timeoutMs, messageFlows: MESSAGE_FLOWS.HIDDEN });
    if (!res.error) {
      const h = inspectArtifacts(res.output);
      Object.assign(hashes, await writeAll(dir, { 'hidden.bpmn': h.layoutXml, 'hidden.svg': h.svg, 'hidden.png': h.png }));
      hidden = { status: classifyRender(res.output, h, res.reimported), removed: res.presentation.removed,
        width: h.checks.pngWidth, height: h.checks.pngHeight };
    } else {
      hidden = { status: 'infrastructure_error', error: res.error.message };
    }
  }

  const record = { id, layout: layout.name, status, harnessStatus: output.status, durationMs: Date.now() - started,
    width: inspected.checks.pngWidth, height: inspected.checks.pngHeight, checks: inspected.checks, hidden,
    semanticSha256: semantic ? sha256(semantic) : null, hashes, pageErrors: shown.pageErrors };
  await writeFile(join(dir, 'case.json'), `${JSON.stringify(record, null, 2)}\n`);
  return record;
}
