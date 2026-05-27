import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { DiagramNodeData } from '../types';
import { CATALOG_BY_ID } from '../data/catalog';
import { Illustration } from '../data/illustrations';
import { batteryBankStats } from '../lib/calculations';

function ComponentNode({ data, selected }: NodeProps<DiagramNodeData>) {
  const spec = CATALOG_BY_ID[data.specId];
  if (!spec) {
    return <div className="ves-node ves-node--unknown">Unknown component</div>;
  }

  const roleClass = `ves-node--${spec.role}`;
  const qtyBadge = data.quantity > 1 ? `×${data.quantity}` : null;

  let detail: string | null = null;
  let bankBadge: string | null = null;
  if (spec.role === 'storage') {
    const stats = batteryBankStats(spec, data);
    detail = `${stats.bankAh}Ah · ${(stats.bankWh / 1000).toFixed(2)}kWh · ${stats.bankVoltage}V`;
    if (stats.series > 1 || stats.parallel > 1) {
      bankBadge = `${stats.series}S${stats.parallel}P`;
    }
  } else if (spec.category === 'solar') {
    detail = `${spec.ratedWatts}W`;
  } else if (spec.role === 'source' || spec.role === 'conversion') {
    detail = spec.outputWatts
      ? `${spec.outputWatts}W`
      : spec.outputAmps
        ? `${spec.outputAmps}A`
        : null;
  } else if (spec.role === 'load' && spec.ratedWatts) {
    detail = `${spec.ratedWatts}W`;
  }

  return (
    <div className={`ves-node ${roleClass} ${selected ? 'ves-node--selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <div className="ves-node__illustration">
        <Illustration spec={spec} size={48} />
      </div>
      <div className="ves-node__body">
        <div className="ves-node__name">{spec.name}</div>
        {detail && <div className="ves-node__detail">{detail}</div>}
        {bankBadge && <div className="ves-node__bank">{bankBadge}</div>}
      </div>
      {qtyBadge && <div className="ves-node__qty">{qtyBadge}</div>}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export default memo(ComponentNode);
