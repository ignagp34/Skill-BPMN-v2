// Layout v19 = v16 + proposal H: flow labels that run into a shape slide back along
// their line according to the real length of their text.
import { candidateConfig } from "../shared/candidate-config.ts";

export default candidateConfig(import.meta.url, {
  "./layout-missing.js": "../v10/task-width.ts",
  "./pools.js": "../v2/pool-order.ts",
  "./artifacts.js": "flow-labels.ts",
});
