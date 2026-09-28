// Layout v24-tobe = v24 without v11's room bands, for TO-BE diagrams (skill
// bpmn-tobe, plans/bpmn-tobe.md, option A). A band moves every shape below it
// down, so adding an annotation to an AS-IS could move its process; here an
// artifact takes v6's best spot and nothing else moves.
import { candidateConfig } from "../shared/candidate-config.ts";

export default candidateConfig(import.meta.url, {
  "bpmn-auto-layout": "../v12/auto-layout.js",
  "./layout-missing.js": "../v10/task-width.ts",
  "./pools.js": "../v22/lane-rows.ts",
  "./edge-channels.js": "../v23/untangle.ts",
  "./artifacts.js": "./artifacts.ts",
});
