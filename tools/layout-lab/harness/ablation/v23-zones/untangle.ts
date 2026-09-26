// Ablation of v23: only C (name boxes of gateways and of the flow's own ends ignored), on v21.
import { untangling, V21_TUNING } from "../../v21/untangle.ts";

export const distributeParallelChannels = untangling({ ...V21_TUNING, zoneGateways: false, zoneOwnEnds: false });
