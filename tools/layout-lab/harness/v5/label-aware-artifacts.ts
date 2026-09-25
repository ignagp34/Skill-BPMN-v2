import BpmnModdle from "bpmn-moddle";

/**
 * Layout v5: placeArtifacts of packages/bpmn-core/src/render/artifacts.ts with
 * label awareness (plans/layout-iteracion-1.md, ideas E/F). Copied verbatim;
 * every change is marked "v5:". A candidate position is judged by what is
 * actually drawn:
 *  - an artifact's footprint includes its external name (data object/store,
 *    estimated as bpmn-js lays it out: centred under the shape, <= 90 px wide);
 *  - text annotations get a height that fits their text (no overflow);
 *  - external labels of other elements (events, gateways, named flows) are
 *    obstacles for the footprint and for association routes;
 *  - an association may not leave through its own artifact's name.
 * When no position satisfies that, the group falls back to v0's rules.
 */

const DATA_REF_TYPES = new Set(["bpmn:DataObjectReference", "bpmn:DataStoreReference"]);
const ARTIFACT_TYPES = new Set([...DATA_REF_TYPES, "bpmn:TextAnnotation"]);
const CONTAINER_TYPES = new Set(["bpmn:Participant", "bpmn:Lane"]);

const HEADER_W = 30;
const DATA_W = 36;
const DATA_H = 50;
const STORE_W = 50;
const STORE_H = 50;
const ANNOTATION_W = 140;
const ANNOTATION_H = 40;
const ARTIFACT_GAP = 24;
const DEFAULT_SEARCH_STEP = 48;
const DEFAULT_SEARCH_RINGS = 4;
const DATA_SEARCH_STEP = 60;
const DATA_SEARCH_RINGS = 6;
const STORE_SEARCH_STEP = 68;
const STORE_SEARCH_RINGS = 7;
const PARTICIPANT_INSET = 12;
const CROWDED_MARGIN = 40;
// v5: what bpmn-js draws next to shapes.
const LABEL_MAX_W = 90;          // default width of an external label
const CHAR_W = 6;                // same estimate as render/labels.ts
const LABEL_LINE_H = 14;
const ANNOTATION_TEXT_W = 130;   // annotation width minus its text padding
const ANNOTATION_PAD_Y = 12;
// v5: strict rules rank candidates by one weighted cost, in px of association length:
// crossing a shape is almost forbidden, covering a label or crossing a line/label is
// traded against a longer association, so artifacts stay close to their node.
const WEIGHTS = { shapeCrossing: 1000, labelOverlap: 300, labelCrossing: 300, lineCrossing: 150, bend: 60, crowding: 20 };
type Weights = typeof WEIGHTS;
const STRICT_RING_FACTOR = 2;    // strict rules search twice as far before falling back to v0
const CLEARANCE = 2;             // free space around an artifact's footprint (strict rules)
const EXTERNAL_LABEL = /^bpmn:(StartEvent|EndEvent|IntermediateCatchEvent|IntermediateThrowEvent|BoundaryEvent|\w*Gateway|DataObjectReference|DataStoreReference)$/;

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Pt {
  x: number;
  y: number;
}

interface EdgeSegment {
  a: Pt;
  b: Pt;
  edgeId: string;
}

interface ShapeNode {
  $type: "bpmndi:BPMNShape";
  id?: string;
  bpmnElement?: { id: string; $type: string };
  bounds?: Bounds;
}

interface EdgeNode {
  $type: "bpmndi:BPMNEdge";
  id?: string;
  bpmnElement?: { id: string; $type: string };
  waypoint?: Array<{ $type: string; x: number; y: number }>;
}

interface ArtifactGroup {
  artifact: any;
  associations: any[];
  attachedNodeIds: string[];
  participantId?: string;
}

interface ArtifactRoute {
  points: Pt[];
  bends: number;
  length: number;
  crossings: number;
  lineCrossings: number; // v5: crossings with drawn lines, ranked after shape crossings
  labelCrossings: number; // v5: labels crossed
}

interface ArtifactCandidate {
  bounds: Bounds;
  routes: Map<string, Pt[]>;
  insideParticipant: boolean;
  cost?: number; // v5: weighted cost under strict rules
  score: {
    crossings: number;
    lineCrossings: number; // v5
    bends: number;
    totalLength: number;
    crowding: number;
  };
}

type PlaneEl = ShapeNode | EdgeNode;

