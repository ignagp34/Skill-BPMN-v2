// Layout v14 = v7 + the three clear winners of the v8–v12 votes: v10 (task
// width), v11 (room for artifacts) and v9 (event names above), unchanged.
import { candidateConfig } from "../shared/candidate-config.ts";

export default candidateConfig(import.meta.url, {
  "./layout-missing.js": "../v10/task-width.ts",
  "./pools.js": "../v2/pool-order.ts",
  "./artifacts.js": "combined.ts",
});
