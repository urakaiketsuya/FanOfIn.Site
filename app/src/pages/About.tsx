import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { AccountUser, OmnidexDecklist } from "@gatcg/shared";
import ClassIcon from "../components/ClassIcon";
import ElementIcon from "../components/ElementIcon";
import CardImage from "../components/CardImage";
import CardHoverPreview from "../components/CardHoverPreview";
import DonutChart, { buildChartSegments } from "../components/DonutChart";
import BarChart from "../components/BarChart";
import ComparisonGrid from "../features/compare/ComparisonGrid";
import type { ComparedDeck } from "../features/compare/types";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { useFeaturedSets } from "../features/sets/useFeaturedSets";
import { latestBoosterSet } from "../features/packs/boosterSets";
import PackOpenerWidget from "../features/packs/PackOpenerWidget";
import { accountApi } from "../lib/accountApi";
import { useCardsByNames } from "../features/events/useCardsByNames";
import { computeAggressionForecast } from "../lib/aggressionForecast";
import AggressionForecast from "../features/decks/AggressionForecast";
import HypergeometricCalculator from "../features/deckbuilder/HypergeometricCalculator";

const CLASS_ROW = ["WARRIOR", "MAGE", "CLERIC", "ASSASSIN", "RANGER", "TAMER", "GUARDIAN"];
const ELEMENT_ROW = ["FIRE", "WATER", "WIND", "CRUX", "UMBRA", "EXALTED", "LUXEM", "TERA"];

interface FeatureGroup {
  title: string;
  items: string[];
  example: { to: string; label: string };
}

