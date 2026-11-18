import type { CardGridSize } from "../lib/cardGridSize";

export default function CardGridSizeControl({ value, onChange }: {
  value: CardGridSize;
  onChange: (value: CardGridSize) => void;
}) {
  return <label className="flex items-center gap-2 text-sm">Grid size<select value={value} onChange={event => onChange(event.target.value as CardGridSize)} className="min-h-control rounded border border-ctp-surface1 bg-ctp-base px-2 focus-visible:outline-2 focus-visible:outline-ctp-blue"><option value="large">Large</option><option value="medium">Medium</option><option value="compact">Compact</option></select></label>;
}
