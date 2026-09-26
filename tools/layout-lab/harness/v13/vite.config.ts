// Layout v13 = v7 + flow clarity after the channel distribution: one direction per
// node face and no ambiguous merging of lines (user notes on v12, 2026-09-26).
import { candidateConfig } from "../shared/candidate-config.ts";

export default candidateConfig(import.meta.url, {
  "./layout-missing.js": "../v1/per-pool-layout.ts",
  "./pools.js": "../v2/pool-order.ts",
  "./edge-channels.js": "flow-clarity.ts",
  "./artifacts.js": "../v7/frames.ts",
});
