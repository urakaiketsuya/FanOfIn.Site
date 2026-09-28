import { useCallback, useSyncExternalStore } from 'react';
import { liveQuery } from 'dexie';

/** One IndexedDB subscription and snapshot per resource, shared by all mounted consumers. */
export function createSharedLiveQuery<T>(query: () => Promise<T>, initial: T) {
  let snapshot = initial;
  let subscription: {unsubscribe: () => void} | undefined;
  const listeners = new Set<() => void>();
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    if (!subscription) subscription = liveQuery(query).subscribe({
      next(value) { snapshot = value; for (const notify of listeners) notify(); },
      error(reason) { console.error('Local cache read failed', reason); },
    });
    return () => {
      listeners.delete(listener);
      if (!listeners.size) {subscription?.unsubscribe(); subscription = undefined; snapshot = initial;}
    };
  };
  return function useSharedQuery(enabled = true): T {
    const listen = useCallback((listener: () => void) => enabled ? subscribe(listener) : () => {}, [enabled]);
    const read = useCallback(() => enabled ? snapshot : initial, [enabled]);
    return useSyncExternalStore(listen, read, read);
  };
}
