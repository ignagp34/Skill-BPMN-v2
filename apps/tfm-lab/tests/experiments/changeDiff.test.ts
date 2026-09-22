import { describe, expect, it } from "vitest";

import {
  evaluateModelChange,
  normalizeActivityName,
  type ExpectedChangeSpec,
} from "../../src/experiments/changeDiff.js";
import type { FlowNode, ResolvedModel, SequenceFlow } from "@text-to-bpmn/core";

function task(id: string, label: string, pool = "Lane A"): FlowNode {
  return {
    annotations: [],
    id,
    kind: "task",
    label,
    pool,
    sourceLine: 1,
  };
}

function gateway(id: string, label = "Decision"): FlowNode {
  return {
    annotations: [],
    id,
    kind: "exclusiveGateway",
    label,
    pool: "Lane A",
    sourceLine: 1,
  };
}

function flow(id: string, sourceId: string, targetId: string): SequenceFlow {
  return { id, sourceId, targetId };
}

function model(nodes: FlowNode[], flows: SequenceFlow[]): ResolvedModel {
  const nodeIdsByPool = new Map<string, string[]>();
  for (const node of nodes) {
    nodeIdsByPool.set(node.pool, [...(nodeIdsByPool.get(node.pool) ?? []), node.id]);
  }
  return {
    errors: [],
    flowNodes: new Map(nodes.map((node) => [node.id, node])),
    flows,
    messageFlows: [],
    pools: [...nodeIdsByPool.entries()].map(([name, nodeIds]) => ({ name, nodeIds })),
  };
}

function evaluate(base: ResolvedModel, changed: ResolvedModel, spec: ExpectedChangeSpec) {
  return evaluateModelChange(base, changed, spec).changeEvaluation;
}

