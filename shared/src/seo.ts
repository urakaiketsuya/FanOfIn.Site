/** Public app routes with generated entry documents. Personal tools stay out of search. */
export const PUBLIC_PAGE_ROUTES = [
  ['/cards', 'Grand Archive Card Database', 'Search Grand Archive cards by name, class, element and set.'],
  ['/cards/stats', 'Grand Archive Card Statistics', 'Explore card usage across published Grand Archive tournament decks.'],
  ['/cards/staples', 'Grand Archive Deck Staples', 'Find frequently played cards in published Grand Archive tournament decks.'],
  ['/cards/spoilers', 'Grand Archive Card Spoilers', 'Browse revealed Grand Archive cards and their printed rules.'],
  ['/cards/banlist', 'Grand Archive Banlist', 'Check card restrictions for Grand Archive deck building.'],
  ['/cards/search-reference', 'Card Search Reference', 'Search Grand Archive cards using names, costs, types and other card fields.'],
  ['/cards/packages', 'Grand Archive Card Packages', 'Explore groups of cards used together in Grand Archive decks.'],
  ['/stores', 'Grand Archive Stores', 'Find Grand Archive tournament stores and their recorded events.'],
  ['/thema', 'Grand Archive Thema', 'Explore Grand Archive Thema editions and competition history.'],
  ['/seasons', 'Grand Archive Seasons', 'Browse Grand Archive tournament seasons and recorded events.'],
  ['/players', 'Grand Archive Players', 'Explore player profiles and Grand Archive tournament results.'],
  ['/teams', 'Grand Archive Teams', 'Browse recorded team competition results in Grand Archive.'],
  ['/achievements', 'Grand Archive Achievements', 'Explore tournament and player achievement categories.'],
  ['/battle-chart', 'Grand Archive Battle Chart', 'Compare champion matchups from recorded Grand Archive competition.'],
  ['/metagame', 'Grand Archive Metagame', 'Explore champions and archetypes in published tournament decks.'],
  ['/decks', 'Grand Archive Decks', 'Browse Grand Archive tournament builds and community decklists.'],
  ['/decks/shared', 'Shared Grand Archive Decks', 'Discover published Grand Archive community decklists.'],
  ['/pantheon', 'Grand Archive Pantheon Decks', 'Browse community Grand Archive decks for the Pantheon format.'],
  ['/compare', 'Compare Grand Archive Decks', 'Compare Grand Archive decklists and the cards they share.'],
  ['/official-decks', 'Official Grand Archive Decks', 'Explore official starter and Re:Collection decklists and primers.'],
  ['/products', 'Grand Archive Products', 'Browse Grand Archive sets, product releases and card collections.'],
  ['/merchandise', 'Grand Archive Merchandise', 'Browse Grand Archive merchandise and published collections.'],
  ['/cards/tags', 'Community Tag Galleries', 'Explore Grand Archive cards by character, artwork, theme and gameplay tags.'],
  ['/archetypes/strategies', 'Published Grand Archive Strategies', 'Explore published strategy definitions and their card packages.'],
  ['/methodology', 'How the Numbers Work', 'Understand the sources and scope of Fan of Insight tournament and deck statistics.'],
  ['/docs/api', 'Fan of Insight Public API', 'Read the public API reference for Grand Archive card statistics and archetypes.'],
  ['/changelog', 'Fan of Insight Changelog', 'Read recent updates to Fan of Insight.'],
  ['/timelines/combos', 'Grand Archive Match Combos', 'Explore card combinations in reviewed Grand Archive match timelines.'],
] as const;
export const PUBLIC_PAGE_PATHS: ReadonlySet<string> = new Set(PUBLIC_PAGE_ROUTES.map(([route]) => route));
export const STORY_PAGE_PATHS: ReadonlySet<string> = new Set([
  "/story", "/story/homeworld", "/story/cambria", "/story/azoth", "/story/sanguo",
  "/story/underland", "/story/radiant-origins", "/story/asphodel",
]);
export function isPublicEntryPath(path: string): boolean {
  return PUBLIC_PAGE_PATHS.has(path) || STORY_PAGE_PATHS.has(path) || /^\/seasons\/[a-z0-9-]+$/.test(path) || /^\/official-decks\/[a-z0-9-]+\/primer$/.test(path);
}

export const STATIC_SITEMAP_ROUTES = [...new Set([
  "/", "/artists", "/events", "/archetypes", "/champions", "/timelines",
  ...STORY_PAGE_PATHS,
  ...PUBLIC_PAGE_ROUTES.map(([route]) => route),
])];

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
  const directory = isPublicEntryPath(path) || (/^\/(?:champions(?:\/[^/]+(?:\/stats)?)?|archetypes(?:\/[a-z0-9]+)?|events(?:\/\d+)?)$/.test(path) && !["/archetypes/compare", "/archetypes/mine", "/archetypes/strategies"].includes(path)) || (path.toLowerCase() !== "/timelines/combos" && /^\/timelines(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?$/i.test(path)) || (/^\/decks\/[a-z0-9]{1,7}$/.test(path) && !["/decks/shared", "/decks/edit", "/decks/new", "/decks/draft"].includes(path)) || /^\/artists(?:\/[^/]+)?$/.test(path) || (card !== null && isCardPageSlug(card[1]));
  return `https://fanofin.site${directory ? `${path}/` : path}`;
}
