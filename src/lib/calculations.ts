import type { Edge, Node } from 'reactflow';
import type { ComponentSpec, CurrentType, DiagramNodeData, GlobalParameters } from '../types';
import { CATALOG_BY_ID } from '../data/catalog';

export interface Calculations {
  storageWh: number;
  usableStorageWh: number;
  dailyConsumptionWh: number;
  dcConsumptionWh: number;
  acConsumptionWh: number;
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
  busVoltage: 12 | 24 | 48;
  loadBreakdown: { label: string; wattHours: number; qty: number; currentType: CurrentType }[];
  warnings: string[];
  errors: string[];
}

interface Resolved {
  node: Node<DiagramNodeData>;
  spec: ComponentSpec;
  data: DiagramNodeData;
}

function resolveNodes(nodes: Node<DiagramNodeData>[]): Resolved[] {
  return nodes
    .map((n) => {
      const spec = CATALOG_BY_ID[n.data.specId];
      if (!spec) return null;
      return { node: n, spec, data: n.data };
    })
    .filter((x): x is Resolved => x !== null);
}

export function batteryBankStats(spec: ComponentSpec, data: DiagramNodeData) {
  const series = Math.max(1, data.seriesCount ?? 1);
  const parallel = Math.max(1, data.parallelCount ?? 1);
  const qty = Math.max(1, data.quantity);
  const cellsTotal = series * parallel * qty;
  const baseVoltage = spec.outputVoltage ?? spec.systemVoltage ?? 12;
  const baseAh = spec.capacityAh ?? 0;
  const baseWh = spec.capacityWh ?? baseVoltage * baseAh;
  const bankVoltage = baseVoltage * series;
  const bankAh = baseAh * parallel;
  const bankWh = baseWh * series * parallel;
  return { series, parallel, qty, cellsTotal, baseVoltage, bankVoltage, bankAh, bankWh };
}

export function calculate(
  nodes: Node<DiagramNodeData>[],
  edges: Edge[],
  params: GlobalParameters,
): Calculations {
  const resolved = resolveNodes(nodes);
  const errors: string[] = [];
  const warnings: string[] = [];

  // Determine dominant bus voltage from batteries
  let busVoltage = params.systemVoltage;
  const batteryVoltages = new Set<number>();
  let storageWh = 0;
  let usableStorageWh = 0;
  for (const r of resolved) {
    if (r.spec.role !== 'storage') continue;
    const stats = batteryBankStats(r.spec, r.data);
    storageWh += stats.bankWh * stats.qty;
    usableStorageWh += stats.bankWh * (r.spec.usableFraction ?? 1) * stats.qty;
    batteryVoltages.add(stats.bankVoltage);
  }
  if (batteryVoltages.size === 1) {
    const v = Array.from(batteryVoltages)[0];
    if (v === 12 || v === 24 || v === 48) busVoltage = v;
  } else if (batteryVoltages.size > 1) {
    errors.push(
      `Battery banks at mixed voltages: ${Array.from(batteryVoltages)
        .sort((a, b) => a - b)
        .map((v) => `${v}V`)
        .join(', ')}.`,
    );
  }

  // Consumption
  const loadBreakdown: Calculations['loadBreakdown'] = [];
  let dailyConsumptionWh = 0;
  let dcConsumptionWh = 0;
  let acConsumptionWh = 0;
  let peakAcLoadW = 0;
  for (const { spec, data } of resolved) {
    if (spec.role !== 'load') continue;
    const watts = spec.ratedWatts ?? 0;
    const hours = data.hoursPerDay ?? spec.defaultHoursPerDay ?? 0;
    const qty = data.quantity;
    const wh = watts * hours * qty;
    dailyConsumptionWh += wh;
    if (spec.currentType === 'AC') acConsumptionWh += wh;
    else dcConsumptionWh += wh;
    if (wh > 0)
      loadBreakdown.push({ label: spec.name, wattHours: wh, qty, currentType: spec.currentType });
    if (spec.currentType === 'AC') peakAcLoadW = Math.max(peakAcLoadW, watts * qty);
  }
  loadBreakdown.sort((a, b) => b.wattHours - a.wattHours);

  // Solar
  let peakSolarW = 0;
  for (const { spec, data } of resolved) {
    if (spec.category === 'solar') peakSolarW += (spec.ratedWatts ?? 0) * data.quantity;
  }
  const solarGenerationWh = peakSolarW * params.sunlightHoursPerDay * params.solarDerating;

  // Alternator
  let alternatorOutputW = 0;
  for (const { spec, data } of resolved) {
    if (spec.category === 'alternator') {
      const w = spec.outputWatts ?? (spec.outputAmps ?? 0) * (spec.outputVoltage ?? 12);
      alternatorOutputW += w * (spec.efficiency ?? 1) * data.quantity;
    }
  }
  const alternatorGenerationWh = alternatorOutputW * params.drivingHoursPerDay;

  // Shore
  let shoreChargerW = 0;
  for (const { spec, data } of resolved) {
    if (spec.category === 'inverter') {
      const id = spec.id;
      const builtInChargerW = id.includes('48-5000')
        ? 70 * 48
        : id.includes('48-3000')
          ? 35 * 48
          : id.includes('3000')
            ? 1440
            : id.includes('2000')
              ? 960
              : 0;
      shoreChargerW += builtInChargerW * data.quantity;
    }
  }
  if (shoreChargerW === 0 && resolved.some((r) => r.spec.category === 'shore-power')) {
    shoreChargerW = 480;
  }
  const shoreGenerationWh = shoreChargerW * params.shorePowerHoursPerDay;

  const totalGenerationWh = solarGenerationWh + alternatorGenerationWh + shoreGenerationWh;
  const netDailyWh = totalGenerationWh - dailyConsumptionWh;
  const daysOfAutonomy =
    dailyConsumptionWh > 0 ? usableStorageWh / dailyConsumptionWh : Infinity;

  // Capacity tallies
  let controllerCapacityW = 0;
  for (const { spec, data } of resolved) {
    if (spec.category === 'charge-controller')
      controllerCapacityW += (spec.outputWatts ?? 0) * data.quantity;
  }
  let inverterCapacityW = 0;
  for (const { spec, data } of resolved) {
    if (spec.category === 'inverter')
      inverterCapacityW += (spec.outputWatts ?? 0) * data.quantity;
  }

  // Voltage-mismatch errors on DC edges
  for (const e of edges) {
    const sourceNode = resolved.find((r) => r.node.id === e.source);
    const targetNode = resolved.find((r) => r.node.id === e.target);
    if (!sourceNode || !targetNode) continue;
    const sv = effectiveOutputVoltage(sourceNode);
    const tv = effectiveInputVoltage(targetNode);
    if (sv != null && tv != null && sv !== tv) {
      errors.push(
        `Voltage mismatch: ${sourceNode.spec.name} (${sv}V) → ${targetNode.spec.name} (${tv}V).`,
      );
    }
  }

  // Other warnings
  if (peakSolarW > 0 && controllerCapacityW === 0)
    warnings.push('Solar panels added without a charge controller.');
  if (controllerCapacityW > 0 && peakSolarW > controllerCapacityW)
    warnings.push(
      `Solar (${peakSolarW}W) exceeds charge controller capacity (${controllerCapacityW}W).`,
    );
  if (peakAcLoadW > 0 && inverterCapacityW === 0)
    warnings.push('AC loads present but no inverter installed.');
  if (inverterCapacityW > 0 && peakAcLoadW > inverterCapacityW)
    warnings.push(
      `Peak AC load (${peakAcLoadW}W) exceeds inverter capacity (${inverterCapacityW}W).`,
    );
  if (storageWh === 0 && dailyConsumptionWh > 0)
    warnings.push('Loads exist but no battery storage.');
  if (netDailyWh < 0 && storageWh > 0) {
    const days = usableStorageWh / -netDailyWh;
    warnings.push(
      `Net daily energy is negative — batteries deplete in ~${days.toFixed(1)} days at this rate.`,
    );
  }

  // Inverter bus voltage compatibility
  for (const r of resolved) {
    if (r.spec.category !== 'inverter') continue;
    if (r.spec.systemVoltage && r.spec.systemVoltage !== busVoltage) {
      errors.push(
        `${r.spec.name} expects a ${r.spec.systemVoltage}V bus but house bank is ${busVoltage}V.`,
      );
    }
  }

  return {
    storageWh,
    usableStorageWh,
    dailyConsumptionWh,
    dcConsumptionWh,
    acConsumptionWh,
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
    busVoltage,
    loadBreakdown,
    warnings,
    errors,
  };
}

