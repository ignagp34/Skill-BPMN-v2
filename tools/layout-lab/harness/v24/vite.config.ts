// Layout v24 = v22 + v23, both winners of their votes against v20 (v22 7-0;
// v23 12-3 counting the cases it shares with v21), unchanged: v20 + compact lanes
// (v22's lane-rows before stacking) + the tuned untangling router (v23) and
// v21's boundary-event name pass.
import { candidateConfig } from "../shared/candidate-config.ts";

export default candidateConfig(import.meta.url, {
  "bpmn-auto-layout": "../v12/auto-layout.js",
  "./layout-missing.js": "../v10/task-width.ts",
  "./pools.js": "../v22/lane-rows.ts",
  "./edge-channels.js": "../v23/untangle.ts",
  "./artifacts.js": "../v21/boundary-labels.ts",
});
