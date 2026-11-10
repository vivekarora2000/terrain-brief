export const SCHEMA_VERSION = '1.0.0';
export const WORLD_SCALE = 0.008;
export const ELEVATION_SCALE = 0.02;

export type Point2 = [number, number];
export type Provenance = 'explicit' | 'assumed' | 'computed';
export type FeatureType = 'village' | 'farm' | 'clearing' | 'bridge' | 'truck' | 'landmark';
export type Surface = 'graded track' | 'farm track' | 'timber bridge' | 'stone bridge';

export interface Feature {
  id: string;
  type: FeatureType;
  name: string;
  position: Point2;
  description: string;
  provenance: Provenance;
}

export interface RoadNode { id: string; position: Point2; }
export interface RoadEdge {
  id: string;
  name: string;
  from: string;
  to: string;
  points: Point2[];
  surface: Surface;
  widthM: number;
  bridgeId?: 'main-bridge' | 'east-bridge';
  capacityT?: number;
  clearanceM?: number;
  knownRestrictions: string[];
  unknownAttributes: string[];
}

export interface VehicleProfile {
  widthM: number;
  heightM: number;
  weightT: number;
  maxGradePercent: number;
}

export interface SceneDocument {
  schemaVersion: string;
  sceneId: string;
  title: string;
  revision: number;
  seed: number;
  coordinateSystem: { horizontal: string; vertical: string; units: 'meters'; origin: string };
  terrain: { widthM: number; depthM: number; gridSize: number; nearDistanceM: number; verticalExaggeration: number };
  features: Feature[];
  constraints: Array<{ id: string; type: string; description: string }>;
  nodes: RoadNode[];
  edges: RoadEdge[];
  bridgeStatus: Record<'main-bridge' | 'east-bridge', boolean>;
  vehicle: VehicleProfile;
  selectedDestination: string | null;
  cameraBookmarks: Record<string, { label: string; position: [number, number, number]; target: [number, number, number] }>;
  assumptions: string[];
  provenance: { source: string; generatedAt: string };
}

export interface ElevationSample { distanceM: number; elevationM: number; gradePercent: number; point: Point2; }
export interface ConstraintCheck { label: string; status: 'pass' | 'review' | 'fail'; detail: string; }
export interface RouteResult {
  id: string;
  status: 'candidate' | 'review' | 'none';
  edgeIds: string[];
  geometry: Point2[];
  distanceM: number;
  maxGradePercent: number;
  elevation: ElevationSample[];
  checks: ConstraintCheck[];
  unknowns: string[];
  reason?: string;
}

const features: Feature[] = [
  { id: 'village', type: 'village', name: 'Aster Village', position: [-720, -650], description: 'A compact southwest village beside the lower track.', provenance: 'explicit' },
  { id: 'truck', type: 'truck', name: 'Relief truck', position: [-690, -625], description: 'A small civilian supply truck carrying relief goods.', provenance: 'explicit' },
  { id: 'farm', type: 'farm', name: 'North Farm', position: [-260, 560], description: 'Cultivated green plots north of the river.', provenance: 'explicit' },
  { id: 'clearing', type: 'clearing', name: 'Ridge Clearing', position: [700, 230], description: 'An open pad halfway up the eastern ridge.', provenance: 'explicit' },
  { id: 'main-bridge', type: 'bridge', name: 'Main Bridge', position: [-260, -350], description: 'The direct stone crossing on the primary track.', provenance: 'assumed' },
  { id: 'east-bridge', type: 'bridge', name: 'East Bridge', position: [430, -350], description: 'A longer timber crossing with unverified load capacity.', provenance: 'assumed' },
  { id: 'ridge', type: 'landmark', name: 'Eastern Ridge', position: [710, 320], description: 'Prominent high ground on the eastern side of the model.', provenance: 'computed' },
];

