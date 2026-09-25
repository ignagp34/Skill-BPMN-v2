// Selectable layout versions, read from config/layouts.json (single source of
// truth, also used by tools/layout-lab). v0 is the frozen TFM layout.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { UsageError } from './cli-args.mjs';

const CONFIG = fileURLToPath(new URL('../../config/layouts.json', import.meta.url));
const config = JSON.parse(readFileSync(CONFIG, 'utf8'));

const freeze = ({ harness, ...rest }) => Object.freeze({ ...rest, harness: Object.freeze({ ...harness }) });

export const LAYOUTS = Object.freeze(Object.fromEntries(Object.entries(config.versions).map(([k, v]) => [k, freeze(v)])));
export const DEFAULT_LAYOUT = config.default;
/** The TFM layout: parity, corpus fidelity and evaluation baselines. */
export const TFM_LAYOUT = 'v0';

export function layoutVersion(name) {
  const layout = LAYOUTS[name];
  if (!layout) throw new UsageError(`Unknown layout version "${name}". Available: ${Object.keys(LAYOUTS).join(', ')}`);
  return { name, ...layout };
}

/** --layout option → layout version (default from config). */
export const parseLayout = value => layoutVersion(value ?? DEFAULT_LAYOUT);
