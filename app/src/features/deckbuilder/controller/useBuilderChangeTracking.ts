import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import type { ChangeLogEntry } from "../model/builderTypes";
import type { SuggestedBuild } from "../useSuggestedBuild";

export interface PendingBuilderAction {
  label: string;
  subject: string | null;
}

/** Associates a user action with the recommendation changes produced by the next build. */
export function useBuilderChangeTracking(
  build: SuggestedBuild,
  setChangeLog: Dispatch<SetStateAction<ChangeLogEntry[]>>,
) {
  const pendingActionRef = useRef<PendingBuilderAction | null>(null);
  const previousSuggestedRef = useRef<Set<string> | null>(null);
  const previousWinRateRef = useRef<number | null>(null);

  useEffect(() => {
    const current = new Set(
      [...build.material, ...build.main].filter((card) => !card.locked).map((card) => card.cardName),
    );
    const pending = pendingActionRef.current;
    const previous = previousSuggestedRef.current;
    const previousWinRate = previousWinRateRef.current;
    if (previous && pending) {
      const added = Array.from(current).filter((name) => !previous.has(name) && name !== pending.subject);
      const removed = Array.from(previous).filter((name) => !current.has(name) && name !== pending.subject);
      const winRateDelta = previousWinRate !== null && build.conditionalWinRate !== null
        ? build.conditionalWinRate - previousWinRate
        : null;
      setChangeLog((log) => [{ label: pending.label, added, removed, winRateDelta }, ...log].slice(0, 25));
    }
    previousSuggestedRef.current = current;
    previousWinRateRef.current = build.conditionalWinRate;
    pendingActionRef.current = null;
  }, [build, setChangeLog]);

  const resetChangeTracking = useCallback(() => {
    pendingActionRef.current = null;
    previousSuggestedRef.current = null;
    previousWinRateRef.current = null;
  }, []);

  return { pendingActionRef, resetChangeTracking };
}
