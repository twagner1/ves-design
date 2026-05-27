import { useMemo, useState } from 'react';
import { useDiagramStore } from '../store/diagramStore';
import { simulate, type HourPoint } from '../lib/simulator';

const WIDTH = 340;
const HEIGHT = 140;
const PADDING = { top: 8, right: 8, bottom: 22, left: 30 };

export default function Timeline() {
  const nodes = useDiagramStore((s) => s.nodes);
  const edges = useDiagramStore((s) => s.edges);
  const params = useDiagramStore((s) => s.params);
  const setParams = useDiagramStore((s) => s.setParams);

  const sim = useMemo(() => simulate(nodes, edges, params), [nodes, edges, params]);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const innerW = WIDTH - PADDING.left - PADDING.right;
  const innerH = HEIGHT - PADDING.top - PADDING.bottom;
  const pts = sim.points;

  const pathD = useMemo(() => {
    if (pts.length === 0) return '';
    const maxHour = pts[pts.length - 1].hour;
    return pts
      .map((p, i) => {
        const x = PADDING.left + (p.hour / maxHour) * innerW;
        const y = PADDING.top + (1 - p.socPct / 100) * innerH;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
  }, [pts, innerW, innerH]);

  const dayMarkers = useMemo(() => {
    const out: { x: number; day: number }[] = [];
    if (pts.length === 0) return out;
    const maxHour = pts[pts.length - 1].hour;
    for (let d = 1; d <= params.simulationDays; d++) {
      const x = PADDING.left + ((d * 24 - 12) / maxHour) * innerW;
      out.push({ x, day: d });
    }
    return out;
  }, [pts, innerW, params.simulationDays]);

  const hover: HourPoint | null = hoverIdx != null && pts[hoverIdx] ? pts[hoverIdx] : null;

  const minSocBand =
    sim.minSoc < 100 ? (
      <rect
        x={PADDING.left}
        y={PADDING.top + (1 - sim.minSoc / 100) * innerH}
        width={innerW}
        height={(sim.minSoc / 100) * innerH}
        fill="rgba(34,197,94,0.05)"
      />
    ) : null;

  return (
    <section className="panel">
      <header className="panel__header">
        <h2>Battery SoC Simulation</h2>
        <span className="panel__busv">{params.simulationDays}-day forecast</span>
      </header>
      <div className="panel__body">
        <div className="param-row" style={{ marginBottom: 8 }}>
          <div className="param-row__head">
            <label className="param-row__label">Simulation length</label>
            <span className="param-row__value">{params.simulationDays} days</span>
          </div>
          <input
            type="range"
            min={1}
            max={14}
            step={1}
            value={params.simulationDays}
            onChange={(e) => setParams({ simulationDays: parseInt(e.target.value, 10) })}
          />
        </div>
        <div className="param-row" style={{ marginBottom: 8 }}>
          <div className="param-row__head">
            <label className="param-row__label">Starting SoC</label>
            <span className="param-row__value">{params.startingSocPct}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={params.startingSocPct}
            onChange={(e) => setParams({ startingSocPct: parseInt(e.target.value, 10) })}
          />
        </div>

        <svg
          className="soc-chart"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const xRatio = (e.clientX - rect.left) / rect.width;
            const px = xRatio * WIDTH;
            if (px < PADDING.left || px > WIDTH - PADDING.right) {
              setHoverIdx(null);
              return;
            }
            const t = (px - PADDING.left) / innerW;
            const idx = Math.max(0, Math.min(pts.length - 1, Math.round(t * (pts.length - 1))));
            setHoverIdx(idx);
          }}
          onMouseLeave={() => setHoverIdx(null)}
        >
          {/* y-axis grid */}
          {[0, 25, 50, 75, 100].map((v) => {
            const y = PADDING.top + (1 - v / 100) * innerH;
            return (
              <g key={v}>
                <line
                  x1={PADDING.left}
                  x2={WIDTH - PADDING.right}
                  y1={y}
                  y2={y}
                  stroke="#1f2c47"
                  strokeWidth={1}
                />
                <text x={4} y={y + 3} fontSize="9" fill="#8a98b3">
                  {v}%
                </text>
              </g>
            );
          })}

          {minSocBand}

          <path d={pathD} fill="none" stroke="#4f8cff" strokeWidth={1.8} />

          {/* day labels */}
          {dayMarkers.map((m) => (
            <text
              key={m.day}
              x={m.x}
              y={HEIGHT - 6}
              fontSize="9"
              fill="#8a98b3"
              textAnchor="middle"
            >
              D{m.day}
            </text>
          ))}

          {hover && (
            <g>
              <line
                x1={PADDING.left + (hover.hour / pts[pts.length - 1].hour) * innerW}
                x2={PADDING.left + (hover.hour / pts[pts.length - 1].hour) * innerW}
                y1={PADDING.top}
                y2={PADDING.top + innerH}
                stroke="#f4f7ff"
                strokeWidth={0.5}
                strokeDasharray="3,2"
              />
              <circle
                cx={PADDING.left + (hover.hour / pts[pts.length - 1].hour) * innerW}
                cy={PADDING.top + (1 - hover.socPct / 100) * innerH}
                r={2.5}
                fill="#4f8cff"
              />
            </g>
          )}
        </svg>

        <div className="soc-meta">
          <div>
            <span className="soc-meta__label">Min SoC</span>
            <span className={`soc-meta__value ${sim.minSoc < 20 ? 'is-bad' : ''}`}>
              {sim.minSoc.toFixed(0)}%
            </span>
          </div>
          <div>
            <span className="soc-meta__label">Final SoC</span>
            <span className="soc-meta__value">{sim.finalSoc.toFixed(0)}%</span>
          </div>
          <div>
            <span className="soc-meta__label">Empty hits</span>
            <span className={`soc-meta__value ${sim.emptyHits > 0 ? 'is-bad' : ''}`}>
              {sim.emptyHits}
            </span>
          </div>
          <div>
            <span className="soc-meta__label">Full hits</span>
            <span className="soc-meta__value">{sim.fullChargeHits}</span>
          </div>
        </div>

        {hover && (
          <div className="soc-hover">
            Day {hover.day}, {String(hover.hourOfDay).padStart(2, '0')}:00 ·{' '}
            <strong>{hover.socPct.toFixed(0)}%</strong> · solar{' '}
            {hover.solarW.toFixed(0)}W · alt {hover.alternatorW.toFixed(0)}W · shore{' '}
            {hover.shoreW.toFixed(0)}W · load {hover.loadW.toFixed(0)}W
          </div>
        )}
      </div>
    </section>
  );
}
