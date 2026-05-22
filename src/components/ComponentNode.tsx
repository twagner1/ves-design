import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { DiagramNodeData } from '../types';
import { CATALOG_BY_ID } from '../data/catalog';

function ComponentNode({ data, selected }: NodeProps<DiagramNodeData>) {
  const spec = CATALOG_BY_ID[data.specId];
  if (!spec) {
    return <div className="ves-node ves-node--unknown">Unknown component</div>;
  }

  const roleClass = `ves-node--${spec.role}`;
  const qtyBadge = data.quantity > 1 ? `×${data.quantity}` : null;

  let detail: string | null = null;
  if (spec.role === 'storage') {
    detail = `${spec.capacityAh}Ah · ${spec.capacityWh}Wh`;
  } else if (spec.category === 'solar') {
    detail = `${spec.ratedWatts}W`;
  } else if (spec.role === 'source' || spec.role === 'conversion') {
    detail = spec.outputWatts ? `${spec.outputWatts}W` : spec.outputAmps ? `${spec.outputAmps}A` : null;
  } else if (spec.role === 'load' && spec.ratedWatts) {
    detail = `${spec.ratedWatts}W`;
  }

  return (
    <div className={`ves-node ${roleClass} ${selected ? 'ves-node--selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <div className="ves-node__icon" aria-hidden>{spec.icon}</div>
      <div className="ves-node__body">
        <div className="ves-node__name">{spec.name}</div>
        {detail && <div className="ves-node__detail">{detail}</div>}
      </div>
      {qtyBadge && <div className="ves-node__qty">{qtyBadge}</div>}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export default memo(ComponentNode);