const FEATURES: FeatureGroup[] = [
  {
    title: "Cards",
    items: [
      "Full catalog synced locally — search and filter by class, type, subtype, element, set, or artist with no repeat network calls",
      "By Set tab: every expansion, browsable — jump straight into a set's own printings",
      "Pricing per card, plus a decklist's total and priciest cards",
      "Usage & win rate, sortable by usage, raw/adjusted win rate, or recency (\"Hot\")",
      "Win rate by copy count on a card's own page — does 4x actually win more than 2x?",
      "Deck Composition: win rate by what share of the main deck one card type makes up, on Card Stats",
      "Related cards: what's played alongside it, top decks, and most unique decks running it, plus a quick-compare tool right on the page",
      "Same effect shape: cards with a matching ability template (numbers aside), for comparing cost and stats side by side",
      "References, referenced-by, and format legality",
    ],
    example: { to: "/cards/fan-of-insight", label: "Fan of Insight" },
  },
  {
    title: "Tournaments",
    items: [
      "Omnidex events — standings, pairings, decklists, and judges",
      "Live lookup for in-progress events, not just completed ones",
      "Browsable by season, grouped by card-legality window — each season page has its own Champions/Builds meta tabs",
    ],
    example: { to: "/events/60488", label: "Grand Archive 2026 Worlds" },
  },
  {
    title: "Players",
    items: [
      "Elo ratings reconstructed from Omnidex's own per-match deltas",
      "Full event history and notable upsets",
      "Deck history: every Champion played and most-used cards",
      "13,000+ rated players, paginated and searchable by username",
      "Judges tab: certified judges sortable by level and experience — a judge who also competes shows up under one unified profile, not split across two",
      "One click from any decklist to compare it against that Champion's best-performing deck, or its top named build",
      "Rivals: most-played opponents, ranked by worst win rate against them first",
    ],
    example: { to: "/players/5390", label: "elothere" },
  },
  {
    title: "Teams",
    items: [
      "3v3 team-format registrations, browsable per event — similarly-named teams are never merged together by mistake",
      "Filterable by event type and season, searchable by team or player",
    ],
    example: { to: "/teams", label: "Browse Teams" },
  },
  {
    title: "Achievements",
    items: [
      "Badges computed automatically — tournament tiers, rating milestones, playstyle, dedication, and judging",
      "Every badge reflects real, verified performance — nothing hand-picked",
    ],
    example: { to: "/achievements/won-worlds", label: "Won Worlds" },
  },
  {
    title: "Champions",
    items: [
      "Card-image-first Synergy page: a Level/print selector, most-used cards by type, and champion-agnostic archetype Packages",
      "New Releases: cards from the newest set connected to this Champion's own most-played cards",
      "Deep-dive Stats tab: performance broken down season by season, most-played cards by deck section",
      "Named Spirit companions tracked with full Champion-style stats of their own",
      "Bonus Cards tab: every card with an effect that specifically triggers or improves for this Champion",
    ],
    example: { to: "/champions/Guo-Jia", label: "Guo Jia" },
  },
  {
    title: "Archetypes",
    items: [
      "Named builds clustered from real decklists by similarity, not hand-picked ahead of time",
      "Card Impact: which cards (including sideboard tech) actually correlate with a higher win rate for a given build",
      "Card Impact scoped to a specific matchup, from real pairing outcomes — plus the inverse: which of the opponent's cards tend to beat you",
      "Meta share, top-cut rate, average finishing placement, and average deck price per build",
      "Full battle chart: matchup matrix, by-Champion view, and closest/most-lopsided highlights",
      "Sample decklists and defining cards per build",
    ],
    example: { to: "/archetypes/1oi8ut8", label: "Tera Silvie" },
  },
  {
    title: "Browse Decks",
    items: [
      "By Build: every distinct decklist grouped by exact main+material list, including one-off brews — filter to just the ones independently run by 2+ players, by Champion, element, or the specific cards it runs",
      "By Sighting: every public tournament sighting — 56,000+ and counting — filterable by Champion, class, keyword, season, event type, and outcome",
      "Ranked by a tier-weighted placement score, not just raw finish, so a strong finish at a big event outranks a small one",
      "Flags netdecked lists (identical builds from other players) and \"tough finish\" upsets (a strong record that still missed the cut)",
      "Max-price filter and a cheapest-first sort, to find budget decks with strong finishes",
      "Dedicated page per build: composition donuts, priciest cards, a popularity trend, and similar decks — one click loads the whole decklist into a TCGplayer cart",
    ],
    example: { to: "/decks/xenbr4", label: "A top Silvie build" },
  },
  {
    title: "My Decks & Collection",
    items: [
      "Save, rename, version, tag, and share your own Standard or Pantheon decklists from a mobile-friendly deck library",
      "Import an experienced player's Omnidex history in bulk — search and filter the preview, choose exact lists, or keep only their latest deck per Champion",
      "Track physical and proxy copies, import or export CSV, and undo recent collection changes",
      "Add a saved, tournament, Pantheon, or official-product deck straight to your collection, with optional sideboard cards",
      "Build a set quickly by assigning quantities to every card of selected rarities at once",
      "Backfill collection quantities from imported Omnidex decklists without double-counting repeated cards, capped at four copies per unique card",
      "Check deck readiness and missing copies anywhere a decklist appears, then prioritize owned cards—or restrict suggestions to owned cards—in the Guided Deck Builder",
    ],
    example: { to: "/my-decks", label: "Open My Decks" },
  },
  {
    title: "Community & Pantheon Decks",
    items: [
      "Community deck-building trends — what people actually build, not tournament results — plus Sleeved.gg, our recommended place to build and share Grand Archive decks",
      "Standard and Pantheon are classified, disclosed, and analyzed separately — unknown-format lists never contaminate either population",
      "Browse locally stored Pantheon lists by Champion, card, or Boon, then open the full deck page for visual decklist, composition, and readiness views",
      "Champion and element popularity across 20,000+ decks",
      "Top cards by inclusion rate, and a price distribution — both filterable to one Champion's own decks",
      "Recurring exact Standard builds, plus fuzzy Pantheon strategy shells with defining cards and Champion breakdowns",
    ],
    example: { to: "/pantheon", label: "Open Pantheon Decks" },
  },
  {
    title: "Official Product Decks",
    items: [
      "Starter, Re:Collection, and Pantheon product decklists stored directly on Fan of Insight",
      "Products ordered by release date, with dedicated filters and Champion artwork",
      "Expand complete lists with separate Boon and Token sections, or open them as regular deck pages for composition and readiness analytics",
      "Select two to four products and send them directly into the deck comparison workspace",
      "Copy, buy, export, playtest, or tune a printed list in the Guided Deck Builder",
    ],
    example: { to: "/official-decks", label: "Browse Official Products" },
  },
  {
    title: "Regions",
    items: [
      "Archetypes, Champions, Card Composition, and Keywords broken out by where events were held",
      "Group by country, or by a broader region (North America, Southeast Asia, ...)",
      "Card and keyword composition shown as over/under-represented vs. the overall meta, not just raw usage",
      "Compare Regions: two regions side by side across all four tabs at once",
    ],
    example: { to: "/regions", label: "Open Regions" },
  },
  {
    title: "Compare",
    items: [
      "Decks: search by cards they run, import any player's submitted decklist, browse top decks by placement or named build, or paste one that was never even submitted to Omnidex",
      "Side-by-side grid highlighting shared vs. unique cards, with price and win rate per deck, plus Tabletop Simulator export",
      "Suggests cards for whichever compared deck has the lowest win rate, scoped to its own Champion",
      "Cards: line up any number of individual cards' usage, win rate, and price — one card is fine, it just shows its own numbers",
      "Share link: copies a URL that reopens the exact same compared decks for anyone you send it to",
      "Format badges and mixed-format warnings; Pantheon comparisons withhold Standard tournament tuning evidence",
    ],
    example: { to: "/compare", label: "Open Compare" },
  },
  {
    title: "Guided Deck Builder",
    items: [
      "Pick a Champion and Spirit, get a build assembled from the highest win-rate card at every slot — not one example decklist",
      "Or paste a decklist directly — Champion, Spirit, and every section (including sideboard) are detected and locked in automatically",
      "Lock in your own picks (or search and add any card) and the rest re-ranks around them, with editable copy counts",
      "Quantities optimized toward each card's own win-rate-by-copy-count curve, and ranked sideboard suggestions, not just locked-only",
      "\"Cards that might help\" (ranked, unplaced picks) and \"Cards that might hurt\" (locked picks with a real negative lift) as swap-in ideas",
      "Composition suggestions on the Stats tab — is your Ally/Action/etc. share in a range that actually wins more?",
      "A running log of exactly how each pick shifted the rest of the suggestions",
      "Share link: copies a URL that reopens this exact Champion/Spirit and every locked-in card",
      "Pantheon mode uses format-separated community adoption, singleton copy limits, and format-aware validation",
      "Experimental Simulator source: a disclosed community shell with anonymous Clarent card evidence layered in only when enough games and resolvable card IDs exist",
    ],
    example: { to: "/deck-builder", label: "Open Guided Deck Builder" },
  },
  {
    title: "Deck Review",
    items: [
      "A deliberately smaller sibling to the Guided Deck Builder — nothing is ever added for you automatically",
      "Pick a Champion and Spirit, or paste a decklist you already have, then accept, swap, or dismiss one ranked suggestion at a time",
      "Even the Champion print and Spirit themselves start as suggestions, not committed picks",
      "Suggested additions default to the full card-art grid, so you can see exactly what you're adding",
    ],
    example: { to: "/deck-review", label: "Open Deck Review" },
  },
];

