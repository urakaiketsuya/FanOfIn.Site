import { ELEMENT_COLORS } from "../lib/elementAppearance";

export default function ElementRail({ elements = [] }: { elements?: string[] }) {
  const colored = elements.filter((element) => element !== "NORM");
  const visible = colored.length > 0 ? colored : elements.length > 0 ? elements : ["NORM"];
  const colors = Array.from(new Set(visible.map((element) => ELEMENT_COLORS[element] ?? "var(--color-ctp-overlay1)")));
  const background = colors.length === 1
    ? colors[0]
    : `linear-gradient(to bottom, ${colors.map((color, index) => `${color} ${(index / colors.length) * 100}% ${((index + 1) / colors.length) * 100}%`).join(", ")})`;
  return <span data-component="ElementRail" aria-hidden="true" className="absolute inset-y-0 left-0 w-1" style={{ background }} />;
}
