/** Static `/cards/*` routes that are app pages, not card slugs. */
export const RESERVED_CARD_SLUGS = new Set(["stats", "staples", "packages", "tags", "tagging", "spoilers", "banlist", "search-reference"]);

// Kept here, not in cardSeo.ts: build scripts load this file with plain Node type stripping.
export function isCardPageSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && !RESERVED_CARD_SLUGS.has(slug);
}

/** Directory-backed artist, card and tournament pages use the URL GitHub Pages serves directly. */
export function canonicalSiteUrl(pathname: string): string {
  let path = pathname.split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";
  // Preserve the app's existing case-sensitive champion names while normalizing old space URLs.
  path = path.replace(/^(\/champions\/)([^/]+)/, (_, base: string, name: string) => {
    try { return base + encodeURIComponent(decodeURIComponent(name).trim().replace(/\s+/g, "-")); }
    catch { return base + name; }
  });
  const card = /^\/cards\/([^/]+)$/.exec(path);
  const directory = (/^\/(?:champions(?:\/[^/]+(?:\/stats)?)?|archetypes(?:\/[a-z0-9]+)?|events(?:\/\d+)?)$/.test(path) && !["/archetypes/compare", "/archetypes/mine", "/archetypes/strategies"].includes(path)) || (path.toLowerCase() !== "/timelines/combos" && /^\/timelines(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?$/i.test(path)) || (/^\/decks\/[a-z0-9]{1,7}$/.test(path) && !["/decks/shared", "/decks/edit", "/decks/new", "/decks/draft"].includes(path)) || /^\/artists(?:\/[^/]+)?$/.test(path) || (card !== null && isCardPageSlug(card[1]));
  return `https://fanofin.site${directory ? `${path}/` : path}`;
}
