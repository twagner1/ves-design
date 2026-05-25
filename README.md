# ves-design

**Van Electrical System Designer** — an interactive web app for visualizing
and sizing the electrical system of a class B camper van (Sprinter, Ford
Transit, Ram Promaster, etc.).

Drag components from the library onto a canvas, wire them together, and
watch a live power balance, multi-day battery-state-of-charge forecast,
and Bill of Materials update as you build.

## Features

- **Visual component library** with custom SVG illustrations per category.
  Searchable, filterable by 12V / 24V / 48V, and drag-and-drop onto the
  canvas. Covers batteries, solar panels, alternator chargers, MPPT
  controllers, inverter/chargers, DC-DC converters, shore power, busbars
  and distribution blocks, outlets, lights, fans, fridges, water pumps,
  HVAC, and appliances.
- **Wiring with gauge + run length** — every wire (edge) carries an
  editable AWG gauge and one-way run length. The app estimates the
  current each segment carries, then computes round-trip voltage drop
  and checks ampacity. Click a wire to edit it; new wires auto-suggest
  the smallest safe gauge. Edges are labeled `6 AWG · 5 ft` and turn red
  when over-ampacity.
- **Busbars & distribution** — Blue Sea busbars (+/−), Victron Lynx
  Distributor / Power In, blade fuse block, and a Class-T main fuse.
  Current through a busbar is summed from the loads one hop downstream.
- **Diagram canvas** built on [React Flow](https://reactflow.dev/).
  Components are color-coded by role and edges are colored by current
  type (blue = DC, yellow = AC, inferred from the components they connect).
- **Series/parallel battery banks** — set series and parallel counts
  per battery node. Effective bank voltage = base × series, capacity Ah
  = base × parallel. Mixed-voltage banks are flagged as errors.
- **Quantity grouping** — placed components keep a quantity; click
  "Expand to N nodes" to split a grouped node into independent nodes.
- **Configuration validation** — voltage-mismatch errors on edges,
  mixed-bus battery errors, inverter↔bus voltage compatibility, peak
  load vs. inverter capacity, solar vs. controller capacity, wire
  over-ampacity (error) and >3% voltage drop (warning).
- **Adjustable daily parameters** — peak-sun hours, shore-power hours,
  driving hours, solar derating, starting SoC, simulation length.
- **Live energy balance** — usable storage, daily consumption (DC/AC
  split), generation by source (solar/alternator/shore), net Wh, days
  of autonomy.
- **Multi-day SoC simulation** — hourly forecast over 1–14 days with a
  scrubbable SVG line chart. Tracks min/max/final SoC, full-charge hits,
  empty hits.
- **Preset library** — Weekend Warrior, Overlanding, Full-Time Off-Grid
  (48V) ready to load in one click.
- **Save / load designs** — named designs persisted to `localStorage`.
- **Bill of Materials** — grouped by category with running USD total,
  exportable to CSV.
- **Node inspector** — click any node to edit quantity, hours/day usage
  (for loads), or series/parallel configuration (for batteries).

## Stack

- Vite + React 19 + TypeScript
- React Flow for the diagram canvas
- Zustand for state
- Plain CSS (no UI framework)
- Inline SVG illustrations (no external image downloads — offline-friendly)

## Getting Started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
npm run lint     # ESLint
```

## Project Layout

```
src/
  data/
    catalog.ts          Component specs (price, watts, capacity, voltage)
    illustrations.tsx   SVG illustrations per category
    presets.ts          Weekend, Overlanding, Full-Time presets
    wire.ts             AWG gauge table (resistance + ampacity)
  lib/
    calculations.ts     Energy balance, voltage validation, wiring, BOM math
    simulator.ts        Hourly SoC simulation
    storage.ts          localStorage save/load
    csv.ts              BOM → CSV export
  store/
    diagramStore.ts     Zustand store for diagram + parameters
  components/
    Sidebar.tsx         Searchable component palette
    Canvas.tsx          React Flow canvas + AC/DC edge coloring
    ComponentNode.tsx   Custom node with illustration + bank badge
    Toolbar.tsx         Presets, Save, Load, Clear
    Parameters.tsx      Daily-use parameter sliders
    LiveStats.tsx       Live energy balance + warnings/errors
    Timeline.tsx        SoC chart over the simulation window
    Inspector.tsx       Node editor (qty/series/parallel/usage) + wire editor
    BillOfMaterials.tsx Grouped BOM with CSV export
  types.ts              Shared domain types
```

## Calculation notes

- **Solar generation** = panel-rated W × sunlight h/day × derating factor.
- **Alternator generation** = charger output W × driving h/day × efficiency.
- **Shore generation** is gated by an installed inverter/charger
  (MultiPlus 2000 → 960W, 3000 → 1440W, 48/3000 → 1680W, 48/5000 → 3360W).
  A standalone shore inlet without an inverter/charger falls back to ~480W.
- **Daily consumption** = Σ (load W × hours/day × quantity).
- **Days of autonomy** = usable storage Wh ÷ daily consumption Wh.
- **Wire voltage drop** = I × R, where I = segment power ÷ segment
  voltage and R = 2 × run-length × resistance-per-foot (round trip,
  positive + return conductor). Ampacity follows ABYC E-11 for 105°C
  insulation outside engine spaces; the auto-suggested gauge is the
  smallest with ampacity ≥ 1.25 × estimated current.
- **SoC simulation** runs at 1-hour resolution. Solar is shaped as a
  half-sine centered at noon, integrated to match the day's peak-sun
  hours; driving is a contiguous morning block; shore is a contiguous
  evening block; loads are spread evenly across 24h.

These are first-order estimates intended for early-stage planning. They
don't model battery temperature, charge curves, BMS limits, wiring
losses, or instantaneous peak loads beyond the included sizing warnings.

## License

MIT — see [LICENSE](./LICENSE).
