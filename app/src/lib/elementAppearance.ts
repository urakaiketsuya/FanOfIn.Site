import type { CSSProperties } from "react";
import type { ProfileElement } from "@gatcg/shared";

export const ELEMENT_COLORS: Record<string, string> = {
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

export function profileAppearanceStyle(element?: ProfileElement): CSSProperties {
  return { "--identity-accent": element ? ELEMENT_COLORS[element] : "var(--catppuccin-color-blue)" } as CSSProperties;
}
