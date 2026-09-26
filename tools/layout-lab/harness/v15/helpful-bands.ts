import { placeArtifactsWithRoom } from "../v11/lane-room.ts";
import { raiseEventLabels } from "../v9/event-labels.ts";

/**
 * Layout v15 = v14 with one change, from the user's note on v11 in
 * c-syn015-gemini (Â«se ha agrandado innecesariamente el primer laneÂ»): a band
 * opened under an artifact's row is kept only if, placing again, some artifact
 * goes somewhere else (spots under the band compared after its shift); a band
 * that changes no placement is undone. Three earlier criteria were tried and
 * dropped (evidence/layout-v15/REPORT.md): «fewer artifacts without a clean
 * spot» and «fewer shapes and labels crossed or covered» undid useful bands
 * (c-syn011: long associations through tasks again); «some artifact inside the
 * band» kept c-syn015-gemini's, whose artifacts were already in that strip. Everything else is v14 (v10 task width, v9 event names last).
 */
export async function placeArtifacts(layoutXml: string): Promise<string> {
  return raiseEventLabels(await placeArtifactsWithRoom(layoutXml, { keepOnlyHelpfulBands: true }));
}
