import { useCallback } from 'react';
import { createSearchParams, useLocation, useSearchParams, type SetURLSearchParams } from 'react-router-dom';

/** BrowserRouter updates history before its transition renders. Merge against that latest URL. */
export function useBrowseParams(): ReturnType<typeof useSearchParams> {
  const [params, setParams] = useSearchParams();
  const { pathname } = useLocation();
  const update: SetURLSearchParams = useCallback((next, options) => {
    const current = window.location.pathname === pathname ? new URLSearchParams(window.location.search) : params;
    const before = current.toString();
    const updated = createSearchParams(typeof next === 'function' ? next(current) : next);
    if (updated.toString() !== before) setParams(updated, { preventScrollReset: true, ...options });
  }, [params, pathname, setParams]);
  return [params, update];
}
