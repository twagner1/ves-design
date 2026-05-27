import { useMemo } from 'react';
import { useDiagramStore } from '../store/diagramStore';
import { buildBom, formatUsd } from '../lib/calculations';
import { bomToCsv, downloadCsv } from '../lib/csv';

const CATEGORY_LABELS: Record<string, string> = {
  battery: 'Batteries',
  solar: 'Solar Panels',
  alternator: 'Alternator Chargers',
  'charge-controller': 'Charge Controllers',
  inverter: 'Inverters',
  converter: 'Converters',
  'shore-power': 'Shore Power',
  busbar: 'Busbars & Distribution',
  outlet: 'Outlets',
  light: 'Lights',
  fan: 'Fans',
  fridge: 'Refrigeration',
  water: 'Water',
  hvac: 'Heating & Cooling',
  appliance: 'Appliances',
};

export default function BillOfMaterials() {
  const nodes = useDiagramStore((s) => s.nodes);
  const bom = useMemo(() => buildBom(nodes), [nodes]);

  const grouped = useMemo(() => {
    const out = new Map<string, typeof bom.lines>();
    for (const line of bom.lines) {
      if (!out.has(line.category)) out.set(line.category, []);
      out.get(line.category)!.push(line);
    }
    return out;
  }, [bom]);

  const handleExport = () => {
    const csv = bomToCsv(bom);
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    downloadCsv(`ves-bom-${ts}.csv`, csv);
  };

  return (
    <section className="panel">
      <header className="panel__header">
        <h2>Bill of Materials</h2>
        <div className="panel__header-right">
          <span className="panel__total">{formatUsd(bom.total)}</span>
          <button
            type="button"
            className="btn btn--sm"
            onClick={handleExport}
            disabled={bom.lines.length === 0}
            title="Export to CSV"
          >
            Export CSV
          </button>
        </div>
      </header>
      <div className="panel__body">
        {bom.lines.length === 0 ? (
          <p className="empty">No components yet. Drag from the palette to get started.</p>
        ) : (
          <div className="bom">
            {Array.from(grouped.entries()).map(([category, lines]) => (
              <div key={category} className="bom__group">
                <h3 className="bom__heading">{CATEGORY_LABELS[category] ?? category}</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th className="num">Qty</th>
                      <th className="num">Unit</th>
                      <th className="num">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l) => (
                      <tr key={l.specId}>
                        <td>{l.name}</td>
                        <td className="num">{l.quantity}</td>
                        <td className="num">{formatUsd(l.unitPrice)}</td>
                        <td className="num">{formatUsd(l.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
