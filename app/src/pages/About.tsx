import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { OmnidexDecklist } from "@gatcg/shared";
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
      "Most-played cards by deck section, per Champion",
      "Performance broken down season by season",
      "Named Spirit companions tracked with full Champion-style stats of their own",
      "Bonus Cards tab: every card with an effect that specifically triggers or improves for this Champion",
    ],
    example: { to: "/champions/Guo%20Jia", label: "Guo Jia" },
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
    example: { to: "/archetypes/14lh0s0", label: "Tera Silvie" },
  },
  {
    title: "Browse Decks",
    items: [
      "By Build: every distinct decklist grouped by exact main+material list, including one-off brews — filter to just the ones independently run by 2+ players, by Champion, element, or the specific cards it runs",
      "By Sighting: every public tournament sighting — 56,000+ and counting — filterable by Champion, class, keyword, season, event type, and outcome",
      "Ranked by a tier-weighted placement score, not just raw finish, so a strong finish at a big event outranks a small one",
      "Flags netdecked lists (identical builds from other players) and \"tough finish\" upsets (a strong record that still missed the cut)",
      "Max-price filter and a cheapest-first sort, to find budget decks with strong finishes",
      "Dedicated page per build: composition donuts, a DIAO score, priciest cards, a popularity trend, and similar decks — one click loads the whole decklist into a TCGplayer cart",
    ],
    example: { to: "/decks/xenbr4", label: "A top Silvie build" },
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
      "Side-by-side grid highlighting shared vs. unique cards, with price, win rate, and DIAO score per deck, plus Tabletop Simulator export",
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
  rating: { composite: 7.0, scores: { durability: 7, interaction: 7, aggro: 8, opportunity: 6 } },
};

