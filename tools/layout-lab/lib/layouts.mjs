// Selectable layout versions. The registry lives in the skill's
// config/layouts.json (one place decides, including the skill's default); v0 is
// the TFM layout, frozen and always available for comparison. A candidate adds
// an entry pointing at its own harness under tools/layout-lab/harness/ and never
// edits v0 (plans/layout-iteracion-1.md, principle 1).
export { DEFAULT_LAYOUT, LAYOUTS, layoutVersion } from '../../../skills/bpmn/scripts/lib/layouts.mjs';