const WALKTHROUGH_HASH = "xenbr4";

/**
 * Pre-baked snapshot of a real popular deck (Silvie, /decks/xenbr4) — computing this live via
 * useDeckPopularity() meant fetching + client-side decoding the full deck-card-index dataset
 * (90MB+, every popular deck in the game) just to extract one deck's composition, which was the
 * dominant load time on this page once it became the home page. Values captured directly from
 * that page's own rendered output; re-capture (see git history for the exact commit) if a future
 * pipeline regen shifts this deck's stats enough to matter.
 */
const WALKTHROUGH_DECK = {
  championName: "Silvie",
  classes: ["TAMER", "MAGE"],
  elements: ["TERA", "WIND"],
  playerCount: 51,
  eventCount: 20,
  bestPlacement: 4,
  avgWinRate: 0.37,
  championImage: "/cards/images/tiptrzblqr.jpg",
};

const WALKTHROUGH_TYPE_SEGMENTS = buildChartSegments(
  new Map([
    ["ALLY", 40],
    ["ACTION", 16],
    ["ITEM", 12],
    ["REGALIA", 8],
    ["CHAMPION", 4],
    ["UNIQUE", 2],
  ]),
);

const WALKTHROUGH_RESERVE_BARS = [
  { label: "0", value: 0 },
  { label: "1", value: 7 },
  { label: "2", value: 34 },
  { label: "3", value: 19 },
  { label: "4", value: 0 },
  { label: "5", value: 0 },
  { label: "6", value: 0 },
  { label: "7", value: 0 },
  { label: "8+", value: 0 },
];

/**
 * Same "pre-baked, no live fetch" reasoning as WALKTHROUGH_DECK above — captured directly from
 * /archetypes/gidbxg?tab=impact, this build's own full-field Card Impact (not matchup-scoped).
 * "Water Diao Chan (Fractal of Insight)" is a genuinely small, "emerging"-confidence archetype (17
 * decks, 10 players, 15 events) — picked for this walkthrough because its name is a nice callback
 * to the site's own, not because it's the biggest sample available; the small-sample caveat below
 * is real, not boilerplate. Archetype cluster IDs are re-derived by the clustering pipeline and
 * aren't stable long-term — if this example's own link ever breaks, re-capture from a currently-real
 * cluster (grep data/analysis/archetype-taxonomy.json for a "Fractal of Insight" name match first;
 * don't just refresh the numbers on the old id).
 */
const WALKTHROUGH_CARD_IMPACT = {
  clusterId: "gidbxg",
  clusterName: "Water Diao Chan (Fractal of Insight)",
  deckCount: 17,
  cards: [
    { name: "Water Resonance Bauble", slug: "water-resonance-bauble", image: "/cards/images/vvmdvbkuht.jpg", role: "Mixed", winRateWith: 0.651, winRateWithout: 0.303, lift: 0.137 },
    { name: "Dissonant Fractal", slug: "dissonant-fractal", image: "/cards/images/ve2xbe3gbp.jpg", role: "Main", winRateWith: 0.676, winRateWithout: 0.408, lift: 0.119 },
    { name: "Quicksilver Grail", slug: "quicksilver-grail", image: "/cards/images/6oyti67l58.jpg", role: "Material", winRateWith: 0.660, winRateWithout: 0.424, lift: 0.105 },
    { name: "Lost in Thought", slug: "lost-in-thought", image: "/cards/images/v0lut4793k.jpg", role: "Main", winRateWith: 0.673, winRateWithout: 0.441, lift: 0.102 },
    { name: "Viridian Protective Trinket", slug: "viridian-protective-trinket", image: "/cards/images/ydupmu6gvm.jpg", role: "Sideboard", winRateWith: 0.643, winRateWithout: 0.441, lift: 0.090 },
    { name: "Turbo Charge", slug: "turbo-charge", image: "/cards/images/c16bn55g9b.jpg", role: "Main", winRateWith: 0.662, winRateWithout: 0.488, lift: 0.068 },
  ],
};

/**
 * A real decklist from the same "Water Diao Chan (Fractal of Insight)" cluster (deckId 32243:2150,
 * canonical hash 8qjzzs) — feeds the actual `computeAggressionForecast`/`HypergeometricCalculator`
 * live below, rather than faking their output. Deliberately not the cluster's best-performing
 * sighting (8qjzzs's own real record is a modest 24th-place finish, 3 sightings) — picked because
 * it's the deck this cluster's own defining-card list was captured from, so its Fractal count lines
 * up with the "Burst Asunder off Fractals" scaling-damage example the forecast component calls out
 * by name. Verified: this deck runs 4x Burst Asunder plus 18 total Fractal-subtype cards, so the
 * forecast's "combo-scaling copies" callout is real for this exact list, not incidental.
 */
