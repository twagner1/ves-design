import type { Edge, Node } from 'reactflow';
import type { DiagramNodeData, GlobalParameters } from '../types';

interface Preset {
  id: string;
  name: string;
  description: string;
  nodes: Node<DiagramNodeData>[];
  edges: Edge[];
  params: GlobalParameters;
}

const baseParams = (overrides: Partial<GlobalParameters>): GlobalParameters => ({
  sunlightHoursPerDay: 5,
  shorePowerHoursPerDay: 0,
  drivingHoursPerDay: 1,
  solarDerating: 0.75,
  systemVoltage: 12,
  simulationDays: 7,
  startingSocPct: 80,
  ...overrides,
});

const node = (
  id: string,
  specId: string,
  x: number,
  y: number,
  extras: Partial<DiagramNodeData> = {},
): Node<DiagramNodeData> => ({
  id,
  type: 'vesNode',
  position: { x, y },
  data: { specId, label: specId, quantity: 1, ...extras },
});

const edge = (id: string, source: string, target: string): Edge => ({
  id,
  source,
  target,
});

// ───────── Weekend Warrior ─────────
const weekend: Preset = {
  id: 'weekend',
  name: 'Weekend Warrior',
  description: 'Light loads — fridge, fan, lights, phone charging. ~200Ah, 200W solar.',
  params: baseParams({ sunlightHoursPerDay: 5, drivingHoursPerDay: 2 }),
  nodes: [
    node('w-solar', 'solar-200w', 40, 40, { quantity: 1 }),
    node('w-alt', 'victron-orion-30a', 40, 200),
    node('w-mppt', 'victron-100-30', 320, 40),
    node('w-batt', 'bb-100ah', 320, 220, { quantity: 2 }),
    node('w-inv', 'aims-1500', 600, 220),
    node('w-fridge', 'fridge-isotherm-85', 880, 40),
    node('w-fan', 'maxxair-7500', 880, 160),
    node('w-lights', 'light-puck', 880, 280, { quantity: 6 }),
    node('w-phone', 'phone-charging', 880, 400, { quantity: 2 }),
  ],
  edges: [
    edge('we1', 'w-solar', 'w-mppt'),
    edge('we2', 'w-mppt', 'w-batt'),
    edge('we3', 'w-alt', 'w-batt'),
    edge('we4', 'w-batt', 'w-inv'),
    edge('we5', 'w-batt', 'w-fridge'),
    edge('we6', 'w-batt', 'w-fan'),
    edge('we7', 'w-batt', 'w-lights'),
    edge('we8', 'w-batt', 'w-phone'),
  ],
};

// ───────── Overlanding ─────────
const overland: Preset = {
  id: 'overland',
  name: 'Overlanding',
  description: 'Moderate solar + heavy alternator charging from frequent driving. 400Ah, 600W solar.',
  params: baseParams({ sunlightHoursPerDay: 4.5, drivingHoursPerDay: 4 }),
  nodes: [
    node('o-solar1', 'solar-200w', 40, 40, { quantity: 3 }),
    node('o-alt', 'victron-orion-50a', 40, 240),
    node('o-mppt', 'victron-100-50', 320, 40),
    node('o-batt', 'bb-100ah', 320, 220, { quantity: 4 }),
    node('o-inv', 'victron-multiplus-2000', 600, 220),
    node('o-fridge', 'fridge-dometic-cfx', 880, 40),
    node('o-fan', 'maxxair-7500', 880, 140, { quantity: 2 }),
    node('o-lights', 'light-puck', 880, 240, { quantity: 10 }),
    node('o-laptop', 'laptop-charging', 880, 340, { quantity: 2 }),
    node('o-heater', 'webasto-heater', 880, 440),
    node('o-water', 'water-pump', 880, 540),
  ],
  edges: [
    edge('oe1', 'o-solar1', 'o-mppt'),
    edge('oe2', 'o-mppt', 'o-batt'),
    edge('oe3', 'o-alt', 'o-batt'),
    edge('oe4', 'o-batt', 'o-inv'),
    edge('oe5', 'o-batt', 'o-fridge'),
    edge('oe6', 'o-batt', 'o-fan'),
    edge('oe7', 'o-batt', 'o-lights'),
    edge('oe8', 'o-batt', 'o-laptop'),
    edge('oe9', 'o-batt', 'o-heater'),
    edge('oe10', 'o-batt', 'o-water'),
  ],
};

