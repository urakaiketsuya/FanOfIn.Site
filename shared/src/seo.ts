/** Static `/cards/*` routes that are app pages, not card slugs. */
export const RESERVED_CARD_SLUGS = new Set(["stats", "staples", "packages", "tags", "tagging"]);

// Kept here, not in cardSeo.ts: build scripts load this file with plain Node type stripping.
export function isCardPageSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && !RESERVED_CARD_SLUGS.has(slug);
}

/** Directory-backed artist, card and tournament pages use the URL GitHub Pages serves directly. */
export function canonicalSiteUrl(pathname: string): string {
  const path = pathname.split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";
  const card = /^\/cards\/([^/]+)$/.exec(path);
  const directory = /^\/decks\/[a-z0-9]{1,7}$/.test(path) || /^\/artists(?:\/[^/]+)?$/.test(path) || (card !== null && isCardPageSlug(card[1]));
  return `https://fanofin.site${directory ? `${path}/` : path}`;
}