const WALKTHROUGH_DAMAGE_HASH = "8qjzzs";
const WALKTHROUGH_DAMAGE_MAIN: { name: string; quantity: number }[] = [
  { name: "Fast Cure", quantity: 4 },
  { name: "Fractal of Insight", quantity: 4 },
  { name: "Gildas, Chronicler of Aesa", quantity: 2 },
  { name: "Shimmering Refraction", quantity: 4 },
  { name: "Unstable Fractal", quantity: 3 },
  { name: "Zhang Jiao, Way of Peace", quantity: 4 },
  { name: "Burst Asunder", quantity: 4 },
  { name: "Captivating Opulence", quantity: 1 },
  { name: "Fractal of Intrusion", quantity: 3 },
  { name: "Fractal of Rain", quantity: 4 },
  { name: "Fractal of Refreshment", quantity: 3 },
  { name: "Fractal of Snow", quantity: 4 },
  { name: "Fracturize", quantity: 4 },
  { name: "Frostsworn Paladin", quantity: 4 },
  { name: "Glimmering Refusal", quantity: 4 },
  { name: "Jianyu, Fate's Premonition", quantity: 1 },
  { name: "Refracting Missile", quantity: 4 },
  { name: "Throne-Keeper Bullfrog", quantity: 3 },
];
const WALKTHROUGH_DAMAGE_MATERIAL: { name: string; quantity: number }[] = [
  { name: "Minthe, Spirit of Water", quantity: 1 },
  { name: "Diao Chan, Enchantress", quantity: 1 },
  { name: "Backup Charger", quantity: 1 },
  { name: "Censer of Restful Peace", quantity: 1 },
  { name: "Fire Resonance Bauble", quantity: 1 },
  { name: "Nullifying Lantern", quantity: 1 },
  { name: "Portentous Tanggu", quantity: 1 },
  { name: "Sacramental Rite", quantity: 1 },
  { name: "Scepter of Fascination", quantity: 1 },
  { name: "Tariff Ring", quantity: 1 },
  { name: "Crystalline Mirror", quantity: 1 },
  { name: "Wand of Frost", quantity: 1 },
];
const WALKTHROUGH_DAMAGE_ALL_NAMES = [...WALKTHROUGH_DAMAGE_MAIN, ...WALKTHROUGH_DAMAGE_MATERIAL].map((l) => l.name);

/**
 * Same "pre-baked, no live fetch" reasoning as every other walkthrough constant above — captured
 * directly from /deck-builder (Diao Chan + Spirit of Wind, 47 matching decks). The point of this
 * feature is that it assembles a build from real data rather than showing one example decklist, so
 * this is a real assembled-material-deck slice, not a hand-picked "best of" list.
 */
const WALKTHROUGH_DECK_BUILDER = {
  championName: "Diao Chan",
  spiritName: "Spirit of Wind",
  matchingDecks: 47,
  cards: [
    { name: "Diao Chan, Enchantress", slug: "diao-chan-enchantress", image: "/cards/images/0ueslsle3w.jpg", lift: null },
    { name: "Grand Crusader's Ring", slug: "grand-crusaders-ring", image: "/cards/images/ioxgugw9r9.jpg", lift: 0.136 },
    { name: "Smoke Bombs", slug: "smoke-bombs", image: "/cards/images/porhmr2lkv.jpg", lift: 0.121 },
    { name: "Backup Charger", slug: "backup-charger", image: "/cards/images/3apypgzedx.jpg", lift: 0.081 },
    { name: "Nullifying Lantern", slug: "nullifying-lantern", image: "/cards/images/t6kxtm8eed.jpg", lift: 0.072 },
  ] as { name: string; slug: string; image: string; lift: number | null }[],
};

/** Same "pre-baked, no live fetch" reasoning as WALKTHROUGH_DECK above — captured from the two real, independently popular Silvie builds at /decks/xenbr4 and /decks/1xiwetk. */
const COMPARE_CHAMPION_NAME = "Silvie";

