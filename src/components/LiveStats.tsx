import { useMemo } from 'react';
import { useDiagramStore } from '../store/diagramStore';
import { calculate, formatW, formatWh } from '../lib/calculations';

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'good' | 'bad' | 'warn' | 'info';
}) {
  return (
    <div className={`stat ${tone ? `stat--${tone}` : ''}`}>
      <div className="stat__label">{label}</div>
      <div className="stat__value">{value}</div>
      {sub && <div className="stat__sub">{sub}</div>}
    </div>
  );
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="bar">
      <div className="bar__fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function LiveStats() {
  const nodes = useDiagramStore((s) => s.nodes);
  const edges = useDiagramStore((s) => s.edges);
  const params = useDiagramStore((s) => s.params);

  const calc = useMemo(() => calculate(nodes, edges, params), [nodes, edges, params]);

  const generationMax = Math.max(calc.totalGenerationWh, calc.dailyConsumptionWh, 1);
  const netTone: 'good' | 'bad' | 'info' =
    calc.dailyConsumptionWh === 0 ? 'info' : calc.netDailyWh >= 0 ? 'good' : 'bad';

  return (
    <section className="panel">
      <header className="panel__header">
        <h2>Live Energy Balance</h2>
        <span className="panel__busv">{calc.busVoltage}V bus</span>
      </header>
      <div className="panel__body">
        <div className="stat-grid">
          <Stat
            label="Storage (usable)"
            value={formatWh(calc.usableStorageWh)}
            sub={`Nameplate ${formatWh(calc.storageWh)}`}
            tone="info"
          />
          <Stat
            label="Daily consumption"
            value={formatWh(calc.dailyConsumptionWh)}
            sub={`DC ${formatWh(calc.dcConsumptionWh)} · AC ${formatWh(calc.acConsumptionWh)}`}
            tone="warn"
          />
          <Stat
            label="Daily generation"
            value={formatWh(calc.totalGenerationWh)}
            sub="solar + alternator + shore"
            tone="good"
          />
          <Stat
            label="Net daily"
            value={`${calc.netDailyWh >= 0 ? '+' : ''}${formatWh(calc.netDailyWh)}`}
            sub={
              calc.dailyConsumptionWh === 0
                ? 'add some loads'
                : calc.netDailyWh >= 0
                  ? 'system is in surplus'
                  : 'system is in deficit'
            }
            tone={netTone}
          />
          <Stat
            label="Days of autonomy"
            value={
              calc.daysOfAutonomy === Infinity
                ? '∞'
                : calc.daysOfAutonomy > 99
                  ? '99+'
                  : calc.daysOfAutonomy.toFixed(1)
            }
            sub="storage ÷ consumption (no generation)"
            tone="info"
          />
          <Stat
            label="Peak solar"
            value={formatW(calc.peakSolarW)}
            sub={`Controller ${formatW(calc.controllerCapacityW)}`}
            tone="info"
          />
        </div>

        <div className="balance">
          <div className="balance__row">
            <div className="balance__label">Solar</div>
            <Bar value={calc.solarGenerationWh} max={generationMax} color="#facc15" />
            <div className="balance__val">{formatWh(calc.solarGenerationWh)}</div>
          </div>
          <div className="balance__row">
            <div className="balance__label">Alternator</div>
            <Bar value={calc.alternatorGenerationWh} max={generationMax} color="#22c55e" />
            <div className="balance__val">{formatWh(calc.alternatorGenerationWh)}</div>
          </div>
          <div className="balance__row">
            <div className="balance__label">Shore</div>
            <Bar value={calc.shoreGenerationWh} max={generationMax} color="#3b82f6" />
            <div className="balance__val">{formatWh(calc.shoreGenerationWh)}</div>
          </div>
          <div className="balance__divider" />
          <div className="balance__row">
            <div className="balance__label">Consumption</div>
            <Bar value={calc.dailyConsumptionWh} max={generationMax} color="#f97316" />
            <div className="balance__val">{formatWh(calc.dailyConsumptionWh)}</div>
          </div>
        </div>

        {calc.loadBreakdown.length > 0 && (
          <div className="load-breakdown">
            <h3>Load Breakdown</h3>
            <table>
              <thead>
                <tr>
                  <th>Load</th>
                  <th className="num">Qty</th>
                  <th>Type</th>
                  <th className="num">Wh/day</th>
                </tr>
              </thead>
              <tbody>
                {calc.loadBreakdown.map((l) => (
                  <tr key={l.label}>
                    <td>{l.label}</td>
                    <td className="num">{l.qty}</td>
                    <td>
                      <span className={`pill pill--${l.currentType.toLowerCase()}`}>
                        {l.currentType}
                      </span>
                    </td>
                    <td className="num">{formatWh(l.wattHours)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {calc.errors.length > 0 && (
          <ul className="errors">
            {calc.errors.map((e) => (
              <li key={e}>✕ {e}</li>
            ))}
          </ul>
        )}
        {calc.warnings.length > 0 && (
          <ul className="warnings">
            {calc.warnings.map((w) => (
              <li key={w}>⚠ {w}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