export async function placeArtifacts(layoutXml: string): Promise<string> {
  const moddle = new BpmnModdle();
  const { rootElement } = await moddle.fromXML(layoutXml);
  const defs = rootElement as { rootElements?: any[]; diagrams?: any[] };

  const planeElements = collectPlaneElements(defs);
  if (planeElements === undefined) {
    return (await moddle.toXML(rootElement, { format: false })).xml;
  }

  const shapeById = new Map<string, ShapeNode>();
  const edgeById = new Map<string, EdgeNode>();
  const participantBoundsById = new Map<string, Bounds>();
  const blockingShapes: Array<{ id: string; bounds: Bounds }> = [];
  const controlEdgeSegments: EdgeSegment[] = [];
  const labelObstacles: Array<{ id: string; bounds: Bounds }> = []; // v5
  const placedAssociationSegments: EdgeSegment[] = []; // v5: routes already drawn

  for (const el of planeElements) {
    if (el.$type === "bpmndi:BPMNShape" && el.bpmnElement?.id && el.bounds) {
      const id = el.bpmnElement.id;
      shapeById.set(id, el);
      const type = el.bpmnElement.$type;
      if (type === "bpmn:Participant") {
        participantBoundsById.set(id, el.bounds);
      } else if (!ARTIFACT_TYPES.has(type) && !CONTAINER_TYPES.has(type)) {
        blockingShapes.push({ id, bounds: el.bounds });
        const label = externalLabelBounds(el); // v5
        if (label) labelObstacles.push({ id: `${id}#label`, bounds: label });
      }
    } else if (el.$type === "bpmndi:BPMNEdge" && el.bpmnElement?.id) {
      edgeById.set(el.bpmnElement.id, el);
      if (el.bpmnElement.$type !== "bpmn:Association") {
        controlEdgeSegments.push(...edgeSegments(el.bpmnElement.id, el.waypoint ?? []));
        const label = (el as any).label?.bounds as Bounds | undefined; // v5
        if (label) labelObstacles.push({ id: `${el.bpmnElement.id}#label`, bounds: label });
      }
    }
  }

  const participantByElementId = collectParticipantMembership(defs);
  const artifactGroups = collectArtifactGroups(defs, participantByElementId);
  artifactGroups.sort(compareArtifactGroups);

  const pendingPlaneElements: PlaneEl[] = [];
  const placedArtifacts = new Map<string, Bounds>();

  for (const group of artifactGroups) {
    const connectedShapes = group.attachedNodeIds
      .map((id) => ({ id, bounds: shapeById.get(id)?.bounds }))
      .filter((entry): entry is { id: string; bounds: Bounds } => entry.bounds !== undefined);
    if (connectedShapes.length === 0) continue;

    const participantBounds = group.participantId ? participantBoundsById.get(group.participantId) : undefined;
    const placedObstacles = Array.from(placedArtifacts.entries()).map(([id, bounds]) => ({ id, bounds }));
    // v5: labels are obstacles and the artifact is judged by its footprint; v0 rules as fallback.
    // Strict rules also require CLEARANCE px of free space (v0 tolerates a 4 px overlap).
    const strict = { obstacles: [...blockingShapes, ...placedObstacles], softObstacles: labelObstacles, weights: WEIGHTS,
      footprintOf: (b: Bounds) => footprint(group.artifact, b), ownLabel: true, clearance: CLEARANCE,
      dims: artifactDimsFor(group.artifact), // v5: annotations fit their text
      // v5: flows and associations already drawn: the footprint avoids them, a route crossing them counts.
      lines: [...controlEdgeSegments, ...placedAssociationSegments], countLineCrossings: true,
      ringFactor: STRICT_RING_FACTOR };
    const legacy = { obstacles: [...blockingShapes, ...placedObstacles], footprintOf: (b: Bounds) => b, ownLabel: false,
      dims: artifactDims(group.artifact.$type), lines: controlEdgeSegments, countLineCrossings: false, ringFactor: 1,
      softObstacles: [] as Array<{ id: string; bounds: Bounds }>, weights: undefined };


    // v5: preference = inside the pool with strict rules > inside with v0 rules > outside (strict, then v0).
    const searches = [strict, legacy].map((rules) => {
      let best: ArtifactCandidate | undefined;
      let relaxedBest: ArtifactCandidate | undefined;
      const candidateBounds = generateCandidateBounds(
        group.artifact.$type,
        rules.dims,
        connectedShapes.map((shape) => shape.bounds),
        participantBounds,
        rules.ringFactor,
      );
      for (const bounds of candidateBounds) {
        const candidate = evaluateCandidate(
          bounds,
          group,
          connectedShapes,
          participantBounds,
          rules.obstacles,
          rules.lines,
          rules,
        );
        if (!candidate) continue;
        if (candidate.insideParticipant) {
          if (!best || compareArtifactCandidates(candidate, best) < 0) best = candidate;
        } else if (!relaxedBest || compareArtifactCandidates(candidate, relaxedBest) < 0) {
          relaxedBest = candidate;
        }
      }
      return { best, relaxedBest };
    });

    const chosen = searches[0].best ?? searches[1].best ?? searches[0].relaxedBest ?? searches[1].relaxedBest;
    if (!chosen) continue;

    placedArtifacts.set(group.artifact.id, strict.footprintOf(chosen.bounds)); // v5
    upsertArtifactShape(moddle, shapeById, pendingPlaneElements, group.artifact, chosen.bounds);
    upsertAssociationEdges(moddle, edgeById, pendingPlaneElements, group.associations, chosen.routes);
    for (const [id, points] of chosen.routes) placedAssociationSegments.push(...edgeSegments(id, points)); // v5
  }

  appendPlaneElements(defs, pendingPlaneElements);

  const { xml } = await moddle.toXML(rootElement, { format: false });
  return xml;
}

