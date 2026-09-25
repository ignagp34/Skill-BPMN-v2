// Layout v5 = v4 + label-aware artifact placement (data object/store names,
// annotation text and other elements' labels count when placing artifacts).
import { candidateConfig } from "../shared/candidate-config.ts";

export default candidateConfig(import.meta.url, {
  "./layout-missing.js": "../v1/per-pool-layout.ts",
  "./pools.js": "../v2/pool-order.ts",
  "./artifacts.js": "artifacts.ts",
});
