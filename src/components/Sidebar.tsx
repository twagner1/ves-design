import { useMemo, useState } from 'react';
import { CATALOG, CATEGORY_ORDER } from '../data/catalog';
import { formatUsd } from '../lib/calculations';
import { Illustration } from '../data/illustrations';
import type { ComponentSpec } from '../types';

function PaletteItem({ spec }: { spec: ComponentSpec }) {
  const onDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData('application/ves-spec-id', spec.id);
    event.dataTransfer.effectAllowed = 'move';
  };

  const summary = (() => {
    if (spec.role === 'storage') return `${spec.capacityAh}Ah / ${(spec.capacityWh ?? 0) / 1000}kWh`;
    if (spec.category === 'solar') return `${spec.ratedWatts}W`;
    if (spec.category === 'alternator' || spec.category === 'charge-controller')
      return spec.outputAmps ? `${spec.outputAmps}A` : `${spec.outputWatts}W`;
    if (spec.category === 'inverter') return `${spec.outputWatts}W`;
    if (spec.role === 'load' && spec.ratedWatts) return `${spec.ratedWatts}W`;
    return '';
  })();

  const voltageBadge = spec.systemVoltage ? `${spec.systemVoltage}V` : spec.outputVoltage ? `${spec.outputVoltage}V` : null;

  return (
    <div
      className="palette-item"
      draggable
      onDragStart={onDragStart}
      title={spec.notes ?? spec.name}
    >
      <div className="palette-item__thumb">
        <Illustration spec={spec} size={36} />
      </div>
      <div className="palette-item__body">
        <div className="palette-item__name">{spec.name}</div>
        <div className="palette-item__meta">
          {summary && <span className="palette-item__summary">{summary}</span>}
          {voltageBadge && <span className={`palette-item__v palette-item__v--${spec.currentType.toLowerCase()}`}>{voltageBadge}</span>}
          {spec.price > 0 && <span className="palette-item__price">{formatUsd(spec.price)}</span>}
        </div>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const [query, setQuery] = useState('');
  const [voltageFilter, setVoltageFilter] = useState<'all' | '12' | '24' | '48'>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATALOG.filter((c) => {
      if (voltageFilter !== 'all') {
        const v = c.systemVoltage ?? c.outputVoltage;
        if (v !== parseInt(voltageFilter, 10)) {
          // Allow universal components (no specific voltage) through always
          if (v) return false;
        }
      }
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        (c.notes ?? '').toLowerCase().includes(q)
      );
    });
  }, [query, voltageFilter]);

  return (
    <aside className="sidebar">
      <header className="sidebar__header">
        <h1>VES Design <span className="sidebar__version">v0.005</span></h1>
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
      <div className="sidebar__filter">
        {(['all', '12', '24', '48'] as const).map((v) => (
          <button
            key={v}
            type="button"
            className={`filter-chip ${voltageFilter === v ? 'filter-chip--on' : ''}`}
            onClick={() => setVoltageFilter(v)}
          >
            {v === 'all' ? 'All' : `${v}V`}
          </button>
        ))}
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