function collectPlaneElements(defs: any): PlaneEl[] | undefined {
  const dg = defs.diagrams?.[0];
  return dg?.plane?.planeElement;
}

function appendPlaneElements(defs: any, items: PlaneEl[]): void {
  const dg = defs.diagrams?.[0];
  if (!dg?.plane) return;
  if (!Array.isArray(dg.plane.planeElement)) dg.plane.planeElement = [];
  dg.plane.planeElement.push(...items);
}

function collectParticipantMembership(defs: any): Map<string, string> {
  const participantByElementId = new Map<string, string>();
  const processToParticipantId = new Map<string, string>();

  for (const root of defs.rootElements ?? []) {
    if (root.$type !== "bpmn:Collaboration") continue;
    for (const participant of root.participants ?? []) {
      const processId = participant.processRef?.id;
      if (processId) processToParticipantId.set(processId, participant.id);
    }
  }

  for (const root of defs.rootElements ?? []) {
    if (root.$type !== "bpmn:Process") continue;
    const participantId = processToParticipantId.get(root.id);
    if (!participantId) continue;
    for (const flowElement of root.flowElements ?? []) {
      if (flowElement.id) participantByElementId.set(flowElement.id, participantId);
    }
    for (const artifact of root.artifacts ?? []) {
      if (artifact.id) participantByElementId.set(artifact.id, participantId);
    }
  }

  return participantByElementId;
}

function collectArtifactGroups(defs: any, participantByElementId: Map<string, string>): ArtifactGroup[] {
  const groups = new Map<string, ArtifactGroup>();

  for (const root of defs.rootElements ?? []) {
    if (root.$type !== "bpmn:Process") continue;
    for (const association of root.artifacts ?? []) {
      if (association.$type !== "bpmn:Association") continue;
      const src = association.sourceRef;
      const tgt = association.targetRef;
      if (!src || !tgt) continue;
      const srcIsArtifact = ARTIFACT_TYPES.has(src.$type);
      const tgtIsArtifact = ARTIFACT_TYPES.has(tgt.$type);
      if (srcIsArtifact === tgtIsArtifact) continue;

      const artifact = srcIsArtifact ? src : tgt;
      const attached = srcIsArtifact ? tgt : src;
      const group = groups.get(artifact.id) ?? {
        artifact,
        associations: [],
        attachedNodeIds: [],
        participantId: participantByElementId.get(artifact.id) ?? participantByElementId.get(attached.id),
      };
      group.associations.push(association);
      if (!group.attachedNodeIds.includes(attached.id)) {
        group.attachedNodeIds.push(attached.id);
      }
      groups.set(artifact.id, group);
    }
  }

  return Array.from(groups.values());
}

function compareArtifactGroups(a: ArtifactGroup, b: ArtifactGroup): number {
  const aDims = artifactDims(a.artifact.$type);
  const bDims = artifactDims(b.artifact.$type);
  return (
    b.attachedNodeIds.length - a.attachedNodeIds.length ||
    bDims.width * bDims.height - aDims.width * aDims.height ||
    a.artifact.id.localeCompare(b.artifact.id)
  );
}