describe("change diff evaluation", () => {
  it("normalizes activity names for deterministic matching", () => {
    expect(normalizeActivityName("  Check,   Documentation! ")).toBe("check documentation");
  });

  it("passes when adding an activity before another activity", () => {
    const base = model(
      [task("a", "Receive request"), task("c", "Review request")],
      [flow("f1", "a", "c")],
    );
    const changed = model(
      [task("a", "Receive request"), task("b", "Check documentation"), task("c", "Review request")],
      [flow("f1", "a", "b"), flow("f2", "b", "c")],
    );

    const result = evaluate(base, changed, {
      type: "add_activity",
      activity: "Check documentation",
      mustBeAfter: "Receive request",
      mustBeBefore: "Review request",
    });

    expect(result.status).toBe("passed");
    expect(result.metrics.targetChangeApplied).toBe(true);
    expect(result.metrics.addedActivities).toEqual(["Check documentation"]);
  });

  it("passes when removing a target activity", () => {
    const base = model(
      [task("a", "Receive request"), task("b", "Register request"), task("c", "Notify customer")],
      [flow("f1", "a", "b"), flow("f2", "b", "c")],
    );
    const changed = model(
      [task("a", "Receive request"), task("c", "Notify customer")],
      [flow("f1", "a", "c")],
    );

    const result = evaluate(base, changed, {
      type: "remove_activity",
      activity: "Register request",
    });

    expect(result.metrics.targetChangeApplied).toBe(true);
    expect(result.metrics.removedActivities).toEqual(["Register request"]);
    expect(result.metrics.unexpectedRemovedActivities).toEqual([]);
  });

  it("passes when moving an activity to another lane", () => {
    const base = model(
      [task("a", "Receive request", "Customer"), task("b", "Review request", "Back Office")],
      [flow("f1", "a", "b")],
    );
    const changed = model(
      [task("a", "Receive request", "Customer"), task("b", "Review request", "Customer Service")],
      [flow("f1", "a", "b")],
    );

    const result = evaluate(base, changed, {
      type: "move_activity_to_lane",
      activity: "Review request",
      expectedLane: "Customer Service",
    });

    expect(result.metrics.targetChangeApplied).toBe(true);
    expect(result.metrics.unexpectedLaneChanges).toEqual([]);
  });

  it("detects an unexpected removed activity", () => {
    const base = model(
      [task("a", "Receive request"), task("b", "Review request"), task("c", "Notify customer")],
      [flow("f1", "a", "b"), flow("f2", "b", "c")],
    );
    const changed = model(
      [task("a", "Receive request"), task("b", "Review request"), task("x", "Archive case")],
      [flow("f1", "a", "b"), flow("f2", "b", "x")],
    );

    const result = evaluate(base, changed, {
      type: "add_activity",
      activity: "Archive case",
      mustBeAfter: "Review request",
    });

    expect(result.metrics.unexpectedRemovedActivities).toEqual(["Notify customer"]);
    expect(result.checks.find((check) => check.name === "no_unexpected_activity_removals")?.passed).toBe(false);
  });

  it("detects an unexpected added activity", () => {
    const base = model(
      [task("a", "Receive request"), task("b", "Review request")],
      [flow("f1", "a", "b")],
    );
    const changed = model(
      [task("a", "Receive request"), task("b", "Review request"), task("x", "Archive case")],
      [flow("f1", "a", "b"), flow("f2", "b", "x")],
    );

    const result = evaluate(base, changed, {
      type: "move_activity_after",
      activity: "Review request",
      mustBeAfter: "Receive request",
    });

    expect(result.metrics.unexpectedAddedActivities).toEqual(["Archive case"]);
    expect(result.checks.find((check) => check.name === "no_unexpected_activity_additions")?.passed).toBe(false);
  });

  it("detects duplicated target activity", () => {
    const base = model(
      [task("a", "Receive request"), task("b", "Review request")],
      [flow("f1", "a", "b")],
    );
    const changed = model(
      [task("a", "Receive request"), task("b", "Review request"), task("b2", "Review request")],
      [flow("f1", "a", "b"), flow("f2", "a", "b2")],
    );

    const result = evaluate(base, changed, {
      type: "move_activity_after",
      activity: "Review request",
      mustBeAfter: "Receive request",
    });

    expect(result.status).toBe("failed");
    expect(result.checks.find((check) => check.name === "activity_not_duplicated")?.passed).toBe(false);
  });

  it("checks relative order with graph reachability through intermediate nodes", () => {
    const base = model(
      [task("a", "Approve request"), task("b", "Notify customer")],
      [flow("f1", "a", "b")],
    );
    const changed = model(
      [task("a", "Approve request"), gateway("g"), task("x", "Archive decision"), task("b", "Notify customer")],
      [flow("f1", "a", "g"), flow("f2", "g", "x"), flow("f3", "x", "b")],
    );

    const result = evaluate(base, changed, {
      type: "move_activity_after",
      activity: "Notify customer",
      mustBeAfter: "Approve request",
    });

    expect(result.checks.find((check) => check.name === "relative_order_correct")?.passed).toBe(true);
  });

  it("handles unsupported future change types with an explicit limitation check", () => {
    const base = model([task("a", "Receive request")], []);
    const changed = model([task("a", "Receive request")], []);

    const result = evaluate(base, changed, {
      type: "rename_activity",
      activity: "Receive request",
    });

    expect(result.status).toBe("warning");
    expect(result.checks.find((check) => check.name === "change_type_not_implemented")?.severity).toBe("warning");
  });

  it("returns deterministic results for identical input", () => {
    const base = model(
      [task("a", "Receive request"), task("b", "Review request")],
      [flow("f1", "a", "b")],
    );
    const changed = model(
      [task("a", "Receive request"), task("b", "Review request", "Customer Service")],
      [flow("f1", "a", "b")],
    );
    const spec: ExpectedChangeSpec = {
      type: "move_activity_to_lane",
      activity: "Review request",
      expectedLane: "Customer Service",
    };

    expect(evaluateModelChange(base, changed, spec)).toEqual(evaluateModelChange(base, changed, spec));
  });
});
