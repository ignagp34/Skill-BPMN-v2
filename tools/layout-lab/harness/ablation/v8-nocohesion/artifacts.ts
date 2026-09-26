// Ablation for v8 (evidence/layout-v8/REPORT.md): reach 0 px, farLength 0.
import { placeArtifactsTuned, v8Tuning } from "../../v8/artifacts.ts";

export const placeArtifacts = (xml: string): Promise<string> => placeArtifactsTuned(xml, v8Tuning(0, 0));
