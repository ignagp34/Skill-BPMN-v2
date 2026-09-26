// Ablation of v23: only A (bends cost 80), on v21.
import { untangling, V21_TUNING } from "../../v21/untangle.ts";

export const distributeParallelChannels = untangling({ ...V21_TUNING, bend: 80 });
