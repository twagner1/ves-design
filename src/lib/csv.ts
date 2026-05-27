import type { Bom } from './calculations';

function escape(value: string | number): string {
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function bomToCsv(bom: Bom): string {
  const rows = [
    ['Item', 'Category', 'Quantity', 'Unit Price (USD)', 'Subtotal (USD)'],
    ...bom.lines.map((l) => [l.name, l.category, l.quantity, l.unitPrice, l.total]),
    [],
    ['', '', '', 'TOTAL', bom.total],
  ];
  return rows.map((r) => r.map(escape).join(',')).join('\r\n');
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
