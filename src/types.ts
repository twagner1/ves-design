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

export interface ComponentSpec {
  id: string;
  name: string;
  category: ComponentCategory;
  role: ComponentRole;
  icon: string;

  voltage?: number;

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
}

export interface GlobalParameters {
  sunlightHoursPerDay: number;
  shorePowerHoursPerDay: number;
  drivingHoursPerDay: number;
  solarDerating: number;
  systemVoltage: number;
}
