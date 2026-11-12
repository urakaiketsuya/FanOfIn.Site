import { useEffect, useRef } from "react";

/** Homepage entrances run once, when their content first enters the viewport. */
export function useHomeReveal<T extends HTMLElement>(ready = true) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || !ready || element.dataset.revealed) return;
    if (!("IntersectionObserver" in window)) {
      element.dataset.revealed = "true";
      return;
    }
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      element.dataset.revealed = "true";
      observer.disconnect();
    }, { threshold: 0.15 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ready]);
  return ref;
}
