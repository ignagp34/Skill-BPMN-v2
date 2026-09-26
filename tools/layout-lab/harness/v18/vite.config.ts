// Layout v18 = v16 + v12 (bpmn-auto-layout with Grid.addAfter fixed, vendored) +
// v13 (flow clarity): the pair that won 5-0 over v12 alone, on the current default.
import { candidateConfig } from "../shared/candidate-config.ts";

export default candidateConfig(import.meta.url, {
  "bpmn-auto-layout": "../v12/auto-layout.js",
  "./layout-missing.js": "../v10/task-width.ts",
  "./pools.js": "../v2/pool-order.ts",
  "./edge-channels.js": "../v13/flow-clarity.ts",
  "./artifacts.js": "../v16/data-labels.ts",
});