function searchConfigForArtifact(artifactType: string): { rings: number; step: number } {
  if (artifactType === "bpmn:DataStoreReference") {
    return { rings: STORE_SEARCH_RINGS, step: STORE_SEARCH_STEP };
  }
  if (artifactType === "bpmn:DataObjectReference") {
    return { rings: DATA_SEARCH_RINGS, step: DATA_SEARCH_STEP };
  }
  return { rings: DEFAULT_SEARCH_RINGS, step: DEFAULT_SEARCH_STEP };
}

function generateCandidateBounds(
  artifactType: string,
  dims: { width: number; height: number },
  attachedBounds: Bounds[],
  participantBounds: Bounds | undefined,
  ringFactor = 1, // v5
): Bounds[] {
  const anchor = unionBounds(attachedBounds);
  const anchorCenter = { x: centerX(anchor), y: centerY(anchor) };
  const candidates = new Map<string, Bounds>();
  const config = searchConfigForArtifact(artifactType);
  const { step } = config;
  const rings = config.rings * ringFactor; // v5

  const addCandidate = (x: number, y: number): void => {
    const bounds = {
      x: Math.round(x),
      y: Math.round(y),
      width: dims.width,
      height: dims.height,
    };
    const key = `${bounds.x},${bounds.y}`;
    if (!candidates.has(key)) candidates.set(key, bounds);
  };

  for (let ring = 0; ring <= rings; ring++) {
    const distance = ARTIFACT_GAP + ring * step;
    addCandidate(anchorCenter.x - dims.width / 2, anchor.y - dims.height - distance);
    addCandidate(anchorCenter.x - dims.width / 2, anchor.y + anchor.height + distance);
    addCandidate(anchor.x - dims.width - distance, anchorCenter.y - dims.height / 2);
    addCandidate(anchor.x + anchor.width + distance, anchorCenter.y - dims.height / 2);
    addCandidate(anchor.x - dims.width - distance, anchor.y - dims.height - distance);
    addCandidate(anchor.x + anchor.width + distance, anchor.y - dims.height - distance);
    addCandidate(anchor.x - dims.width - distance, anchor.y + anchor.height + distance);
    addCandidate(anchor.x + anchor.width + distance, anchor.y + anchor.height + distance);

    for (let dx = -ring; dx <= ring; dx++) {
      for (let dy = -ring; dy <= ring; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        addCandidate(
          anchorCenter.x - dims.width / 2 + dx * step,
          anchorCenter.y - dims.height / 2 + dy * step,
        );
      }
    }
  }

  if (attachedBounds.length >= 2) {
    const centroid = averageCenter(attachedBounds);
    for (let ring = 0; ring <= rings; ring++) {
      const distance = ARTIFACT_GAP + ring * step;
      addCandidate(centroid.x - dims.width / 2, centroid.y - dims.height / 2 - distance);
      addCandidate(centroid.x - dims.width / 2, centroid.y - dims.height / 2 + distance);
      addCandidate(centroid.x - dims.width / 2 - distance, centroid.y - dims.height / 2);
      addCandidate(centroid.x - dims.width / 2 + distance, centroid.y - dims.height / 2);
    }
  }

  if (attachedBounds.length === 2) {
    const a = centerPoint(attachedBounds[0]);
    const b = centerPoint(attachedBounds[1]);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const normal = { x: -dy / len, y: dx / len };
    const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    for (let ring = 0; ring <= rings; ring++) {
      const distance = dims.height / 2 + ARTIFACT_GAP + ring * step;
      addCandidate(
        midpoint.x + normal.x * distance - dims.width / 2,
        midpoint.y + normal.y * distance - dims.height / 2,
      );
      addCandidate(
        midpoint.x - normal.x * distance - dims.width / 2,
        midpoint.y - normal.y * distance - dims.height / 2,
      );
    }
  }

  if (participantBounds) {
    addCandidate(participantBounds.x + HEADER_W + PARTICIPANT_INSET, anchorCenter.y - dims.height / 2);
    addCandidate(
      participantBounds.x + participantBounds.width - dims.width - PARTICIPANT_INSET,
      anchorCenter.y - dims.height / 2,
    );
    addCandidate(anchorCenter.x - dims.width / 2, participantBounds.y + PARTICIPANT_INSET);
    addCandidate(
      anchorCenter.x - dims.width / 2,
      participantBounds.y + participantBounds.height - dims.height - PARTICIPANT_INSET,
    );
  }

  return Array.from(candidates.values());
}

