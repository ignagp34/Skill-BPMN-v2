import type { BpmnValidationResult, FlowNode, ResolvedModel } from "@text-to-bpmn/core";

export type ChangeEvaluationStatus = "passed" | "warning" | "failed";
export type ChangeCheckSeverity = "error" | "warning" | "info";

export type ExpectedChangeType =
  | "add_activity"
  | "remove_activity"
  | "move_activity_to_lane"
  | "move_activity_before"
  | "move_activity_after"
  | "move_activity_to_branch"
  | "add_branch_condition"
  | "rename_activity"
  | "preserve_unrelated_structure";

export type ExpectedChangeSpec = {
  type: ExpectedChangeType;
  activity?: string;
  expectedLane?: string;
  mustBeAfter?: string;
  mustBeBefore?: string;
  mustNotBeAfter?: string;
  protectedActivities?: string[];
  [key: string]: unknown;
};

export type ChangeEvaluationCheck = {
  name: string;
  passed: boolean;
  severity: ChangeCheckSeverity;
  message: string;
  details: Record<string, unknown>;
};

export type ActivityChange = {
  activity: string;
  baseLane?: string;
  changedLane?: string;
};

export type ConnectionChange = {
  activity: string;
  basePredecessors: string[];
  baseSuccessors: string[];
  changedPredecessors: string[];
  changedSuccessors: string[];
};

export type ChangeEvaluationMetrics = {
  baseActivityCount: number;
  changedActivityCount: number;
  addedActivities: string[];
  removedActivities: string[];
  preservedActivities: string[];
  renamedOrPossiblyRenamedActivities: string[];
  unexpectedAddedActivities: string[];
  unexpectedRemovedActivities: string[];
  unexpectedLaneChanges: ActivityChange[];
  unexpectedConnectionChanges: ConnectionChange[];
  preservationRate: number;
  targetChangeApplied: boolean;
  unexpectedChangeCount: number;
};

export type ChangeEvaluation = {
  status: ChangeEvaluationStatus;
  score: number;
  checks: ChangeEvaluationCheck[];
  metrics: ChangeEvaluationMetrics;
};

export type ChangeEvaluationResult = {
  changeEvaluation: ChangeEvaluation;
};

export type ChangeEvaluationOptions = {
  baseModelParseable?: boolean;
  changedModelParseable?: boolean;
  changedBpmnValidation?: BpmnValidationResult;
};

type ActivityInfo = {
  id: string;
  label: string;
  normalizedLabel: string;
  lane: string;
  predecessorNames: string[];
  successorNames: string[];
};

type ActivityIndex = {
  byNormalizedName: Map<string, ActivityInfo[]>;
  graph: Map<string, string[]>;
  tasks: ActivityInfo[];
};

const IMPLEMENTED_TYPES: ReadonlySet<ExpectedChangeType> = new Set([
  "add_activity",
  "remove_activity",
  "move_activity_to_lane",
  "move_activity_before",
  "move_activity_after",
  "preserve_unrelated_structure",
]);

export function normalizeActivityName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[.,;:!?()[\]{}"'`]+/g, "")
    .replace(/\s+/g, " ");
}

