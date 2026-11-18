import { NAV_ENTRIES } from './navigation';

export interface Breadcrumb { to: string; label: string }
const links = NAV_ENTRIES.flatMap(entry => entry.kind === 'group' ? entry.links : entry.external ? [] : [entry]);
export function routeLabel(path: string): string {
  const known = links.find(link => link.to === path);
  if (known) return known.label;
  if (path === '/') return 'Home';
  try { return decodeURIComponent(path.split('/').filter(Boolean).at(-1) ?? '').replace(/-/g, ' '); }
  catch { return 'Details'; }
}
export function defaultBreadcrumbs(path: string): Breadcrumb[] {
  if (path === '/') return [];
  const parent = links.filter(link => !link.to.includes('?') && path.startsWith(`${link.to}/`)).sort((a, b) => b.to.length - a.to.length)[0];
  return [{ to: '/', label: 'Home' }, ...(parent ? [parent] : [])];
}
/** Keep the actual source URL, trim loops, and avoid turning primary navigation into a history log. */
export function nextBreadcrumbs(previous: Breadcrumb[], source: Breadcrumb, destination: string): Breadcrumb[] {
  const path = destination.split(/[?#]/)[0];
  const existing = previous.findIndex(crumb => crumb.to.split(/[?#]/)[0] === path);
  if (existing >= 0) return previous.slice(0, existing);
  if (links.some(link => link.to.split('?')[0] === path) || path === '/') return defaultBreadcrumbs(path);
  const trail = [...previous.filter(crumb => crumb.to.split(/[?#]/)[0] !== source.to.split(/[?#]/)[0]), source];
  return trail.length > 4 ? [trail[0], ...trail.slice(-3)] : trail;
}
