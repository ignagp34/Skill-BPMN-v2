// Layout v11 = v7 + proposal B: open room in the lane for artifacts without a
// clean spot (evidence/layout-review-20260926/REVIEW.md).
import { candidateConfig } from "../shared/candidate-config.ts";

export default candidateConfig(import.meta.url, {
  "./layout-missing.js": "../v1/per-pool-layout.ts",
  "./pools.js": "../v2/pool-order.ts",
  "./artifacts.js": "lane-room.ts",
});