const nodes: RoadNode[] = [
  { id: 'village-node', position: [-690, -625] },
  { id: 'west-split', position: [-470, -520] },
  { id: 'main-south', position: [-280, -455] },
  { id: 'main-north', position: [-245, -235] },
  { id: 'east-south', position: [405, -465] },
  { id: 'east-north', position: [450, -230] },
  { id: 'center', position: [80, -70] },
  { id: 'farm-node', position: [-250, 540] },
  { id: 'ridge-base', position: [500, 80] },
  { id: 'clearing-node', position: [700, 230] },
];

const edges: RoadEdge[] = [
  { id: 'village-track', name: 'Village approach', from: 'village-node', to: 'west-split', points: [[-690,-625],[-590,-590],[-470,-520]], surface: 'graded track', widthM: 4.6, knownRestrictions: [], unknownAttributes: [] },
  { id: 'main-approach', name: 'Main approach', from: 'west-split', to: 'main-south', points: [[-470,-520],[-375,-485],[-280,-455]], surface: 'graded track', widthM: 4.2, knownRestrictions: [], unknownAttributes: [] },
  { id: 'main-bridge-edge', name: 'Main Bridge', from: 'main-south', to: 'main-north', points: [[-280,-455],[-270,-350],[-245,-235]], surface: 'stone bridge', widthM: 3.8, bridgeId: 'main-bridge', capacityT: 12, clearanceM: 3.9, knownRestrictions: ['Single lane'], unknownAttributes: [] },
  { id: 'main-center', name: 'Orchard track', from: 'main-north', to: 'center', points: [[-245,-235],[-110,-155],[80,-70]], surface: 'farm track', widthM: 3.7, knownRestrictions: [], unknownAttributes: [] },
  { id: 'alternate-south', name: 'Lower valley track', from: 'west-split', to: 'east-south', points: [[-470,-520],[-200,-565],[120,-540],[405,-465]], surface: 'graded track', widthM: 4.0, knownRestrictions: ['Seasonal dust'], unknownAttributes: [] },
  { id: 'east-bridge-edge', name: 'East Bridge', from: 'east-south', to: 'east-north', points: [[405,-465],[430,-350],[450,-230]], surface: 'timber bridge', widthM: 3.5, bridgeId: 'east-bridge', clearanceM: 3.5, knownRestrictions: ['Single lane'], unknownAttributes: ['Load capacity not documented'] },
  { id: 'east-center', name: 'East bank track', from: 'east-north', to: 'center', points: [[450,-230],[300,-145],[80,-70]], surface: 'farm track', widthM: 3.8, knownRestrictions: [], unknownAttributes: [] },
  { id: 'center-ridge', name: 'Ridge approach', from: 'center', to: 'ridge-base', points: [[80,-70],[230,-5],[380,35],[500,80]], surface: 'graded track', widthM: 3.8, knownRestrictions: ['Steep final bend'], unknownAttributes: [] },
  { id: 'ridge-clearing', name: 'Clearing climb', from: 'ridge-base', to: 'clearing-node', points: [[500,80],[565,115],[625,165],[700,230]], surface: 'graded track', widthM: 3.6, knownRestrictions: ['Sustained grade'], unknownAttributes: [] },
  { id: 'farm-spur', name: 'Farm spur', from: 'center', to: 'farm-node', points: [[80,-70],[-35,100],[-120,310],[-250,540]], surface: 'farm track', widthM: 3.4, knownRestrictions: [], unknownAttributes: ['Wet-weather condition'] },
];

