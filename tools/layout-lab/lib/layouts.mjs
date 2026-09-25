// Selectable layout versions. v0 is the TFM layout, frozen and always available
// for comparison. A candidate adds an entry pointing at its own harness app/page;
// it never edits v0 (plans/layout-iteracion-1.md, principle 1).
import { TFM_HARNESS } from '../../../skills/bpmn-desde-resumen/scripts/lib/harness.mjs';

export const LAYOUTS = Object.freeze({
  v0: { description: 'TFM layout (frozen engine f558eb0, apps/tfm-lab headless harness)', harness: TFM_HARNESS },
});

export function layoutVersion(name) {
  const layout = LAYOUTS[name];
  if (!layout) throw new Error(`Unknown layout version "${name}". Available: ${Object.keys(LAYOUTS).join(', ')}`);
  return { name, ...layout };
}
