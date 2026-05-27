import { useState, type ReactNode } from 'react';
import { Chevron } from './Chevron';

interface CollapsiblePanelProps {
  title: string;
  headerRight?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

export default function CollapsiblePanel({
  title,
  headerRight,
  defaultOpen = true,
  children,
}: CollapsiblePanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="panel">
      <header className="panel__header">
        <button
          type="button"
          className="panel__toggle"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <Chevron open={open} />
          <h2>{title}</h2>
        </button>
        {headerRight ? <div className="panel__header-right">{headerRight}</div> : null}
      </header>
      {open ? <div className="panel__body">{children}</div> : null}
    </section>
  );
}
