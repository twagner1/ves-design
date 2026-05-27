import type { Edge, Node } from 'reactflow';
import type { DiagramNodeData, GlobalParameters } from '../types';
import { CATALOG_BY_ID } from '../data/catalog';
import { calculate, inverterBuiltInChargerW } from './calculations';

export interface HourPoint {
  hour: number;       // hours from start (0 = midnight day 1)
  day: number;        // 1-indexed day
  hourOfDay: number;  // 0..23
  socPct: number;
  solarW: number;
  alternatorW: number;
  shoreW: number;
  loadW: number;
  netW: number;
}

export interface Simulation {
  points: HourPoint[];
  minSoc: number;
  maxSoc: number;
  finalSoc: number;
  fullChargeHits: number;
  emptyHits: number;
  usableStorageWh: number;
}

/**
 * Solar irradiance curve normalized so that ∫ curve(h) dh from sunrise..sunset = sunlightHoursPerDay.
 * Approximate it as a half-sine centered at noon spanning a window proportional to sunlightHoursPerDay.
 */
function solarFraction(hourOfDay: number, sunlightHoursPerDay: number): number {
  // Window centered at noon; half-width scales with sun hours (cap at ±6h).
  const halfWindow = Math.min(6, Math.max(2, sunlightHoursPerDay));
  const start = 12 - halfWindow;
  const end = 12 + halfWindow;
  if (hourOfDay < start || hourOfDay >= end) return 0;
  const t = (hourOfDay - start) / (end - start); // 0..1
  // Half-sine: peak at t=0.5
  const shape = Math.sin(Math.PI * t);
  // Scale: average of half-sine over its domain is 2/π. So integral = (2/π)(2 halfWindow) = (4/π)*halfWindow.
  // We want integral over the day = sunlightHoursPerDay (peak-sun equivalent). So:
  //   scale = sunlightHoursPerDay / ((4/π) * halfWindow)
  const scale = sunlightHoursPerDay / ((4 / Math.PI) * halfWindow);
  return shape * scale;
}

function inDrivingBlock(hourOfDay: number, drivingHoursPerDay: number): boolean {
  // Treat driving as a contiguous block starting at 9am.
  const start = 9;
  return hourOfDay >= start && hourOfDay < start + drivingHoursPerDay;
}

function inShoreBlock(hourOfDay: number, shoreHoursPerDay: number): boolean {
  // Treat shore as plugged in starting at 6pm running through the night.
  // Use float arithmetic so fractional hours (e.g. 2.5h) are handled correctly.
  const start = 18;
  const end = start + shoreHoursPerDay; // may exceed 24 — wrap with modulo
  if (end <= 24) {
    return hourOfDay >= start && hourOfDay < end;
  }
  // Wraps past midnight: in-block when past 18:00 OR before the wrap-around end.
  return hourOfDay >= start || hourOfDay < end - 24;
}

export function simulate(
  nodes: Node<DiagramNodeData>[],
  edges: Edge[],
  params: GlobalParameters,
): Simulation {
  const calc = calculate(nodes, edges, params);
  const capacityWh = calc.usableStorageWh;
  const points: HourPoint[] = [];

  // Aggregate generation rated capacities (instantaneous max W)
  let peakSolarW = 0;
  let alternatorRatedW = 0;
  let shoreChargerW = 0;
  const hasShoreInlet = nodes.some((n) => CATALOG_BY_ID[n.data.specId]?.category === 'shore-power');
  for (const n of nodes) {
    const spec = CATALOG_BY_ID[n.data.specId];
    if (!spec) continue;
    const qty = n.data.quantity;
    if (spec.category === 'solar') peakSolarW += (spec.ratedWatts ?? 0) * qty;
    else if (spec.category === 'alternator') {
      // outputWatts is the delivered DC output to the house bank (matches
      // sourceOutputWatts in calculations.ts) — no extra efficiency derating.
      const w = spec.outputWatts ?? (spec.outputAmps ?? 0) * (spec.outputVoltage ?? 12);
      alternatorRatedW += w * qty;
    } else if (spec.category === 'inverter' && hasShoreInlet) {
      // Shore charging needs both an AC inlet and an inverter/charger.
      shoreChargerW += inverterBuiltInChargerW(spec) * qty;
    }
  }

  // Average constant load draw (assume constant throughout day)
  const avgLoadW = calc.dailyConsumptionWh / 24;

  // Initial SoC
  const totalHours = Math.max(1, params.simulationDays) * 24;
  let socWh = capacityWh > 0 ? (capacityWh * params.startingSocPct) / 100 : 0;
  let fullChargeHits = 0;
  let emptyHits = 0;
  let wasFull = false;
  let wasEmpty = false;
  let minSoc = 100;
  let maxSoc = -1;

  for (let h = 0; h < totalHours; h++) {
    const hourOfDay = h % 24;
    const day = Math.floor(h / 24) + 1;

    const solarW = peakSolarW * solarFraction(hourOfDay, params.sunlightHoursPerDay) * params.solarDerating;
    const alternatorW = inDrivingBlock(hourOfDay, params.drivingHoursPerDay) ? alternatorRatedW : 0;
    const shoreW = inShoreBlock(hourOfDay, params.shorePowerHoursPerDay) ? shoreChargerW : 0;
    const genW = solarW + alternatorW + shoreW;
    const loadW = avgLoadW;
    const netW = genW - loadW;

    // Apply over 1 hour
    socWh += netW;
    if (capacityWh > 0) {
      if (socWh > capacityWh) {
        socWh = capacityWh;
        // Count only the transition into full, not every hour spent there.
        if (!wasFull) fullChargeHits++;
        wasFull = true;
      } else {
        wasFull = false;
      }
      if (socWh < 0) {
        socWh = 0;
        // Count only the transition into empty, not every hour spent there.
        if (!wasEmpty) emptyHits++;
        wasEmpty = true;
      } else {
        wasEmpty = false;
      }
    }

    const socPct = capacityWh > 0 ? (socWh / capacityWh) * 100 : 0;
    minSoc = Math.min(minSoc, socPct);
    maxSoc = Math.max(maxSoc, socPct);

    points.push({ hour: h, day, hourOfDay, socPct, solarW, alternatorW, shoreW, loadW, netW });
  }

  return {
    points,
    minSoc: capacityWh > 0 ? minSoc : 0,
    maxSoc: capacityWh > 0 ? maxSoc : 0,
    finalSoc: capacityWh > 0 ? points[points.length - 1].socPct : 0,
    fullChargeHits,
    emptyHits,
    usableStorageWh: capacityWh,
  };
}
