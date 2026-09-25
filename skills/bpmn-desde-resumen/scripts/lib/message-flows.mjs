// Message-flow presentation (user decision 2026-09-25): hidden by default, as
// the company web's "Hide message flows" export. The layout is computed first
// with the flows present, so no position changes; the flows are then removed
// from the BPMN and the SVG/PNG are re-exported from that BPMN.
import { UsageError } from './cli-args.mjs';

export const MESSAGE_FLOWS = Object.freeze({ HIDDEN: 'hidden', SHOWN: 'shown' });
export const DEFAULT_MESSAGE_FLOWS = MESSAGE_FLOWS.HIDDEN;

/** Keeps the layout with its message flows when they are hidden (evaluation, metrics). */
export const FULL_LAYOUT_FILE = 'layout-full.bpmn';

export function parseMessageFlows(value) {
  const mode = value ?? DEFAULT_MESSAGE_FLOWS;
  if (!Object.values(MESSAGE_FLOWS).includes(mode)) {
    throw new UsageError(`--message-flows must be ${Object.values(MESSAGE_FLOWS).join(' or ')}`);
  }
  return mode;
}

/**
 * Runs inside the harness page (needs DOMParser). Same logic as
 * apps/company-web/src/ui/app.ts stripMessageFlows (web BPMN export), plus the
 * number of flows removed. Must stay self-contained: Playwright serialises it.
 */
export function stripMessageFlowsInPage(xml) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) return { xml, removed: 0 };

  const messageFlowIds = new Set();
  for (const flow of Array.from(doc.getElementsByTagNameNS('*', 'messageFlow'))) {
    const id = flow.getAttribute('id');
    if (id) messageFlowIds.add(id);
    flow.remove();
  }
  if (messageFlowIds.size === 0) return { xml, removed: 0 };

  for (const edge of Array.from(doc.getElementsByTagNameNS('*', 'BPMNEdge'))) {
    const ref = edge.getAttribute('bpmnElement');
    if (ref && messageFlowIds.has(ref)) edge.remove();
  }
  return { xml: new XMLSerializer().serializeToString(doc), removed: messageFlowIds.size };
}
