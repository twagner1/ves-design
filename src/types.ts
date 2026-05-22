export type ComponentCategory =
  | 'battery'
  | 'solar'
  | 'alternator'
  | 'converter'
  | 'inverter'
  | 'charge-controller'
  | 'shore-power'
  | 'outlet'
  | 'light'
  | 'appliance'
  | 'fan'
  | 'fridge'
  | 'water'
  | 'hvac';

export type ComponentRole =
  | 'source'
  | 'storage'
  | 'conversion'
  | 'distribution'
  | 'load';

export type CurrentType = 'DC' | 'AC' | 'either';

export interface ComponentSpec {
  id: string;
  name: string;
  category: ComponentCategory;
  role: ComponentRole;
  icon: string;

  currentType: CurrentType;
  systemVoltage?: 12 | 24 | 48 | 120 | 240;
  outputVoltage?: 12 | 24 | 48 | 120 | 240;

  capacityAh?: number;
  capacityWh?: number;
  usableFraction?: number;

  ratedWatts?: number;

  outputAmps?: number;
  outputWatts?: number;
  efficiency?: number;

  defaultHoursPerDay?: number;

  price: number;
  notes?: string;
}

export interface DiagramNodeData {
  specId: string;
  label: string;
  quantity: number;
  hoursPerDay?: number;
  seriesCount?: number;
  parallelCount?: number;
}

export interface GlobalParameters {
  sunlightHoursPerDay: number;
  shorePowerHoursPerDay: number;
  drivingHoursPerDay: number;
  solarDerating: number;
  systemVoltage: 12 | 24 | 48;
  simulationDays: number;
  startingSocPct: number;
}

export interface SavedDesign {
  id: string;
  name: string;
  savedAt: string;
  nodes: unknown;
  edges: unknown;
  params: GlobalParameters;
}