const RATING_PILLARS: { key: keyof typeof WALKTHROUGH_DECK.rating.scores; label: string; description: string }[] = [
  {
    key: "durability",
    label: "Durability",
    description:
      "How well this build survives and stabilizes: Recover (life gain) and protection effects (Spellshroud/Intercept/Prevent).",
  },
  {
    key: "interaction",
    label: "Interaction",
    description: "How much this build can disrupt or answer the opponent: Banish, Destroy, Negate, Fast-speed access, and guaranteed damage.",
  },
  {
    key: "aggro",
    label: "Aggro",
    description:
      "How much pressure this build applies: average Ally power, evasion (Unblockable/Ranged), threat count, a cheap memory curve, and guaranteed damage.",
  },
  {
    key: "opportunity",
    label: "Opportunity",
    description:
      "How reliably this build creates access to its key plays: card draw (repeatable draw counts for more than a one-shot) plus Floating Memory.",
  },
];

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
 * /archetypes/qnv8tz?tab=impact (Water Diao Chan vs. its Water Guo Jia matchup, real pairing data,
 * 14 games). This is a genuinely small matchup sample (most matchup-scoped Card Impact rows are —
 * see docs/CALCULATIONS.md's sample-size note), so the lift numbers here are modest by design,
 * not cherry-picked for a bigger-looking result.
 */
const WALKTHROUGH_MATCHUP = {
  clusterId: "qnv8tz",
  clusterName: "Water Diao Chan",
  opponentClusterName: "Water Guo Jia",
  games: 14,
  cards: [
    { name: "Quicksilver Grail", slug: "quicksilver-grail", image: "/cards/images/6oyti67l58.jpg", role: "Material", winRateWith: 0.56, winRateWithout: 0.4, lift: 0.06 },
    { name: "Viridian Protective Trinket", slug: "viridian-protective-trinket", image: "/cards/images/ydupmu6gvm.jpg", role: "Sideboard", winRateWith: 0.56, winRateWithout: 0.4, lift: 0.06 },
    { name: "Song of Frost", slug: "song-of-frost", image: "/cards/images/rglq1kjunp.jpg", role: "Mixed", winRateWith: 0.56, winRateWithout: 0.42, lift: 0.06 },
    { name: "Fractal of Refreshment", slug: "fractal-of-refreshment", image: "/cards/images/htmfs6s6uh.jpg", role: "Main", winRateWith: 0.57, winRateWithout: 0.43, lift: 0.06 },
    { name: "Fire Resonance Bauble", slug: "fire-resonance-bauble", image: "/cards/images/pwkkbbu08s.jpg", role: "Mixed", winRateWith: 0.57, winRateWithout: 0.43, lift: 0.06 },
  ],
};

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
    { name: "Viridian Protective Trinket", slug: "viridian-protective-trinket", image: "/cards/images/ydupmu6gvm.jpg", lift: 0.088 },
    { name: "Backup Charger", slug: "backup-charger", image: "/cards/images/3apypgzedx.jpg", lift: 0.081 },
    { name: "Smoke Bombs", slug: "smoke-bombs", image: "/cards/images/porhmr2lkv.jpg", lift: 0.08 },
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

  return (
    <div>
      <section className="relative overflow-hidden border-b border-ctp-surface0">
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-[center_20%]"
          style={{ backgroundImage: `url(https://api.gatcg.com/cards/images/gd06sut2vg.jpg)` }}
        />
        <div className="pointer-events-none absolute inset-0 bg-ctp-base/85" />
        <div className="relative mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="text-4xl font-bold text-ctp-blue sm:text-5xl">Fan of Insight</h1>
          <p className="mt-4 text-lg text-ctp-subtext1">
            Build better Grand Archive decks with tournament data and locally stored community lists. Explore the
            Standard or Pantheon meta, compare proven and official products, and find card-by-card suggestions.
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

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/decks" className="rounded-md bg-ctp-blue px-5 py-2 text-sm font-semibold text-ctp-base hover:opacity-90">
              Explore Decks
            </Link>
            <Link
              to="/deck-builder"
              className="rounded-md border border-ctp-surface1 px-5 py-2 text-sm font-semibold text-ctp-text hover:border-ctp-blue"
            >
              Build a Deck
            </Link>
            <Link
              to="/official-decks"
              className="rounded-md border border-ctp-surface1 px-5 py-2 text-sm font-semibold text-ctp-text hover:border-ctp-mauve"
            >
              Official Decks
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-ctp-surface0 px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-ctp-subtext0">See it in action</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-ctp-subtext1">
            This isn't a mockup — it's a real deck's real page, rendered right here. {WALKTHROUGH_DECK.championName} was
            independently played by {WALKTHROUGH_DECK.playerCount} players across {WALKTHROUGH_DECK.eventCount} events.
          </p>

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
              correlate with a higher win rate against a specific opponent, from real pairing outcomes.{" "}
              {WALKTHROUGH_MATCHUP.clusterName} vs. {WALKTHROUGH_MATCHUP.opponentClusterName}, {WALKTHROUGH_MATCHUP.games}{" "}
              recorded games:
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
                  {WALKTHROUGH_MATCHUP.cards.map((c) => (
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
              Correlational, not causal — and a genuinely small sample, like most single matchups. Filter to a
              different opponent, or drop the matchup filter entirely for the build's full-field numbers.{" "}
              <Link to={`/archetypes/${WALKTHROUGH_MATCHUP.clusterId}?tab=impact`} className="hover:text-ctp-blue hover:underline">
                Open Card Impact &rarr;
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

      <section className="border-t border-ctp-surface0 px-4 py-16">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[280px_1fr] lg:items-center">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ctp-subtext0">How the DIAO Score works</h2>
            <p className="mt-2 text-sm text-ctp-subtext1">
              Every deck page scores its decklist on four independent 1&ndash;10 pillars &mdash; Aggro,
              Durability, Interaction, Aggro, Opportunity &mdash; so you can size up a build's play style at a glance,
              before you've played a single game with it.
            </p>
            <p className="mt-4 text-xs text-ctp-subtext0">
              The composite is the plain average of the four pillar scores. Every score-band boundary is a real
              percentile from 94 actual Regionals/Ascent 1st-place decklists, not a round number &mdash; and scored
              per decklist, not per Champion, since the same Champion can have genuinely opposite real builds.
              Correlational, not causal, same as every other stat on this site.
            </p>
            <Link to={`/decks/${WALKTHROUGH_HASH}`} className="mt-4 inline-block text-sm font-semibold text-ctp-blue hover:underline">
              See it on this deck's own page &rarr;
            </Link>
          </div>

          <div className="rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">
                {WALKTHROUGH_DECK.championName} example
              </span>
              <span className="text-2xl font-bold text-ctp-blue">{WALKTHROUGH_DECK.rating.composite.toFixed(2)}</span>
            </div>
            <div className="mt-4 space-y-4">
              {RATING_PILLARS.map((p) => (
                <div key={p.key}>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-24 shrink-0 font-semibold text-ctp-text">{p.label}</span>
                    <div className="h-2 flex-1 rounded-full bg-ctp-surface0">
                      <div
                        className="h-2 rounded-full bg-ctp-blue"
                        style={{ width: `${(WALKTHROUGH_DECK.rating.scores[p.key] / 10) * 100}%` }}
                      />
                    </div>
                    <span className="w-6 shrink-0 text-right text-ctp-subtext0">{WALKTHROUGH_DECK.rating.scores[p.key]}</span>
                  </div>
                  <p className="mt-1 text-xs text-ctp-subtext1">{p.description}</p>
                </div>
              ))}
            </div>
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

      <section className="border-t border-ctp-surface0 bg-ctp-mantle/40 py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-ctp-subtext0">Explore the site</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-ctp-subtext1">
            Every top-level section and what it actually does — not just a page list.
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
        </div>
      </section>

      <section className="border-t border-ctp-surface0">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ctp-subtext0">How it's built</h2>
          <p className="mt-4 text-ctp-subtext1">
            A small pipeline crawls Omnidex and the Grand Archive API on a daily schedule and publishes the results
            as static data. The site itself is a client-only app that fetches and caches that data in your
            browser — no backend, no database, no user data collected. Nothing to sign up for, nothing tracked.
          </p>
        </div>
      </section>
    </div>
  );
}
