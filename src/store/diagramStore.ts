import { create } from 'zustand';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from 'reactflow';
import type { DiagramNodeData, GlobalParameters, SavedDesign } from '../types';
import { CATALOG_BY_ID } from '../data/catalog';
import { PRESETS } from '../data/presets';

interface DiagramState {
  nodes: Node<DiagramNodeData>[];
  edges: Edge[];
  selectedNodeId: string | null;
  params: GlobalParameters;

  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  addNodeFromSpec: (specId: string, position: { x: number; y: number }) => void;
  removeNode: (nodeId: string) => void;
  updateNodeData: (nodeId: string, patch: Partial<DiagramNodeData>) => void;
  expandGroup: (nodeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  clearDiagram: () => void;

  setParams: (patch: Partial<GlobalParameters>) => void;
  loadPreset: (presetId: string) => void;
  loadSnapshot: (design: SavedDesign) => void;
}

function nextId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

const STARTER = PRESETS[1]; // Overlanding

export const useDiagramStore = create<DiagramState>((set, get) => ({
  nodes: STARTER.nodes.map((n) => ({ ...n, data: { ...n.data } })),
  edges: STARTER.edges.map((e) => ({ ...e })),
  selectedNodeId: null,
  params: { ...STARTER.params },

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },
  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },
  onConnect: (connection) => {
    set({ edges: addEdge({ ...connection, animated: true }, get().edges) });
  },

  addNodeFromSpec: (specId, position) => {
    const spec = CATALOG_BY_ID[specId];
    if (!spec) return;
    const isBattery = spec.role === 'storage';
    const newNode: Node<DiagramNodeData> = {
      id: nextId(specId),
      type: 'vesNode',
      position,
      data: {
        specId,
        label: spec.name,
        quantity: 1,
        hoursPerDay: spec.defaultHoursPerDay,
        seriesCount: isBattery ? 1 : undefined,
        parallelCount: isBattery ? 1 : undefined,
      },
    };
    set({ nodes: [...get().nodes, newNode] });
  },

  removeNode: (nodeId) => {
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedNodeId: get().selectedNodeId === nodeId ? null : get().selectedNodeId,
    });
  },

  updateNodeData: (nodeId, patch) => {
    set({
      nodes: get().nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n,
      ),
    });
  },

  expandGroup: (nodeId) => {
    const state = get();
    const node = state.nodes.find((n) => n.id === nodeId);
    if (!node || node.data.quantity <= 1) return;
    const qty = node.data.quantity;
    const replacements: Node<DiagramNodeData>[] = [];
    for (let i = 0; i < qty; i++) {
      replacements.push({
        ...node,
        id: nextId(node.data.specId),
        position: {
          x: node.position.x + (i % 3) * 60,
          y: node.position.y + Math.floor(i / 3) * 50,
        },
        data: { ...node.data, quantity: 1 },
      });
    }
    const firstId = replacements[0].id;
    // Reroute existing edges to/from the original to the first replacement.
    const newEdges = state.edges.map((e) => {
      if (e.source === nodeId) return { ...e, source: firstId };
      if (e.target === nodeId) return { ...e, target: firstId };
      return e;
    });
    set({
      nodes: [...state.nodes.filter((n) => n.id !== nodeId), ...replacements],
      edges: newEdges,
      selectedNodeId: firstId,
    });
  },

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),
  clearDiagram: () => set({ nodes: [], edges: [], selectedNodeId: null }),

  setParams: (patch) => set({ params: { ...get().params, ...patch } }),

  loadPreset: (presetId) => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    set({
      nodes: preset.nodes.map((n) => ({ ...n, data: { ...n.data } })),
      edges: preset.edges.map((e) => ({ ...e })),
      params: { ...preset.params },
      selectedNodeId: null,
    });
  },

  loadSnapshot: (design) => {
    set({
      nodes: design.nodes as Node<DiagramNodeData>[],
      edges: design.edges as Edge[],
      params: design.params,
      selectedNodeId: null,
    });
  },
}));
