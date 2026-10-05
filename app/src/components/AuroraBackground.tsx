import { useEffect, useRef } from "react";

/** Ambient light stays behind content and never captures pointer or keyboard input. */
export default function AuroraBackground() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const syncVisibility = () => { host.dataset.paused = String(document.hidden); };
    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);
    return () => document.removeEventListener("visibilitychange", syncVisibility);
  }, []);

  return <div ref={hostRef} className="aurora-background" aria-hidden="true" />;
}
