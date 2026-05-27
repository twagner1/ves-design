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
import { analyzeEdge, dominantBusVoltage, edgeCurrentType, resolveAll } from '../lib/calculations';
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
  const params = useDiagramStore((s) => s.params);
  const selectedEdgeId = useDiagramStore((s) => s.selectedEdgeId);
  const onNodesChange = useDiagramStore((s) => s.onNodesChange);
  const onEdgesChange = useDiagramStore((s) => s.onEdgesChange);
  const onConnect = useDiagramStore((s) => s.onConnect);
  const addNodeFromSpec = useDiagramStore((s) => s.addNodeFromSpec);
  const selectNode = useDiagramStore((s) => s.selectNode);
  const selectEdge = useDiagramStore((s) => s.selectEdge);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const rfInstanceRef = useRef<ReactFlowInstance | null>(null);

  // Color + label edges from wire analysis (AC/DC, over-ampacity, gauge/length).
  const styledEdges = useMemo<Edge[]>(() => {
    const resolved = resolveAll(nodes);
    const busV = dominantBusVoltage(nodes, params.systemVoltage);
    return edges.map((e) => {
      const ct = edgeCurrentType(e, resolved);
      const a = analyzeEdge(e, resolved, edges, busV);
      const selected = e.id === selectedEdgeId;
      let stroke = ct === 'AC' ? '#facc15' : '#4f8cff';
      if (a?.overAmpacity) stroke = '#ef4444';
      else if (a && a.voltageDropPct > 10) stroke = '#f59e0b';
      const label =
        a && a.lengthFt != null ? `${a.gauge} AWG · ${a.lengthFt}ft` : undefined;
      return {
        ...e,
        animated: true,
        label,
        labelStyle: { fill: '#d3dbeb', fontSize: 10 },
        labelBgStyle: { fill: '#111a2e', fillOpacity: 0.9 },
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 3,
        style: {
          ...(e.style ?? {}),
          stroke,
          strokeWidth: selected ? 4 : 2,
        },
        data: { ...(e.data ?? {}), currentType: ct },
      };
    });
  }, [edges, nodes, params.systemVoltage, selectedEdgeId]);

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
        onEdgeClick={(_, e) => selectEdge(e.id)}
        onPaneClick={() => {
          selectNode(null);
          selectEdge(null);
        }}
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
          <span className="canvas-legend__item">
            <span className="canvas-legend__swatch" style={{ background: '#ef4444' }} />
            Over-ampacity
          </span>
        </div>
      </ReactFlow>
    </div>
  );
}