export function evaluateModelChange(
  baseModel: ResolvedModel,
  changedModel: ResolvedModel,
  expectedChangeSpec: ExpectedChangeSpec,
  options: ChangeEvaluationOptions = {},
): ChangeEvaluationResult {
  const baseIndex = buildActivityIndex(baseModel);
  const changedIndex = buildActivityIndex(changedModel);
  const checks: ChangeEvaluationCheck[] = [];

  addCheck(checks, "base_model_parseable", options.baseModelParseable ?? true, "error", {
    passed: "The base model was parsed successfully.",
    failed: "The base model could not be parsed successfully.",
  });
  addCheck(checks, "changed_model_parseable", options.changedModelParseable ?? true, "error", {
    passed: "The changed model was parsed successfully.",
    failed: "The changed model could not be parsed successfully.",
  });

  if (options.changedBpmnValidation !== undefined) {
    addCheck(
      checks,
      "bpmn_validation_after_change",
      options.changedBpmnValidation.status !== "failed",
      options.changedBpmnValidation.status === "failed" ? "error" : "warning",
      {
        passed: "The changed model passed BPMN validation.",
        failed: "The changed model has BPMN validation errors.",
      },
      {
        status: options.changedBpmnValidation.status,
        errors: options.changedBpmnValidation.errors.length,
        warnings: options.changedBpmnValidation.warnings.length,
      },
    );
  }

  if (!IMPLEMENTED_TYPES.has(expectedChangeSpec.type)) {
    addCheck(checks, "change_type_not_implemented", false, "warning", {
      passed: "The expected change type is implemented.",
      failed: `The expected change type '${expectedChangeSpec.type}' is reserved for future implementation.`,
    });
  }

  const allowedAdded = new Set<string>();
  const allowedRemoved = new Set<string>();
  const allowedLaneChanges = new Set<string>();
  const targetName = typeof expectedChangeSpec.activity === "string" ? expectedChangeSpec.activity : "";
  const targetNorm = normalizeActivityName(targetName);

  if (expectedChangeSpec.type === "add_activity" && targetNorm.length > 0) {
    allowedAdded.add(targetNorm);
  }
  if (expectedChangeSpec.type === "remove_activity" && targetNorm.length > 0) {
    allowedRemoved.add(targetNorm);
  }
  if (expectedChangeSpec.type === "move_activity_to_lane" && targetNorm.length > 0) {
    allowedLaneChanges.add(targetNorm);
  }

  const baseNames = new Set(baseIndex.byNormalizedName.keys());
  const changedNames = new Set(changedIndex.byNormalizedName.keys());
  const addedNorms = sorted([...changedNames].filter((name) => !baseNames.has(name)));
  const removedNorms = sorted([...baseNames].filter((name) => !changedNames.has(name)));
  const preservedNorms = sorted([...baseNames].filter((name) => changedNames.has(name)));
  const unexpectedAddedNorms = addedNorms.filter((name) => !allowedAdded.has(name));
  const unexpectedRemovedNorms = removedNorms.filter((name) => !allowedRemoved.has(name));

  const unexpectedLaneChanges = collectUnexpectedLaneChanges(
    baseIndex,
    changedIndex,
    preservedNorms,
    allowedLaneChanges,
  );
  const unexpectedConnectionChanges = collectUnexpectedConnectionChanges(
    baseIndex,
    changedIndex,
    preservedNorms,
    expectedConnectionIgnoreSet(expectedChangeSpec, targetNorm, allowedAdded, allowedRemoved),
  );

  const metrics: ChangeEvaluationMetrics = {
    baseActivityCount: baseIndex.tasks.length,
    changedActivityCount: changedIndex.tasks.length,
    addedActivities: labelsForNorms(changedIndex, addedNorms),
    removedActivities: labelsForNorms(baseIndex, removedNorms),
    preservedActivities: labelsForNorms(baseIndex, preservedNorms),
    renamedOrPossiblyRenamedActivities: inferPossibleRenames(baseIndex, changedIndex, removedNorms, addedNorms),
    unexpectedAddedActivities: labelsForNorms(changedIndex, unexpectedAddedNorms),
    unexpectedRemovedActivities: labelsForNorms(baseIndex, unexpectedRemovedNorms),
    unexpectedLaneChanges,
    unexpectedConnectionChanges,
    preservationRate: baseIndex.tasks.length === 0 ? 1 : round(preservedNorms.length / baseIndex.byNormalizedName.size),
    targetChangeApplied: false,
    unexpectedChangeCount:
      unexpectedAddedNorms.length +
      unexpectedRemovedNorms.length +
      unexpectedLaneChanges.length +
      unexpectedConnectionChanges.length,
  };

  metrics.targetChangeApplied = evaluateTargetChange(
    expectedChangeSpec,
    baseIndex,
    changedIndex,
    checks,
  );

  addPreservationChecks(expectedChangeSpec, baseIndex, changedIndex, checks);
  addUnexpectedChangeChecks(metrics, checks);

  const score = scoreEvaluation(metrics, checks, options.changedBpmnValidation);
  const status = statusFor(score, checks);

  return {
    changeEvaluation: {
      status,
      score,
      checks: checks.sort(compareChecks),
      metrics: sortMetrics(metrics),
    },
  };
}

