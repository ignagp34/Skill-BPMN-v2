// Layout v16 = v15 + names of data objects and stores above when below collides
// (the user's idea after v9, 2026-09-26).
import { candidateConfig } from "../shared/candidate-config.ts";

export default candidateConfig(import.meta.url, {
  "./layout-missing.js": "../v10/task-width.ts",
  "./pools.js": "../v2/pool-order.ts",
  "./artifacts.js": "data-labels.ts",
});
