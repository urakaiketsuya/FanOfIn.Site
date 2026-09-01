import { useEffect, useState } from "react";
import { useGlobalLoading } from "../lib/useGlobalLoading";
import { useSyncProgress } from "../lib/sync/SyncProvider";

/**
 * Indeterminate progress bar that sits on the sticky header's bottom border. Delayed ~120ms so a
 * fast cache hit (the common case, since published data is IndexedDB-backed) never flashes the bar;
 * only genuinely slow loads render it.
 */
export default function LoadingBar() {
  const pageLoading = useGlobalLoading();
  const { phase: syncPhase, fetched, total } = useSyncProgress();
  const loading = pageLoading || syncPhase === "syncing";
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

  const determinate = syncPhase === "syncing" && total !== null && total > 0;

  return (
    <div
      className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden"
      role="progressbar"
      aria-label="Loading"
      aria-valuenow={determinate ? fetched : undefined}
      aria-valuemin={determinate ? 0 : undefined}
      aria-valuemax={determinate ? total : undefined}
    >
      {determinate ? (
        <div
          className="h-full rounded-full bg-ctp-blue transition-[width] duration-200 ease-out"
          style={{ width: `${Math.min(100, (fetched / total) * 100)}%` }}
        />
      ) : (
        <div className="loading-bar-slide h-full w-1/3 rounded-full bg-ctp-blue" />
      )}
    </div>
  );
}