function evaluateCandidate(
  bounds: Bounds,
  group: ArtifactGroup,
  connectedShapes: Array<{ id: string; bounds: Bounds }>,
  participantBounds: Bounds | undefined,
  obstacleShapes: Array<{ id: string; bounds: Bounds }>,
  lines: EdgeSegment[], // v5: rules.lines (v0: control edges only)
  rules: { footprintOf: (b: Bounds) => Bounds; ownLabel: boolean; clearance?: number; countLineCrossings: boolean;
    softObstacles: Array<{ id: string; bounds: Bounds }>; weights?: Weights }, // v5
): ArtifactCandidate | undefined {
  const area = rules.footprintOf(bounds); // v5: shape + its name
  const insideParticipant = participantBounds ? withinParticipantInterior(area, participantBounds) : true; // v5: footprint
  if (participantBounds && !insideParticipant && farOutsideParticipant(bounds, participantBounds)) {
    return undefined;
  }
  const blocks = (b: Bounds) => (rules.clearance === undefined
    ? boxesOverlap(area, b, 4) // v0
    : boxesOverlap(expandBounds(area, rules.clearance), b, 0));
  if (obstacleShapes.some((shape) => blocks(shape.bounds))) {
    return undefined;
  }
  if (lines.some((segment) => segmentIntersectsRect(segment.a, segment.b, expandBounds(area, 4), 0))) {
    return undefined;
  }

  // v5: labels are soft obstacles: covering one, or leaving through the artifact's own name, costs.
  const labelOverlaps = rules.softObstacles.filter((label) => boxesOverlap(area, label.bounds, 0)).length;
  const ownLabel = rules.ownLabel ? dataLabelBounds(group.artifact, bounds) : undefined;
  const softRouteBlockers = ownLabel ? [...rules.softObstacles, { id: "#own-label", bounds: ownLabel }] : rules.softObstacles;
  const routeBlockers = obstacleShapes;

  const routes = new Map<string, Pt[]>();
  let crossings = 0;
  let lineCrossings = 0; // v5
  let labelCrossings = 0; // v5
  let bends = 0;
  let totalLength = 0;

  for (const association of group.associations) {
    const otherId =
      association.sourceRef?.id === group.artifact.id
        ? association.targetRef?.id
        : association.sourceRef?.id;
    const otherShape = connectedShapes.find((shape) => shape.id === otherId);
    if (!otherShape) return undefined;

    const route = bestLeaderRoute(
      association.sourceRef?.id === group.artifact.id ? bounds : otherShape.bounds,
      association.sourceRef?.id === group.artifact.id ? otherShape.bounds : bounds,
      routeBlockers.filter((shape) => shape.id !== otherId),
      rules.countLineCrossings ? lines : [], // v5
      softRouteBlockers, // the linked node's own label counts too: the route should leave by another side
      rules.weights,
    );
    routes.set(association.id, route.points);
    crossings += route.crossings;
    lineCrossings += route.lineCrossings; // v5
    labelCrossings += route.labelCrossings; // v5
    bends += route.bends;
    totalLength += route.length;
  }

  const crowding = obstacleShapes.filter((shape) => boxesOverlap(expandBounds(area, CROWDED_MARGIN), shape.bounds, 0)).length; // v5: footprint

  return {
    bounds,
    routes,
    insideParticipant,
    score: {
      crossings,
      lineCrossings,
      bends,
      totalLength,
      crowding,
    },
    cost: rules.weights && (rules.weights.shapeCrossing * crossings + rules.weights.lineCrossing * lineCrossings
      + rules.weights.labelCrossing * labelCrossings + rules.weights.bend * bends + totalLength + rules.weights.labelOverlap * labelOverlaps
      + rules.weights.crowding * crowding), // v5
  };
}

function compareArtifactCandidates(a: ArtifactCandidate, b: ArtifactCandidate): number {
  if (a.cost !== undefined && b.cost !== undefined) { // v5: strict rules
    return Number(b.insideParticipant) - Number(a.insideParticipant) || a.cost - b.cost
      || a.bounds.y - b.bounds.y || a.bounds.x - b.bounds.x;
  }
  return (
    Number(b.insideParticipant) - Number(a.insideParticipant) ||
    a.score.crossings - b.score.crossings ||
    a.score.lineCrossings - b.score.lineCrossings || // v5
    a.score.bends - b.score.bends ||
    a.score.crowding - b.score.crowding ||
    a.score.totalLength - b.score.totalLength ||
    a.bounds.y - b.bounds.y ||
    a.bounds.x - b.bounds.x
  );
}

