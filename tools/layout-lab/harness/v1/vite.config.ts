// Layout v1 (idea A): every pool gets its own bpmn-auto-layout pass.
import { candidateConfig } from "../shared/candidate-config.ts";

export default candidateConfig(import.meta.url, {
  "./layout-missing.js": "per-pool-layout.ts",
});
