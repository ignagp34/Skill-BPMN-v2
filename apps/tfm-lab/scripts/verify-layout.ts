import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve as resolvePath } from "node:path";
import { layoutProcess } from "bpmn-auto-layout";
import { parseDsl, emitBpmnXml } from "@text-to-bpmn/core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolvePath(__dirname, "..", "..", "..", "packages", "bpmn-core", "tests", "fixtures");
const fixtures = [
  "gemini-03.dsl",
  "gemini-04.dsl",
  "gemini-05.dsl",
  "s17-order-to-ship.dsl",
  "s17-job-application.dsl",
  "s17-pizza-order.dsl",
  "s17-document-approval.dsl",
  "s-a3-find-a-job.dsl",
];

for (const name of fixtures) {
  const source = readFileSync(resolvePath(fixturesDir, name), "utf8");
  const result = parseDsl(source);
  const xml = emitBpmnXml(result.model);
  try {
    const out = await layoutProcess(xml);
    const hasDi = /<bpmndi:BPMNDiagram/.test(out);
    console.log(`${hasDi ? "✓" : "?"} ${name} (${out.length} chars, DI: ${hasDi})`);
  } catch (e) {
    console.log(`✗ ${name}: ${(e as Error).message}`);
  }
}
