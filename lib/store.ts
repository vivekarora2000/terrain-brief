import { create } from 'zustand';
import { computeRoutes, createSeedScene, type RouteResult, type SceneDocument, validateSceneImport } from './scene';

export interface BriefMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  detail?: string;
  status?: 'success' | 'review' | 'error';
}

interface Snapshot {
  scene: SceneDocument;
  routeMode: 'strict' | 'exploratory';
}

interface SceneStore {
  scene: SceneDocument;
  routeMode: 'strict' | 'exploratory';
  primaryRoute: RouteResult | null;
  alternativeRoute: RouteResult | null;
  selectedFeatureId: string;
  selectedEdgeId: string | null;
  cameraBookmark: 'overview' | 'village' | 'clearing';
  cameraNonce: number;
  labelsVisible: boolean;
  contoursVisible: boolean;
  presentation: boolean;
  presentationStep: number;
  inspectorVisible: boolean;
  activeMobileTab: 'brief' | 'scene' | 'inspect';
  isThinking: boolean;
  importError: string | null;
  routeHoverIndex: number | null;
  messages: BriefMessage[];
  history: Snapshot[];
  future: Snapshot[];
  runCommand: (input: string) => Promise<void>;
  selectFeature: (id: string) => void;
  selectEdge: (id: string | null) => void;
  setRouteMode: (mode: 'strict' | 'exploratory') => void;
  updateVehicle: (patch: Partial<SceneDocument['vehicle']>) => void;
  setBookmark: (bookmark: 'overview' | 'village' | 'clearing') => void;
  resetCamera: () => void;
  toggleLabels: () => void;
  toggleContours: () => void;
  togglePresentation: () => void;
  nextPresentationStep: (direction: 1 | -1) => void;
  setMobileTab: (tab: 'brief' | 'scene' | 'inspect') => void;
  setInspectorVisible: (visible: boolean) => void;
  setRouteHoverIndex: (index: number | null) => void;
  undo: () => void;
  redo: () => void;
  resetScene: () => void;
  exportScene: () => void;
  importScene: (file: File) => Promise<void>;
  hydrate: () => void;
}

const seed = createSeedScene();
const initialMessage: BriefMessage = {
  id: 'welcome', role: 'assistant', status: 'success',
  text: 'The illustrative scene is ready.',
  detail: 'Ask how the relief truck can reach the ridge clearing, or change one of the supported constraints.',
};

function cloneScene(scene: SceneDocument): SceneDocument {
  return JSON.parse(JSON.stringify(scene)) as SceneDocument;
}

function persistScene(scene: SceneDocument, routeMode: 'strict' | 'exploratory') {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('terrain-brief:scene', JSON.stringify({ scene, routeMode }));
}

function loadPersisted(): Snapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = JSON.parse(window.localStorage.getItem('terrain-brief:scene') ?? 'null');
    return value && validateSceneImport(value.scene) && (value.routeMode === 'strict' || value.routeMode === 'exploratory') ? value : null;
  } catch { return null; }
}

function routeFor(scene: SceneDocument, mode: 'strict' | 'exploratory') {
  if (!scene.selectedDestination) return { primaryRoute: null, alternativeRoute: null };
  const result = computeRoutes(scene, mode);
  return { primaryRoute: result.primary, alternativeRoute: result.alternative };
}

function withEdit(state: SceneStore, edit: (scene: SceneDocument) => void) {
  const previous = cloneScene(state.scene);
  const scene = cloneScene(state.scene);
  edit(scene);
  scene.revision += 1;
  const routes = routeFor(scene, state.routeMode);
  persistScene(scene, state.routeMode);
  return { scene, ...routes, history: [...state.history.slice(-19), { scene: previous, routeMode: state.routeMode }], future: [] };
}

