import type { CardGridSize } from "../lib/cardGridSize";
import Button from "./ui/Button";

export default function CardGridSizeControl({ value, onChange }: {
  value: CardGridSize;
  onChange: (value: CardGridSize) => void;
}) {
  return <div role="group" aria-label="Grid size" className="flex flex-wrap items-center gap-2">
    <span className="text-sm">Grid size</span>
    <div className="flex flex-wrap gap-1">
      {(["large", "medium", "compact"] as const).map(size => <Button
        key={size}
        aria-pressed={value === size}
        variant={value === size ? "primary" : "secondary"}
        onClick={() => onChange(size)}
      >{size === "large" ? "Large" : size === "medium" ? "Medium" : "Compact"}</Button>)}
    </div>
  </div>;
}
