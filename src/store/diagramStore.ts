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
import type { DiagramNodeData, GlobalParameters } from '../types';
import { CATALOG_BY_ID } from '../data/catalog';

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
  selectNode: (nodeId: string | null) => void;
  clearDiagram: () => void;

  setParams: (patch: Partial<GlobalParameters>) => void;
  loadStarter: () => void;
}

const DEFAULT_PARAMS: GlobalParameters = {
  sunlightHoursPerDay: 5,
  shorePowerHoursPerDay: 0,
  drivingHoursPerDay: 1,
  solarDerating: 0.75,
  systemVoltage: 12,
};

function nextId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

const STARTER_NODES: Node<DiagramNodeData>[] = [
  {
    id: 'starter-solar',
    type: 'vesNode',
    position: { x: 40, y: 40 },
    data: { specId: 'solar-200w', label: '200W Rigid Solar Panel', quantity: 2 },
  },
  {
    id: 'starter-alt',
    type: 'vesNode',
    position: { x: 40, y: 200 },
    data: { specId: 'victron-orion-30a', label: 'Victron Orion-Tr Smart 12/12-30A', quantity: 1 },
  },
  {
    id: 'starter-mppt',
    type: 'vesNode',
    position: { x: 320, y: 40 },
    data: { specId: 'victron-100-30', label: 'Victron MPPT 100/30', quantity: 1 },
  },
  {
    id: 'starter-battery',
    type: 'vesNode',
    position: { x: 320, y: 220 },
    data: { specId: 'bb-100ah', label: 'Battle Born 100Ah LiFePO4', quantity: 2 },
  },
  {
    id: 'starter-inverter',
    type: 'vesNode',
    position: { x: 600, y: 220 },
    data: { specId: 'victron-multiplus-2000', label: 'Victron MultiPlus 12/2000', quantity: 1 },
  },
  {
    id: 'starter-fridge',
    type: 'vesNode',
    position: { x: 880, y: 40 },
    data: { specId: 'fridge-isotherm-85', label: 'Isotherm CR85 Fridge', quantity: 1 },
  },
  {
    id: 'starter-fan',
    type: 'vesNode',
    position: { x: 880, y: 160 },
    data: { specId: 'maxxair-7500', label: 'MaxxAir Deluxe 7500K Fan', quantity: 1 },
  },
  {
    id: 'starter-lights',
    type: 'vesNode',
    position: { x: 880, y: 280 },
    data: { specId: 'light-puck', label: 'LED Puck Light', quantity: 8 },
  },
  {
    id: 'starter-laptop',
    type: 'vesNode',
    position: { x: 880, y: 400 },
    data: { specId: 'laptop-charging', label: 'Laptop Charging (USB-C PD)', quantity: 1 },
  },
];

const STARTER_EDGES: Edge[] = [
  { id: 'e1', source: 'starter-solar', target: 'starter-mppt' },
  { id: 'e2', source: 'starter-mppt', target: 'starter-battery' },
  { id: 'e3', source: 'starter-alt', target: 'starter-battery' },
  { id: 'e4', source: 'starter-battery', target: 'starter-inverter' },
  { id: 'e5', source: 'starter-battery', target: 'starter-fridge' },
  { id: 'e6', source: 'starter-battery', target: 'starter-fan' },
  { id: 'e7', source: 'starter-battery', target: 'starter-lights' },
  { id: 'e8', source: 'starter-inverter', target: 'starter-laptop' },
];

export const useDiagramStore = create<DiagramState>((set, get) => ({
  nodes: STARTER_NODES,
  edges: STARTER_EDGES,
  selectedNodeId: null,
  params: DEFAULT_PARAMS,

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
    const newNode: Node<DiagramNodeData> = {
      id: nextId(specId),
      type: 'vesNode',
      position,
      data: {
        specId,
        label: spec.name,
        quantity: 1,
        hoursPerDay: spec.defaultHoursPerDay,
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
  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),
  clearDiagram: () => set({ nodes: [], edges: [], selectedNodeId: null }),

  setParams: (patch) => set({ params: { ...get().params, ...patch } }),
  loadStarter: () =>
    set({ nodes: STARTER_NODES, edges: STARTER_EDGES, selectedNodeId: null }),
}));
