import Button from "./ui/Button";

export type CardLayout = "Grid" | "Rows" | "List";

/** Shared touch and keyboard targets for compatible card collections. */
export default function CardLayoutControls({ value, onChange }: {
  value: CardLayout;
  onChange: (value: CardLayout) => void;
}) {
  return <div role="group" aria-label="Card layout" className="flex flex-wrap gap-1">
    {(["Grid", "Rows", "List"] as const).map(layout => <Button key={layout} aria-pressed={value === layout} variant={value === layout ? "primary" : "secondary"} onClick={() => onChange(layout)}>{layout}</Button>)}
  </div>;
}