function evaluateTargetChange(
  spec: ExpectedChangeSpec,
  baseIndex: ActivityIndex,
  changedIndex: ActivityIndex,
  checks: ChangeEvaluationCheck[],
): boolean {
  switch (spec.type) {
    case "add_activity":
      return evaluateAddActivity(spec, baseIndex, changedIndex, checks);
    case "remove_activity":
      return evaluateRemoveActivity(spec, baseIndex, changedIndex, checks);
    case "move_activity_to_lane":
      return evaluateMoveActivityToLane(spec, baseIndex, changedIndex, checks);
    case "move_activity_before":
      return evaluateMoveActivityBefore(spec, baseIndex, changedIndex, checks);
    case "move_activity_after":
      return evaluateMoveActivityAfter(spec, baseIndex, changedIndex, checks);
    case "preserve_unrelated_structure":
      return evaluatePreserveUnrelatedStructure(spec, baseIndex, changedIndex, checks);
    default:
      return false;
  }
}

function evaluateAddActivity(
  spec: ExpectedChangeSpec,
  baseIndex: ActivityIndex,
  changedIndex: ActivityIndex,
  checks: ChangeEvaluationCheck[],
): boolean {
  const activity = requiredString(spec.activity);
  if (activity === undefined) {
    missingField(checks, "activity");
    return false;
  }
  const norm = normalizeActivityName(activity);
  const baseMatches = baseIndex.byNormalizedName.get(norm) ?? [];
  const changedMatches = changedIndex.byNormalizedName.get(norm) ?? [];

  addCheck(checks, "added_activity_not_in_base", baseMatches.length === 0, "warning", {
    passed: "The added activity was not already present in the base model.",
    failed: "The expected added activity already exists in the base model.",
  });
  addCheck(checks, "added_activity_exists", changedMatches.length > 0, "error", {
    passed: "The added activity exists in the changed model.",
    failed: "The added activity is missing from the changed model.",
  });
  addDuplicateCheck(checks, "no_duplicate_target_activity", activity, changedMatches);

  const target = changedMatches[0];
  const afterOk = checkReachabilityConstraint(
    checks,
    changedIndex,
    spec.mustBeAfter,
    activity,
    "added_activity_has_expected_predecessor",
    "after",
  );
  const beforeOk = checkReachabilityConstraint(
    checks,
    changedIndex,
    activity,
    spec.mustBeBefore,
    "added_activity_has_expected_successor",
    "before",
  );

  return changedMatches.length === 1 && target !== undefined && afterOk && beforeOk;
}

function evaluateRemoveActivity(
  spec: ExpectedChangeSpec,
  baseIndex: ActivityIndex,
  changedIndex: ActivityIndex,
  checks: ChangeEvaluationCheck[],
): boolean {
  const activity = requiredString(spec.activity);
  if (activity === undefined) {
    missingField(checks, "activity");
    return false;
  }
  const norm = normalizeActivityName(activity);
  const baseMatches = baseIndex.byNormalizedName.get(norm) ?? [];
  const changedMatches = changedIndex.byNormalizedName.get(norm) ?? [];

  addCheck(checks, "target_activity_exists_in_base", baseMatches.length > 0, "error", {
    passed: "The target activity exists in the base model.",
    failed: "The target activity is missing from the base model.",
  });
  addCheck(checks, "removed_activity_absent", changedMatches.length === 0, "error", {
    passed: "The removed activity is absent from the changed model.",
    failed: "The removed activity still exists in the changed model.",
  });

  return baseMatches.length > 0 && changedMatches.length === 0;
}

