import { useEffect, useRef } from "react";
import type { Container } from "@tsparticles/engine";

let enginePromise: Promise<typeof import("@tsparticles/engine")["tsParticles"]> | undefined;

function loadEngine() {
  return enginePromise ??= Promise.all([
    import("@tsparticles/engine"),
    import("@tsparticles/basic"),
  ]).then(async ([{ tsParticles }, { loadBasic }]) => {
    await loadBasic(tsParticles);
    return tsParticles;
  }).catch((error: unknown) => {
    enginePromise = undefined;
    throw error;
  });
}

/** Decorative only: routes and controls never depend on the engine loading. */
export default function ParticleBackground() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;
    let generation = 0;
    let container: Container | undefined;

    async function syncMotion() {
      const current = ++generation;
      container?.destroy();
      container = undefined;
      if (reducedMotion.matches) return;

      try {
        const engine = await loadEngine();
        if (disposed || current !== generation) return;
        const colors = getComputedStyle(document.documentElement);
        const next = await engine.load({
          id: "body-particles",
          element: host!,
          options: {
            fullScreen: { enable: false },
            fpsLimit: 30,
            detectRetina: false,
            pauseOnBlur: true,
            pauseOnOutsideViewport: true,
            interactivity: { events: { onClick: { enable: false }, onHover: { enable: false } } },
            particles: {
              number: { value: 48, density: { enable: false } },
              color: { value: [
                colors.getPropertyValue("--catppuccin-color-blue").trim(),
                colors.getPropertyValue("--catppuccin-color-mauve").trim(),
              ] },
              shape: { type: "circle" },
              opacity: { value: { min: 0.12, max: 0.3 } },
              size: { value: { min: 1, max: 2 } },
              move: { enable: true, speed: 0.2, direction: "top", random: true, outModes: { default: "out" } },
            },
            responsive: [{ maxWidth: 768, options: { particles: { number: { value: 18 } } } }],
          },
        });
        if (disposed || current !== generation) next?.destroy();
        else container = next;
      } catch {
        // A failed optional background must not interrupt navigation or page data.
      }
    }

    void syncMotion();
    reducedMotion.addEventListener("change", syncMotion);
    return () => {
      disposed = true;
      generation++;
      reducedMotion.removeEventListener("change", syncMotion);
      container?.destroy();
    };
  }, []);

  return <div ref={hostRef} className="particle-background" aria-hidden="true" />;
}
