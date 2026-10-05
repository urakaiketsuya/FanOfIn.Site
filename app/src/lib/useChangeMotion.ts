import { useEffect, useRef } from "react";

/** Animate committed display changes without remounting inputs or their drafts. */
export function useChangeMotion<T extends HTMLElement>(value: string | number, emphasis: "fade" | "highlight" = "fade") {
  const ref = useRef<T>(null);
  const previous = useRef(value);
  useEffect(() => {
    const changed = previous.current !== value;
    previous.current = value;
    const element = ref.current;
    if (!changed || !element || !element.animate) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (preference.matches) return;
    const background = getComputedStyle(element).backgroundColor;
    const animation = element.animate(emphasis === "fade"
      ? [{ opacity: 0.55 }, { opacity: 1 }]
      : [{ backgroundColor: `color-mix(in srgb, var(--catppuccin-color-blue) 20%, ${background})` }, { backgroundColor: background }],
    { duration: emphasis === "fade" ? 180 : 220, easing: "ease-out" });
    const stop = () => { if (preference.matches) animation.cancel(); };
    preference.addEventListener("change", stop);
    return () => { animation.cancel(); preference.removeEventListener("change", stop); };
  }, [value, emphasis]);
  return ref;
}
