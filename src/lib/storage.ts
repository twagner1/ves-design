import type { Edge, Node } from 'reactflow';
import type { DiagramNodeData, GlobalParameters, SavedDesign } from '../types';

const KEY = 'ves-design.saved-designs';

export interface DesignSnapshot {
  nodes: Node<DiagramNodeData>[];
  edges: Edge[];
  params: GlobalParameters;
}

export function loadAll(): SavedDesign[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr;
  } catch {
    return [];
  }
}

export function saveDesign(name: string, snapshot: DesignSnapshot): SavedDesign {
  const all = loadAll();
  const id = `d-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const design: SavedDesign = {
    id,
    name: name.trim() || `Design ${all.length + 1}`,
    savedAt: new Date().toISOString(),
    nodes: snapshot.nodes,
    edges: snapshot.edges,
    params: snapshot.params,
  };
  all.unshift(design);
  // Cap at 20 designs.
  while (all.length > 20) all.pop();
  localStorage.setItem(KEY, JSON.stringify(all));
  return design;
}

export function deleteDesign(id: string): void {
  const all = loadAll().filter((d) => d.id !== id);
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function loadDesign(id: string): SavedDesign | null {
  return loadAll().find((d) => d.id === id) ?? null;
}
