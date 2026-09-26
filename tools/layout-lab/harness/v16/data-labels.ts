import { raiseLabels } from "../v9/event-labels.ts";
import { placeArtifacts as placeArtifactsV15 } from "../v15/helpful-bands.ts";

/**
 * Layout v16 = v15 + v9's rule for data objects and data stores (the user's idea,
 * 2026-09-26): bpmn-js draws their name under the shape; when that box collides
 * with shapes, sequence flows, associations or labels and the box above collides
 * strictly less (and stays in the lane), the name goes above. Runs after v15's
 * event pass, on the final geometry; the event pass itself is unchanged.
 */
const DATA = /^bpmn:(DataObjectReference|DataStoreReference)$/;

export async function placeArtifacts(layoutXml: string): Promise<string> {
  return raiseLabels(await placeArtifactsV15(layoutXml), DATA);
}
