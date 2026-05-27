import type { ComponentCategory, ComponentSpec } from '../types';

interface IllustrationProps {
  size?: number;
  className?: string;
}

function S({ children, size = 64, className }: { children: React.ReactNode } & IllustrationProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role="img"
    >
      {children}
    </svg>
  );
}

export function BatteryIllustration(p: IllustrationProps & { voltage?: number }) {
  const v = p.voltage ?? 12;
  const color = v >= 48 ? '#9333ea' : v >= 24 ? '#06b6d4' : '#3b82f6';
  return (
    <S {...p}>
      <rect x="8" y="14" width="40" height="36" rx="3" fill="#0f172a" stroke={color} strokeWidth="2" />
      <rect x="48" y="22" width="6" height="6" fill={color} />
      <rect x="48" y="36" width="6" height="6" fill={color} />
      <rect x="12" y="20" width="32" height="6" rx="1" fill={color} opacity="0.85" />
      <rect x="12" y="29" width="22" height="6" rx="1" fill={color} opacity="0.65" />
      <rect x="12" y="38" width="14" height="6" rx="1" fill={color} opacity="0.4" />
      <text x="32" y="58" textAnchor="middle" fill={color} fontSize="9" fontWeight="700">
        {v}V
      </text>
    </S>
  );
}

export function SolarIllustration(p: IllustrationProps) {
  return (
    <S {...p}>
      <circle cx="48" cy="14" r="6" fill="#facc15" />
      <g stroke="#facc15" strokeWidth="1.5" strokeLinecap="round">
        <line x1="48" y1="2" x2="48" y2="6" />
        <line x1="56" y1="6" x2="58" y2="4" />
        <line x1="60" y1="14" x2="62" y2="14" />
      </g>
      <g transform="rotate(-12 32 38)">
        <rect x="6" y="24" width="52" height="28" rx="1" fill="#0c1b3a" stroke="#1d4ed8" strokeWidth="1.5" />
        <g stroke="#1d4ed8" strokeWidth="0.9">
          <line x1="6" y1="33" x2="58" y2="33" />
          <line x1="6" y1="43" x2="58" y2="43" />
          <line x1="19" y1="24" x2="19" y2="52" />
          <line x1="32" y1="24" x2="32" y2="52" />
          <line x1="45" y1="24" x2="45" y2="52" />
        </g>
      </g>
    </S>
  );
}

export function AlternatorIllustration(p: IllustrationProps) {
  return (
    <S {...p}>
      <circle cx="32" cy="32" r="20" fill="#0f172a" stroke="#22c55e" strokeWidth="2" />
      <g fill="#22c55e">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <rect
            key={deg}
            x="30"
            y="6"
            width="4"
            height="8"
            rx="1"
            transform={`rotate(${deg} 32 32)`}
          />
        ))}
      </g>
      <circle cx="32" cy="32" r="8" fill="#22c55e" />
      <circle cx="32" cy="32" r="3" fill="#0f172a" />
    </S>
  );
}

export function ChargeControllerIllustration(p: IllustrationProps) {
  return (
    <S {...p}>
      <rect x="8" y="14" width="48" height="36" rx="3" fill="#0f172a" stroke="#a855f7" strokeWidth="2" />
      <rect x="12" y="18" width="40" height="14" fill="#1e293b" stroke="#a855f7" strokeWidth="1" />
      <polyline
        points="14,28 20,22 26,26 32,21 38,25 44,20 50,24"
        fill="none"
        stroke="#a855f7"
        strokeWidth="1.5"
      />
      <circle cx="16" cy="42" r="2" fill="#22c55e" />
      <circle cx="24" cy="42" r="2" fill="#facc15" />
      <circle cx="32" cy="42" r="2" fill="#ef4444" />
    </S>
  );
}

export function InverterIllustration(p: IllustrationProps) {
  return (
    <S {...p}>
      <rect x="8" y="12" width="48" height="40" rx="3" fill="#0f172a" stroke="#a855f7" strokeWidth="2" />
      <path
        d="M16,32 Q22,18 28,32 T40,32 T52,32"
        fill="none"
        stroke="#facc15"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <text x="14" y="46" fill="#a855f7" fontSize="8" fontWeight="700">DC</text>
      <text x="42" y="46" fill="#facc15" fontSize="8" fontWeight="700">AC</text>
    </S>
  );
}

export function ConverterIllustration(p: IllustrationProps) {
  return (
    <S {...p}>
      <rect x="8" y="18" width="48" height="28" rx="3" fill="#0f172a" stroke="#a855f7" strokeWidth="2" />
      <text x="18" y="36" fill="#a855f7" fontSize="9" fontWeight="700">48V</text>
      <path d="M28,32 L36,32 M34,29 L36,32 L34,35" stroke="#a855f7" strokeWidth="1.5" fill="none" />
      <text x="38" y="36" fill="#3b82f6" fontSize="9" fontWeight="700">12V</text>
    </S>
  );
}

export function ShoreIllustration(p: IllustrationProps) {
  return (
    <S {...p}>
      <rect x="20" y="10" width="24" height="34" rx="3" fill="#0f172a" stroke="#3b82f6" strokeWidth="2" />
      <circle cx="28" cy="22" r="2.5" fill="#3b82f6" />
      <circle cx="36" cy="22" r="2.5" fill="#3b82f6" />
      <rect x="29" y="30" width="6" height="2" fill="#3b82f6" />
      <line x1="32" y1="44" x2="32" y2="58" stroke="#3b82f6" strokeWidth="2" />
      <path d="M22,58 L42,58" stroke="#3b82f6" strokeWidth="2" />
    </S>
  );
}

