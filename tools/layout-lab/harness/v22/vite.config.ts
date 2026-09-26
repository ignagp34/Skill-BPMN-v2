// Layout v22 = v20 + compact lanes: each lane drops the empty grid rows that only
// other lanes use, before pools and lanes are stacked. Everything else is v20.
import { candidateConfig } from "../shared/candidate-config.ts";

export default candidateConfig(import.meta.url, {
  "bpmn-auto-layout": "../v12/auto-layout.js",
  "./layout-missing.js": "../v10/task-width.ts",
  "./pools.js": "./lane-rows.ts",
  "./edge-channels.js": "../v13/flow-clarity.ts",
  "./artifacts.js": "../v19/flow-labels.ts",
});
