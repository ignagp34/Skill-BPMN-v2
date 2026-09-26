// Ablation for v8 (evidence/layout-v8/REPORT.md): reach 250 px, farLength 3.
import { placeArtifactsTuned, v8Tuning } from "../../v8/artifacts.ts";

export const placeArtifacts = (xml: string): Promise<string> => placeArtifactsTuned(xml, v8Tuning(250, 3));
