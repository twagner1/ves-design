import { useDiagramStore } from '../store/diagramStore';
import { CATALOG_BY_ID } from '../data/catalog';

export default function NodeInspector() {
  const selectedId = useDiagramStore((s) => s.selectedNodeId);
  const node = useDiagramStore((s) => s.nodes.find((n) => n.id === selectedId));
  const updateNodeData = useDiagramStore((s) => s.updateNodeData);
  const removeNode = useDiagramStore((s) => s.removeNode);

  if (!node) {
    return (
      <section className="panel inspector inspector--empty">
        <div className="inspector__hint">Click a component on the canvas to edit its quantity and usage.</div>
      </section>
    );
  }

  const spec = CATALOG_BY_ID[node.data.specId];
  if (!spec) return null;

  const isLoad = spec.role === 'load';

  return (
    <section className="panel inspector">
      <header className="panel__header">
        <h2>
          <span aria-hidden style={{ marginRight: 8 }}>{spec.icon}</span>
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
          <input
            type="number"
            min={1}
            max={99}
            value={node.data.quantity}
            onChange={(e) =>
              updateNodeData(node.id, { quantity: Math.max(1, parseInt(e.target.value || '1', 10)) })
            }
          />
        </div>
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
