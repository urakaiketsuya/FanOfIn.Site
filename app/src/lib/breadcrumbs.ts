import { NAV_ENTRIES } from './navigation';

export interface Breadcrumb { to: string; label: string }
const links = NAV_ENTRIES.flatMap(entry => entry.kind === 'group' ? entry.links : entry.external ? [] : [entry]);
const pathname = (to: string) => to.split(/[?#]/)[0].replace(/\/+$/, '') || '/';

export function routeLabel(to: string): string {
  const path = pathname(to);
  return (links.find(link => link.to === to) ?? links.find(link => link.to === path))?.label
    ?? (path === '/' ? 'Home' : 'Details');
}
export function defaultBreadcrumbs(path: string): Breadcrumb[] {
  if (path === '/') return [];
  const parent = links.filter(link => !link.to.includes('?') && path.startsWith(`${link.to}/`)).sort((a, b) => b.to.length - a.to.length)[0];
  return [{ to: '/', label: 'Home' }, ...(parent ? [parent] : [])];
}
/** Keep the actual source URL, trim loops, and avoid turning primary navigation into a history log. */
export function nextBreadcrumbs(previous: Breadcrumb[], source: Breadcrumb, destination: string): Breadcrumb[] {
  const path = pathname(destination);
  const existing = previous.findIndex(crumb => pathname(crumb.to) === path);
  if (existing >= 0) return previous.slice(0, existing);
  if (links.some(link => pathname(link.to) === path) || path === '/') return defaultBreadcrumbs(path);
  const trail = [...previous.filter(crumb => pathname(crumb.to) !== pathname(source.to)), source];
  return trail.length > 4 ? [trail[0], ...trail.slice(-3)] : trail;
}

export function ancestorBreadcrumbs(trail: Breadcrumb[], currentPath: string): Breadcrumb[] {
  return trail.filter(crumb => pathname(crumb.to) !== pathname(currentPath));
}
