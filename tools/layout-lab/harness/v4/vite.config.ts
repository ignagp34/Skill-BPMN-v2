// Layout v4 = v2 + idea E1: pool and lane title bands kept clear of shapes and labels.
import { candidateConfig } from "../shared/candidate-config.ts";

export default candidateConfig(import.meta.url, {
  "./layout-missing.js": "../v1/per-pool-layout.ts",
  "./pools.js": "../v2/pool-order.ts",
  "./artifacts.js": "title-band-clearance.ts",
});
