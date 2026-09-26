// Layout v12 = v7 + proposal A: bpmn-auto-layout with Grid.addAfter fixed (no more
// row splicing that pushes gateways to the end; evidence/layout-review-20260926/REVIEW.md).
import { candidateConfig } from "../shared/candidate-config.ts";

export default candidateConfig(import.meta.url, {
  "bpmn-auto-layout": "auto-layout.js",
  "./layout-missing.js": "../v1/per-pool-layout.ts",
  "./pools.js": "../v2/pool-order.ts",
  "./artifacts.js": "../v7/frames.ts",
});
