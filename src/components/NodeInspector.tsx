import { useDiagramStore } from '../store/diagramStore';
import { CATALOG_BY_ID } from '../data/catalog';
import { batteryBankStats } from '../lib/calculations';
import { Illustration } from '../data/illustrations';

export default function NodeInspector() {
  const selectedId = useDiagramStore((s) => s.selectedNodeId);
  const node = useDiagramStore((s) => s.nodes.find((n) => n.id === selectedId));
  const updateNodeData = useDiagramStore((s) => s.updateNodeData);
  const removeNode = useDiagramStore((s) => s.removeNode);
  const expandGroup = useDiagramStore((s) => s.expandGroup);

  if (!node) {
    return (
      <section className="panel inspector inspector--empty">
        <div className="inspector__hint">
          Click a component on the canvas to edit its quantity, series/parallel configuration, or usage.
        </div>
      </section>
    );
  }

  const spec = CATALOG_BY_ID[node.data.specId];
  if (!spec) return null;

  const isLoad = spec.role === 'load';
  const isBattery = spec.role === 'storage';

  return (
    <section className="panel inspector">
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
                    <strong>{s.series}S{s.parallel}P</strong> × {s.qty} ={' '}
                    <span>
                      {cells} cell{cells > 1 ? 's' : ''} · {s.bankVoltage}V ·{' '}
                      {s.bankAh * s.qty}Ah · {((s.bankWh * s.qty) / 1000).toFixed(2)} kWh
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
              <span>{(node.data.hoursPerDay ?? spec.defaultHoursPerDay ?? 0).toFixed(2)} h/day</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
