// Layout v2 = v1 + idea B: vertical pool order that minimises pools crossed by message flows.
import { candidateConfig } from "../shared/candidate-config.ts";

export default candidateConfig(import.meta.url, {
  "./layout-missing.js": "../v1/per-pool-layout.ts",
  "./pools.js": "pool-order.ts",
});