const COMPARE_DECK_1: OmnidexDecklist = {
  main: [
    { card: "Baby Gray Slime", quantity: 4 },
    { card: "Blissful Calling", quantity: 4 },
    { card: "Dungeon Guide", quantity: 4 },
    { card: "Escape the Wreckage", quantity: 3 },
    { card: "Forest Cake", quantity: 4 },
    { card: "Limitless Slime", quantity: 4 },
    { card: "Baby Red Slime", quantity: 4 },
    { card: "Gather Slimes", quantity: 4 },
    { card: "Baby Green Slime", quantity: 4 },
    { card: "Slimeshield", quantity: 3 },
    { card: "Storm Slime", quantity: 4 },
    { card: "Ethereal Slime", quantity: 4 },
    { card: "Lustrous Slime", quantity: 3 },
    { card: "Gaia's Songbird", quantity: 3 },
    { card: "Ordinary Bear", quantity: 3 },
    { card: "Twilight Slime", quantity: 1 },
    { card: "Hymn of Gaia's Grace", quantity: 2 },
    { card: "Slime King", quantity: 2 },
  ],
  material: [
    { card: "Spirit of Slime", quantity: 1 },
    { card: "Silvie, Wilds Whisperer", quantity: 1 },
    { card: "Silvie, With the Pack", quantity: 1 },
    { card: "Silvie, Slime Sovereign", quantity: 1 },
    { card: "Backup Charger", quantity: 1 },
    { card: "Beastbond Boots", quantity: 1 },
    { card: "Quicksilver Grail", quantity: 1 },
    { card: "Covenant of Thorns", quantity: 1 },
    { card: "Gaia's Blessing", quantity: 1 },
    { card: "Horn of Beastcalling", quantity: 1 },
    { card: "Stonescale Band", quantity: 1 },
    { card: "Verdant Scepter", quantity: 1 },
  ],
  sideboard: [],
};

const COMPARE_DECK_2: OmnidexDecklist = {
  main: [
    { card: "Baby Gray Slime", quantity: 4 },
    { card: "Blissful Calling", quantity: 3 },
    { card: "Dungeon Guide", quantity: 4 },
    { card: "Escape the Wreckage", quantity: 4 },
    { card: "Forest Cake", quantity: 4 },
    { card: "Limitless Slime", quantity: 4 },
    { card: "Baby Red Slime", quantity: 4 },
    { card: "Gather Slimes", quantity: 4 },
    { card: "Baby Green Slime", quantity: 4 },
    { card: "Slimeshield", quantity: 4 },
    { card: "Storm Slime", quantity: 4 },
    { card: "Ethereal Slime", quantity: 4 },
    { card: "Lustrous Slime", quantity: 4 },
    { card: "Gaia's Songbird", quantity: 3 },
    { card: "Slime Eruption", quantity: 3 },
    { card: "Scavenging Raccoon", quantity: 3 },
  ],
  material: COMPARE_DECK_1.material,
  sideboard: [],
};

const COMPARE_DECKS: ComparedDeck[] = [
  { key: "xenbr4", label: "Silvie build 1", source: { kind: "custom", decklist: COMPARE_DECK_1 } },
  { key: "1xiwetk", label: "Silvie build 2", source: { kind: "custom", decklist: COMPARE_DECK_2 } },
];

const COMPARE_DECKLISTS: Map<string, OmnidexDecklist | null> = new Map([
  ["xenbr4", COMPARE_DECK_1],
  ["1xiwetk", COMPARE_DECK_2],
]);

