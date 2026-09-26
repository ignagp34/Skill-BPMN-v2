// Layout v8 = v7 + proposal C: v6's artifact rules without cohesion and with a
// reach limit on associations (evidence/layout-review-20260926/REVIEW.md).
import { candidateConfig } from "../shared/candidate-config.ts";

export default candidateConfig(import.meta.url, {
  "./layout-missing.js": "../v1/per-pool-layout.ts",
  "./pools.js": "../v2/pool-order.ts",
  "./artifacts.js": "artifacts.ts",
});
