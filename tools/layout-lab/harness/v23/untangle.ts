import { untangling, V21_TUNING } from "../v21/untangle.ts";

/**
 * Layout v23 = v21 tuned from the user's vote on it (v21 11, v20 7, 1 tie; no notes).
 * In 5 of v21's 7 losses the new routes shared more stretches of line, and in two
 * of them it added bends without removing any crossing. In f-gemini-04 the branches
 * of a gateway left through the face of «OK» and came into their tasks from above,
 * and «Zero» ran 2 px from another flow: two lines that read as one.
 *
 *  A. bends cost 80 instead of 40: a crossing (150) is no longer worth two extra bends;
 *  B. two flows sharing neither source nor target that run parallel closer than
 *     10 px count as merged there (60 per px), as an exact overlap already did;
 *  C. v21's name boxes were partly wrong: a gateway's name is not below it when a
 *     line uses that vertex (v0's placeLabels picks a free vertex), and the names of
 *     a flow's own ends are moved by later passes (v9, boundary pass). Those boxes
 *     made v21 divert flows off a gateway's bottom vertex with extra bends
 *     (h-ml-01, c-syn009). v23 keeps only other events' boxes.
 *
 * A alone changed nothing on the bench (identical to v21), so v23 = v21 + B + C.
 * Ablations: tools/layout-lab/harness/ablation/v23-bend80 (A), v23-near10 (B), v23-zones (C).
 */
export const V23_TUNING = { ...V21_TUNING, nearGap: 10, zoneGateways: false, zoneOwnEnds: false };

export const distributeParallelChannels = untangling(V23_TUNING);
