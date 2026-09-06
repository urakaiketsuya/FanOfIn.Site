import { useCallback, useState } from "react";

const VIEW_MODE_STORAGE_KEY = "deckbuilder-view-mode-v1";

export type BuilderViewMode = "list" | "grid";

function loadViewMode(storageKey: string, defaultMode: BuilderViewMode): BuilderViewMode {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw === "grid" || raw === "list" ? raw : defaultMode;
  } catch {
    return defaultMode;
  }
}

function saveViewMode(mode: BuilderViewMode, storageKey: string): void {
  try {
    localStorage.setItem(storageKey, mode);
  } catch {
    // Private-browsing/storage-full edge cases can throw here — losing the saved preference
    // silently is strictly better than crashing the page over it.
  }
}

/** List vs. full-image grid for Material/Main/Sideboard on the Build tab — a durable per-browser
 * preference. Defaults to the existing list layout so this doesn't change anyone's view; a caller
 * with a different default surface (e.g. Deck Review, where the suggestion feed is the whole page
 * rather than one tab among several) can pass its own storage key and default without affecting
 * the Guided Deck Builder's own saved preference. */
export function useBuilderViewMode(storageKey: string = VIEW_MODE_STORAGE_KEY, defaultMode: BuilderViewMode = "list"): [BuilderViewMode, (mode: BuilderViewMode) => void] {
  const [mode, setMode] = useState<BuilderViewMode>(() => loadViewMode(storageKey, defaultMode));

  const setPersisted = useCallback((next: BuilderViewMode) => {
    setMode(next);
    saveViewMode(next, storageKey);
  }, [storageKey]);

  return [mode, setPersisted];
}