function upsertArtifactShape(
  moddle: BpmnModdle,
  shapeById: Map<string, ShapeNode>,
  pending: PlaneEl[],
  artifact: any,
  bounds: Bounds,
): void {
  const existing = shapeById.get(artifact.id);
  if (existing) {
    existing.bounds = makeBounds(moddle, bounds);
    return;
  }
  const created = makeShape(moddle, artifact, bounds);
  shapeById.set(artifact.id, created);
  pending.push(created);
}

function upsertAssociationEdges(
  moddle: BpmnModdle,
  edgeById: Map<string, EdgeNode>,
  pending: PlaneEl[],
  associations: any[],
  routes: Map<string, Pt[]>,
): void {
  for (const association of associations) {
    const points = routes.get(association.id);
    if (!points) continue;
    const existing = edgeById.get(association.id);
    if (existing) {
      existing.waypoint = points.map((point) =>
        moddle.create("dc:Point", { x: point.x, y: point.y }) as unknown as { $type: string; x: number; y: number },
      );
      continue;
    }
    const created = makeEdge(moddle, association, points);
    edgeById.set(association.id, created);
    pending.push(created);
  }
}

function bestLeaderRoute(
  srcBounds: Bounds,
  tgtBounds: Bounds,
  obstacles: Array<{ id: string; bounds: Bounds }>,
  lines: EdgeSegment[] = [], // v5: drawn lines a route should not cross
  softObstacles: Array<{ id: string; bounds: Bounds }> = [], // v5: labels a route should not cross
  weights?: Weights, // v5
): ArtifactRoute {
  const sourceSides = preferredLeaderSides(srcBounds, tgtBounds);
  const targetSides = preferredLeaderSides(tgtBounds, srcBounds);
  let best: ArtifactRoute | undefined;

  for (const sourceSide of sourceSides) {
    for (const targetSide of targetSides) {
      const start = portPoint(srcBounds, sourceSide);
      const end = portPoint(tgtBounds, targetSide);
      const routeCandidates = [
        [start, end],
        [start, { x: start.x, y: end.y }, end],
        [start, { x: end.x, y: start.y }, end],
      ];

      for (const rawRoute of routeCandidates) {
        const points = compactPoints(rawRoute);
        const route: ArtifactRoute = {
          points,
          bends: Math.max(0, points.length - 2),
          length: totalLength(points),
          crossings: countRouteCrossings(points, obstacles),
          lineCrossings: countLineCrossings(points, lines), // v5
          labelCrossings: countRouteCrossings(points, softObstacles), // v5
        };
        if (!best || compareRoutes(route, best, weights) < 0) best = route;
      }
    }
  }

  return best ?? {
    points: [centerPoint(srcBounds), centerPoint(tgtBounds)],
    bends: 0,
    length: Math.hypot(centerX(tgtBounds) - centerX(srcBounds), centerY(tgtBounds) - centerY(srcBounds)),
    crossings: obstacles.length,
    lineCrossings: 0,
    labelCrossings: 0,
  };
}

function compareRoutes(a: ArtifactRoute, b: ArtifactRoute, weights?: Weights): number {
  if (weights) { // v5
    const cost = (r: ArtifactRoute) => weights.shapeCrossing * r.crossings + weights.lineCrossing * r.lineCrossings
      + weights.labelCrossing * r.labelCrossings + weights.bend * r.bends + r.length;
    return cost(a) - cost(b) || a.points.length - b.points.length;
  }
  return a.crossings - b.crossings || a.bends - b.bends || a.length - b.length || a.points.length - b.points.length;
}

function preferredLeaderSides(srcBounds: Bounds, tgtBounds: Bounds): Array<"left" | "right" | "top" | "bottom"> {
  const dx = centerX(tgtBounds) - centerX(srcBounds);
  const dy = centerY(tgtBounds) - centerY(srcBounds);

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? ["right", "top", "bottom", "left"] : ["left", "top", "bottom", "right"];
  }
  return dy >= 0 ? ["bottom", "right", "left", "top"] : ["top", "right", "left", "bottom"];
}