export function createSeedScene(): SceneDocument {
  return {
    schemaVersion: SCHEMA_VERSION,
    sceneId: 'hillside-relief-delivery',
    title: 'Hillside Relief Delivery',
    revision: 1,
    seed: 1847,
    coordinateSystem: { horizontal: 'x=east, y=north', vertical: 'elevation above local datum', units: 'meters', origin: 'scene center; no geographic coordinates' },
    terrain: { widthM: 2000, depthM: 2000, gridSize: 81, nearDistanceM: 250, verticalExaggeration: 1.5 },
    features: features.map((item) => ({ ...item, position: [...item.position] })),
    constraints: [
      { id: 'farm-north', type: 'north_of', description: 'North Farm remains north of the river corridor.' },
      { id: 'clearing-ridge', type: 'near', description: 'Ridge Clearing remains within 260 m of Eastern Ridge.' },
      { id: 'village-river', type: 'south_of', description: 'Aster Village remains south of the river corridor.' },
    ],
    nodes: nodes.map((item) => ({ ...item, position: [...item.position] })),
    edges: edges.map((item) => ({ ...item, points: item.points.map((p) => [...p]) })),
    bridgeStatus: { 'main-bridge': true, 'east-bridge': true },
    vehicle: { widthM: 2.5, heightM: 3.2, weightT: 8.5, maxGradePercent: 22 },
    selectedDestination: null,
    cameraBookmarks: {
      overview: { label: 'Overview', position: [11, 11, 13], target: [0, 0, 0] },
      village: { label: 'Village', position: [-7, 4.2, 1], target: [-5.6, 0.6, 5] },
      clearing: { label: 'Clearing', position: [8.5, 5.2, -0.5], target: [5.6, 1.5, -1.8] },
    },
    assumptions: [
      'Terrain and road geometry are synthetic and illustrative.',
      'Configured vehicle limits are not manufacturer-verified.',
      'East Bridge load capacity is unknown and requires review.',
      'Visibility analysis considers terrain only.',
    ],
    provenance: { source: 'Terrain Brief deterministic demonstration adapter', generatedAt: '2026-01-01T00:00:00Z' },
  };
}

export function heightAt(eastM: number, northM: number, seed = 1847): number {
  const x = eastM / 1000;
  const n = northM / 1000;
  const seedPhase = (seed % 97) / 97;
  const eastRidge = 93 * Math.exp(-((x - 0.68) ** 2) / 0.11) * (0.82 + 0.18 * Math.cos(n * 5.5));
  const westHills = 38 * Math.exp(-((x + 0.52) ** 2 + (n - 0.18) ** 2) / 0.22);
  const rolling = 19 * Math.sin(x * 3.4 + seedPhase) * Math.cos(n * 3.1) + 8 * Math.sin((x + n) * 7.2);
  const riverCenter = -0.35 + 0.055 * Math.sin(x * 4.1);
  const riverValley = -36 * Math.exp(-((n - riverCenter) ** 2) / 0.06);
  const baseSlope = 22 + 14 * (n + 1) + 5 * (x + 1);
  return Math.max(3, baseSlope + eastRidge + westHills + rolling + riverValley);
}

export function toWorld(point: Point2, liftM = 0): [number, number, number] {
  return [point[0] * WORLD_SCALE, (heightAt(point[0], point[1]) + liftM) * ELEVATION_SCALE, -point[1] * WORLD_SCALE];
}

export function interpolateLine(points: Point2[], spacingM = 25): Point2[] {
  const result: Point2[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const [ax, ay] = points[i];
    const [bx, by] = points[i + 1];
    const length = Math.hypot(bx - ax, by - ay);
    const count = Math.max(1, Math.ceil(length / spacingM));
    for (let step = 0; step < count; step += 1) {
      const t = step / count;
      result.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
    }
  }
  result.push(points.at(-1)!);
  return result;
}

export function edgeMetrics(edge: RoadEdge): { lengthM: number; maxGradePercent: number; samples: ElevationSample[] } {
  const points = interpolateLine(edge.points, 25);
  let distanceM = 0;
  let maxGradePercent = 0;
  const samples: ElevationSample[] = [];
  points.forEach((point, index) => {
    if (index > 0) distanceM += Math.hypot(point[0] - points[index - 1][0], point[1] - points[index - 1][1]);
    const elevationM = heightAt(point[0], point[1]);
    let gradePercent = 0;
    if (index > 0) {
      const horizontal = Math.hypot(point[0] - points[index - 1][0], point[1] - points[index - 1][1]);
      gradePercent = horizontal ? Math.abs((elevationM - heightAt(points[index - 1][0], points[index - 1][1])) / horizontal) * 100 : 0;
      maxGradePercent = Math.max(maxGradePercent, gradePercent);
    }
    samples.push({ distanceM, elevationM, gradePercent, point });
  });
  return { lengthM: distanceM, maxGradePercent, samples };
}

