import { useCallback, useMemo, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Edge,
  type NodeTypes,
  type ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useDiagramStore } from '../store/diagramStore';
import ComponentNode from './ComponentNode';
import { CATALOG_BY_ID } from '../data/catalog';
import { edgeCurrentType, resolveAll } from '../lib/calculations';
import type { DiagramNodeData } from '../types';

const nodeTypes: NodeTypes = { vesNode: ComponentNode };

function roleColor(role: string | undefined): string {
  switch (role) {
    case 'source':       return '#22c55e';
    case 'storage':      return '#3b82f6';
    case 'conversion':   return '#a855f7';
    case 'distribution': return '#64748b';
    case 'load':         return '#f97316';
    default:             return '#94a3b8';
  }
}

export default function Canvas() {
  const nodes = useDiagramStore((s) => s.nodes);
  const edges = useDiagramStore((s) => s.edges);
  const onNodesChange = useDiagramStore((s) => s.onNodesChange);
  const onEdgesChange = useDiagramStore((s) => s.onEdgesChange);
  const onConnect = useDiagramStore((s) => s.onConnect);
  const addNodeFromSpec = useDiagramStore((s) => s.addNodeFromSpec);
  const selectNode = useDiagramStore((s) => s.selectNode);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const rfInstanceRef = useRef<ReactFlowInstance | null>(null);

  // Color edges by AC/DC current type
  const styledEdges = useMemo<Edge[]>(() => {
    const resolved = resolveAll(nodes);
    return edges.map((e) => {
      const ct = edgeCurrentType(e, resolved);
      const stroke = ct === 'AC' ? '#facc15' : '#4f8cff';
      return {
        ...e,
        animated: true,
        style: { ...(e.style ?? {}), stroke, strokeWidth: 2 },
        data: { ...(e.data ?? {}), currentType: ct },
      };
    });
  }, [edges, nodes]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const specId = event.dataTransfer.getData('application/ves-spec-id');
      if (!specId || !rfInstanceRef.current) return;
      const position = rfInstanceRef.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      addNodeFromSpec(specId, position);
    },
    [addNodeFromSpec],
  );

  return (
    <div className="canvas" ref={wrapperRef} onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow
        nodes={nodes}
        edges={styledEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onInit={(inst) => (rfInstanceRef.current = inst)}
        onNodeClick={(_, n) => selectNode(n.id)}
        onPaneClick={() => selectNode(null)}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} size={1} color="#1f2937" />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          nodeColor={(n) => {
            const data = n.data as DiagramNodeData | undefined;
            const role = data?.specId ? CATALOG_BY_ID[data.specId]?.role : undefined;
            return roleColor(role);
          }}
          maskColor="rgba(0,0,0,0.6)"
          style={{ background: '#0b1220' }}
        />

        <div className="canvas-legend">
          <span className="canvas-legend__item">
            <span className="canvas-legend__swatch" style={{ background: '#4f8cff' }} />
            DC
          </span>
          <span className="canvas-legend__item">
            <span className="canvas-legend__swatch" style={{ background: '#facc15' }} />
            AC
          </span>
        </div>
      </ReactFlow>
    </div>
  );
}
