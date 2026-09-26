// Ablation variant of v8 (not a registered layout; rendered with bench-render --harness).
import { candidateConfig } from "../../shared/candidate-config.ts";

export default candidateConfig(import.meta.url, {
  "./layout-missing.js": "../../v1/per-pool-layout.ts",
  "./pools.js": "../../v2/pool-order.ts",
  "./artifacts.js": "artifacts.ts",
});
