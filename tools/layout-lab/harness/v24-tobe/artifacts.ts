import { clearTitleBands } from "../v4/title-band-clearance.ts";
import { placeArtifactsWith } from "../v5/label-aware-artifacts.ts";
import { V6_TUNING } from "../v6/artifacts.ts";
import { tidyFrames } from "../v7/frames.ts";
import { raiseEventLabels, raiseLabels } from "../v9/event-labels.ts";
import { nudgeFlowLabels } from "../v19/flow-labels.ts";
import { sideBoundaryLabels } from "../v21/boundary-labels.ts";

/**
 * v24's artifact pass (v21 → v19 → v16 → v15 → v11) with no room band: v6's
 * placement once, then v11's finish (title bands, frames) and the same label
 * passes in the same order. Shapes and flows keep the position the earlier
 * phases gave them, whatever artifacts the DSL adds.
 */
const DATA = /^bpmn:(DataObjectReference|DataStoreReference)$/;

export async function placeArtifacts(layoutXml: string): Promise<string> {
  const placed = await tidyFrames(await clearTitleBands(await placeArtifactsWith(layoutXml, V6_TUNING)));
  return sideBoundaryLabels(await nudgeFlowLabels(await raiseLabels(await raiseEventLabels(placed), DATA)));
}
