import { useEffect, useState } from "react";

/**
 * Holds the last value that's been stable for `delayMs` — for a value that updates in a rapid
 * burst (e.g. the card-catalog sync's `useLiveQuery` emitting a new array on every ~50-card write
 * batch, see `app/src/lib/sync/cards.ts`) feeding an expensive downstream computation that
 * shouldn't redo its work on every single intermediate update.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
