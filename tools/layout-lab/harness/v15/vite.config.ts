// Layout v15 = v14 + one change to v11's rule: a band opened for an artifact
// stays only if it helps (the user's note on c-syn015-gemini).
import { candidateConfig } from "../shared/candidate-config.ts";

export default candidateConfig(import.meta.url, {
  "./layout-missing.js": "../v10/task-width.ts",
  "./pools.js": "../v2/pool-order.ts",
  "./artifacts.js": "helpful-bands.ts",
});
