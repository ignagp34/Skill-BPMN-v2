// Layout v10 = v7 + proposal D: tasks as wide as their longest word needs
// (evidence/layout-review-20260926/REVIEW.md).
import { candidateConfig } from "../shared/candidate-config.ts";

export default candidateConfig(import.meta.url, {
  "./layout-missing.js": "task-width.ts",
  "./pools.js": "../v2/pool-order.ts",
  "./artifacts.js": "../v7/frames.ts",
});
