// Ablation of v23: only B (near-parallel flows closer than 10 px count as merged), on v21.
import { untangling, V21_TUNING } from "../../v21/untangle.ts";

export const distributeParallelChannels = untangling({ ...V21_TUNING, nearGap: 10 });