// v5: proper crossings between a route and drawn lines (touching ends do not count).
function countLineCrossings(points: Pt[], lines: EdgeSegment[]): number {
  let crossings = 0;
  for (const line of lines) {
    for (let i = 0; i < points.length - 1; i++) {
      if (segmentsCross(points[i], points[i + 1], line.a, line.b)) {
        crossings++;
        break;
      }
    }
  }
  return crossings;
}

function segmentsCross(p1: Pt, p2: Pt, q1: Pt, q2: Pt): boolean {
  const orient = (a: Pt, b: Pt, c: Pt) => Math.sign((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));
  const d1 = orient(q1, q2, p1);
  const d2 = orient(q1, q2, p2);
  const d3 = orient(p1, p2, q1);
  const d4 = orient(p1, p2, q2);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

function countRouteCrossings(points: Pt[], obstacles: Array<{ id: string; bounds: Bounds }>): number {
  let crossings = 0;
  for (const obstacle of obstacles) {
    let hit = false;
    for (let i = 0; i < points.length - 1; i++) {
      if (segmentIntersectsRect(points[i], points[i + 1], obstacle.bounds, 3)) {
        hit = true;
        break;
      }
    }
    if (hit) crossings++;
  }
  return crossings;
}

function withinParticipantInterior(bounds: Bounds, participant: Bounds): boolean {
  const left = participant.x + HEADER_W + PARTICIPANT_INSET;
  const right = participant.x + participant.width - PARTICIPANT_INSET;
  const top = participant.y + PARTICIPANT_INSET;
  const bottom = participant.y + participant.height - PARTICIPANT_INSET;
  return (
    bounds.x >= left &&
    bounds.y >= top &&
    bounds.x + bounds.width <= right &&
    bounds.y + bounds.height <= bottom
  );
}

function farOutsideParticipant(bounds: Bounds, participant: Bounds): boolean {
  const margin = STORE_SEARCH_STEP * 2;
  return (
    bounds.x + bounds.width < participant.x - margin ||
    bounds.x > participant.x + participant.width + margin ||
    bounds.y + bounds.height < participant.y - margin ||
    bounds.y > participant.y + participant.height + margin
  );
}

function unionBounds(items: Bounds[]): Bounds {
  return {
    x: Math.min(...items.map((item) => item.x)),
    y: Math.min(...items.map((item) => item.y)),
    width: Math.max(...items.map((item) => item.x + item.width)) - Math.min(...items.map((item) => item.x)),
    height: Math.max(...items.map((item) => item.y + item.height)) - Math.min(...items.map((item) => item.y)),
  };
}

function averageCenter(items: Bounds[]): Pt {
  return {
    x: items.reduce((sum, item) => sum + centerX(item), 0) / items.length,
    y: items.reduce((sum, item) => sum + centerY(item), 0) / items.length,
  };
}

function centerPoint(bounds: Bounds): Pt {
  return { x: centerX(bounds), y: centerY(bounds) };
}

function centerX(bounds: Bounds): number {
  return bounds.x + bounds.width / 2;
}

function centerY(bounds: Bounds): number {
  return bounds.y + bounds.height / 2;
}

function portPoint(bounds: Bounds, side: "left" | "right" | "top" | "bottom"): Pt {
  if (side === "left") return { x: bounds.x, y: centerY(bounds) };
  if (side === "right") return { x: bounds.x + bounds.width, y: centerY(bounds) };
  if (side === "top") return { x: centerX(bounds), y: bounds.y };
  return { x: centerX(bounds), y: bounds.y + bounds.height };
}

function boxesOverlap(a: Bounds, b: Bounds, pad: number): boolean {
  return !(
    a.x + a.width <= b.x + pad ||
    b.x + b.width <= a.x + pad ||
    a.y + a.height <= b.y + pad ||
    b.y + b.height <= a.y + pad
  );
}

function expandBounds(bounds: Bounds, by: number): Bounds {
  return {
    x: bounds.x - by,
    y: bounds.y - by,
    width: bounds.width + by * 2,
    height: bounds.height + by * 2,
  };
}

function segmentIntersectsRect(a: Pt, b: Pt, bounds: Bounds, inset: number): boolean {
  const left = bounds.x + inset;
  const right = bounds.x + bounds.width - inset;
  const top = bounds.y + inset;
  const bottom = bounds.y + bounds.height - inset;

  let t0 = 0;
  let t1 = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  const clips: Array<[number, number]> = [
    [-dx, a.x - left],
    [dx, right - a.x],
    [-dy, a.y - top],
    [dy, bottom - a.y],
  ];

  for (const [p, q] of clips) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const r = q / p;
    if (p < 0) {
      if (r > t1) return false;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return false;
      if (r < t1) t1 = r;
    }
  }

  return t1 > t0;
}

