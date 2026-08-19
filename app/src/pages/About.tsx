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
      "Full catalog synced locally — search and filter by class, type, subtype, element, or artist with no repeat network calls",
      "Pricing per card, plus a decklist's total and priciest cards",
      "Usage & win rate, sortable by usage, raw/adjusted win rate, or recency (\"Hot\")",
      "Related cards: what's played alongside it, top decks, and most unique decks running it",
      "References, referenced-by, and format legality",
    ],
    example: { to: "/cards/fan-of-insight", label: "Fan of Insight" },
  },
  {
    title: "Sets",
    items: ["Every expansion, browsable", "Every card printed in a given set"],
    example: { to: "/sets/DTR", label: "Distorted Reflections" },
  },
  {
    title: "Tournaments",
    items: [
      "Omnidex events — standings, pairings, decklists, and judges",
      "Live lookup for in-progress events, not just completed ones",
      "Browsable by season, grouped by card-legality window",
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
    ],
    example: { to: "/players/5390", label: "elothere" },
  },
  {
    title: "Judges",
    items: [
      "Certified judges, sortable by level and experience",
      "Shares the player ID space, so a judge who also plays gets both views on one profile",
    ],
    example: { to: "/players/590", label: "Ain" },
  },
  {
    title: "Teams",
    items: [
      "3v3 team-format registrations — a flat log, not deduplicated (team names alone aren't a reliable identity)",
      "Filterable by event type and season, searchable by team or player",
    ],
    example: { to: "/teams", label: "Browse Teams" },
  },
  {
    title: "Achievements",
    items: [
      "Badges computed automatically — tournament tiers, rating milestones, playstyle, dedication, and judging",
      "No manual curation: every unlock is derived straight from the underlying stats",
    ],
    example: { to: "/achievements/won-worlds", label: "Won Worlds" },
  },
  {
    title: "Champions",
    items: [
      "Most-played cards by deck section, per Champion",
      "Performance broken down season by season",
      "Named Spirit companions tracked with full Champion-style stats of their own",
    ],
    example: { to: "/champions/Guo%20Jia", label: "Guo Jia" },
  },
  {
    title: "Archetypes",
    items: [
      "Named builds clustered from real decklists by similarity, not hand-picked ahead of time",
      "Card Impact: which cards (including sideboard tech) actually correlate with a higher win rate for a given build",
      "Meta share, top-cut rate, average finishing placement, and average deck price per build",
      "Full battle chart: matchup matrix, by-Champion view, and closest/most-lopsided highlights",
      "Sample decklists and defining cards per build",
    ],
    example: { to: "/archetypes/14lh0s0", label: "Tera Silvie" },
  },
  {
    title: "Top Decks",
    items: [
      "Every public decklist — 56,000+ and counting",
      "Filterable by Champion, class, keyword, season, event type, and outcome",
      "Ranked by a tier-weighted placement score, not just raw finish, so a strong finish at a big event outranks a small one",
      "Flags netdecked lists (identical builds from other players) and \"tough finish\" upsets (a strong record that still missed the cut)",
    ],
    example: { to: "/top-decks", label: "Browse Top Decks" },
  },
  {
    title: "Popular Decks",
    items: [
      "Exact decklists independently run by 2+ players",
      "Dedicated page per deck: composition donuts, a power rating, priciest cards, a popularity trend, and similar decks",
      "One click loads the entire decklist into a TCGplayer cart — no manually searching for 60 cards one at a time",
    ],
    example: { to: "/decks/xenbr4", label: "A top Silvie build" },
  },
  {
    title: "Compare",
    items: [
      "Search for decks containing specific cards",
      "Import any player's submitted decklist from an event",
      "Paste in a decklist that was never even submitted to Omnidex",
      "Side-by-side grid highlighting shared vs. unique cards, with price and power rating per deck, plus Tabletop Simulator export",
    ],
    example: { to: "/compare", label: "Open Compare" },
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
            Every ingested Grand Archive TCG tournament, deck, and card — aggregated in one place and turned into
            real analysis.
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
            <Link to="/champions" className="rounded-md bg-ctp-blue px-5 py-2 text-sm font-semibold text-ctp-base hover:opacity-90">
              Browse Champions
            </Link>
            <Link
              to="/top-decks"
              className="rounded-md border border-ctp-surface1 px-5 py-2 text-sm font-semibold text-ctp-text hover:border-ctp-blue"
            >
              See Top Decks
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
        </div>
      </section>

      <section className="border-t border-ctp-surface0 px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-ctp-subtext0">
            Compare decks, for real
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-ctp-subtext1">
            Two real, independently popular {COMPARE_CHAMPION_NAME} builds, lined up card by card — green is in
            both, yellow is only in one. This is the live Compare tool, not a screenshot — scroll within it to see
            the full card list.
          </p>

          <div className="relative mt-8">
            <div className="max-h-[28rem] overflow-y-auto rounded-lg border border-ctp-surface1">
              <ComparisonGrid decks={COMPARE_DECKS} decklists={COMPARE_DECKLISTS} />
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 rounded-b-lg bg-gradient-to-t from-ctp-base to-transparent" />
          </div>

          <p className="mt-6 text-center text-xs text-ctp-subtext0">
            Compare accepts far more than this — search decks by cards they run, import any player's submitted
            list, or paste in a decklist that was never even submitted to Omnidex.{" "}
            <Link to="/compare" className="hover:text-ctp-blue hover:underline">
              Open Compare &rarr;
            </Link>
          </p>
        </div>
      </section>

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
                  {f.items.map((item) => (
                    <li key={item} className="flex gap-1.5 text-xs text-ctp-subtext1">
                      <span className="mt-0.5 shrink-0 text-ctp-subtext0">&middot;</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
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
            A small pipeline crawls Omnidex and the Grand Archive API on a weekly schedule and publishes the results
            as static data. The site itself is a client-only app that fetches and caches that data in your
            browser — no backend, no database, no user data collected. Nothing to sign up for, nothing tracked.
          </p>
        </div>
      </section>
    </div>
  );
}
