import type { Edge, Node } from 'reactflow';
import type {
  ComponentSpec,
  CurrentType,
  DiagramNodeData,
  GlobalParameters,
  WireEdgeData,
} from '../types';
import { CATALOG_BY_ID } from '../data/catalog';
import { DEFAULT_RUN_FT, GAUGE_BY_AWG, suggestGauge } from '../data/wire';

/** Assumed inverter efficiency when AC loads exist but no inverter is installed. */
const DEFAULT_INVERTER_EFFICIENCY = 0.9;

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

  // AC loads are powered through an inverter; gross their battery draw up by
  // the inverter conversion loss (avg of installed inverters, or a default).
  const inverters = resolved.filter((r) => r.spec.category === 'inverter');
  const inverterEfficiency =
    inverters.length > 0
      ? inverters.reduce((s, r) => s + (r.spec.efficiency ?? DEFAULT_INVERTER_EFFICIENCY), 0) /
        inverters.length
      : DEFAULT_INVERTER_EFFICIENCY;

  // Consumption (battery-side Wh — AC loads include inverter loss)
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
    const isAc = spec.currentType === 'AC';
    const wh = (watts * hours * qty) / (isAc ? inverterEfficiency : 1);
    dailyConsumptionWh += wh;
    if (isAc) acConsumptionWh += wh;
    else dcConsumptionWh += wh;
    if (wh > 0)
      loadBreakdown.push({ label: spec.name, wattHours: wh, qty, currentType: spec.currentType });
    // Inverter sizing is rated on AC output power, not the grossed-up draw.
    if (isAc) peakAcLoadW = Math.max(peakAcLoadW, watts * qty);
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
      // outputWatts/outputAmps already describe the charger's delivered DC
      // output to the house bank, so no further efficiency derating applies.
      const w = spec.outputWatts ?? (spec.outputAmps ?? 0) * (spec.outputVoltage ?? 12);
      alternatorOutputW += w * data.quantity;
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

  // Wiring: ampacity (error) and voltage drop (warning) per edge.
  for (const e of edges) {
    const a = analyzeEdge(e, resolved, edges, busVoltage);
    if (!a || a.currentA <= 0.01) continue;
    const seg = `${a.sourceName} → ${a.targetName}`;
    if (a.overAmpacity) {
      errors.push(
        `Undersized wire ${seg}: ${a.gauge} AWG carries ~${a.currentA.toFixed(0)}A but is rated ${a.ampacity}A. Use ${a.suggestedGauge} AWG or larger.`,
      );
    }
    if (a.voltageDropPct > 10) {
      warnings.push(
        `High voltage drop ${seg}: ${a.voltageDropPct.toFixed(1)}% (${a.gauge} AWG, ${a.lengthFt}ft). Shorten the run or go to ${a.suggestedGauge} AWG.`,
      );
    } else if (a.voltageDropPct > 3) {
      warnings.push(
        `Voltage drop ${seg}: ${a.voltageDropPct.toFixed(1)}% (${a.gauge} AWG, ${a.lengthFt}ft) exceeds the 3% target for critical circuits.`,
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

// ───────── Wiring: current, voltage drop, ampacity ─────────

/** Power (W) drawn by a single node, used to estimate the current a wire carries. */
function nodeDrawWatts(r: Resolved): number {
  const { spec, data } = r;
  if (spec.role === 'load') return (spec.ratedWatts ?? 0) * data.quantity;
  if (spec.category === 'inverter') return (spec.outputWatts ?? 0) * data.quantity;
  if (spec.category === 'converter' || spec.category === 'charge-controller')
    return (spec.outputWatts ?? 0) * data.quantity;
  return 0;
}

/** Power (W) a source node can deliver, used when a wire feeds a battery/busbar. */
function sourceOutputWatts(r: Resolved): number {
  const { spec, data } = r;
  if (spec.category === 'solar') return (spec.ratedWatts ?? 0) * data.quantity;
  if (spec.category === 'alternator')
    return (spec.outputWatts ?? (spec.outputAmps ?? 0) * (spec.outputVoltage ?? 12)) * data.quantity;
  if (spec.category === 'charge-controller' || spec.category === 'converter')
    return (spec.outputWatts ?? 0) * data.quantity;
  if (spec.category === 'inverter') {
    const id = spec.id;
    const charger =
      id.includes('48-5000') ? 70 * 48 :
      id.includes('48-3000') ? 35 * 48 :
      id.includes('3000') ? 1440 :
      id.includes('2000') ? 960 : 0;
    return charger * data.quantity;
  }
  return 0;
}

function segmentVoltage(src: Resolved, tgt: Resolved | undefined, busVoltage: number): number {
  if (src.spec.role === 'storage') return batteryBankStats(src.spec, src.data).bankVoltage;
  if (src.spec.outputVoltage) return src.spec.outputVoltage;
  if (src.spec.systemVoltage) return src.spec.systemVoltage;
  // Busbar / distribution carries the bus — fall back to the target's voltage or bus voltage.
  if (tgt) {
    if (tgt.spec.role === 'storage') return batteryBankStats(tgt.spec, tgt.data).bankVoltage;
    if (tgt.spec.systemVoltage) return tgt.spec.systemVoltage;
    if (tgt.spec.outputVoltage) return tgt.spec.outputVoltage;
  }
  return busVoltage;
}

function segmentPower(
  src: Resolved,
  tgt: Resolved | undefined,
  resolved: Resolved[],
  edges: Edge[],
): number {
  if (!tgt) return sourceOutputWatts(src);

  const directDraw = nodeDrawWatts(tgt);
  if (directDraw > 0) return directDraw;

  if (tgt.spec.role === 'storage') {
    // Charging segment — limited by what the source can deliver.
    return sourceOutputWatts(src);
  }

  if (tgt.spec.role === 'distribution') {
    // Sum one hop downstream of the busbar/fuse block.
    let sum = 0;
    for (const e2 of edges) {
      if (e2.source !== tgt.node.id) continue;
      const downstream = resolved.find((r) => r.node.id === e2.target);
      if (downstream) sum += nodeDrawWatts(downstream);
    }
    if (sum > 0) return sum;
    return sourceOutputWatts(src);
  }

  return sourceOutputWatts(src);
}

export interface EdgeWireAnalysis {
  gauge: string;
  lengthFt: number;
  currentA: number;
  voltage: number;
  resistanceOhms: number;
  voltageDrop: number;
  voltageDropPct: number;
  ampacity: number;
  overAmpacity: boolean;
  suggestedGauge: string;
  currentType: CurrentType;
  sourceName: string;
  targetName: string;
}

export function analyzeEdge(
  edge: Edge,
  resolved: Resolved[],
  edges: Edge[],
  busVoltage: number,
): EdgeWireAnalysis | null {
  const src = resolved.find((r) => r.node.id === edge.source);
  const tgt = resolved.find((r) => r.node.id === edge.target);
  if (!src) return null;

  const data = (edge.data ?? {}) as WireEdgeData;
  const gauge = data.gauge ?? '8';
  const lengthFt = data.lengthFt ?? DEFAULT_RUN_FT;
  const g = GAUGE_BY_AWG[gauge] ?? GAUGE_BY_AWG['8'];

  const voltage = segmentVoltage(src, tgt, busVoltage);
  const power = segmentPower(src, tgt, resolved, edges);
  const currentA = voltage > 0 ? power / voltage : 0;

  // Round-trip (positive + return conductor).
  const resistanceOhms = 2 * lengthFt * g.ohmsPerFoot;
  const voltageDrop = currentA * resistanceOhms;
  const voltageDropPct = voltage > 0 ? (voltageDrop / voltage) * 100 : 0;

  return {
    gauge,
    lengthFt,
    currentA,
    voltage,
    resistanceOhms,
    voltageDrop,
    voltageDropPct,
    ampacity: g.ampacity,
    overAmpacity: currentA > g.ampacity,
    suggestedGauge: suggestGauge(currentA, lengthFt, voltage),
    currentType: edgeCurrentType(edge, resolved),
    sourceName: src.spec.name,
    targetName: tgt?.spec.name ?? '(open)',
  };
}

/** Fill in default gauge (auto-sized to current) and run length for edges that lack them. */
export function normalizeEdges(
  edges: Edge[],
  nodes: Node<DiagramNodeData>[],
  busVoltage: number,
): Edge[] {
  const resolved = resolveNodes(nodes);
  return edges.map((e) => {
    const data = (e.data ?? {}) as WireEdgeData;
    if (data.gauge != null && data.lengthFt != null) return e;
    const analysis = analyzeEdge({ ...e, data: {} }, resolved, edges, busVoltage);
    const suggested = analysis ? analysis.suggestedGauge : '8';
    return {
      ...e,
      data: {
        gauge: data.gauge ?? suggested,
        lengthFt: data.lengthFt ?? DEFAULT_RUN_FT,
      },
    };
  });
}

export function dominantBusVoltage(
  nodes: Node<DiagramNodeData>[],
  fallback: number,
): number {
  const voltages = new Set<number>();
  for (const n of nodes) {
    const spec = CATALOG_BY_ID[n.data.specId];
    if (spec?.role === 'storage') voltages.add(batteryBankStats(spec, n.data).bankVoltage);
  }
  if (voltages.size === 1) return Array.from(voltages)[0];
  return fallback;
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
