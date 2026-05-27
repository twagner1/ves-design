export interface WireGauge {
  awg: string;        // e.g. "8", "1/0", "4/0"
  label: string;      // display label
  ohmsPerFoot: number; // copper, ~20°C
  ampacity: number;   // ABYC E-11, 105°C insulation, outside engine space
  rank: number;       // ascending conductor size (bigger = thicker wire)
}

// Ordered from thinnest to thickest. ohmsPerFoot = (Ω per 1000ft) / 1000.
export const WIRE_GAUGES: WireGauge[] = [
  { awg: '18',  label: '18 AWG',  ohmsPerFoot: 6.385 / 1000,  ampacity: 20,  rank: 0 },
  { awg: '16',  label: '16 AWG',  ohmsPerFoot: 4.016 / 1000,  ampacity: 25,  rank: 1 },
  { awg: '14',  label: '14 AWG',  ohmsPerFoot: 2.525 / 1000,  ampacity: 35,  rank: 2 },
  { awg: '12',  label: '12 AWG',  ohmsPerFoot: 1.588 / 1000,  ampacity: 45,  rank: 3 },
  { awg: '10',  label: '10 AWG',  ohmsPerFoot: 0.9989 / 1000, ampacity: 60,  rank: 4 },
  { awg: '8',   label: '8 AWG',   ohmsPerFoot: 0.6282 / 1000, ampacity: 80,  rank: 5 },
  { awg: '6',   label: '6 AWG',   ohmsPerFoot: 0.3951 / 1000, ampacity: 120, rank: 6 },
  { awg: '4',   label: '4 AWG',   ohmsPerFoot: 0.2485 / 1000, ampacity: 160, rank: 7 },
  { awg: '2',   label: '2 AWG',   ohmsPerFoot: 0.1563 / 1000, ampacity: 210, rank: 8 },
  { awg: '1',   label: '1 AWG',   ohmsPerFoot: 0.1239 / 1000, ampacity: 245, rank: 9 },
  { awg: '1/0', label: '1/0 AWG', ohmsPerFoot: 0.09825 / 1000, ampacity: 285, rank: 10 },
  { awg: '2/0', label: '2/0 AWG', ohmsPerFoot: 0.07793 / 1000, ampacity: 330, rank: 11 },
  { awg: '3/0', label: '3/0 AWG', ohmsPerFoot: 0.06180 / 1000, ampacity: 385, rank: 12 },
  { awg: '4/0', label: '4/0 AWG', ohmsPerFoot: 0.04901 / 1000, ampacity: 445, rank: 13 },
];

export const GAUGE_BY_AWG: Record<string, WireGauge> = Object.fromEntries(
  WIRE_GAUGES.map((g) => [g.awg, g]),
);

export const DEFAULT_RUN_FT = 5;

/** Voltage-drop target for critical DC circuits (matches the warning threshold). */
export const VOLTAGE_DROP_TARGET_PCT = 3;

/**
 * Smallest gauge whose ampacity covers current × 1.25, and — when the run
 * length and segment voltage are known — also keeps round-trip voltage drop
 * within the 3% target so the suggestion actually resolves a drop warning.
 */
export function suggestGauge(current: number, lengthFt?: number, voltage?: number): string {
  if (current <= 0) return '14';
  const ampacityTarget = current * 1.25;
  const checkDrop = lengthFt != null && voltage != null && voltage > 0;
  const found = WIRE_GAUGES.find((g) => {
    if (g.ampacity < ampacityTarget) return false;
    if (checkDrop) {
      const dropPct = ((current * 2 * lengthFt * g.ohmsPerFoot) / voltage) * 100;
      if (dropPct > VOLTAGE_DROP_TARGET_PCT) return false;
    }
    return true;
  });
  return (found ?? WIRE_GAUGES[WIRE_GAUGES.length - 1]).awg;
}
