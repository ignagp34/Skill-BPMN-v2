// What a session starts from: a bpmn run folder, a DSL file or a .bpmn with DI.
// Returns the DSL (null for a bare .bpmn), the starting layout XML (null when
// the DSL must be rendered first), the layout version and where to save.
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { UsageError } from '../../../bpmn/scripts/lib/cli-args.mjs';
import { sha256 } from '../../../bpmn/scripts/lib/hash.mjs';
import { parseLayout } from '../../../bpmn/scripts/lib/layouts.mjs';
import { FULL_LAYOUT_FILE, parseMessageFlows } from '../../../bpmn/scripts/lib/message-flows.mjs';
import { RunStore } from '../../../bpmn/scripts/lib/run-store.mjs';
import { EDITOR_CONFIG } from './config.mjs';

const stem = path => basename(path).replace(/\.[^.]+$/, '');

async function fromRun(runDir, options) {
  const store = await RunStore.open(runDir);
  const xmlFile = [FULL_LAYOUT_FILE, 'diagram.bpmn'].map(f => store.path(f)).find(existsSync);
  if (!xmlFile) throw new UsageError(`${runDir} has no diagram.bpmn: nothing to edit (status ${store.info.status}).`);
  const dslFile = store.path('normalized.dsl');
  const last = store.lastAttempt;
  const recorded = last?.layout?.version;
  return {
    kind: 'run', path: store.dir, label: store.info.runId,
    dsl: existsSync(dslFile) ? await readFile(dslFile, 'utf8') : null,
    initialXml: await readFile(xmlFile, 'utf8'), initialXmlFile: basename(xmlFile),
    // The run's diagram is taken as it is, so its own layout version is the starting one.
    startLayout: recorded ? { version: recorded, harness: last.layout.harness, from: 'run' }
      : { version: 'unknown', harness: null, from: 'run' },
    messageFlows: parseMessageFlows(options['message-flows'] ?? last?.presentation?.messageFlows),
    outDir: resolve(options.out ?? join(store.dir, EDITOR_CONFIG.runEditsFolder)),
  };
}

async function fromDsl(dslPath, options) {
  return {
    kind: 'dsl', path: dslPath, label: stem(dslPath),
    dsl: await readFile(dslPath, 'utf8'), initialXml: null, initialXmlFile: null,
    startLayout: null, // rendered with the recompile layout
    messageFlows: parseMessageFlows(options['message-flows']),
    outDir: resolve(requireOut(options, '--dsl')),
  };
}

async function fromBpmn(bpmnPath, options) {
  const xml = await readFile(bpmnPath, 'utf8');
  if (!/<bpmndi:BPMNDiagram\b/.test(xml)) throw new UsageError(`${bpmnPath} has no BPMN DI (no BPMNDiagram): nothing to edit.`);
  return {
    kind: 'bpmn', path: bpmnPath, label: stem(bpmnPath),
    dsl: null, initialXml: xml, initialXmlFile: basename(bpmnPath),
    startLayout: { version: 'unknown', harness: null, from: 'bpmn' },
    messageFlows: parseMessageFlows(options['message-flows']),
    outDir: resolve(requireOut(options, '--bpmn')),
  };
}

function requireOut(options, input) {
  if (typeof options.out !== 'string' || !options.out) throw new UsageError(`--out is required with ${input}.`);
  return options.out;
}

/** --run | --dsl | --bpmn (exactly one) → the session's source. */
export async function resolveSource(options) {
  const given = ['run', 'dsl', 'bpmn'].filter(key => typeof options[key] === 'string' && options[key]);
  if (given.length !== 1) throw new UsageError('Give exactly one of --run <runDir>, --dsl <file> or --bpmn <file>.');
  const path = resolve(options[given[0]]);
  if (!existsSync(path)) throw new UsageError(`${path} does not exist.`);
  const source = await { run: fromRun, dsl: fromDsl, bpmn: fromBpmn }[given[0]](path, options);
  // Recompiling the DSL uses --layout, else the default of skills/bpmn/config/layouts.json, read now.
  const recompile = parseLayout(options.layout);
  return { ...source, recompileLayout: { version: recompile.name, harness: recompile.harness,
    from: options.layout ? 'option' : 'default' } };
}

export const sourceRecord = source => ({
  kind: source.kind, path: source.path, initialXmlFile: source.initialXmlFile,
  dslSha256: source.dsl === null ? null : sha256(source.dsl),
  initialXmlSha256: source.initialXml === null ? null : sha256(source.initialXml),
});