function evaluateEdge(scene: SceneDocument, edge: RoadEdge, mode: 'strict' | 'exploratory') {
  const metrics = edgeMetrics(edge);
  const failures: string[] = [];
  const unknowns = [...edge.unknownAttributes];
  if (edge.bridgeId && !scene.bridgeStatus[edge.bridgeId]) failures.push(`${edge.name} is closed`);
  if (edge.widthM < scene.vehicle.widthM + 0.4) failures.push(`Usable width ${edge.widthM.toFixed(1)} m is below the configured margin`);
  if (edge.capacityT !== undefined && edge.capacityT < scene.vehicle.weightT) failures.push(`Capacity ${edge.capacityT.toFixed(1)} t is below vehicle weight`);
  if (edge.clearanceM !== undefined && edge.clearanceM < scene.vehicle.heightM + 0.2) failures.push(`Clearance ${edge.clearanceM.toFixed(1)} m is below the configured margin`);
  if (metrics.maxGradePercent > scene.vehicle.maxGradePercent) failures.push(`Sampled grade ${metrics.maxGradePercent.toFixed(1)}% exceeds configured ${scene.vehicle.maxGradePercent}%`);
  if (mode === 'strict' && unknowns.length) failures.push('Required attributes are unknown in strict mode');
  return { ...metrics, failures, unknowns };
}

function pathfind(scene: SceneDocument, mode: 'strict' | 'exploratory', excludedEdges = new Set<string>()): RouteResult {
  const start = 'village-node';
  const goal = 'clearing-node';
  const dist = new Map<string, number>([[start, 0]]);
  const previous = new Map<string, { node: string; edge: RoadEdge }>();
  const pending = new Set(scene.nodes.map((n) => n.id));
  while (pending.size) {
    let current: string | undefined;
    let best = Infinity;
    pending.forEach((node) => { const value = dist.get(node) ?? Infinity; if (value < best) { best = value; current = node; } });
    if (!current || best === Infinity) break;
    pending.delete(current);
    if (current === goal) break;
    for (const edge of scene.edges) {
      if (excludedEdges.has(edge.id)) continue;
      const neighbor = edge.from === current ? edge.to : edge.to === current ? edge.from : null;
      if (!neighbor || !pending.has(neighbor)) continue;
      const assessment = evaluateEdge(scene, edge, mode);
      if (assessment.failures.length) continue;
      const penalty = assessment.unknowns.length ? 45 : 0;
      const candidate = best + assessment.lengthM + penalty;
      if (candidate < (dist.get(neighbor) ?? Infinity)) {
        dist.set(neighbor, candidate);
        previous.set(neighbor, { node: current, edge });
      }
    }
  }
  if (!previous.has(goal)) {
    const closed = Object.entries(scene.bridgeStatus).filter(([, open]) => !open).map(([id]) => scene.features.find((f) => f.id === id)?.name).filter(Boolean);
    return { id: 'no-route', status: 'none', edgeIds: [], geometry: [], distanceM: 0, maxGradePercent: 0, elevation: [], checks: [], unknowns: [], reason: closed.length ? `No road route under current constraints. Closed: ${closed.join(', ')}.` : 'No road route satisfies the configured vehicle constraints.' };
  }
  const pathEdges: RoadEdge[] = [];
  let cursor = goal;
  while (cursor !== start) {
    const step = previous.get(cursor)!;
    pathEdges.unshift(step.edge);
    cursor = step.node;
  }
  let nodeCursor = start;
  const orientedPoints: Point2[] = [];
  const unknowns: string[] = [];
  const checks: ConstraintCheck[] = [];
  pathEdges.forEach((edge) => {
    const forward = edge.from === nodeCursor;
    const points = forward ? edge.points : [...edge.points].reverse();
    orientedPoints.push(...(orientedPoints.length ? points.slice(1) : points));
    nodeCursor = forward ? edge.to : edge.from;
    const assessment = evaluateEdge(scene, edge, mode);
    unknowns.push(...assessment.unknowns.map((item) => `${edge.name}: ${item}`));
  });
  const routeSamples = interpolateLine(orientedPoints, 25);
  let distanceM = 0;
  let maxGradePercent = 0;
  const elevation = routeSamples.map((point, index) => {
    if (index > 0) distanceM += Math.hypot(point[0] - routeSamples[index - 1][0], point[1] - routeSamples[index - 1][1]);
    const elevationM = heightAt(point[0], point[1]);
    const horizontal = index > 0 ? Math.hypot(point[0] - routeSamples[index - 1][0], point[1] - routeSamples[index - 1][1]) : 0;
    const gradePercent = horizontal ? Math.abs((elevationM - heightAt(routeSamples[index - 1][0], routeSamples[index - 1][1])) / horizontal) * 100 : 0;
    maxGradePercent = Math.max(maxGradePercent, gradePercent);
    return { distanceM, elevationM, gradePercent, point };
  });
  checks.push({ label: 'Road width', status: 'pass', detail: `All segments preserve at least 0.4 m configured width margin.` });
  checks.push({ label: 'Maximum grade', status: 'pass', detail: `${maxGradePercent.toFixed(1)}% sampled at 25 m intervals; configured limit ${scene.vehicle.maxGradePercent}%.` });
  checks.push({ label: 'Bridge status', status: 'pass', detail: 'All crossings on this candidate are open.' });
  if (unknowns.length) checks.push({ label: 'Unknown attributes', status: 'review', detail: unknowns.join('; ') });
  else checks.push({ label: 'Known clearances', status: 'pass', detail: 'Known bridge clearances and capacities satisfy configured values.' });
  return { id: pathEdges.map((e) => e.id).join(':'), status: unknowns.length ? 'review' : 'candidate', edgeIds: pathEdges.map((e) => e.id), geometry: orientedPoints, distanceM, maxGradePercent, elevation, checks, unknowns };
}

