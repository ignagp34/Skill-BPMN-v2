// Layout v23-zones: v21 with its router tuned (see untangle.ts). Everything else is v21.
import { candidateConfig } from "../../shared/candidate-config.ts";

export default candidateConfig(import.meta.url, {
  "bpmn-auto-layout": "../../v12/auto-layout.js",
  "./layout-missing.js": "../../v10/task-width.ts",
  "./pools.js": "../../v2/pool-order.ts",
  "./edge-channels.js": "./untangle.ts",
  "./artifacts.js": "../../v21/boundary-labels.ts",
});