function evaluateMoveActivityToLane(
  spec: ExpectedChangeSpec,
  baseIndex: ActivityIndex,
  changedIndex: ActivityIndex,
  checks: ChangeEvaluationCheck[],
): boolean {
  const activity = requiredString(spec.activity);
  const expectedLane = requiredString(spec.expectedLane);
  if (activity === undefined || expectedLane === undefined) {
    missingField(checks, activity === undefined ? "activity" : "expectedLane");
    return false;
  }
  const norm = normalizeActivityName(activity);
  const baseMatches = baseIndex.byNormalizedName.get(norm) ?? [];
  const changedMatches = changedIndex.byNormalizedName.get(norm) ?? [];
  const changed = changedMatches[0];

  addCheck(checks, "target_activity_exists_in_base", baseMatches.length > 0, "error", {
    passed: "The target activity exists in the base model.",
    failed: "The target activity is missing from the base model.",
  });
  addCheck(checks, "activity_still_exists", changedMatches.length > 0, "error", {
    passed: "The moved activity still exists in the changed model.",
    failed: "The moved activity is missing from the changed model.",
  });
  addDuplicateCheck(checks, "activity_not_duplicated", activity, changedMatches);
  addCheck(
    checks,
    "lane_changed_correctly",
    changed !== undefined && normalizeActivityName(changed.lane) === normalizeActivityName(expectedLane),
    "error",
    {
      passed: "The activity is in the expected lane.",
      failed: "The activity is not in the expected lane.",
    },
    { expectedLane, actualLane: changed?.lane },
  );

  return (
    baseMatches.length > 0 &&
    changedMatches.length === 1 &&
    changed !== undefined &&
    normalizeActivityName(changed.lane) === normalizeActivityName(expectedLane)
  );
}

function evaluateMoveActivityBefore(
  spec: ExpectedChangeSpec,
  _baseIndex: ActivityIndex,
  changedIndex: ActivityIndex,
  checks: ChangeEvaluationCheck[],
): boolean {
  const activity = requiredString(spec.activity);
  const reference = requiredString(spec.mustBeBefore);
  if (activity === undefined || reference === undefined) {
    missingField(checks, activity === undefined ? "activity" : "mustBeBefore");
    return false;
  }
  return evaluateRelativeMove(spec, changedIndex, checks, activity, reference, "before");
}

function evaluateMoveActivityAfter(
  spec: ExpectedChangeSpec,
  _baseIndex: ActivityIndex,
  changedIndex: ActivityIndex,
  checks: ChangeEvaluationCheck[],
): boolean {
  const activity = requiredString(spec.activity);
  const reference = requiredString(spec.mustBeAfter);
  if (activity === undefined || reference === undefined) {
    missingField(checks, activity === undefined ? "activity" : "mustBeAfter");
    return false;
  }
  return evaluateRelativeMove(spec, changedIndex, checks, reference, activity, "after");
}

function evaluateRelativeMove(
  spec: ExpectedChangeSpec,
  changedIndex: ActivityIndex,
  checks: ChangeEvaluationCheck[],
  sourceActivity: string,
  targetActivity: string,
  direction: "before" | "after",
): boolean {
  const activity = requiredString(spec.activity);
  if (activity === undefined) return false;
  const targetMatches = changedIndex.byNormalizedName.get(normalizeActivityName(activity)) ?? [];
  const referenceName = direction === "after" ? sourceActivity : targetActivity;
  const referenceMatches = changedIndex.byNormalizedName.get(normalizeActivityName(referenceName)) ?? [];

  addCheck(checks, "activity_still_exists", targetMatches.length > 0, "error", {
    passed: "The moved activity still exists in the changed model.",
    failed: "The moved activity is missing from the changed model.",
  });
  addCheck(checks, "reference_activity_exists", referenceMatches.length > 0, "error", {
    passed: "The reference activity exists in the changed model.",
    failed: "The reference activity is missing from the changed model.",
  });
  addDuplicateCheck(checks, "activity_not_duplicated", activity, targetMatches);

  const source = findSingleActivity(changedIndex, sourceActivity);
  const target = findSingleActivity(changedIndex, targetActivity);
  const reachable = source !== undefined && target !== undefined && hasPath(changedIndex.graph, source.id, target.id);
  addCheck(
    checks,
    "relative_order_correct",
    reachable,
    "error",
    {
      passed: "The expected relative order is present in the changed model.",
      failed: "The expected relative order is not present in the changed model.",
    },
    { sourceActivity, targetActivity },
  );

  return targetMatches.length === 1 && referenceMatches.length > 0 && reachable;
}