// ───────── Full-Time Off-Grid (48V) ─────────
const fulltime: Preset = {
  id: 'fulltime',
  name: 'Full-Time Off-Grid (48V)',
  description: 'Big 48V bank, 1200W solar, mini-split A/C, induction, full-time loads.',
  params: baseParams({
    sunlightHoursPerDay: 5,
    drivingHoursPerDay: 1,
    shorePowerHoursPerDay: 0,
    systemVoltage: 48,
  }),
  nodes: [
    node('f-solar', 'solar-400w', 40, 40, { quantity: 3 }),
    node('f-alt', 'victron-orion-12-48-25', 40, 240),
    node('f-mppt', 'victron-250-60', 320, 40),
    node('f-batt', 'eg4-ll-s-48v', 320, 220, { quantity: 2, parallelCount: 1 }),
    node('f-dcdc', 'dcdc-48-12-30a', 600, 80),
    node('f-inv', 'victron-multiplus-48-5000', 600, 240),
    node('f-ac', 'minisplit-48', 880, 40),
    node('f-induction', 'induction-cooktop', 880, 140),
    node('f-fridge', 'fridge-dometic-cfx', 880, 240),
    node('f-fan', 'maxxair-7500', 880, 340, { quantity: 2 }),
    node('f-lights', 'light-puck', 880, 440, { quantity: 12 }),
    node('f-laptop', 'laptop-charging', 880, 540, { quantity: 2 }),
    node('f-water', 'water-pump', 880, 640),
  ],
  edges: [
    edge('fe1', 'f-solar', 'f-mppt'),
    edge('fe2', 'f-mppt', 'f-batt'),
    edge('fe3', 'f-alt', 'f-batt'),
    edge('fe4', 'f-batt', 'f-inv'),
    edge('fe5', 'f-batt', 'f-dcdc'),
    edge('fe6', 'f-batt', 'f-ac'),
    edge('fe7', 'f-inv', 'f-induction'),
    edge('fe8', 'f-dcdc', 'f-fridge'),
    edge('fe9', 'f-dcdc', 'f-fan'),
    edge('fe10', 'f-dcdc', 'f-lights'),
    edge('fe11', 'f-dcdc', 'f-laptop'),
    edge('fe12', 'f-dcdc', 'f-water'),
  ],
};

// ───────── Winnebago Ekko 23B (Dual Lithionics) ─────────
const ekko23b: Preset = {
  id: 'ekko23b',
  name: 'Winnebago Ekko 23B',
  description: 'Dual 320Ah Lithionics, 530W solar, Balmar 170A alternator, Xantrex 2000W. 12V, ~8.2kWh.',
  params: baseParams({ sunlightHoursPerDay: 5, drivingHoursPerDay: 2 }),
  nodes: [
    node('ek-solar-215', 'solar-215w', 40, 40, { quantity: 2 }),
    node('ek-solar-100', 'solar-100w', 40, 180),
    node('ek-mppt', 'victron-100-30', 320, 40),
    node('ek-alt', 'balmar-170a', 40, 330),
    node('ek-shore', 'shore-30a', 40, 470),
    node('ek-batt', 'lithionics-320ah', 320, 230, { quantity: 2, seriesCount: 1, parallelCount: 1 }),
    node('ek-inv', 'xantrex-freedom-xc-2000', 600, 230),
    node('ek-fridge', 'fridge-dometic-cfx', 880, 40),
    node('ek-fan', 'maxxair-7500', 880, 160),
    node('ek-water', 'water-pump', 880, 280),
    node('ek-lights', 'light-puck', 880, 380, { quantity: 4 }),
    node('ek-phone', 'phone-charging', 880, 480),
    node('ek-laptop', 'laptop-charging', 880, 580),
  ],
  edges: [
    edge('eke1', 'ek-solar-215', 'ek-mppt'),
    edge('eke2', 'ek-solar-100', 'ek-mppt'),
    edge('eke3', 'ek-mppt', 'ek-batt'),
    edge('eke4', 'ek-alt', 'ek-batt'),
    edge('eke5', 'ek-shore', 'ek-inv'),
    edge('eke6', 'ek-batt', 'ek-inv'),
    edge('eke7', 'ek-batt', 'ek-fridge'),
    edge('eke8', 'ek-batt', 'ek-fan'),
    edge('eke9', 'ek-batt', 'ek-water'),
    edge('eke10', 'ek-batt', 'ek-lights'),
    edge('eke11', 'ek-batt', 'ek-phone'),
    edge('eke12', 'ek-batt', 'ek-laptop'),
  ],
};

export const PRESETS: Preset[] = [weekend, overland, fulltime, ekko23b];
