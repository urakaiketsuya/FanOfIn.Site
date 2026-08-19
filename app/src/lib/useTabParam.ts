import { useSearchParams } from "react-router-dom";

/**
 * Drop-in replacement for `useState` on a page's tab — backs the value with a `?tab=` query
 * param (functional `setSearchParams` update, so it composes safely with any other query param
 * the same page reads/writes) instead of local state, so a link can open directly on a specific
 * tab and the current tab is shareable/bookmarkable. Uses `replace` navigation so clicking through
 * tabs doesn't spam browser history. The param is omitted entirely when set back to `defaultTab`,
 * keeping default-tab URLs clean. An unrecognized or missing value falls back to `defaultTab`
 * rather than erroring, so a stale/bad link still renders something.
 */
export function useTabParam<T extends string>(paramName: string, validTabs: readonly T[], defaultTab: T): [T, (tab: T) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get(paramName);
  const tab = raw && (validTabs as readonly string[]).includes(raw) ? (raw as T) : defaultTab;

  function setTab(next: T) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (next === defaultTab) params.delete(paramName);
        else params.set(paramName, next);
        return params;
      },
      { replace: true },
    );
  }

  return [tab, setTab];
}
