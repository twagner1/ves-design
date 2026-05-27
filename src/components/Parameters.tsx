import { useDiagramStore } from '../store/diagramStore';
import CollapsiblePanel from './CollapsiblePanel';

interface SliderRow {
  label: string;
  help: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (v: number) => void;
}

function SliderRow({ label, help, value, min, max, step, suffix, onChange }: SliderRow) {
  return (
    <div className="param-row">
      <div className="param-row__head">
        <label className="param-row__label">{label}</label>
        <span className="param-row__value">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      <p className="param-row__help">{help}</p>
    </div>
  );
}

export default function Parameters() {
  const params = useDiagramStore((s) => s.params);
  const setParams = useDiagramStore((s) => s.setParams);

  return (
    <CollapsiblePanel title="Daily Use Parameters">
        <SliderRow
          label="Sunlight"
          help="Effective peak-sun hours your panels collect on an average day."
          value={params.sunlightHoursPerDay}
          min={0}
          max={10}
          step={0.5}
          suffix=" h/day"
          onChange={(v) => setParams({ sunlightHoursPerDay: v })}
        />
        <SliderRow
          label="Shore Power"
          help="Hours per day you're plugged into a campground or garage outlet."
          value={params.shorePowerHoursPerDay}
          min={0}
          max={24}
          step={0.5}
          suffix=" h/day"
          onChange={(v) => setParams({ shorePowerHoursPerDay: v })}
        />
        <SliderRow
          label="Driving"
          help="Hours per day the engine is running — drives the alternator charger."
          value={params.drivingHoursPerDay}
          min={0}
          max={12}
          step={0.5}
          suffix=" h/day"
          onChange={(v) => setParams({ drivingHoursPerDay: v })}
        />
        <SliderRow
          label="Solar Derating"
          help="Real-world solar output as a fraction of nameplate (shading, angle, heat). 0.75 is typical."
          value={params.solarDerating}
          min={0.4}
          max={1}
          step={0.05}
          suffix="×"
          onChange={(v) => setParams({ solarDerating: v })}
        />
    </CollapsiblePanel>
  );
}
