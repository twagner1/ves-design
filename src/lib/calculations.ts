import type { Node } from 'reactflow';
import type { ComponentSpec, DiagramNodeData, GlobalParameters } from '../types';
import { CATALOG_BY_ID } from '../data/catalog';

export interface Calculations {
  storageWh: number;
  usableStorageWh: number;
  dailyConsumptionWh: number;
  solarGenerationWh: number;
  alternatorGenerationWh: number;
  shoreGenerationWh: number;
  totalGenerationWh: number;
  netDailyWh: number;
  daysOfAutonomy: number;
  peakSolarW: number;
  controllerCapacityW: number;
  inverterCapacityW: number;
  peakAcLoadW: number;
  loadBreakdown: { label: string; wattHours: number; qty: number }[];
  warnings: string[];
}

interface Resolved {
  spec: ComponentSpec;
  data: DiagramNodeData;
}

function resolveNodes(nodes: Node<DiagramNodeData>[]): Resolved[] {
  return nodes
    .map((n) => {
      const spec = CATALOG_BY_ID[n.data.specId];
      if (!spec) return null;
      return { spec, data: n.data };
    })
    .filter((x): x is Resolved => x !== null);
}

export function calculate(
  nodes: Node<DiagramNodeData>[],
  params: GlobalParameters,
): Calculations {
  const resolved = resolveNodes(nodes);

  // Storage
  let storageWh = 0;
  for (const { spec, data } of resolved) {
    if (spec.role !== 'storage') continue;
    const wh = spec.capacityWh ?? (spec.capacityAh ?? 0) * (spec.voltage ?? 12);
    storageWh += wh * data.quantity;
  }
  const usableStorageWh =
    resolved
      .filter((r) => r.spec.role === 'storage')
      .reduce((acc, r) => {
        const wh = r.spec.capacityWh ?? (r.spec.capacityAh ?? 0) * (r.spec.voltage ?? 12);
        const usable = wh * (r.spec.usableFraction ?? 1);
        return acc + usable * r.data.quantity;
      }, 0) || storageWh;

  // Consumption
  const loadBreakdown: { label: string; wattHours: number; qty: number }[] = [];
  let dailyConsumptionWh = 0;
  let peakAcLoadW = 0;
  for (const { spec, data } of resolved) {
    if (spec.role !== 'load') continue;
    const watts = spec.ratedWatts ?? 0;
    const hours = data.hoursPerDay ?? spec.defaultHoursPerDay ?? 0;
    const wh = watts * hours * data.quantity;
    dailyConsumptionWh += wh;
    if (wh > 0) loadBreakdown.push({ label: spec.name, wattHours: wh, qty: data.quantity });
    if (watts >= 300) peakAcLoadW = Math.max(peakAcLoadW, watts * data.quantity);
  }
  loadBreakdown.sort((a, b) => b.wattHours - a.wattHours);

  // Solar generation
  let peakSolarW = 0;
  for (const { spec, data } of resolved) {
    if (spec.category === 'solar') {
      peakSolarW += (spec.ratedWatts ?? 0) * data.quantity;
    }
  }
  const solarGenerationWh = peakSolarW * params.sunlightHoursPerDay * params.solarDerating;

  // Alternator generation
  let alternatorOutputW = 0;
  for (const { spec, data } of resolved) {
    if (spec.category === 'alternator') {
      const w = spec.outputWatts ?? (spec.outputAmps ?? 0) * params.systemVoltage;
      alternatorOutputW += w * (spec.efficiency ?? 1) * data.quantity;
    }
  }
  const alternatorGenerationWh = alternatorOutputW * params.drivingHoursPerDay;

  // Shore generation (gated by an installed inverter/charger or a standalone shore inlet)
  let shoreChargerW = 0;
  for (const { spec, data } of resolved) {
    if (spec.category === 'inverter') {
      // MultiPlus 12/2000 ≈ 80A built-in charger ≈ 960W; 12/3000 ≈ 120A ≈ 1440W
      const builtInChargerW = spec.id.includes('3000') ? 1440 : spec.id.includes('2000') ? 960 : 0;
      shoreChargerW += builtInChargerW * data.quantity;
    }
  }
  // If no inverter/charger but a shore inlet exists, assume a generic 40A charger
  if (shoreChargerW === 0 && resolved.some((r) => r.spec.category === 'shore-power')) {
    shoreChargerW = 480;
  }
  const shoreGenerationWh = shoreChargerW * params.shorePowerHoursPerDay;

  const totalGenerationWh = solarGenerationWh + alternatorGenerationWh + shoreGenerationWh;
  const netDailyWh = totalGenerationWh - dailyConsumptionWh;

  const daysOfAutonomy =
    dailyConsumptionWh > 0 ? usableStorageWh / dailyConsumptionWh : Infinity;

  // Charge controller capacity
  let controllerCapacityW = 0;
  for (const { spec, data } of resolved) {
    if (spec.category === 'charge-controller') {
      controllerCapacityW += (spec.outputWatts ?? 0) * data.quantity;
    }
  }

  // Inverter capacity
  let inverterCapacityW = 0;
  for (const { spec, data } of resolved) {
    if (spec.category === 'inverter') {
      inverterCapacityW += (spec.outputWatts ?? 0) * data.quantity;
    }
  }

  // Warnings
  const warnings: string[] = [];
  if (peakSolarW > 0 && controllerCapacityW === 0) {
    warnings.push('Solar panels added without a charge controller.');
  }
  if (controllerCapacityW > 0 && peakSolarW > controllerCapacityW) {
    warnings.push(
      `Solar (${peakSolarW}W) exceeds charge controller capacity (${controllerCapacityW}W).`,
    );
  }
  if (peakAcLoadW > 0 && inverterCapacityW === 0) {
    warnings.push('AC loads present but no inverter installed.');
  }
  if (inverterCapacityW > 0 && peakAcLoadW > inverterCapacityW) {
    warnings.push(
      `Peak AC load (${peakAcLoadW}W) exceeds inverter capacity (${inverterCapacityW}W).`,
    );
  }
  if (storageWh === 0 && dailyConsumptionWh > 0) {
    warnings.push('Loads exist but no battery storage.');
  }
  if (netDailyWh < 0 && storageWh > 0) {
    const days = usableStorageWh / -netDailyWh;
    warnings.push(
      `Net daily energy is negative — batteries deplete in ~${days.toFixed(1)} days at this rate.`,
    );
  }

  return {
    storageWh,
    usableStorageWh,
    dailyConsumptionWh,
    solarGenerationWh,
    alternatorGenerationWh,
    shoreGenerationWh,
    totalGenerationWh,
    netDailyWh,
    daysOfAutonomy,
    peakSolarW,
    controllerCapacityW,
    inverterCapacityW,
    peakAcLoadW,
    loadBreakdown,
    warnings,
  };
}

