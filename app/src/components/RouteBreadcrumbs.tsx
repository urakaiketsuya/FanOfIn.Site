import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigationType } from 'react-router-dom';
import { defaultBreadcrumbs, nextBreadcrumbs, routeLabel, type Breadcrumb } from '../lib/breadcrumbs';

function readTrail(key: string, pathname: string): Breadcrumb[] | undefined {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(`breadcrumbs:v1:${key}:${pathname}`) ?? 'null');
    if (Array.isArray(value) && value.every(item => typeof item?.label === 'string' && typeof item?.to === 'string' && item.to.startsWith('/') && !item.to.startsWith('//'))) return value;
  } catch { /* Private browsing may disable storage. */ }
}
const pageTitle = (pathname: string) => Array.from(document.querySelectorAll('main h1')).find(heading => heading.getClientRects().length > 0)?.textContent?.trim() || routeLabel(pathname);

export default function RouteBreadcrumbs() {
  const location = useLocation();
  const navigation = useNavigationType();
  const [snapshot, setSnapshot] = useState(() => ({ location, trail: readTrail(location.key, location.pathname) ?? defaultBreadcrumbs(location.pathname) }));
  const [title, setTitle] = useState(() => pageTitle(location.pathname));
  let trail = snapshot.trail;
  if (snapshot.location.key !== location.key) {
    trail = location.pathname === snapshot.location.pathname ? snapshot.trail
      : navigation === 'POP' ? readTrail(location.key, location.pathname) ?? defaultBreadcrumbs(location.pathname)
      : nextBreadcrumbs(snapshot.trail, { to: snapshot.location.pathname + snapshot.location.search + snapshot.location.hash, label: pageTitle(snapshot.location.pathname) }, location.pathname);
    setSnapshot({ location, trail });
  }
  useEffect(() => {
    try { sessionStorage.setItem(`breadcrumbs:v1:${location.key}:${location.pathname}`, JSON.stringify(trail)); } catch { /* Best effort. */ }
  }, [location.key, location.pathname, trail]);
  useEffect(() => {
    const update = () => setTitle(pageTitle(location.pathname));
    update();
    const observer = new MutationObserver(update);
    const main = document.getElementById('main-content');
    if (main) observer.observe(main, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [location.pathname]);
  if (location.pathname === '/') return null;
  return <nav aria-label="Breadcrumb" className="mx-auto w-full max-w-7xl px-4 pt-3 sm:px-6 lg:px-8">
    <ol className="flex min-w-0 flex-wrap items-center gap-x-2 text-sm">
      {trail.map(crumb => <li key={crumb.to} className="flex min-w-0 max-w-full items-center gap-2">
        <Link to={crumb.to} className="inline-flex min-h-12 min-w-12 items-center break-words rounded px-1 text-ctp-blue underline-offset-4 hover:underline focus-visible:outline-2">{crumb.label}</Link>
        <span aria-hidden="true" className="text-ctp-overlay1">/</span>
      </li>)}
      <li aria-current="page" className="min-w-0 break-words py-3 text-ctp-subtext1">{title || routeLabel(location.pathname)}</li>
    </ol>
  </nav>;
}
