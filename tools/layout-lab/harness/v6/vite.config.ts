// Layout v6 = v5 with artifact rules tuned from the user's notes (straight near
// associations, more air around artifacts, same-name artifacts together).
import { candidateConfig } from "../shared/candidate-config.ts";

export default candidateConfig(import.meta.url, {
  "./layout-missing.js": "../v1/per-pool-layout.ts",
  "./pools.js": "../v2/pool-order.ts",
  "./artifacts.js": "artifacts.ts",
});