function compactPoints(points: Pt[]): Pt[] {
  const deduped: Pt[] = [];
  for (const point of points) {
    const last = deduped[deduped.length - 1];
    if (!last || last.x !== point.x || last.y !== point.y) {
      deduped.push({ x: Math.round(point.x), y: Math.round(point.y) });
    }
  }
  return deduped;
}

function edgeSegments(edgeId: string, waypoint: Array<{ x: number; y: number }>): EdgeSegment[] {
  const segments: EdgeSegment[] = [];
  for (let i = 0; i < waypoint.length - 1; i++) {
    segments.push({
      edgeId,
      a: { x: waypoint[i].x, y: waypoint[i].y },
      b: { x: waypoint[i + 1].x, y: waypoint[i + 1].y },
    });
  }
  return segments;
}

function totalLength(points: Pt[]): number {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
  }
  return total;
}

// v5: sizes and label boxes of what bpmn-js draws.
function artifactDimsFor(artifact: any): { width: number; height: number } {
  const dims = artifactDims(artifact.$type);
  if (artifact.$type !== "bpmn:TextAnnotation") return dims;
  const text = String(artifact.text ?? "");
  const lines = text.split("\n").reduce((n, line) => n + Math.max(1, Math.ceil((line.length * CHAR_W) / ANNOTATION_TEXT_W)), 0);
  return { width: dims.width, height: Math.max(dims.height, lines * LABEL_LINE_H + ANNOTATION_PAD_Y) };
}

/** External name box under a shape, as bpmn-js lays it out (estimate). */
function labelBoxUnder(bounds: Bounds, name: unknown): Bounds | undefined {
  const text = String(name ?? "").trim();
  if (!text) return undefined;
  const width = Math.min(LABEL_MAX_W, text.length * CHAR_W);
  const lines = Math.max(1, Math.ceil((text.length * CHAR_W) / LABEL_MAX_W));
  return { x: centerX(bounds) - width / 2, y: bounds.y + bounds.height, width, height: lines * LABEL_LINE_H };
}

function dataLabelBounds(artifact: any, bounds: Bounds): Bounds | undefined {
  return DATA_REF_TYPES.has(artifact.$type) ? labelBoxUnder(bounds, artifact.name) : undefined;
}

function footprint(artifact: any, bounds: Bounds): Bounds {
  const label = dataLabelBounds(artifact, bounds);
  return label ? unionBounds([bounds, label]) : bounds;
}

function externalLabelBounds(el: any): Bounds | undefined {
  if (el.label?.bounds) return el.label.bounds;
  const ref = el.bpmnElement;
  return ref && EXTERNAL_LABEL.test(ref.$type) ? labelBoxUnder(el.bounds, ref.name) : undefined;
}

function artifactDims($type: string): { width: number; height: number } {
  if ($type === "bpmn:DataStoreReference") return { width: STORE_W, height: STORE_H };
  if ($type === "bpmn:TextAnnotation") return { width: ANNOTATION_W, height: ANNOTATION_H };
  return { width: DATA_W, height: DATA_H };
}

function makeBounds(moddle: BpmnModdle, bounds: Bounds): Bounds {
  return moddle.create("dc:Bounds", { ...bounds }) as unknown as Bounds;
}

function makeShape(moddle: BpmnModdle, bpmnElement: any, bounds: Bounds): ShapeNode {
  return moddle.create("bpmndi:BPMNShape", {
    id: `${bpmnElement.id}_di`,
    bpmnElement,
    bounds: makeBounds(moddle, bounds),
  }) as unknown as ShapeNode;
}

function makeEdge(moddle: BpmnModdle, bpmnElement: any, waypoint: Pt[]): EdgeNode {
  return moddle.create("bpmndi:BPMNEdge", {
    id: `${bpmnElement.id}_di`,
    bpmnElement,
    waypoint: waypoint.map((point) =>
      moddle.create("dc:Point", { x: point.x, y: point.y }) as unknown as { $type: string; x: number; y: number },
    ),
  }) as unknown as EdgeNode;
}
