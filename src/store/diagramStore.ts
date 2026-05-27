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
import type { DiagramNodeData, GlobalParameters, SavedDesign, WireEdgeData } from '../types';
import { CATALOG_BY_ID } from '../data/catalog';
import { PRESETS } from '../data/presets';
import { analyzeEdge, dominantBusVoltage, normalizeEdges, resolveAll } from '../lib/calculations';
import { DEFAULT_RUN_FT } from '../data/wire';

interface DiagramState {
  nodes: Node<DiagramNodeData>[];
  edges: Edge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  params: GlobalParameters;

  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  addNodeFromSpec: (specId: string, position: { x: number; y: number }) => void;
  removeNode: (nodeId: string) => void;
  swapNodeSpec: (nodeId: string, newSpecId: string) => void;
  updateNodeData: (nodeId: string, patch: Partial<DiagramNodeData>) => void;
  expandGroup: (nodeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  updateEdgeData: (edgeId: string, patch: Partial<WireEdgeData>) => void;
  clearDiagram: () => void;

  setParams: (patch: Partial<GlobalParameters>) => void;
  loadPreset: (presetId: string) => void;
  loadSnapshot: (design: SavedDesign) => void;
}

function nextId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

const STARTER = PRESETS[1]; // Overlanding

function withWiring(
  edges: Edge[],
  nodes: Node<DiagramNodeData>[],
  params: GlobalParameters,
): Edge[] {
  return normalizeEdges(edges, nodes, dominantBusVoltage(nodes, params.systemVoltage));
}

const initialNodes = STARTER.nodes.map((n) => ({ ...n, data: { ...n.data } }));
const initialParams = { ...STARTER.params };

export const useDiagramStore = create<DiagramState>((set, get) => ({
  nodes: initialNodes,
  edges: withWiring(
    STARTER.edges.map((e) => ({ ...e })),
    initialNodes,
    initialParams,
  ),
  selectedNodeId: null,
  selectedEdgeId: null,
  params: initialParams,

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },
  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },
  onConnect: (connection) => {
    const state = get();
    const busV = dominantBusVoltage(state.nodes, state.params.systemVoltage);
    const resolved = resolveAll(state.nodes);
    const draft: Edge = {
      id: nextId('e'),
      source: connection.source!,
      target: connection.target!,
      sourceHandle: connection.sourceHandle ?? null,
      targetHandle: connection.targetHandle ?? null,
      animated: true,
      data: {},
    };
    const analysis = analyzeEdge(draft, resolved, state.edges, busV);
    draft.data = {
      gauge: analysis ? analysis.suggestedGauge : '8',
      lengthFt: DEFAULT_RUN_FT,
    } satisfies WireEdgeData;
    set({ edges: addEdge(draft, state.edges) });
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

  swapNodeSpec: (nodeId, newSpecId) => {
    const spec = CATALOG_BY_ID[newSpecId];
    if (!spec) return;
    set({
      nodes: get().nodes.map((n) => {
        if (n.id !== nodeId) return n;
        const isBattery = spec.role === 'storage';
        const isLoad = spec.role === 'load';
        return {
          ...n,
          data: {
            ...n.data,
            specId: newSpecId,
            label: spec.name,
            // Keep series/parallel only while the node stays a battery; carry
            // usage hours across loads, otherwise drop role-specific fields.
            seriesCount: isBattery ? (n.data.seriesCount ?? 1) : undefined,
            parallelCount: isBattery ? (n.data.parallelCount ?? 1) : undefined,
            hoursPerDay: isLoad
              ? (n.data.hoursPerDay ?? spec.defaultHoursPerDay)
              : undefined,
          },
        };
      }),
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
    const replacementIds = replacements.map((r) => r.id);
    // Fan each edge touching the original out to every replacement so each
    // expanded node keeps the original's connections instead of just the first.
    const newEdges = state.edges.flatMap((e) => {
      const touchesSource = e.source === nodeId;
      const touchesTarget = e.target === nodeId;
      if (!touchesSource && !touchesTarget) return [e];
      return replacementIds.map((rid) => ({
        ...e,
        id: nextId('e'),
        source: touchesSource ? rid : e.source,
        target: touchesTarget ? rid : e.target,
      }));
    });
    set({
      nodes: [...state.nodes.filter((n) => n.id !== nodeId), ...replacements],
      edges: newEdges,
      selectedNodeId: replacementIds[0],
    });
  },

  selectNode: (nodeId) => set({ selectedNodeId: nodeId, selectedEdgeId: null }),
  selectEdge: (edgeId) => set({ selectedEdgeId: edgeId, selectedNodeId: null }),

  updateEdgeData: (edgeId, patch) => {
    set({
      edges: get().edges.map((e) =>
        e.id === edgeId ? { ...e, data: { ...(e.data ?? {}), ...patch } } : e,
      ),
    });
  },

  clearDiagram: () => set({ nodes: [], edges: [], selectedNodeId: null, selectedEdgeId: null }),

  setParams: (patch) => set({ params: { ...get().params, ...patch } }),

  loadPreset: (presetId) => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const nodes = preset.nodes.map((n) => ({ ...n, data: { ...n.data } }));
    const params = { ...preset.params };
    set({
      nodes,
      edges: withWiring(preset.edges.map((e) => ({ ...e })), nodes, params),
      params,
      selectedNodeId: null,
      selectedEdgeId: null,
    });
  },

  loadSnapshot: (design) => {
    // Validate the saved shape at the boundary so stale/corrupted data can't
    // propagate NaN or undefined into the store and poison every calculation.
    const rawNodes = Array.isArray(design.nodes) ? (design.nodes as Node<DiagramNodeData>[]) : [];
    const rawEdges = Array.isArray(design.edges) ? (design.edges as Edge[]) : [];

    const nodes = rawNodes
      .filter((n) => n && typeof n.data?.specId === 'string')
      .map((n) => ({
        ...n,
        data: {
          ...n.data,
          quantity: Math.max(1, Number(n.data.quantity) || 1),
        },
      }));

    const saved = design.params ?? {};
    const params: import('../types').GlobalParameters = {
      sunlightHoursPerDay: Number(saved.sunlightHoursPerDay) || 5,
      shorePowerHoursPerDay: Number(saved.shorePowerHoursPerDay) || 0,
      drivingHoursPerDay: Number(saved.drivingHoursPerDay) || 1,
      solarDerating: Number(saved.solarDerating) || 0.75,
      systemVoltage: ([12, 24, 48] as const).includes(saved.systemVoltage) ? saved.systemVoltage : 12,
      simulationDays: Number(saved.simulationDays) || 7,
      startingSocPct: Number(saved.startingSocPct ?? 80),
    };

    set({
      nodes,
      edges: withWiring(rawEdges, nodes, params),
      params,
      selectedNodeId: null,
      selectedEdgeId: null,
    });
  },
}));
