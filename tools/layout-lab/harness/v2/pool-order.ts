import BpmnModdle from "bpmn-moddle";

import {
  extendOuterLanes,
  placePoolsAndLanes as stackPools,
} from "../../../../packages/bpmn-core/src/render/pools.js";

export { extendOuterLanes };

/**
 * Layout v2 = v1 + idea B of plans/layout-iteracion-1.md: vertical pool order.
 *
 * v0 stacks pools in DSL declaration order. v2 picks the order that minimises
 * the number of pools each message flow has to cross (Σ |row(source pool) −
 * row(target pool)| over message flows), trying every permutation. Ties keep
 * the order closest to the DSL (fewest swapped pairs), so the declared order
 * wins whenever it is already optimal; with two pools nothing ever changes.
 *
 * Only the stacking changes: v0's placePoolsAndLanes runs on the reordered
 * participants and the collaboration's participant list is put back in its
 * original order afterwards, so the semantic part of the BPMN is untouched.
 */
const MAX_POOLS_FOR_EXHAUSTIVE_SEARCH = 8; // 8! = 40 320 orders

export async function placePoolsAndLanes(layoutXml: string): Promise<string> {
  const order = await chooseOrder(layoutXml);
  if (!order) return stackPools(layoutXml);
  const stacked = await stackPools(await withParticipantOrder(layoutXml, order.best));
  return withParticipantOrder(stacked, order.original);
}

interface PoolOrder { original: string[]; best: string[]; }

async function chooseOrder(xml: string): Promise<PoolOrder | null> {
  const { rootElement } = await new BpmnModdle().fromXML(xml);
  const defs = rootElement as any;
  const collaboration = (defs.rootElements ?? []).find((r: any) => r.$type === "bpmn:Collaboration");
  const participants: any[] = collaboration?.participants ?? [];
  const n = participants.length;
  if (n < 3 || n > MAX_POOLS_FOR_EXHAUSTIVE_SEARCH) return null;

  const poolOf = poolIndexByElement(participants);
  const links: Array<[number, number]> = [];
  for (const mf of collaboration.messageFlows ?? []) {
    const a = poolOf.get(mf.sourceRef?.id);
    const b = poolOf.get(mf.targetRef?.id);
    if (a !== undefined && b !== undefined && a !== b) links.push([a, b]);
  }
  if (links.length === 0) return null;

  const identity = participants.map((_, i) => i);
  let best = identity;
  let bestKey = [cost(identity, links), 0];
  for (const perm of permutations(identity)) {
    const key = [cost(perm, links), inversions(perm)];
    if (key[0] < bestKey[0] || (key[0] === bestKey[0] && key[1] < bestKey[1])) {
      best = perm;
      bestKey = key;
    }
  }
  if (best === identity) return null;
  const ids = participants.map((p) => p.id as string);
  return { original: ids, best: best.map((i) => ids[i]) };
}

/** Participant index of every element a message flow can reference (the pool itself or anything inside it). */
function poolIndexByElement(participants: any[]): Map<string, number> {
  const poolOf = new Map<string, number>();
  const visit = (elements: any[] | undefined, index: number) => {
    for (const el of elements ?? []) {
      poolOf.set(el.id, index);
      visit(el.flowElements, index);
    }
  };
  participants.forEach((p, index) => {
    poolOf.set(p.id, index);
    visit(p.processRef?.flowElements, index);
  });
  return poolOf;
}

/** Σ rows crossed; perm[row] = pool index. */
function cost(perm: number[], links: Array<[number, number]>): number {
  const row = new Array<number>(perm.length);
  perm.forEach((pool, r) => { row[pool] = r; });
  return links.reduce((sum, [a, b]) => sum + Math.abs(row[a] - row[b]), 0);
}

function inversions(perm: number[]): number {
  let count = 0;
  for (let i = 0; i < perm.length; i += 1) for (let j = i + 1; j < perm.length; j += 1) if (perm[i] > perm[j]) count += 1;
  return count;
}

function* permutations(items: number[]): Generator<number[]> {
  if (items.length <= 1) { yield items; return; }
  for (let i = 0; i < items.length; i += 1) {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const tail of permutations(rest)) yield [items[i], ...tail];
  }
}

async function withParticipantOrder(xml: string, ids: string[]): Promise<string> {
  const moddle = new BpmnModdle();
  const { rootElement } = await moddle.fromXML(xml);
  const defs = rootElement as any;
  const collaboration = (defs.rootElements ?? []).find((r: any) => r.$type === "bpmn:Collaboration");
  const byId = new Map((collaboration.participants ?? []).map((p: any) => [p.id, p]));
  collaboration.participants = ids.map((id) => byId.get(id));
  return (await moddle.toXML(defs, { format: false })).xml;
}