function evaluatePreserveUnrelatedStructure(
  spec: ExpectedChangeSpec,
  baseIndex: ActivityIndex,
  changedIndex: ActivityIndex,
  checks: ChangeEvaluationCheck[],
): boolean {
  const protectedActivities = Array.isArray(spec.protectedActivities)
    ? spec.protectedActivities.filter((value): value is string => typeof value === "string")
    : [];
  if (protectedActivities.length === 0) {
    addCheck(checks, "protected_activities_specified", false, "warning", {
      passed: "Protected activities were specified.",
      failed: "No protected activities were specified.",
    });
    return false;
  }

  let allPassed = true;
  for (const activity of protectedActivities) {
    const norm = normalizeActivityName(activity);
    const base = baseIndex.byNormalizedName.get(norm)?.[0];
    const changed = changedIndex.byNormalizedName.get(norm)?.[0];
    const exists = base !== undefined && changed !== undefined;
    const lanePreserved = exists && base.lane === changed.lane;
    const connectionsPreserved =
      exists &&
      sameStringSet(base.predecessorNames, changed.predecessorNames) &&
      sameStringSet(base.successorNames, changed.successorNames);

    allPassed = allPassed && exists && lanePreserved && connectionsPreserved;
    addCheck(checks, `protected_activity_exists:${norm}`, exists, "error", {
      passed: `Protected activity '${activity}' exists in both models.`,
      failed: `Protected activity '${activity}' is missing in one of the models.`,
    });
    addCheck(checks, `protected_activity_lane_preserved:${norm}`, lanePreserved, "warning", {
      passed: `Protected activity '${activity}' kept its lane.`,
      failed: `Protected activity '${activity}' changed lanes.`,
    });
    addCheck(checks, `protected_connections_preserved:${norm}`, connectionsPreserved, "warning", {
      passed: `Protected activity '${activity}' kept its direct structural connections.`,
      failed: `Protected activity '${activity}' changed direct structural connections.`,
    });
  }

  return allPassed;
}

function addPreservationChecks(
  spec: ExpectedChangeSpec,
  baseIndex: ActivityIndex,
  changedIndex: ActivityIndex,
  checks: ChangeEvaluationCheck[],
): void {
  if (spec.type === "preserve_unrelated_structure") return;
  const protectedActivities = Array.isArray(spec.protectedActivities)
    ? spec.protectedActivities.filter((value): value is string => typeof value === "string")
    : [];
  if (protectedActivities.length === 0) {
    addCheck(checks, "unrelated_activities_preserved", true, "info", {
      passed: "No explicit protected activities were provided for unrelated-structure checks.",
      failed: "Unrelated activities were not preserved.",
    });
    return;
  }

  const missing = protectedActivities.filter((activity) => {
    const norm = normalizeActivityName(activity);
    return !baseIndex.byNormalizedName.has(norm) || !changedIndex.byNormalizedName.has(norm);
  });
  addCheck(checks, "unrelated_activities_preserved", missing.length === 0, "warning", {
    passed: "All protected unrelated activities exist in both models.",
    failed: "Some protected unrelated activities are missing after the change.",
  }, { missing });
}

function addUnexpectedChangeChecks(metrics: ChangeEvaluationMetrics, checks: ChangeEvaluationCheck[]): void {
  addCheck(checks, "no_unexpected_activity_removals", metrics.unexpectedRemovedActivities.length === 0, "error", {
    passed: "No unexpected activities were removed.",
    failed: "Unexpected activities were removed.",
  }, { unexpectedRemovedActivities: metrics.unexpectedRemovedActivities });
  addCheck(checks, "no_unexpected_activity_additions", metrics.unexpectedAddedActivities.length === 0, "warning", {
    passed: "No unexpected activities were added.",
    failed: "Unexpected activities were added.",
  }, { unexpectedAddedActivities: metrics.unexpectedAddedActivities });
  addCheck(checks, "unrelated_lanes_preserved", metrics.unexpectedLaneChanges.length === 0, "warning", {
    passed: "Unrelated activity lanes were preserved.",
    failed: "Unexpected lane changes were detected.",
  }, { unexpectedLaneChanges: metrics.unexpectedLaneChanges });
  addCheck(checks, "connections_preserved_or_reasonably_updated", metrics.unexpectedConnectionChanges.length === 0, "warning", {
    passed: "No unexpected direct connection changes were detected.",
    failed: "Unexpected direct connection changes were detected.",
  }, { unexpectedConnectionChanges: metrics.unexpectedConnectionChanges });
}