export function BusbarIllustration(p: IllustrationProps) {
  return (
    <S {...p}>
      <rect x="6" y="26" width="52" height="12" rx="2" fill="#0f172a" stroke="#ef4444" strokeWidth="2" />
      <g fill="#ef4444">
        <circle cx="14" cy="32" r="3" />
        <circle cx="26" cy="32" r="3" />
        <circle cx="38" cy="32" r="3" />
        <circle cx="50" cy="32" r="3" />
      </g>
      <g stroke="#64748b" strokeWidth="2" strokeLinecap="round">
        <line x1="14" y1="26" x2="14" y2="16" />
        <line x1="26" y1="38" x2="26" y2="48" />
        <line x1="38" y1="26" x2="38" y2="16" />
        <line x1="50" y1="38" x2="50" y2="48" />
      </g>
    </S>
  );
}

export function OutletIllustration(p: IllustrationProps) {
  return (
    <S {...p}>
      <rect x="12" y="8" width="40" height="48" rx="6" fill="#0f172a" stroke="#64748b" strokeWidth="2" />
      <rect x="26" y="18" width="3" height="10" fill="#64748b" rx="1" />
      <rect x="35" y="18" width="3" height="10" fill="#64748b" rx="1" />
      <circle cx="32" cy="42" r="3" fill="#64748b" />
    </S>
  );
}

export function LightIllustration(p: IllustrationProps) {
  return (
    <S {...p}>
      <circle cx="32" cy="26" r="14" fill="#facc15" opacity="0.25" />
      <path
        d="M22,28 A10,10 0 1 1 42,28 L40,38 L24,38 Z"
        fill="#facc15"
        stroke="#eab308"
        strokeWidth="1.5"
      />
      <rect x="26" y="40" width="12" height="4" fill="#94a3b8" />
      <rect x="27" y="46" width="10" height="3" fill="#94a3b8" />
      <rect x="28" y="51" width="8" height="3" fill="#94a3b8" />
    </S>
  );
}

export function FanIllustration(p: IllustrationProps) {
  return (
    <S {...p}>
      <circle cx="32" cy="32" r="22" fill="#0f172a" stroke="#06b6d4" strokeWidth="2" />
      <g fill="#06b6d4">
        {[0, 90, 180, 270].map((deg) => (
          <path
            key={deg}
            d="M32,32 Q40,18 32,12 Q24,18 32,32"
            transform={`rotate(${deg} 32 32)`}
          />
        ))}
      </g>
      <circle cx="32" cy="32" r="4" fill="#0f172a" />
    </S>
  );
}

export function FridgeIllustration(p: IllustrationProps) {
  return (
    <S {...p}>
      <rect x="16" y="6" width="32" height="52" rx="3" fill="#0f172a" stroke="#06b6d4" strokeWidth="2" />
      <line x1="16" y1="24" x2="48" y2="24" stroke="#06b6d4" strokeWidth="1.5" />
      <rect x="44" y="10" width="2" height="8" fill="#06b6d4" />
      <rect x="44" y="30" width="2" height="14" fill="#06b6d4" />
      <text x="32" y="42" textAnchor="middle" fill="#06b6d4" fontSize="11">❄</text>
    </S>
  );
}

export function WaterIllustration(p: IllustrationProps) {
  return (
    <S {...p}>
      <path
        d="M32,8 Q44,28 44,40 A12,12 0 1 1 20,40 Q20,28 32,8 Z"
        fill="#3b82f6"
        opacity="0.9"
      />
      <ellipse cx="28" cy="40" rx="3" ry="6" fill="#fff" opacity="0.3" />
    </S>
  );
}

export function HvacIllustration(p: IllustrationProps) {
  return (
    <S {...p}>
      <g stroke="#06b6d4" strokeWidth="2" strokeLinecap="round">
        <line x1="32" y1="6" x2="32" y2="58" />
        <line x1="6" y1="32" x2="58" y2="32" />
        <line x1="13" y1="13" x2="51" y2="51" />
        <line x1="51" y1="13" x2="13" y2="51" />
      </g>
      <circle cx="32" cy="32" r="6" fill="#06b6d4" />
    </S>
  );
}

export function ApplianceIllustration(p: IllustrationProps) {
  return (
    <S {...p}>
      <rect x="10" y="10" width="44" height="44" rx="4" fill="#0f172a" stroke="#f97316" strokeWidth="2" />
      <rect x="16" y="16" width="32" height="20" fill="#1e293b" stroke="#f97316" strokeWidth="1" />
      <circle cx="22" cy="46" r="3" fill="#f97316" />
      <circle cx="32" cy="46" r="3" fill="#f97316" opacity="0.6" />
      <circle cx="42" cy="46" r="3" fill="#f97316" opacity="0.3" />
    </S>
  );
}

const CATEGORY_RENDERERS: Record<
  ComponentCategory,
  (props: IllustrationProps & { voltage?: number }) => React.ReactElement
> = {
  battery: BatteryIllustration,
  solar: SolarIllustration,
  alternator: AlternatorIllustration,
  'charge-controller': ChargeControllerIllustration,
  inverter: InverterIllustration,
  converter: ConverterIllustration,
  'shore-power': ShoreIllustration,
  busbar: BusbarIllustration,
  outlet: OutletIllustration,
  light: LightIllustration,
  fan: FanIllustration,
  fridge: FridgeIllustration,
  water: WaterIllustration,
  hvac: HvacIllustration,
  appliance: ApplianceIllustration,
};

export function Illustration({
  spec,
  size = 56,
  className,
}: {
  spec: ComponentSpec;
  size?: number;
  className?: string;
}) {
  const Renderer = CATEGORY_RENDERERS[spec.category];
  return <Renderer size={size} className={className} voltage={spec.systemVoltage} />;
}
