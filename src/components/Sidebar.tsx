import { useMemo, useState } from 'react';
import { CATALOG, CATEGORY_ORDER } from '../data/catalog';
import { formatUsd } from '../lib/calculations';
import type { ComponentSpec } from '../types';

function PaletteItem({ spec }: { spec: ComponentSpec }) {
  const onDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData('application/ves-spec-id', spec.id);
    event.dataTransfer.effectAllowed = 'move';
  };

  const summary = (() => {
    if (spec.role === 'storage') return `${spec.capacityAh}Ah / ${spec.capacityWh}Wh`;
    if (spec.category === 'solar') return `${spec.ratedWatts}W`;
    if (spec.category === 'alternator' || spec.category === 'charge-controller')
      return spec.outputAmps ? `${spec.outputAmps}A` : `${spec.outputWatts}W`;
    if (spec.category === 'inverter') return `${spec.outputWatts}W`;
    if (spec.role === 'load' && spec.ratedWatts) return `${spec.ratedWatts}W`;
    return '';
  })();

  return (
    <div
      className="palette-item"
      draggable
      onDragStart={onDragStart}
      title={spec.notes ?? spec.name}
    >
      <div className="palette-item__icon" aria-hidden>
        {spec.icon}
      </div>
      <div className="palette-item__body">
        <div className="palette-item__name">{spec.name}</div>
        <div className="palette-item__meta">
          {summary && <span className="palette-item__summary">{summary}</span>}
          {spec.price > 0 && <span className="palette-item__price">{formatUsd(spec.price)}</span>}
        </div>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATALOG;
    return CATALOG.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        (c.notes ?? '').toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <aside className="sidebar">
      <header className="sidebar__header">
        <h1>VES Design</h1>
        <p className="sidebar__tag">Van Electrical System Designer</p>
      </header>
      <div className="sidebar__search">
        <input
          type="search"
          placeholder="Search components…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="sidebar__hint">Drag components onto the canvas.</div>
      <div className="sidebar__categories">
        {CATEGORY_ORDER.map(({ category, label }) => {
          const items = filtered.filter((c) => c.category === category);
          if (items.length === 0) return null;
          return (
            <section key={category} className="palette-section">
              <h2 className="palette-section__title">{label}</h2>
              <div className="palette-section__items">
                {items.map((spec) => (
                  <PaletteItem key={spec.id} spec={spec} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </aside>
  );
}
