// Layout v9 = v7 + proposal G: event names above the event when below collides
// (evidence/layout-review-20260926/REVIEW.md).
import { candidateConfig } from "../shared/candidate-config.ts";

export default candidateConfig(import.meta.url, {
  "./layout-missing.js": "../v1/per-pool-layout.ts",
  "./pools.js": "../v2/pool-order.ts",
  "./artifacts.js": "event-labels.ts",
});