function effectiveOutputVoltage(r: Resolved): number | null {
  if (r.spec.role === 'storage') {
    return batteryBankStats(r.spec, r.data).bankVoltage;
  }
  if (r.spec.outputVoltage) return r.spec.outputVoltage;
  if (r.spec.systemVoltage) return r.spec.systemVoltage;
  return null;
}

function effectiveInputVoltage(r: Resolved): number | null {
  if (r.spec.role === 'storage') return batteryBankStats(r.spec, r.data).bankVoltage;
  // Solar panels have variable input — don't flag
  if (r.spec.category === 'solar') return null;
  if (r.spec.systemVoltage) return r.spec.systemVoltage;
  if (r.spec.outputVoltage) return r.spec.outputVoltage;
  return null;
}

export function edgeCurrentType(
  edge: Edge,
  resolved: Resolved[],
): CurrentType {
  const src = resolved.find((r) => r.node.id === edge.source);
  const tgt = resolved.find((r) => r.node.id === edge.target);
  if (!src || !tgt) return 'DC';
  if (src.spec.currentType === 'AC' || tgt.spec.currentType === 'AC') return 'AC';
  // Inverter ('either') feeding any load → output side is AC; feeding from battery → DC input
  if (src.spec.category === 'inverter') return 'AC';
  if (tgt.spec.category === 'inverter') return 'DC';
  return 'DC';
}

export function resolveAll(nodes: Node<DiagramNodeData>[]): Resolved[] {
  return resolveNodes(nodes);
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
    const series = node.data.seriesCount ?? 1;
    const parallel = node.data.parallelCount ?? 1;
    const physicalQty = node.data.quantity * series * parallel;
    const existing = grouped.get(spec.id);
    if (existing) {
      existing.quantity += physicalQty;
      existing.total = existing.quantity * existing.unitPrice;
    } else {
      grouped.set(spec.id, {
        specId: spec.id,
        name: spec.name,
        category: spec.category,
        quantity: physicalQty,
        unitPrice: spec.price,
        total: physicalQty * spec.price,
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