export const useSceneStore = create<SceneStore>((set, get) => {
  const scene = seed;
  const routeMode = 'exploratory' as const;
  const routes = routeFor(scene, routeMode);
  return {
    scene, routeMode, ...routes,
    selectedFeatureId: 'clearing', selectedEdgeId: null, cameraBookmark: 'overview', cameraNonce: 0,
    labelsVisible: true, contoursVisible: false, presentation: false, presentationStep: 0, inspectorVisible: true,
    activeMobileTab: 'scene', isThinking: false, importError: null, routeHoverIndex: null,
    messages: [initialMessage], history: [], future: [],

    runCommand: async (rawInput) => {
      const input = rawInput.trim();
      if (!input) return;
      set((state) => ({ messages: [...state.messages, { id: crypto.randomUUID(), role: 'user', text: input }], isThinking: true }));
      await new Promise((resolve) => setTimeout(resolve, 420));
      const normalized = input.toLowerCase().replace(/[?.!]/g, '').trim();
      const state = get();
      let response: BriefMessage;
      if (normalized.includes('move') && normalized.includes('farm') && normalized.includes('north')) {
        set((current) => withEdit(current, (next) => {
          const farm = next.features.find((feature) => feature.id === 'farm')!;
          farm.position = [farm.position[0], Math.min(820, farm.position[1] + 180)];
          farm.provenance = 'explicit';
          const node = next.nodes.find((item) => item.id === 'farm-node')!;
          node.position = [...farm.position];
          const edge = next.edges.find((item) => item.id === 'farm-spur')!;
          edge.points[edge.points.length - 1] = [...farm.position];
        }));
        response = { id: crypto.randomUUID(), role: 'assistant', status: 'success', text: 'Moved North Farm 180 m farther north.', detail: 'Its explicit north-of-river constraint remains satisfied. The farm spur endpoint was recomputed.' };
      } else if (normalized.includes('close') && normalized.includes('main bridge')) {
        if (!state.scene.bridgeStatus['main-bridge']) response = { id: crypto.randomUUID(), role: 'assistant', text: 'Main Bridge is already closed.', detail: 'No scene revision was created.' };
        else {
          set((current) => withEdit(current, (next) => { next.bridgeStatus['main-bridge'] = false; next.selectedDestination = 'clearing'; }));
          const rerouted = computeRoutes({ ...state.scene, bridgeStatus: { ...state.scene.bridgeStatus, 'main-bridge': false }, selectedDestination: 'clearing' }, state.routeMode).primary;
          response = { id: crypto.randomUUID(), role: 'assistant', status: rerouted.status === 'review' ? 'review' : 'success', text: 'Closed Main Bridge and recomputed the road route.', detail: rerouted.status === 'review' ? 'The candidate now uses East Bridge. Its load capacity is unknown, so the route requires review.' : 'The route now uses the longer eastern crossing.' };
        }
      } else if (normalized.includes('reopen') && normalized.includes('main bridge')) {
        if (state.scene.bridgeStatus['main-bridge']) response = { id: crypto.randomUUID(), role: 'assistant', text: 'Main Bridge is already open.', detail: 'No scene revision was created.' };
        else {
          set((current) => withEdit(current, (next) => { next.bridgeStatus['main-bridge'] = true; next.selectedDestination = 'clearing'; }));
          response = { id: crypto.randomUUID(), role: 'assistant', status: 'success', text: 'Reopened Main Bridge.', detail: 'The shorter primary candidate has been restored and checked against the current vehicle profile.' };
        }
      } else if ((normalized.includes('how') || normalized.includes('route')) && normalized.includes('truck') && normalized.includes('clearing')) {
        set((current) => withEdit(current, (next) => { next.selectedDestination = 'clearing'; }));
        const result = computeRoutes({ ...state.scene, selectedDestination: 'clearing' }, state.routeMode).primary;
        response = result.status === 'none'
          ? { id: crypto.randomUUID(), role: 'assistant', status: 'error', text: 'No route under current constraints.', detail: result.reason }
          : { id: crypto.randomUUID(), role: 'assistant', status: result.status === 'review' ? 'review' : 'success', text: result.status === 'review' ? 'Found a candidate route that requires review.' : 'Found a candidate under current assumptions.', detail: `${(result.distanceM / 1000).toFixed(2)} km via ${result.edgeIds.includes('main-bridge-edge') ? 'Main Bridge' : 'East Bridge'} · maximum sampled grade ${result.maxGradePercent.toFixed(1)}%.` };
      } else if (normalized.includes('view') && normalized.includes('village')) {
        set({ cameraBookmark: 'village', cameraNonce: state.cameraNonce + 1, activeMobileTab: 'scene' });
        response = { id: crypto.randomUUID(), role: 'assistant', status: 'success', text: 'Showing the village viewpoint.', detail: 'Camera position changed; scene geometry is unchanged.' };
      } else if (normalized.includes('reset') && normalized.includes('scene')) {
        get().resetScene();
        response = { id: crypto.randomUUID(), role: 'assistant', status: 'success', text: 'Reset Hillside Relief Delivery.', detail: 'Restored the seeded terrain, feature positions, bridge states, and vehicle profile.' };
      } else {
        response = { id: crypto.randomUUID(), role: 'assistant', status: 'error', text: 'That edit is not supported in this first release.', detail: 'Try moving the farm north, computing the truck route, changing the main bridge status, changing the camera, or resetting the scene.' };
      }
      set((current) => ({ messages: [...current.messages, response], isThinking: false }));
    },

    selectFeature: (id) => set({ selectedFeatureId: id, selectedEdgeId: null, inspectorVisible: true, activeMobileTab: 'inspect' }),
    selectEdge: (id) => set({ selectedEdgeId: id, inspectorVisible: id ? true : get().inspectorVisible, activeMobileTab: 'inspect' }),
    setRouteMode: (mode) => set((state) => {
      const snapshot = { scene: cloneScene(state.scene), routeMode: state.routeMode };
      const routes = routeFor(state.scene, mode);
      persistScene(state.scene, mode);
      return { routeMode: mode, ...routes, history: [...state.history.slice(-19), snapshot], future: [] };
    }),
    updateVehicle: (patch) => set((state) => withEdit(state, (next) => { next.vehicle = { ...next.vehicle, ...patch }; })),
    setBookmark: (bookmark) => set((state) => ({ cameraBookmark: bookmark, cameraNonce: state.cameraNonce + 1, activeMobileTab: 'scene' })),
    resetCamera: () => set((state) => ({ cameraBookmark: 'overview', cameraNonce: state.cameraNonce + 1 })),
    toggleLabels: () => set((state) => ({ labelsVisible: !state.labelsVisible })),
    toggleContours: () => set((state) => ({ contoursVisible: !state.contoursVisible })),
    togglePresentation: () => set((state) => ({ presentation: !state.presentation, presentationStep: 0, cameraBookmark: 'overview', cameraNonce: state.cameraNonce + 1 })),
    nextPresentationStep: (direction) => set((state) => {
      const bookmarks = ['overview', 'village', 'clearing'] as const;
      const step = (state.presentationStep + direction + bookmarks.length) % bookmarks.length;
      return { presentationStep: step, cameraBookmark: bookmarks[step], cameraNonce: state.cameraNonce + 1 };
    }),
    setMobileTab: (tab) => set({ activeMobileTab: tab }),
    setInspectorVisible: (visible) => set({ inspectorVisible: visible }),
    setRouteHoverIndex: (index) => set({ routeHoverIndex: index }),
    undo: () => set((state) => {
      const snapshot = state.history.at(-1);
      if (!snapshot) return state;
      const routes = routeFor(snapshot.scene, snapshot.routeMode);
      persistScene(snapshot.scene, snapshot.routeMode);
      return { scene: snapshot.scene, routeMode: snapshot.routeMode, ...routes, history: state.history.slice(0, -1), future: [{ scene: cloneScene(state.scene), routeMode: state.routeMode }, ...state.future].slice(0, 20) };
    }),
    redo: () => set((state) => {
      const snapshot = state.future[0];
      if (!snapshot) return state;
      const routes = routeFor(snapshot.scene, snapshot.routeMode);
      persistScene(snapshot.scene, snapshot.routeMode);
      return { scene: snapshot.scene, routeMode: snapshot.routeMode, ...routes, history: [...state.history, { scene: cloneScene(state.scene), routeMode: state.routeMode }].slice(-20), future: state.future.slice(1) };
    }),
    resetScene: () => set((state) => {
      const next = createSeedScene();
      persistScene(next, 'exploratory');
      return { scene: next, routeMode: 'exploratory', primaryRoute: null, alternativeRoute: null, selectedFeatureId: 'clearing', selectedEdgeId: null, cameraBookmark: 'overview', cameraNonce: state.cameraNonce + 1, history: [...state.history, { scene: cloneScene(state.scene), routeMode: state.routeMode }].slice(-20), future: [] };
    }),
    exportScene: () => {
      const blob = new Blob([JSON.stringify(get().scene, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = 'hillside-relief-delivery.terrain.json'; link.click();
      URL.revokeObjectURL(url);
    },
    importScene: async (file) => {
      if (file.size > 1_000_000) { set({ importError: 'Import is larger than the 1 MB limit.' }); return; }
      try {
        const value = JSON.parse(await file.text());
        if (!validateSceneImport(value)) throw new Error('Schema or scene ID is not supported.');
        set((state) => {
          const next = cloneScene(value);
          const routes = routeFor(next, state.routeMode);
          persistScene(next, state.routeMode);
          return { scene: next, ...routes, importError: null, history: [...state.history, { scene: cloneScene(state.scene), routeMode: state.routeMode }].slice(-20), future: [] };
        });
      } catch (error) { set({ importError: error instanceof Error ? error.message : 'Could not import this scene.' }); }
    },
    hydrate: () => {
      const stored = loadPersisted();
      if (!stored) return;
      const routes = routeFor(stored.scene, stored.routeMode);
      set({ scene: stored.scene, routeMode: stored.routeMode, ...routes });
    },
  };
});
