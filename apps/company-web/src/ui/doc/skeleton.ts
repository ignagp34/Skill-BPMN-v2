/**
 * Walks an already-parsed ResolvedModel and produces a clean, self-explanatory
 * "lane -> ordered tasks" skeleton. This is what gets embedded in the doc-gen
 * prompt so the external AI never has to parse the custom DSL: it only enriches
 * the activities we hand it. The skeleton also keeps the document structure
 * locked to the diagram (same lanes, same tasks, same order).
 */
import type { FlowNode, ResolvedModel } from "@text-to-bpmn/core";

export type SkeletonActivity = {
  /** Global chronological number across the whole process. */
  number: number;
  /** Task label exactly as it appears in the diagram. */
  name: string;
};

export type SkeletonLane = {
  lane: string;
  activities: SkeletonActivity[];
};

export type DocSkeleton = {
  /** Every distinct pool/lane in diagram order (even those with no tasks). */
  lanes: SkeletonLane[];
  /** All pool names in order, for the Actores section. */
  pools: string[];
  totalActivities: number;
};

/**
 * Assign a chronological index to every flow node by walking sequence flows
 * from the start events outward (BFS). Nodes unreachable from a start (rare;
 * malformed diagrams) fall back to their source-line order so they still appear.
 */
function chronologicalOrder(model: ResolvedModel): Map<string, number> {
  const adjacency = new Map<string, string[]>();
  const indegree = new Map<string, number>();
  for (const id of model.flowNodes.keys()) {
    adjacency.set(id, []);
    indegree.set(id, 0);
  }
  for (const flow of model.flows) {
    if (!adjacency.has(flow.sourceId) || !indegree.has(flow.targetId)) continue;
    adjacency.get(flow.sourceId)!.push(flow.targetId);
    indegree.set(flow.targetId, (indegree.get(flow.targetId) ?? 0) + 1);
  }

  // Seed the queue with start events first, then any other zero-indegree node,
  // both ordered by source line so the walk is deterministic.
  const byLine = (a: string, b: string): number =>
    (model.flowNodes.get(a)?.sourceLine ?? 0) - (model.flowNodes.get(b)?.sourceLine ?? 0);
  const starts = [...model.flowNodes.values()]
    .filter((n) => n.kind === "startEvent")
    .map((n) => n.id);
  const otherRoots = [...indegree.entries()]
    .filter(([id, deg]) => deg === 0 && !starts.includes(id))
    .map(([id]) => id);
  const queue = [...starts.sort(byLine), ...otherRoots.sort(byLine)];

  const order = new Map<string, number>();
  const visited = new Set<string>(queue);
  let counter = 0;
  while (queue.length > 0) {
    const id = queue.shift()!;
    order.set(id, counter++);
    for (const next of (adjacency.get(id) ?? []).slice().sort(byLine)) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }

  // Any node never reached (disconnected) gets appended in source-line order.
  const leftovers = [...model.flowNodes.keys()].filter((id) => !order.has(id)).sort(byLine);
  for (const id of leftovers) order.set(id, counter++);
  return order;
}

export function buildSkeleton(model: ResolvedModel): DocSkeleton {
  const order = chronologicalOrder(model);
  const pools = model.pools.map((p) => p.name);

  // Collect task nodes per pool, ordered chronologically.
  const tasksByPool = new Map<string, FlowNode[]>();
  for (const name of pools) tasksByPool.set(name, []);
  for (const node of model.flowNodes.values()) {
    if (node.kind !== "task") continue;
    if (!tasksByPool.has(node.pool)) tasksByPool.set(node.pool, []);
    tasksByPool.get(node.pool)!.push(node);
  }

  // Global numbering: number tasks by chronological order across all pools, so
  // a reader following the diagram sees 1,2,3… even though sheets are grouped
  // by lane. Build a single ordered list first, then map id -> number.
  const allTasks = [...model.flowNodes.values()]
    .filter((n) => n.kind === "task")
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  const numberById = new Map<string, number>();
  allTasks.forEach((t, i) => numberById.set(t.id, i + 1));

  // Preserve every pool, including ones that gained tasks not in model.pools.
  const laneNames = [...new Set([...pools, ...tasksByPool.keys()])];
  const lanes: SkeletonLane[] = laneNames.map((lane) => {
    const tasks = (tasksByPool.get(lane) ?? [])
      .slice()
      .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    return {
      lane,
      activities: tasks.map((t) => ({ number: numberById.get(t.id) ?? 0, name: t.label })),
    };
  });

  return {
    lanes,
    pools: laneNames,
    totalActivities: allTasks.length,
  };
}

/** Render the skeleton as the plain-text block embedded into the AI prompt. */
export function renderSkeletonText(skeleton: DocSkeleton): string {
  const lines: string[] = [];
  for (const lane of skeleton.lanes) {
    if (lane.activities.length === 0) continue;
    lines.push(`LANE: ${lane.lane}`);
    for (const act of lane.activities) {
      lines.push(`  ${act.number}. ${act.name}`);
    }
  }
  return lines.join("\n");
}
