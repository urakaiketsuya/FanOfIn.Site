import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { syncCards, type SyncProgress } from "./cards";

const initialProgress: SyncProgress = { phase: "idle", fetched: 0, total: null };

const SyncContext = createContext<SyncProgress>(initialProgress);

export function SyncProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<SyncProgress>(initialProgress);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    syncCards(setProgress).catch((err: unknown) => {
      console.error("card sync failed", err);
      setProgress((p) => ({ ...p, phase: "error" }));
    });
  }, []);

  return <SyncContext.Provider value={progress}>{children}</SyncContext.Provider>;
}

export function useSyncProgress(): SyncProgress {
  return useContext(SyncContext);
}
