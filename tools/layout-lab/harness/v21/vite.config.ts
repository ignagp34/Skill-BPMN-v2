// Layout v21 = v20 + untangling (user's note on c-syn015-chatgpt, v20 vote): v13's
// flow-clarity router also re-routes flows that cross another, looking for fewer
// crossings, keeping clear of labels; a boundary event's name moves beside its exit
// line when that line crosses it. Everything else is v20.
import { candidateConfig } from "../shared/candidate-config.ts";

export default candidateConfig(import.meta.url, {
  "bpmn-auto-layout": "../v12/auto-layout.js",
  "./layout-missing.js": "../v10/task-width.ts",
  "./pools.js": "../v2/pool-order.ts",
  "./edge-channels.js": "./untangle.ts",
  "./artifacts.js": "./boundary-labels.ts",
});