export default function About() {
  useDocumentTitle(null, "What Fan of Insight is, how it's built, and why it exists.");
  const featuredSets = useFeaturedSets();
  const latestSet = useMemo(() => latestBoosterSet(featuredSets ?? []), [featuredSets]);
  const [user, setUser] = useState<AccountUser | null | undefined>(undefined);

  // Real cards for the Projected Damage / Hypergeometric Calculator walkthrough — resolved from the
  // locally-synced catalog (same lean per-name lookup ComparisonGrid's own card resolution already
  // uses on this page), not the full 90MB+ deck-card-index just to redisplay one hardcoded decklist.
  const damageCardsByName = useCardsByNames(WALKTHROUGH_DAMAGE_ALL_NAMES);
  const damageForecast = useMemo(
    () => computeAggressionForecast(WALKTHROUGH_DAMAGE_MAIN, damageCardsByName, WALKTHROUGH_DAMAGE_MATERIAL),
    [damageCardsByName],
  );

  useEffect(() => {
    let active = true;
    void accountApi.session()
      .then((session) => { if (active) setUser(session.user); })
      .catch(() => { if (active) setUser(null); });
    return () => { active = false; };
  }, []);

  return (
    <div data-component="About">
      <section className="relative overflow-hidden border-b border-ctp-surface0">
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-[center_20%]"
          style={{ backgroundImage: `url(https://api.gatcg.com/cards/images/gd06sut2vg.jpg)` }}
        />
        <div className="pointer-events-none absolute inset-0 bg-ctp-base/85" />
        <div className="relative mx-auto max-w-3xl px-4 py-14 text-center sm:py-20">
          <h1 className="text-4xl font-bold text-ctp-blue sm:text-5xl">Fan of Insight</h1>
          <p className="mt-4 text-lg text-ctp-subtext1">
            "Oh, it's like EDHRecs, but better."
          </p>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-ctp-subtext0">
            Build better decks using the same info the pros have.
          </p>

          <div className="mt-6 flex items-center justify-center gap-1.5">
            {CLASS_ROW.map((c) => (
              <ClassIcon key={c} cardClass={c} size={22} />
            ))}
          </div>
          <div className="mt-2 flex items-center justify-center gap-1.5">
            {ELEMENT_ROW.map((e) => (
              <ElementIcon key={e} element={e} size={18} />
            ))}
          </div>

          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link to="/decks" className="rounded-md bg-ctp-blue px-5 py-2 text-sm font-semibold text-ctp-base hover:opacity-90">
              Find a proven deck
            </Link>
            <Link
              to="/collection"
              className="rounded-md border border-ctp-green/60 px-5 py-2 text-sm font-semibold text-ctp-green hover:border-ctp-green hover:bg-ctp-green/5"
            >
              Build from my collection
            </Link>
            <Link
              to="/deck-builder"
              className="rounded-md border border-ctp-surface1 px-5 py-2 text-sm font-semibold text-ctp-text hover:border-ctp-mauve"
            >
              Start building
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-ctp-surface0 bg-ctp-mantle/40 px-4 py-10">
        <div className="mx-auto max-w-5xl">
          {user && (
            <div className="mb-6 flex flex-col gap-3 rounded-xl border border-ctp-blue/40 bg-ctp-blue/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-ctp-text">Welcome back, {user.displayName}</p>
                <p className="mt-0.5 text-sm text-ctp-subtext1">Pick up where you left off.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to="/my-decks" className="rounded-md bg-ctp-blue px-3 py-2 text-sm font-semibold text-ctp-base hover:opacity-90">My Decks</Link>
                <Link to="/collection" className="rounded-md border border-ctp-green/60 px-3 py-2 text-sm font-semibold text-ctp-green hover:bg-ctp-green/5">My Collection</Link>
                <Link to="/deck-builder" className="rounded-md border border-ctp-surface1 px-3 py-2 text-sm font-semibold text-ctp-text hover:border-ctp-mauve">Continue Building</Link>
              </div>
            </div>
          )}

          <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-ctp-subtext0">What do you want to do?</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link to="/decks" className="rounded-xl border border-ctp-surface1 bg-ctp-base p-4 hover:border-ctp-blue">
              <p className="text-xs font-semibold uppercase tracking-wide text-ctp-blue">Manage Your Decks</p>
              <p className="mt-2 text-sm text-ctp-subtext1">Create and browse decklists with all sorts of useful analysis tools for free.</p>
            </Link>
            <Link to="/deck-builder" className="rounded-xl border border-ctp-surface1 bg-ctp-base p-4 hover:border-ctp-mauve">
              <p className="text-xs font-semibold uppercase tracking-wide text-ctp-mauve">Find Top Cards</p>
              <p className="mt-2 text-sm text-ctp-subtext1">See the most used cards for each champion.</p>
            </Link>
            <Link to="/collection" className="rounded-xl border border-ctp-surface1 bg-ctp-base p-4 hover:border-ctp-green">
              <p className="text-xs font-semibold uppercase tracking-wide text-ctp-green">Easy To Get Started</p>
              <p className="mt-2 text-sm text-ctp-subtext1">Import your existing decks from other sites and omnidex.</p>
            </Link>
            <Link to="/my-decks" className="rounded-xl border border-ctp-surface1 bg-ctp-base p-4 hover:border-ctp-yellow">
              <p className="text-xs font-semibold uppercase tracking-wide text-ctp-yellow">Free Tools For Better Decks</p>
              <p className="mt-2 text-sm text-ctp-subtext1">Import your existing decks to get suggestions. Find out how much damage you can do each turn and if you'll see a given card.</p>
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-ctp-surface0 px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ctp-subtext0">New on Fan of Insight</h2>
            <Link to="/changelog" className="shrink-0 text-xs text-ctp-blue hover:underline">Full changelog &rarr;</Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Link to="/deck-review" className="rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4 hover:border-ctp-blue">
              <p className="font-semibold text-ctp-text">Deck Review</p>
              <p className="mt-1 text-xs text-ctp-subtext1">Get suggestions as you build your deck.</p>
            </Link>
            <Link to="/champions" className="rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4 hover:border-ctp-mauve">
              <p className="font-semibold text-ctp-text">Champion Info</p>
              <p className="mt-1 text-xs text-ctp-subtext1">The top cards of every champion for each element and level.</p>
            </Link>
            <Link to="/deck-builder" className="rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4 hover:border-ctp-green">
              <p className="font-semibold text-ctp-text">Blended Collection Tracking</p>
              <p className="mt-1 text-xs text-ctp-subtext1">Add decks to your collection, then highlight which cards you use across decks for easy tracking.</p>
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-ctp-surface0 px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-ctp-subtext0">See it in action</h2>

          <div className="mt-8 grid gap-6 lg:grid-cols-[220px_1fr] lg:items-center">
            <div className="flex flex-col items-center text-center">
              <CardHoverPreview image={WALKTHROUGH_DECK.championImage} alt={WALKTHROUGH_DECK.championName}>
                <Link to={`/decks/${WALKTHROUGH_HASH}`}>
                  <CardImage
                    image={WALKTHROUGH_DECK.championImage}
                    alt={WALKTHROUGH_DECK.championName}
                    className="h-40 w-28 rounded-md border border-ctp-surface1 object-cover object-top"
                  />
                </Link>
              </CardHoverPreview>
              <Link to={`/decks/${WALKTHROUGH_HASH}`} className="mt-3 text-lg font-semibold text-ctp-text hover:text-ctp-blue">
                {WALKTHROUGH_DECK.championName}
              </Link>
              <p className="mt-1 text-xs text-ctp-subtext0">
                {WALKTHROUGH_DECK.classes.join("/")} · {WALKTHROUGH_DECK.elements.join("/")}
              </p>
              <p className="mt-1 text-xs text-ctp-subtext0">
                Best finish #{WALKTHROUGH_DECK.bestPlacement} · {(WALKTHROUGH_DECK.avgWinRate * 100).toFixed(0)}% avg win rate
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <DonutChart title="Card Types" segments={WALKTHROUGH_TYPE_SEGMENTS} />
              <BarChart title="Reserve Cost Curve" bars={WALKTHROUGH_RESERVE_BARS} />
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-ctp-subtext0">
            These are the exact charts from the deck's own page — plus subtypes, rarity, keywords, damage
            composition, priciest cards, and a popularity trend.{" "}
            <Link to={`/decks/${WALKTHROUGH_HASH}`} className="hover:text-ctp-blue hover:underline">
              Open the full page &rarr;
            </Link>
          </p>

          <div className="mx-auto mt-16 max-w-2xl border-t border-ctp-surface0 pt-10">
            <p className="text-center text-sm text-ctp-subtext1">
              Card Impact goes further than composition — for a given build, it can tell you which cards actually
              correlate with a higher win rate, from real recorded games. {WALKTHROUGH_CARD_IMPACT.clusterName},{" "}
              {WALKTHROUGH_CARD_IMPACT.deckCount} decks:
            </p>
            <div className="mt-4 overflow-x-auto rounded-lg border border-ctp-surface1 bg-ctp-base">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
                    <th className="px-3 py-2">Card</th>
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2">Win rate (with)</th>
                    <th className="px-3 py-2">Win rate (without)</th>
                    <th className="px-3 py-2">Lift</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ctp-surface0">
                  {WALKTHROUGH_CARD_IMPACT.cards.map((c) => (
                    <tr key={c.name}>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <CardHoverPreview image={c.image} alt={c.name}>
                          <Link to={`/cards/${c.slug}`} className="text-ctp-text hover:text-ctp-blue">
                            {c.name}
                          </Link>
                        </CardHoverPreview>
                      </td>
                      <td className="px-3 py-2 text-ctp-subtext1">{c.role}</td>
                      <td className="px-3 py-2 text-ctp-subtext1">{(c.winRateWith * 100).toFixed(0)}%</td>
                      <td className="px-3 py-2 text-ctp-subtext1">{(c.winRateWithout * 100).toFixed(0)}%</td>
                      <td className="px-3 py-2 font-semibold text-ctp-green">+{(c.lift * 100).toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-center text-xs text-ctp-subtext0">
              Correlational, not causal — and a genuinely small, "emerging" archetype (17 decks across 15 events), not
              a headline sample size. Filter to a specific opponent for a matchup view, or browse the build's full
              defining cards and sample decklists.{" "}
              <Link to={`/archetypes/${WALKTHROUGH_CARD_IMPACT.clusterId}?tab=impact`} className="hover:text-ctp-blue hover:underline">
                Open Card Impact &rarr;
              </Link>
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-3xl border-t border-ctp-surface0 pt-10">
            <p className="text-center text-sm text-ctp-subtext1">
              These aren't screenshots either — the same live Direct Damage Forecast and Hypergeometric Calculator
              from a deck's own Build tab, run right here against a real {WALKTHROUGH_CARD_IMPACT.clusterName}{" "}
              decklist. Burst Asunder's bonus damage scales with how many Fractals this exact list runs.
            </p>
            {damageCardsByName.size > 0 ? (
              <>
                <AggressionForecast forecast={damageForecast} />
                <HypergeometricCalculator
                  mainLines={WALKTHROUGH_DAMAGE_MAIN}
                  materialLines={WALKTHROUGH_DAMAGE_MATERIAL}
                  catalogByName={damageCardsByName}
                />
              </>
            ) : (
              <p className="mt-4 text-center text-xs text-ctp-subtext0">Loading card data…</p>
            )}
            <p className="mt-4 text-center text-xs text-ctp-subtext0">
              Every field above is live and editable — pick a different card, not just this example.{" "}
              <Link to={`/decks/${WALKTHROUGH_DAMAGE_HASH}`} className="hover:text-ctp-blue hover:underline">
                Open the full deck page &rarr;
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-ctp-surface0 bg-ctp-mantle/40 px-4 py-16">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[280px_1fr] lg:items-center">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ctp-subtext0">Compare decks, for real</h2>
            <p className="mt-2 text-sm text-ctp-subtext1">
              Two real, independently popular {COMPARE_CHAMPION_NAME} builds, lined up card by card — green is in
              both, yellow is only in one. This is the live Compare tool, not a screenshot.
            </p>
            <p className="mt-4 text-xs text-ctp-subtext0">
              Compare accepts far more than this — search decks by cards they run, import any player's submitted
              list, or paste in a decklist that was never even submitted to Omnidex — and a second mode compares
              individual cards' usage, win rate, and price side by side, not just whole decks.
            </p>
            <Link to="/compare" className="mt-4 inline-block text-sm font-semibold text-ctp-blue hover:underline">
              Open Compare &rarr;
            </Link>
          </div>

          <div className="relative min-w-0 max-w-full">
            <div className="max-h-[28rem] max-w-full overflow-y-auto rounded-lg border border-ctp-surface1">
              <ComparisonGrid decks={COMPARE_DECKS} decklists={COMPARE_DECKLISTS} />
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 rounded-b-lg bg-gradient-to-t from-ctp-mantle/40 to-transparent" />
          </div>
        </div>
      </section>
      
      <section className="border-t border-ctp-surface0 bg-ctp-mantle/40 px-4 py-16">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[280px_1fr] lg:items-center">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ctp-subtext0">Guided Deck Builder</h2>
            <p className="mt-2 text-sm text-ctp-subtext1">
              Start with a Champion and Spirit, then get data-informed card and quantity suggestions from comparable
              tournament decks.{" "}
              {WALKTHROUGH_DECK_BUILDER.championName} + {WALKTHROUGH_DECK_BUILDER.spiritName},{" "}
              {WALKTHROUGH_DECK_BUILDER.matchingDecks} matching decks:
            </p>
            <p className="mt-4 text-xs text-ctp-subtext0">
              Lock in your own picks (or paste a decklist to start from) and the rest adapts around them, with
              editable quantities, "buddy cards," swap-in ideas, composition guidance, and a running log of what
              changed with each choice.
            </p>
            <Link to="/deck-builder" className="mt-4 inline-block text-sm font-semibold text-ctp-blue hover:underline">
              Open Guided Deck Builder &rarr;
            </Link>
          </div>

          <ul className="space-y-1.5">
            {WALKTHROUGH_DECK_BUILDER.cards.map((c) => (
              <li key={c.name} className="flex items-center gap-2 rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-1.5 text-sm">
                <CardHoverPreview image={c.image} alt={c.name}>
                  <Link to={`/cards/${c.slug}`} className="text-ctp-text hover:text-ctp-blue">
                    {c.name}
                  </Link>
                </CardHoverPreview>
                {c.lift !== null ? (
                  <span className="ml-auto text-xs font-semibold text-ctp-green">+{(c.lift * 100).toFixed(1)}%</span>
                ) : (
                  <span className="ml-auto rounded-full border border-ctp-surface1 px-1.5 text-[10px] text-ctp-subtext0">staple</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {latestSet && (
        <section className="border-t border-ctp-surface0 px-4 py-16">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-ctp-subtext0">
              Open a pack
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-sm text-ctp-subtext1">
              A simulated 12-card {latestSet.name} booster, drawn live from its real card pool — not a mockup, and
              not the same 12 cards twice.
            </p>

            <div className="mt-8">
              <PackOpenerWidget setPrefix={latestSet.prefix} buttonLabel={`Open a ${latestSet.name} Pack`} />
            </div>

            <p className="mt-6 text-center text-xs text-ctp-subtext0">
              Odds are a best-effort approximation built from publicly available guaranteed-per-box rates — Grand
              Archive doesn't publish an official per-pack rarity table, so this isn't exact retail odds. Works for
              every set, not just this one.{" "}
              <Link to="/cards?tab=sets" className="hover:text-ctp-blue hover:underline">
                Open any set's pack &rarr;
              </Link>
            </p>
          </div>
        </section>
      )}

      <section className="border-t border-ctp-surface0 bg-ctp-mantle/40 py-12">
        <div className="mx-auto max-w-5xl px-4">
          <details>
            <summary className="cursor-pointer list-none text-center text-sm font-semibold uppercase tracking-wide text-ctp-blue hover:underline">
              Explore every feature <span aria-hidden="true">&darr;</span>
            </summary>
            <p className="mx-auto mt-2 max-w-xl text-center text-sm text-ctp-subtext1">
              A complete guide to every top-level section and what it does.
            </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-lg border border-ctp-surface1 bg-ctp-base p-4">
                <h3 className="text-sm font-semibold text-ctp-text">{f.title}</h3>
                <ul className="mt-2 space-y-1">
                  {f.items.slice(0, 3).map((item) => (
                    <li key={item} className="flex gap-1.5 text-xs text-ctp-subtext1">
                      <span className="mt-0.5 shrink-0 text-ctp-subtext0">&middot;</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                {f.items.length > 3 && (
                  <details className="mt-2 text-xs text-ctp-subtext1">
                    <summary className="cursor-pointer select-none text-ctp-blue hover:underline">
                      {f.items.length - 3} more capabilities
                    </summary>
                    <ul className="mt-2 space-y-1 border-l border-ctp-surface1 pl-2">
                      {f.items.slice(3).map((item) => (
                        <li key={item} className="flex gap-1.5">
                          <span className="mt-0.5 shrink-0 text-ctp-subtext0">&middot;</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                <Link to={f.example.to} className="mt-3 inline-block text-xs text-ctp-subtext0 hover:text-ctp-blue hover:underline">
                  {f.example.label} &rarr;
                </Link>
              </div>
            ))}
          </div>
          </details>
        </div>
      </section>

      <section className="border-t border-ctp-surface0">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ctp-subtext0">How it's built</h2>
          <p className="mt-4 text-ctp-subtext1">
            A small pipeline crawls Omnidex and the Grand Archive API on a daily schedule and publishes the results
            as static data. Most browsing stays fast and account-free, with published data cached in your browser.
            Signing in is optional and is only needed for personal features such as saved decks, public profiles,
            and collection tracking.
          </p>
          <Link to="/methodology" className="mt-3 inline-block text-sm text-ctp-blue hover:underline">
            How the stats work &rarr;
          </Link>
        </div>
      </section>
    </div>
  );
}
