import { clearTitleBands } from "../v4/title-band-clearance.ts";
import { placeArtifacts as placeLabelAwareArtifacts } from "./label-aware-artifacts.ts";

/** v5 = v4 with label-aware artifact placement; v4's title-band pass still runs last. */
export async function placeArtifacts(layoutXml: string): Promise<string> {
  return clearTitleBands(await placeLabelAwareArtifacts(layoutXml));
}