function buildActivityIndex(model: ResolvedModel): ActivityIndex {
  const graph = new Map<string, string[]>();
  for (const node of model.flowNodes.values()) {
    graph.set(node.id, []);
  }
  for (const flow of model.flows) {
    const targets = graph.get(flow.sourceId) ?? [];
    targets.push(flow.targetId);
    graph.set(flow.sourceId, sorted(targets));
  }

  const tasks = Array.from(model.flowNodes.values())
    .filter((node): node is FlowNode & { kind: "task" } => node.kind === "task")
    .sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id))
    .map((node) => ({
      id: node.id,
      label: node.label,
      normalizedLabel: normalizeActivityName(node.label),
      lane: node.pool,
      predecessorNames: adjacentNames(model, node.id, "incoming"),
      successorNames: adjacentNames(model, node.id, "outgoing"),
    }));

  const byNormalizedName = new Map<string, ActivityInfo[]>();
  for (const task of tasks) {
    const values = byNormalizedName.get(task.normalizedLabel) ?? [];
    values.push(task);
    byNormalizedName.set(task.normalizedLabel, values);
  }
  for (const [key, values] of byNormalizedName) {
    byNormalizedName.set(
      key,
      values.sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id)),
    );
  }

  return { byNormalizedName, graph, tasks };
}

function adjacentNames(model: ResolvedModel, nodeId: string, direction: "incoming" | "outgoing"): string[] {
  const labels: string[] = [];
  for (const flow of model.flows) {
    const adjacentId =
      direction === "incoming" && flow.targetId === nodeId
        ? flow.sourceId
        : direction === "outgoing" && flow.sourceId === nodeId
          ? flow.targetId
          : undefined;
    if (adjacentId === undefined) continue;
    const adjacent = model.flowNodes.get(adjacentId);
    if (adjacent === undefined) continue;
    labels.push(displayNodeName(adjacent));
  }
  return sorted(labels);
}

function displayNodeName(node: FlowNode): string {
  if (node.label.trim().length > 0) return node.label.trim();
  return node.kind;
}

function collectUnexpectedLaneChanges(
  baseIndex: ActivityIndex,
  changedIndex: ActivityIndex,
  preservedNorms: string[],
  allowedLaneChanges: Set<string>,
): ActivityChange[] {
  return preservedNorms
    .filter((norm) => !allowedLaneChanges.has(norm))
    .flatMap((norm) => {
      const base = baseIndex.byNormalizedName.get(norm)?.[0];
      const changed = changedIndex.byNormalizedName.get(norm)?.[0];
      if (base === undefined || changed === undefined || base.lane === changed.lane) return [];
      return [{ activity: base.label, baseLane: base.lane, changedLane: changed.lane }];
    })
    .sort((a, b) => a.activity.localeCompare(b.activity));
}

function collectUnexpectedConnectionChanges(
  baseIndex: ActivityIndex,
  changedIndex: ActivityIndex,
  preservedNorms: string[],
  ignoredActivities: Set<string>,
): ConnectionChange[] {
  return preservedNorms
    .filter((norm) => !ignoredActivities.has(norm))
    .flatMap((norm) => {
      const base = baseIndex.byNormalizedName.get(norm)?.[0];
      const changed = changedIndex.byNormalizedName.get(norm)?.[0];
      if (base === undefined || changed === undefined) return [];
      if (
        sameStringSet(base.predecessorNames, changed.predecessorNames) &&
        sameStringSet(base.successorNames, changed.successorNames)
      ) {
        return [];
      }
      return [
        {
          activity: base.label,
          basePredecessors: base.predecessorNames,
          baseSuccessors: base.successorNames,
          changedPredecessors: changed.predecessorNames,
          changedSuccessors: changed.successorNames,
        },
      ];
    })
    .sort((a, b) => a.activity.localeCompare(b.activity));
}

