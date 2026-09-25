// Layout v3 = v2 + idea C: shift each pool's content so message flow ends line up.
import { candidateConfig } from "../shared/candidate-config.ts";

export default candidateConfig(import.meta.url, {
  "./layout-missing.js": "../v1/per-pool-layout.ts",
  "./pools.js": "pool-align.ts",
});
