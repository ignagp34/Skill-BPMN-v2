// Layout v17 = v16 + v13's flow clarity (one direction per node face, no ambiguous
// merging of lines), rebuilt on the current default after v13 won 3-0 over v7.
import { candidateConfig } from "../shared/candidate-config.ts";

export default candidateConfig(import.meta.url, {
  "./layout-missing.js": "../v10/task-width.ts",
  "./pools.js": "../v2/pool-order.ts",
  "./edge-channels.js": "../v13/flow-clarity.ts",
  "./artifacts.js": "../v16/data-labels.ts",
});
