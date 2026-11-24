import { CALCULATORS_ENABLED } from "./archivedCalculators";
import { DISCORD_INVITE_URL } from "./communityLinks";

export interface NavLinkItem { to: string; label: string }
interface NavGroup { kind: "group"; label: string; paths: string[]; links: NavLinkItem[] }
interface NavFlatLink { kind: "link"; to: string; label: string; external?: boolean; icon?: "discord" }
export type NavEntry = NavGroup | NavFlatLink;

export const NAV_ENTRIES: NavEntry[] = [
  {
    kind: "group", label: "Cards",
    paths: ["/cards", "/artists", "/card-discovery"],
    links: [
      { to: "/cards", label: "Browse Cards" },
      { to: "/cards/search-reference", label: "Search Reference" },
      { to: "/cards/spoilers", label: "Spoilers" },
      { to: "/cards/banlist", label: "Banlist" },
      { to: "/cards/staples", label: "Card Staples" },
      { to: "/cards/stats", label: "Top Cards" },
      { to: "/cards/packages", label: "Card Packages" },
      { to: "/card-discovery", label: "Find New Cards" },
      { to: "/artists", label: "Artists" },
    ],
  },
  { kind: "link", to: "/champions", label: "Champions" },
  { kind: "link", to: "/archetypes", label: "Archetypes" },
  {
    kind: "group", label: "Decks",
    paths: ["/decks", "/pantheon/decks", "/official-decks", "/compare", "/deck-builder", "/deck-analysis", "/deck-review"],
    links: [
      { to: "/decks", label: "Browse Decks" },
      { to: "/decks/edit", label: "My Decks" },
      { to: "/decks/new", label: "Create Deck" },
      { to: "/compare", label: "Compare Decks" },
      { to: "/deck-analysis", label: "Deck Report" },
      { to: "/deck-review", label: "Improve Deck" },
      { to: "/pantheon/decks", label: "Pantheon Decks" },
      { to: "/official-decks", label: "Official Product Decks" },
    ],
  },
  {
    kind: "group", label: "Competition",
    paths: ["/metagame", "/events", "/seasons", "/players", "/teams", "/timelines", "/regions", "/stores"],
    links: [
      { to: "/metagame", label: "Metagame" },
      { to: "/events", label: "Browse Events" },
      { to: "/seasons", label: "Seasons" },
      { to: "/players", label: "Players" },
      { to: "/players?tab=judges", label: "Judges" },
      { to: "/teams", label: "Teams" },
      { to: "/timelines", label: "Match Timelines" },
      { to: "/regions", label: "Regional Analysis" },
      { to: "/stores", label: "Store Locator" },
    ],
  },
  {
    kind: "group", label: "Collection",
    paths: ["/collection", "/card-locations", "/looking-for", "/products", "/merchandise", "/packs"],
    links: [
      { to: "/collection", label: "My Collection" },
      { to: "/card-locations", label: "Card Locations" },
      { to: "/looking-for", label: "Trading Binder" },
      { to: "/products", label: "Products" },
      { to: "/merchandise", label: "Merchandise" },
    ],
  },
  {
    kind: "group", label: "Tools",
    paths: ["/combo-lab", "/combos", "/goldfish", "/life-tracker", "/match-log"],
    links: [
      ...(CALCULATORS_ENABLED ? [{ to: "/combo-lab", label: "Combo Lab" }] : []),
      { to: "/goldfish", label: "Goldfish Test" },
      { to: "/life-tracker", label: "Life Tracker" },
      { to: "/match-log", label: "Match Log" },
    ],
  },
  {
    kind: "group", label: "Account",
    paths: ["/account", "/settings"],
    links: [
      { to: "/account", label: "Edit profile" },
      { to: "/settings", label: "Settings" },
    ],
  },
  { kind: "link", to: DISCORD_INVITE_URL, label: "Join Discord", external: true, icon: "discord" },
];

const matchesPath = (pathname: string, path: string) => pathname === path || pathname.startsWith(`${path}/`);

export function entryIsActive(entry: NavEntry, pathname: string) {
  return entry.kind === "link" ? matchesPath(pathname, entry.to) : entry.paths.some(path => matchesPath(pathname, path));
}

/** Query-specific siblings take precedence; unrelated browse filters retain the parent link. */
export function linkIsActive(pathname: string, search: string, to: string) {
  const target = new URL(to, "https://navigation.local");
  if (pathname !== target.pathname) return false;
  const current = new URLSearchParams(search);
  const queryMatches = (url: URL) => Array.from(url.searchParams).every(([key, value]) => current.get(key) === value);
  if (target.search) return queryMatches(target);
  return !NAV_ENTRIES.flatMap(entry => entry.kind === "group" ? entry.links : [entry]).some(link => {
    const sibling = new URL(link.to, target.origin);
    return sibling.pathname === pathname && !!sibling.search && queryMatches(sibling);
  });
}