function expectedConnectionIgnoreSet(
  spec: ExpectedChangeSpec,
  targetNorm: string,
  allowedAdded: Set<string>,
  allowedRemoved: Set<string>,
): Set<string> {
  const ignored = new Set([targetNorm, ...allowedAdded, ...allowedRemoved].filter(Boolean));
  for (const field of ["mustBeAfter", "mustBeBefore", "mustNotBeAfter"] as const) {
    const value = spec[field];
    if (typeof value === "string" && value.trim().length > 0) {
      ignored.add(normalizeActivityName(value));
    }
  }
  return ignored;
}

function inferPossibleRenames(
  baseIndex: ActivityIndex,
  changedIndex: ActivityIndex,
  removedNorms: string[],
  addedNorms: string[],
): string[] {
  const candidates: string[] = [];
  for (const removed of removedNorms) {
    const removedActivity = baseIndex.byNormalizedName.get(removed)?.[0];
    if (removedActivity === undefined) continue;
    for (const added of addedNorms) {
      const addedActivity = changedIndex.byNormalizedName.get(added)?.[0];
      if (addedActivity === undefined) continue;
      if (removedActivity.lane !== addedActivity.lane) continue;
      const predecessorOverlap = intersects(removedActivity.predecessorNames, addedActivity.predecessorNames);
      const successorOverlap = intersects(removedActivity.successorNames, addedActivity.successorNames);
      if (predecessorOverlap || successorOverlap) {
        candidates.push(`${removedActivity.label} -> ${addedActivity.label}`);
      }
    }
  }
  return sorted(candidates);
}

function checkReachabilityConstraint(
  checks: ChangeEvaluationCheck[],
  index: ActivityIndex,
  sourceName: unknown,
  targetName: unknown,
  checkName: string,
  relation: "after" | "before",
): boolean {
  if (typeof sourceName !== "string" || sourceName.trim().length === 0) return true;
  if (typeof targetName !== "string" || targetName.trim().length === 0) return true;
  const source = findSingleActivity(index, sourceName);
  const target = findSingleActivity(index, targetName);
  const passed = source !== undefined && target !== undefined && hasPath(index.graph, source.id, target.id);
  addCheck(
    checks,
    checkName,
    passed,
    "error",
    {
      passed: `The activity has the expected ${relation} relationship.`,
      failed: `The activity does not have the expected ${relation} relationship.`,
    },
    { sourceActivity: sourceName, targetActivity: targetName },
  );
  return passed;
}

function hasPath(graph: Map<string, string[]>, sourceId: string, targetId: string): boolean {
  const seen = new Set<string>();
  const queue = [sourceId];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) continue;
    if (current === targetId) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const next of graph.get(current) ?? []) {
      if (!seen.has(next)) queue.push(next);
    }
  }
  return false;
}

function findSingleActivity(index: ActivityIndex, name: string): ActivityInfo | undefined {
  const matches = index.byNormalizedName.get(normalizeActivityName(name)) ?? [];
  return matches.length === 1 ? matches[0] : undefined;
}

function labelsForNorms(index: ActivityIndex, norms: string[]): string[] {
  return sorted(norms.flatMap((norm) => (index.byNormalizedName.get(norm) ?? []).map((activity) => activity.label)));
}

