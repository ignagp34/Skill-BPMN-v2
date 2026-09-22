import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseDsl, emitBpmnXml } from "@text-to-bpmn/core";

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: npm run emit <path-to-dsl-file>");
  process.exit(1);
}

const file = resolve(process.cwd(), args[0]);
const source = readFileSync(file, "utf8");
const result = parseDsl(source);

const errors = result.errors.filter((e) => e.severity === "error");
if (errors.length > 0) {
  console.error(`\x1b[31m${errors.length} error(s) parsing ${file}:\x1b[0m`);
  for (const e of errors) {
    console.error(`  line ${e.line} [${e.code}] ${e.message}`);
  }
  process.exit(2);
}

const xml = emitBpmnXml(result.model);
process.stdout.write(xml);
