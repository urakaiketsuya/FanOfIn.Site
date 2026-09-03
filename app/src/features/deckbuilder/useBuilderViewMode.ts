import { useCallback, useState } from "react";

const VIEW_MODE_STORAGE_KEY = "deckbuilder-view-mode-v1";

export type BuilderViewMode = "list" | "grid";

function loadViewMode(): BuilderViewMode {
  try {
    const raw = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    return raw === "grid" ? "grid" : "list";
  } catch {
    return "list";
  }
}

function saveViewMode(mode: BuilderViewMode): void {
  try {
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
  } catch {
    // Private-browsing/storage-full edge cases can throw here — losing the saved preference
    // silently is strictly better than crashing the page over it.
  }
}

/** List vs. full-image grid for Material/Main/Sideboard on the Build tab — a durable per-browser
 * preference, defaulting to the existing list layout so this doesn't change anyone's view. */
export function useBuilderViewMode(): [BuilderViewMode, (mode: BuilderViewMode) => void] {
  const [mode, setMode] = useState<BuilderViewMode>(loadViewMode);

  const setPersisted = useCallback((next: BuilderViewMode) => {
    setMode(next);
    saveViewMode(next);
  }, []);

  return [mode, setPersisted];
}
