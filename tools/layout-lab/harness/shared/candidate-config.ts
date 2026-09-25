// Vite config shared by every layout candidate harness.
//
// A candidate is the TFM headless harness, unchanged, with some modules of the
// render pipeline swapped: each key is an import specifier used by
// packages/bpmn-core/src/render/index.ts (e.g. "./pools.js") and each value the
// candidate module that replaces it, relative to the candidate's folder.
// Replacements may import the originals by path and each other; their bare
// imports (bpmn-moddle, bpmn-auto-layout…) resolve as bpmn-core's do. Nothing in
// bpmn-core or apps/tfm-lab is edited, so v0 stays exactly as it was.
//
// No `import "vite"`: harness folders have no node_modules and the skill's
// harness driver already runs the tfm-lab Vite.
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HARNESS_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = resolve(HARNESS_ROOT, "../../..");
const CORE_RENDER_INDEX = join(REPO, "packages/bpmn-core/src/render/index.ts");

const norm = (path: string) => path.split("?")[0].replace(/\\/g, "/").toLowerCase();
const isBare = (source: string) => !source.startsWith(".") && !source.startsWith("/") && !/^[a-zA-Z]:/.test(source);

export function candidateConfig(configUrl: string, substitutions: Record<string, string>) {
  const candidateDir = dirname(fileURLToPath(configUrl));
  const replacements = new Map(Object.entries(substitutions).map(([spec, file]) => [spec, join(candidateDir, file)]));
  const plugin = {
    name: "layout-candidate-substitutions",
    enforce: "pre" as const,
    async resolveId(this: any, source: string, importer: string | undefined, options: object) {
      if (!importer) return null;
      if (norm(importer) === norm(CORE_RENDER_INDEX)) return replacements.get(source) ?? null;
      if (isBare(source) && norm(importer).startsWith(norm(HARNESS_ROOT))) {
        return this.resolve(source, CORE_RENDER_INDEX, { ...options, skipSelf: true });
      }
      return null;
    },
  };
  return { plugins: [plugin], server: { fs: { allow: [REPO] } } };
}
