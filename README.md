# ves-design

**Van Electrical System Designer** — an interactive web app for visualizing
and sizing the electrical system of a class B camper van (Sprinter, Ford
Transit, Ram Promaster, etc.).

Drag components from the library onto a canvas, wire them together, and
watch a live power, storage, consumption, generation, and cost summary
update as you build.

## Features

- **Visual component library** — batteries, solar panels, alternator
  chargers, MPPT controllers, inverter/chargers, DC-DC converters, shore
  power, outlets, lights, fans, fridges, water pumps, HVAC, and common
  appliances. Search and drag onto the canvas.
- **Diagram canvas** — drag-and-drop nodes, connect components with edges
  to model the flow of power. Built on [React Flow](https://reactflow.dev/).
- **Adjustable daily parameters**
  - Effective peak-sun hours per day
  - Hours per day on shore power
  - Hours per day driving (alternator charging)
  - Solar derating factor
- **Live energy balance**
  - Usable battery storage (Wh)
  - Daily consumption from all loads (with per-load hours/day)
  - Daily generation broken out into solar / alternator / shore
  - Net daily Wh and days of autonomy
  - Sizing warnings (controller too small, no inverter for AC loads, etc.)
- **Bill of Materials** — grouped by category with quantities, unit
  prices, subtotals, and a grand total in USD.
- **Node inspector** — click a component to edit quantity and (for loads)
  hours used per day.

## Stack

- Vite + React 19 + TypeScript
- React Flow for the diagram canvas
- Zustand for state
- Plain CSS (no UI framework)

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
  data/catalog.ts       Component specs (price, watts, capacity, etc.)
  lib/calculations.ts   Energy balance + BOM math
  store/diagramStore.ts Zustand store for the diagram + parameters
  components/
    Sidebar.tsx         Searchable component palette (draggable)
    Canvas.tsx          React Flow canvas
    ComponentNode.tsx   Custom node renderer
    Parameters.tsx      Sunlight / shore / driving sliders
    LiveStats.tsx       Energy balance, load breakdown, warnings
    NodeInspector.tsx   Per-node quantity + usage editor
    BillOfMaterials.tsx Grouped BOM with running totals
  types.ts              Shared domain types
```

## Calculation notes

- **Solar generation** = panel-rated W × sunlight h/day × derating factor.
- **Alternator generation** = charger output W × driving h/day × efficiency.
- **Shore generation** is gated by an installed inverter/charger
  (MultiPlus 2000 → ~960W, 3000 → ~1440W). A standalone shore inlet without
  an inverter/charger falls back to an assumed 40A converter (~480W).
- **Daily consumption** = Σ (load rated W × hours/day × quantity).
- **Days of autonomy** = usable storage Wh ÷ daily consumption Wh.

These are first-order estimates intended for early-stage planning. They
don't model battery temperature, charge curves, BMS limits, AC vs DC
wiring losses, or instantaneous peak loads beyond the included sizing
warnings.

## License

MIT — see [LICENSE](./LICENSE).
