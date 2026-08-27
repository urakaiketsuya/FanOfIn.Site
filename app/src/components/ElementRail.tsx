const ELEMENT_RAIL_COLORS: Record<string, string> = {
  // Saturation-weighted colors sampled from the official 50×50 CDN element icons. The small
  // white mix offsets the icons' dark shading/metal rims so a 4px rail remains legible.
  ARCANE: "color-mix(in srgb, #1c73b7 78%, white)",
  ASTRA: "color-mix(in srgb, #353367 72%, white)",
  CRUX: "color-mix(in srgb, #2462a2 74%, white)",
  EXALTED: "color-mix(in srgb, #c8af8c 86%, white)",
  EXIA: "color-mix(in srgb, #7b1a19 68%, white)",
  FIRE: "color-mix(in srgb, #93412c 72%, white)",
  LUXEM: "color-mix(in srgb, #ba9141 82%, white)",
  NEOS: "color-mix(in srgb, #bb893a 80%, white)",
  NORM: "#8b8988",
  TERA: "color-mix(in srgb, #256050 70%, white)",
  UMBRA: "color-mix(in srgb, #3d2a5c 68%, white)",
  WATER: "color-mix(in srgb, #236fb6 76%, white)",
  WIND: "color-mix(in srgb, #4e9343 78%, white)",
};

export default function ElementRail({ elements = [] }: { elements?: string[] }) {
  const colored = elements.filter((element) => element !== "NORM");
  const visible = colored.length > 0 ? colored : elements.length > 0 ? elements : ["NORM"];
  const colors = Array.from(new Set(visible.map((element) => ELEMENT_RAIL_COLORS[element] ?? "var(--color-ctp-overlay1)")));
  const background = colors.length === 1
    ? colors[0]
    : `linear-gradient(to bottom, ${colors.map((color, index) => `${color} ${(index / colors.length) * 100}% ${((index + 1) / colors.length) * 100}%`).join(", ")})`;
  return <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1" style={{ background }} />;
}
