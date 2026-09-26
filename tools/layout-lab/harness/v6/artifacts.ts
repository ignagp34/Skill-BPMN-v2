import { clearTitleBands } from "../v4/title-band-clearance.ts";
import { placeArtifactsWith, type Tuning, V5_TUNING } from "../v5/label-aware-artifacts.ts";

/**
 * v6 = v5 with the artifact rules tuned from the user's notes on the v4–v5 vote
 * (evidence/layout-v5/REPORT.md). Chosen after an ablation on the bench
 * (evidence/layout-v6/REPORT.md):
 *  - near artifacts get straight associations: a bend on a route shorter than
 *    250 px costs like 250 px of line (far ones keep v5's 60);
 *  - soft air: each shape closer than 12 px to the footprint costs 100 (below a
 *    line crossing); a hard clearance sent artifacts to the v0 fallback instead;
 *  - artifacts with the same name, type and pool are pulled together when near:
 *    1.5 per px of distance, capped at 350 px.
 */
export const V6_TUNING: Tuning = Object.freeze({
  ...V5_TUNING,
  weights: Object.freeze({ ...V5_TUNING.weights, bendNear: 250, nearLength: 250, air: 100, airMargin: 12,
    cohesion: 1.5, cohesionRadius: 350 }),
});

export async function placeArtifacts(layoutXml: string): Promise<string> {
  return clearTitleBands(await placeArtifactsWith(layoutXml, V6_TUNING));
}
