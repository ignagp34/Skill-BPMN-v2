import { clearTitleBands } from "../v4/title-band-clearance.ts";
import { placeArtifactsWith, type Tuning } from "../v5/label-aware-artifacts.ts";
import { V6_TUNING } from "../v6/artifacts.ts";
import { tidyFrames } from "../v7/frames.ts";

/**
 * v8 = v7 with proposal C of evidence/layout-review-20260926/REVIEW.md, from the
 * v5–v6 vote (evidence/layout-v6/REPORT.md):
 *  - keeps v6's straight near associations and soft air;
 *  - air may no longer push an artifact away from its node: each px of an
 *    association beyond `reach` costs `farLength` more (v6 lost where air moved
 *    artifacts far away in dense diagrams);
 *  - no cohesion (its only case, planta-residuos, left a store half-way in
 *    another lane and lost the vote).
 * Weights chosen by the sweep in evidence/layout-v8/REPORT.md (variants in
 * harness/ablation/).
 */
export const v8Tuning = (reach: number, farLength: number): Tuning => Object.freeze({
  ...V6_TUNING,
  weights: Object.freeze({ ...V6_TUNING.weights, cohesion: 0, cohesionRadius: 0, reach, farLength }),
});

export const V8_TUNING: Tuning = v8Tuning(250, 1);

export async function placeArtifactsTuned(layoutXml: string, tuning: Tuning): Promise<string> {
  return tidyFrames(await clearTitleBands(await placeArtifactsWith(layoutXml, tuning)));
}

export function placeArtifacts(layoutXml: string): Promise<string> {
  return placeArtifactsTuned(layoutXml, V8_TUNING);
}
