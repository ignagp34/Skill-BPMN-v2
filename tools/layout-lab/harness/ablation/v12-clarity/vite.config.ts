// Ablation: v12 (fixed bpmn-auto-layout) + v13's flow-clarity pass, to see both
// together on find-a-job (not a registered layout; bench-render --harness).
import { candidateConfig } from "../../shared/candidate-config.ts";

export default candidateConfig(import.meta.url, {
  "bpmn-auto-layout": "../../v12/auto-layout.js",
  "./layout-missing.js": "../../v1/per-pool-layout.ts",
  "./pools.js": "../../v2/pool-order.ts",
  "./edge-channels.js": "../../v13/flow-clarity.ts",
  "./artifacts.js": "../../v7/frames.ts",
});
