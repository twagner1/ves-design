import { useDiagramStore } from '../store/diagramStore';
import { CATALOG, CATALOG_BY_ID } from '../data/catalog';
import { analyzeEdge, batteryBankStats, dominantBusVoltage, resolveAll } from '../lib/calculations';
import { Illustration } from '../data/illustrations';
import { WIRE_GAUGES } from '../data/wire';

function NodeEditor({ nodeId }: { nodeId: string }) {
  const node = useDiagramStore((s) => s.nodes.find((n) => n.id === nodeId))!;
  const updateNodeData = useDiagramStore((s) => s.updateNodeData);
  const removeNode = useDiagramStore((s) => s.removeNode);
  const expandGroup = useDiagramStore((s) => s.expandGroup);
  const swapNodeSpec = useDiagramStore((s) => s.swapNodeSpec);

  const spec = CATALOG_BY_ID[node.data.specId];
  if (!spec) return null;

  const isLoad = spec.role === 'load';
  const isBattery = spec.role === 'storage';
  const swapOptions = CATALOG.filter((c) => c.category === spec.category);

  return (
    <>
      <header className="panel__header">
        <h2>
          <span className="inspector__thumb" aria-hidden>
            <Illustration spec={spec} size={28} />
          </span>
          {spec.name}
        </h2>
        <button
          type="button"
          className="btn btn--danger btn--sm"
          onClick={() => removeNode(node.id)}
        >
          Remove
        </button>
      </header>
      <div className="panel__body">
        {spec.notes && <p className="inspector__notes">{spec.notes}</p>}

        {swapOptions.length > 1 && (
          <div className="inspector__row">
            <label>Swap</label>
            <select
              value={spec.id}
              onChange={(e) => swapNodeSpec(node.id, e.target.value)}
              title="Replace this component with another, keeping its wired connections"
            >
              {swapOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="inspector__row">
          <label>Quantity</label>
          <div className="inspector__qty">
            <input
              type="number"
              min={1}
              max={99}
              value={node.data.quantity}
              onChange={(e) =>
                updateNodeData(node.id, {
                  quantity: Math.max(1, parseInt(e.target.value || '1', 10)),
                })
              }
            />
            {node.data.quantity > 1 && (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => expandGroup(node.id)}
                title="Replace this grouped node with N independent nodes"
              >
                Expand to {node.data.quantity} nodes
              </button>
            )}
          </div>
        </div>

        {isBattery && (
          <>
            <div className="inspector__row">
              <label>Series</label>
              <input
                type="number"
                min={1}
                max={16}
                value={node.data.seriesCount ?? 1}
                onChange={(e) =>
                  updateNodeData(node.id, {
                    seriesCount: Math.max(1, parseInt(e.target.value || '1', 10)),
                  })
                }
              />
            </div>
            <div className="inspector__row">
              <label>Parallel</label>
              <input
                type="number"
                min={1}
                max={16}
                value={node.data.parallelCount ?? 1}
                onChange={(e) =>
                  updateNodeData(node.id, {
                    parallelCount: Math.max(1, parseInt(e.target.value || '1', 10)),
                  })
                }
              />
            </div>
            <div className="inspector__bank">
              {(() => {
                const s = batteryBankStats(spec, node.data);
                const cells = s.cellsTotal;
                return (
                  <>
                    <strong>
                      {s.series}S{s.parallel}P
                    </strong>{' '}
                    × {s.qty} ={' '}
                    <span>
                      {cells} cell{cells > 1 ? 's' : ''} · {s.bankVoltage}V · {s.bankAh * s.qty}Ah ·{' '}
                      {((s.bankWh * s.qty) / 1000).toFixed(2)} kWh
                    </span>
                  </>
                );
              })()}
            </div>
          </>
        )}

        {isLoad && (
          <div className="inspector__row">
            <label>Usage</label>
            <div className="inspector__usage">
              <input
                type="range"
                min={0}
                max={24}
                step={0.25}
                value={node.data.hoursPerDay ?? spec.defaultHoursPerDay ?? 0}
                onChange={(e) =>
                  updateNodeData(node.id, { hoursPerDay: parseFloat(e.target.value) })
                }
              />
              <span>
                {(node.data.hoursPerDay ?? spec.defaultHoursPerDay ?? 0).toFixed(2)} h/day
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function EdgeEditor({ edgeId }: { edgeId: string }) {
  const edge = useDiagramStore((s) => s.edges.find((e) => e.id === edgeId));
  const nodes = useDiagramStore((s) => s.nodes);
  const edges = useDiagramStore((s) => s.edges);
  const params = useDiagramStore((s) => s.params);
  const updateEdgeData = useDiagramStore((s) => s.updateEdgeData);

  if (!edge) return null;

  const busV = dominantBusVoltage(nodes, params.systemVoltage);
  const a = analyzeEdge(edge, resolveAll(nodes), edges, busV);
  const gauge = (edge.data?.gauge as string) ?? '8';
  const lengthFt = (edge.data?.lengthFt as number) ?? 5;

  const dropTone = !a
    ? ''
    : a.overAmpacity
      ? 'is-bad'
      : a.voltageDropPct > 10
        ? 'is-bad'
        : a.voltageDropPct > 3
          ? 'is-warn'
          : 'is-good';

  return (
    <>
      <header className="panel__header">
        <h2>
          <span className="inspector__thumb" aria-hidden>
            <span style={{ fontSize: 16 }}>🔌</span>
          </span>
          Wire
        </h2>
        {a && (
          <span className={`pill pill--${a.currentType.toLowerCase()}`}>{a.currentType}</span>
        )}
      </header>
      <div className="panel__body">
        {a && (
          <p className="inspector__notes">
            {a.sourceName} → {a.targetName}
          </p>
        )}

        <div className="inspector__row">
          <label>Gauge</label>
          <select
            value={gauge}
            onChange={(e) => updateEdgeData(edge.id, { gauge: e.target.value })}
          >
            {WIRE_GAUGES.map((g) => (
              <option key={g.awg} value={g.awg}>
                {g.label} · {g.ampacity}A
              </option>
            ))}
          </select>
        </div>

        <div className="inspector__row">
          <label>Run (one-way)</label>
          <div className="inspector__usage">
            <input
              type="range"
              min={1}
              max={50}
              step={1}
              value={lengthFt}
              onChange={(e) => updateEdgeData(edge.id, { lengthFt: parseInt(e.target.value, 10) })}
            />
            <span>{lengthFt} ft</span>
          </div>
        </div>

        {a && (
          <div className="wire-readout">
            <div className="wire-readout__row">
              <span>Estimated current</span>
              <span className={a.overAmpacity ? 'is-bad' : ''}>
                {a.currentA.toFixed(0)} A / {a.ampacity} A
              </span>
            </div>
            <div className="wire-readout__row">
              <span>Voltage drop</span>
              <span className={dropTone}>
                {a.voltageDrop.toFixed(2)} V ({a.voltageDropPct.toFixed(1)}%)
              </span>
            </div>
            <div className="wire-readout__row">
              <span>Segment voltage</span>
              <span>{a.voltage} V</span>
            </div>
            {(a.overAmpacity || a.voltageDropPct > 3) && (
              <button
                type="button"
                className="btn btn--sm wire-readout__suggest"
                onClick={() => updateEdgeData(edge.id, { gauge: a.suggestedGauge })}
              >
                Use suggested {a.suggestedGauge} AWG
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default function DetailsPane() {
  const selectedNodeId = useDiagramStore((s) => s.selectedNodeId);
  const selectedEdgeId = useDiagramStore((s) => s.selectedEdgeId);

  if (selectedNodeId) {
    return (
      <section className="panel inspector details-pane">
        <NodeEditor nodeId={selectedNodeId} />
      </section>
    );
  }
  if (selectedEdgeId) {
    return (
      <section className="panel inspector details-pane">
        <EdgeEditor edgeId={selectedEdgeId} />
      </section>
    );
  }
  return (
    <section className="panel inspector details-pane inspector--empty">
      <header className="panel__header">
        <h2>Details</h2>
      </header>
      <div className="inspector__hint">
        Select a component to edit quantity, series/parallel, or usage. Select a wire to set its
        gauge and run length.
      </div>
    </section>
  );
}
