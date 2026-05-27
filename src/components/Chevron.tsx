export function Chevron({ open, size = 12 }: { open: boolean; size?: number }) {
  return (
    <svg
      className={`chevron ${open ? 'chevron--open' : ''}`}
      width={size}
      height={size}
      viewBox="0 0 12 12"
      aria-hidden="true"
    >
      <path
        d="M2.5 4.5 L6 8 L9.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
