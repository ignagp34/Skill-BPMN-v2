import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseDsl, type FlowNode } from "@text-to-bpmn/core";

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: npm run inspect <path-to-dsl-file>");
  process.exit(1);
}

const file = resolve(process.cwd(), args[0]);
const source = readFileSync(file, "utf8");
const result = parseDsl(source);

const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;

function header(t: string): void {
  console.log("\n" + bold(cyan(t)));
  console.log(dim("─".repeat(t.length)));
}

header(`File: ${file}`);
console.log(`${result.program.traces.length} traces · ${result.program.pools.length} pools · ${result.model.flowNodes.size} flow nodes · ${result.model.flows.length} sequence flows`);

header("Pools");
for (const p of result.program.pools) {
  console.log(`  ${p.name} ${dim(`(first seen line ${p.firstSeenLine})`)}`);
}

header("Traces");
for (let i = 0; i < result.program.traces.length; i++) {
  const t = result.program.traces[i];
  const tag = t.isFragment
    ? `[fragment ${t.leadingAnchor ? "←" : ""}${t.trailingAnchor ? "→" : ""}]`
    : "[regular]";
  console.log(`  ${dim(`#${i}`)} ${tag} ${dim(`lines ${t.startLine}–${t.endLine}`)}`);
  for (const s of t.steps) {
    let summary = "";
    switch (s.kind) {
      case "Task":
        summary = `Task          ${s.pool}::${s.label}`;
        if (s.taskType) summary += dim(` <${s.taskType}>`);
        if (s.boundary.length > 0) summary += dim(` ⚓${s.boundary.map((b) => `(${b.eventType})`).join("")}`);
        if (s.annotations.length > 0) summary += dim(` //${s.annotations.join(" //")}`);
        break;
      case "Event":
        summary = `Event         ${s.pool}::(${s.eventType}${s.label ? " " + s.label : ""})${s.isDoubleParen ? dim(" ((…))") : ""}`;
        break;
      case "Question":
        summary = `Question      ${s.label}`;
        break;
      case "Parallel":
        summary = `Parallel      ${s.lanes.map((l) => `${l.pool}::${l.label}`).join(" | ")}`;
        break;
      case "PoolScope":
        summary = `PoolScope     ${s.pool}:`;
        break;
      case "Annotation":
        summary = `Annotation    //${s.text}`;
        break;
      case "FragmentMarker":
        summary = `FragmentMarker ...`;
        break;
      case "Data":
        summary = `Data          [${s.storeKind === "store" ? "db " : ""}${s.label}]`;
        break;
    }
    console.log(`    ${dim(`L${String(s.line).padStart(3)}`)} ${summary}`);
  }
}

header("Flow nodes");
const grouped = new Map<string, FlowNode[]>();
for (const node of result.model.flowNodes.values()) {
  const arr = grouped.get(node.pool) ?? [];
  arr.push(node);
  grouped.set(node.pool, arr);
}
for (const [pool, nodes] of grouped.entries()) {
  console.log(`  ${dim(`pool=${pool || "(unassigned)"}`)} ${dim(`(${nodes.length})`)}`);
  for (const n of nodes.sort((a, b) => a.sourceLine - b.sourceLine)) {
    const meta: string[] = [n.kind];
    if (n.taskType) meta.push(`<${n.taskType}>`);
    if (n.eventType) meta.push(n.eventType);
    if (n.attachedTo) meta.push(`@${n.attachedTo}`);
    if (n.attachedInputOf) meta.push(`→${n.attachedInputOf}`);
    if (n.interrupting === false) meta.push("non-interrupting");
    console.log(`    ${n.id.padEnd(40)} ${dim(`[${meta.join(" ")}]`)} ${n.label}`);
  }
}

header("Sequence flows");
for (const f of result.model.flows) {
  const cond = f.conditionLabel ? cyan(` [${f.conditionLabel}]`) : "";
  console.log(`  ${f.id.padEnd(8)} ${f.sourceId} → ${f.targetId}${cond}`);
}

header("Diagnostics");
if (result.errors.length === 0) {
  console.log(green("  ✓ no errors or warnings"));
} else {
  for (const e of result.errors) {
    const tag = e.severity === "error" ? red(`[${e.code}]`) : yellow(`[${e.code}]`);
    console.log(`  L${String(e.line).padStart(3)} ${tag} ${e.message}`);
  }
}

console.log("");