function scoreEvaluation(
  metrics: ChangeEvaluationMetrics,
  checks: ChangeEvaluationCheck[],
  changedBpmnValidation: BpmnValidationResult | undefined,
): number {
  let score = 1;
  if (!metrics.targetChangeApplied) score -= 0.4;
  if (
    checks.some(
      (check) =>
        !check.passed &&
        (check.name === "target_activity_exists_in_changed" ||
          check.name === "added_activity_exists" ||
          check.name === "activity_still_exists" ||
          check.name === "no_duplicate_target_activity" ||
          check.name === "activity_not_duplicated"),
    )
  ) {
    score -= 0.2;
  }
  score -= Math.min(0.3, metrics.unexpectedRemovedActivities.length * 0.1);
  score -= Math.min(0.2, metrics.unexpectedAddedActivities.length * 0.05);
  score -= Math.min(0.2, metrics.unexpectedLaneChanges.length * 0.05);
  if (changedBpmnValidation?.status === "failed") score -= 0.1;
  return round(Math.max(0, Math.min(1, score)));
}

function statusFor(score: number, checks: ChangeEvaluationCheck[]): ChangeEvaluationStatus {
  const failedError = checks.some((check) => check.severity === "error" && !check.passed);
  const failedWarning = checks.some((check) => check.severity === "warning" && !check.passed);
  if (score < 0.6 || failedError) return "failed";
  if (score >= 0.85 && !failedWarning) return "passed";
  return "warning";
}

function sortMetrics(metrics: ChangeEvaluationMetrics): ChangeEvaluationMetrics {
  return {
    ...metrics,
    addedActivities: sorted(metrics.addedActivities),
    removedActivities: sorted(metrics.removedActivities),
    preservedActivities: sorted(metrics.preservedActivities),
    renamedOrPossiblyRenamedActivities: sorted(metrics.renamedOrPossiblyRenamedActivities),
    unexpectedAddedActivities: sorted(metrics.unexpectedAddedActivities),
    unexpectedRemovedActivities: sorted(metrics.unexpectedRemovedActivities),
    unexpectedLaneChanges: [...metrics.unexpectedLaneChanges].sort((a, b) => a.activity.localeCompare(b.activity)),
    unexpectedConnectionChanges: [...metrics.unexpectedConnectionChanges].sort((a, b) =>
      a.activity.localeCompare(b.activity),
    ),
  };
}

function addDuplicateCheck(
  checks: ChangeEvaluationCheck[],
  name: string,
  activity: string,
  matches: ActivityInfo[],
): void {
  addCheck(
    checks,
    name,
    matches.length <= 1,
    "error",
    {
      passed: "The target activity is not duplicated.",
      failed: "The target activity appears multiple times in the changed model.",
    },
    { activity, count: matches.length },
  );
}

function addCheck(
  checks: ChangeEvaluationCheck[],
  name: string,
  passed: boolean,
  severity: ChangeCheckSeverity,
  messages: { failed: string; passed: string },
  details: Record<string, unknown> = {},
): void {
  checks.push({
    name,
    passed,
    severity,
    message: passed ? messages.passed : messages.failed,
    details,
  });
}

function missingField(checks: ChangeEvaluationCheck[], field: string): void {
  addCheck(
    checks,
    `missing_expected_change_field:${field}`,
    false,
    "error",
    {
      passed: `Required field '${field}' is present.`,
      failed: `Required field '${field}' is missing from the expected change spec.`,
    },
    { field },
  );
}

function requiredString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function sameStringSet(left: string[], right: string[]): boolean {
  const leftNorm = sorted(left.map(normalizeActivityName));
  const rightNorm = sorted(right.map(normalizeActivityName));
  return leftNorm.length === rightNorm.length && leftNorm.every((value, index) => value === rightNorm[index]);
}

function intersects(left: string[], right: string[]): boolean {
  const rightSet = new Set(right.map(normalizeActivityName));
  return left.some((value) => rightSet.has(normalizeActivityName(value)));
}

function compareChecks(a: ChangeEvaluationCheck, b: ChangeEvaluationCheck): number {
  const severity = severityOrder(a.severity) - severityOrder(b.severity);
  if (severity !== 0) return severity;
  return a.name.localeCompare(b.name);
}

function severityOrder(severity: ChangeCheckSeverity): number {
  switch (severity) {
    case "error":
      return 0;
    case "warning":
      return 1;
    case "info":
      return 2;
  }
}

function sorted(values: string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
