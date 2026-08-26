import { useSyncExternalStore } from "react";

let pendingCount = 0;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

/** Increment the global in-flight counter — call when an async data source starts resolving. */
export function beginLoading(): void {
  pendingCount += 1;
  emit();
}

/** Decrement the global in-flight counter — call when an async data source resolves (or unmounts). */
export function endLoading(): void {
  if (pendingCount > 0) pendingCount -= 1;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): number {
  return pendingCount;
}

/**
 * True while any registered data source is still resolving. Backs the nav progress bar — a single
 * shared signal instead of each page hand-rolling its own "Loading…" text, so a slow fetch is
 * visible as a thin bar under the sticky header regardless of which page triggered it.
 */
export function useGlobalLoading(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot) > 0;
}
