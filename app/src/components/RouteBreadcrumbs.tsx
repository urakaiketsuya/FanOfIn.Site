import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigationType } from 'react-router-dom';
import { ancestorBreadcrumbs, defaultBreadcrumbs, nextBreadcrumbs, routeLabel, type Breadcrumb } from '../lib/breadcrumbs';

const storageKey = (key: string, pathname: string) => `breadcrumbs:v2:${key}:${pathname}`;
function readTrail(key: string, pathname: string): Breadcrumb[] | undefined {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(storageKey(key, pathname)) ?? 'null');
    if (Array.isArray(value) && value.every(item => typeof item?.label === 'string' && typeof item?.to === 'string' && item.to.startsWith('/') && !item.to.startsWith('//'))) return value;
  } catch { /* Private browsing may disable storage. */ }
}
const pageTitle = (pathname: string) => Array.from(document.querySelectorAll('main h1')).find(heading => heading.getClientRects().length > 0)?.textContent?.trim() || routeLabel(pathname);

export default function RouteBreadcrumbs() {
  const location = useLocation();
  const navigation = useNavigationType();
  const [snapshot, setSnapshot] = useState(() => ({ location, trail: readTrail(location.key, location.pathname) ?? defaultBreadcrumbs(location.pathname) }));
  let trail = snapshot.trail;
  if (snapshot.location.key !== location.key) {
    trail = location.pathname === snapshot.location.pathname ? snapshot.trail
      : navigation === 'POP' ? readTrail(location.key, location.pathname) ?? defaultBreadcrumbs(location.pathname)
      : nextBreadcrumbs(snapshot.trail, { to: snapshot.location.pathname + snapshot.location.search + snapshot.location.hash, label: pageTitle(snapshot.location.pathname + snapshot.location.search) }, location.pathname);
    setSnapshot({ location, trail });
  }
  useEffect(() => {
    try { sessionStorage.setItem(storageKey(location.key, location.pathname), JSON.stringify(trail)); } catch { /* Best effort. */ }
  }, [location.key, location.pathname, trail]);
  const ancestors = ancestorBreadcrumbs(trail, location.pathname);
  if (ancestors.length === 0) return null;
  return <nav aria-label="Breadcrumb" className="mx-auto w-full max-w-7xl px-4 pt-3 sm:px-6 lg:px-8">
    <ol className="flex min-w-0 flex-wrap items-center gap-x-2 text-sm">
      {ancestors.map((crumb, index) => <li key={crumb.to} className="flex min-w-0 max-w-full items-center gap-2">
        {index > 0 && <span aria-hidden="true" className="text-ctp-overlay1">/</span>}
        <Link to={crumb.to} className="inline-flex min-h-12 min-w-12 items-center rounded px-1 text-ctp-blue underline-offset-4 hover:underline focus-visible:outline-2"><span className="min-w-0 [overflow-wrap:anywhere]">{crumb.label}</span></Link>
      </li>)}
    </ol>
  </nav>;
}
