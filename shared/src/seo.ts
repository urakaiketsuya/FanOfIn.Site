/** Directory-backed tournament pages use the URL GitHub Pages serves directly. */
export function canonicalSiteUrl(pathname: string): string {
  const path = pathname.split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";
  return `https://fanofin.site${/^\/decks\/[a-z0-9]{1,7}$/.test(path) ? `${path}/` : path}`;
}