export function computeRoutes(scene: SceneDocument, mode: 'strict' | 'exploratory'): { primary: RouteResult; alternative: RouteResult | null } {
  const primary = pathfind(scene, mode);
  if (primary.status === 'none') return { primary, alternative: null };
  let alternative: RouteResult | null = null;
  for (const edgeId of primary.edgeIds) {
    const candidate = pathfind(scene, mode, new Set([edgeId]));
    if (candidate.status !== 'none' && candidate.id !== primary.id && (!alternative || candidate.distanceM < alternative.distanceM)) alternative = candidate;
  }
  return { primary, alternative };
}

export function validateSceneImport(value: unknown): value is SceneDocument {
  if (!value || typeof value !== 'object') return false;
  const scene = value as Partial<SceneDocument>;
  return scene.schemaVersion === SCHEMA_VERSION && scene.sceneId === 'hillside-relief-delivery' && Array.isArray(scene.features) && Array.isArray(scene.edges) && typeof scene.revision === 'number' && !!scene.vehicle && !!scene.bridgeStatus;
}

export function terrainLineOfSight(a: Point2, b: Point2, aHeightM = 2, bHeightM = 2) {
  const samples = interpolateLine([a, b], 20);
  const start = heightAt(a[0], a[1]) + aHeightM;
  const end = heightAt(b[0], b[1]) + bHeightM;
  for (let i = 1; i < samples.length - 1; i += 1) {
    const t = i / (samples.length - 1);
    const lineHeight = start + (end - start) * t;
    const terrainHeight = heightAt(samples[i][0], samples[i][1]);
    if (terrainHeight > lineHeight) return { visible: false, obstruction: samples[i], clearanceM: lineHeight - terrainHeight };
  }
  return { visible: true, obstruction: null, clearanceM: null };
}
