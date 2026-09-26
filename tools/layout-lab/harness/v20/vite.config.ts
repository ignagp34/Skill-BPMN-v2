// Layout v20 = v18 + v19: v16 + v12 (fixed bpmn-auto-layout) + v13 (flow clarity)
// + proposal H (flow labels off shapes). All three won their votes against v16.
import { candidateConfig } from "../shared/candidate-config.ts";

export default candidateConfig(import.meta.url, {
  "bpmn-auto-layout": "../v12/auto-layout.js",
  "./layout-missing.js": "../v10/task-width.ts",
  "./pools.js": "../v2/pool-order.ts",
  "./edge-channels.js": "../v13/flow-clarity.ts",
  "./artifacts.js": "../v19/flow-labels.ts",
});
