import { distributeParallelChannels as distributeV0 } from "../../../../packages/bpmn-core/src/render/edge-channels.js";
import { clarifyFlowsWith, type FlowClarityTuning, V13_TUNING } from "../v13/flow-clarity.ts";

/**
 * Layout v21 = v20 + untangling, from the user's note on c-syn015-chatgpt in the
 * v20 vote: lines should not look tangled or knotted.
 *
 * v13's pass only re-routed flows on a mixed face or in an ambiguous merge. Here a
 * flow that crosses another is troubled too, so the same mini-router (orthogonal
 * routes that never cross a shape, one direction per face, no merges; scored by
 * merged length, crossings, bends and length) looks for a route with fewer
 * crossings, one change at a time, the one that most lowers the diagram's cost
 * first. More rounds, since there are many more candidate flows.
 *
 * Routing runs before the labels are placed, so a new route could run over the
 * name of an event or gateway (first render: 5 cases, e.g. a timer's flow over
 * «5 days»). A route through the default label box of a named event or gateway
 * costs more than two crossings: a crossing is readable, a line over text is not.
 */
export const V21_TUNING: FlowClarityTuning = { ...V13_TUNING, untangle: true, maxRounds: 80, labelZone: 400 };

export async function distributeParallelChannels(layoutXml: string): Promise<string> {
  return clarifyFlowsWith(await distributeV0(layoutXml), V21_TUNING);
}