export interface BomLine {
  specId: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Bom {
  lines: BomLine[];
  total: number;
}

export function buildBom(nodes: Node<DiagramNodeData>[]): Bom {
  const grouped = new Map<string, BomLine>();
  for (const node of nodes) {
    const spec = CATALOG_BY_ID[node.data.specId];
    if (!spec) continue;
    const existing = grouped.get(spec.id);
    if (existing) {
      existing.quantity += node.data.quantity;
      existing.total = existing.quantity * existing.unitPrice;
    } else {
      grouped.set(spec.id, {
        specId: spec.id,
        name: spec.name,
        category: spec.category,
        quantity: node.data.quantity,
        unitPrice: spec.price,
        total: node.data.quantity * spec.price,
      });
    }
  }
  const lines = Array.from(grouped.values()).sort((a, b) =>
    a.category === b.category ? a.name.localeCompare(b.name) : a.category.localeCompare(b.category),
  );
  return { lines, total: lines.reduce((s, l) => s + l.total, 0) };
}

export function formatWh(wh: number): string {
  if (wh === 0) return '0 Wh';
  if (Math.abs(wh) >= 1000) return `${(wh / 1000).toFixed(2)} kWh`;
  return `${Math.round(wh)} Wh`;
}

export function formatW(w: number): string {
  if (Math.abs(w) >= 1000) return `${(w / 1000).toFixed(2)} kW`;
  return `${Math.round(w)} W`;
}

export function formatUsd(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}
