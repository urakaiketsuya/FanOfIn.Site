import { useEffect, useState } from "react";
import { useGlobalLoading } from "../lib/useGlobalLoading";

/**
 * Indeterminate progress bar that sits on the sticky header's bottom border. Delayed ~120ms so a
 * fast cache hit (the common case, since published data is IndexedDB-backed) never flashes the bar;
 * only genuinely slow loads render it.
 */
export default function LoadingBar() {
  const loading = useGlobalLoading();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!loading) {
      setVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setVisible(true), 120);
    return () => window.clearTimeout(timer);
  }, [loading]);

  if (!visible) return null;

  return (
    <div className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden" role="progressbar" aria-label="Loading">
      <div className="loading-bar-slide h-full w-1/3 rounded-full bg-ctp-blue" />
    </div>
  );
}
