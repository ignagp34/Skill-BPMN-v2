import { placeArtifacts as placeArtifactsV11 } from "../v11/lane-room.ts";
import { raiseEventLabels } from "../v9/event-labels.ts";

/**
 * Layout v14 = v7 + v10 + v11 + v9, the candidates that won their vote against v7
 * (2026-09-26: v10 9–1, v11 8–1, v9 6–0). They touch different phases:
 *  - v10 widens tasks right after the per-pool auto-layout (vite.config.ts);
 *  - v11 opens bands for artifacts without a clean spot, then v4 title bands and
 *    v7 frames;
 *  - v9 raises event names last, because v11 moves shapes and routes and v9
 *    decides on the final collisions.
 * Each module is used as it was voted; nothing is retuned here.
 */
export async function placeArtifacts(layoutXml: string): Promise<string> {
  return raiseEventLabels(await placeArtifactsV11(layoutXml));
}
