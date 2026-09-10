import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { AccountUser, OmnidexDecklist } from "@gatcg/shared";
import ClassIcon from "../components/ClassIcon";
import ElementIcon from "../components/ElementIcon";
import CardImage from "../components/CardImage";
import CardHoverPreview from "../components/CardHoverPreview";
import DonutChart, { buildChartSegments } from "../components/DonutChart";
import BarChart from "../components/BarChart";
import ComparisonSummary from "../features/compare/ComparisonSummary";
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

/**
 * Same "pre-baked, no live fetch" reasoning as WALKTHROUGH_DECK above — two real Lorraine builds,
 * decoded directly from deck-card-index.json (deckIds 60363:570 and 60488:4261). Deliberately not
 * two similarly-successful lists: BobbyTortilla's Gauntlet 2026 build went 1-5 (43rd), while
 * Zero0000000000's build finished 2nd at the 2026 World Championship (5-3) — a genuinely different
 * outcome from two independent card choices, not two flavors of the same result. Keys are the real
 * deckIds so the "Open Compare" link below reopens this exact comparison, not a placeholder.
 */
const COMPARE_ADD_PARAM = "60363:570,60488:4261";

const COMPARE_DECK_1: OmnidexDecklist = {
  main: [
    { card: "Benediction Angel", quantity: 1 },
    { card: "Dungeon Guide", quantity: 4 },
    { card: "Escape the Wreckage", quantity: 3 },
    { card: "Fluffy Shopkeep", quantity: 4 },
    { card: "Heavenly Guide", quantity: 1 },
    { card: "Turbo Charge", quantity: 2 },
    { card: "Alizarin Longbowman", quantity: 1 },
    { card: "Chamberlain Toad", quantity: 1 },
    { card: "Aella, Zephyr's Hand", quantity: 3 },
    { card: "Aesan Protector", quantity: 2 },
    { card: "Calming Breeze", quantity: 2 },
    { card: "Dream Fairy", quantity: 2 },
    { card: "Fairy Whispers", quantity: 4 },
    { card: "Imperious Galebind", quantity: 3 },
    { card: "Rally the Peasants", quantity: 3 },
    { card: "Reclaim", quantity: 4 },
    { card: "Rose, Eternal Paragon", quantity: 1 },
    { card: "Stifling Trap", quantity: 2 },
    { card: "Veiling Breeze", quantity: 3 },
    { card: "Windmill Engineer", quantity: 4 },
    { card: "Crux Sight", quantity: 2 },
    { card: "Ghosts of Pendragon", quantity: 4 },
    { card: "Spirit Blade: Ascension", quantity: 4 },
    { card: "Spirit Blade: Retribution", quantity: 1 },
  ],
  material: [
    { card: "Spirit of Wind", quantity: 1 },
    { card: "Lorraine, Wandering Warrior", quantity: 1 },
    { card: "Lorraine, Blademaster", quantity: 1 },
    { card: "Lorraine, Spirit Ruler", quantity: 1 },
    { card: "Backup Charger", quantity: 1 },
    { card: "Clarent, Reimagined", quantity: 1 },
    { card: "Clarent, Sword of Peace", quantity: 1 },
    { card: "Drawn Blade", quantity: 1 },
    { card: "Lost Providence", quantity: 1 },
    { card: "Sword of Seeking", quantity: 1 },
    { card: "Purifying Thurible", quantity: 1 },
    { card: "Prismatic Edge", quantity: 1 },
  ],
  sideboard: [
    { card: "Orb of Sealing", quantity: 1 },
    { card: "Annul Spell", quantity: 2 },
    { card: "Crystallized Destiny", quantity: 2 },
    { card: "Cry for Help", quantity: 1 },
    { card: "Dream Fairy", quantity: 1 },
    { card: "Ensnaring Fumes", quantity: 3 },
    { card: "Psychopomp's Gale", quantity: 2 },
    { card: "Stifling Trap", quantity: 1 },
  ],
};

const COMPARE_DECK_2: OmnidexDecklist = {
  main: [
    { card: "Dungeon Guide", quantity: 4 },
    { card: "Escape the Wreckage", quantity: 2 },
    { card: "Fluffy Shopkeep", quantity: 4 },
    { card: "Turbo Charge", quantity: 2 },
    { card: "Tyrannical Denigration", quantity: 1 },
    { card: "Condemning Evisceration", quantity: 2 },
    { card: "Aella, Zephyr's Hand", quantity: 3 },
    { card: "Aesan Protector", quantity: 2 },
    { card: "Calming Breeze", quantity: 2 },
    { card: "Displace", quantity: 3 },
    { card: "Fairy Whispers", quantity: 4 },
    { card: "Imperious Galebind", quantity: 3 },
    { card: "Reclaim", quantity: 4 },
    { card: "Scout the Land", quantity: 2 },
    { card: "Veiling Breeze", quantity: 3 },
    { card: "Verdigris Decree", quantity: 2 },
    { card: "Windmill Engineer", quantity: 4 },
    { card: "Crux Sight", quantity: 3 },
    { card: "Ghosts of Pendragon", quantity: 4 },
    { card: "Spirit Blade: Ascension", quantity: 4 },
    { card: "Spirit Blade: Retribution", quantity: 2 },
  ],
  material: [
    { card: "Brissa, Spirit of Wind", quantity: 1 },
    { card: "Lorraine, Wandering Warrior", quantity: 1 },
    { card: "Lorraine, Blademaster", quantity: 1 },
    { card: "Lorraine, Spirit Ruler", quantity: 1 },
    { card: "Backup Charger", quantity: 1 },
    { card: "Clarent, Reimagined", quantity: 1 },
    { card: "Clarent, Sword of Peace", quantity: 1 },
    { card: "Drawn Blade", quantity: 1 },
    { card: "Lost Providence", quantity: 1 },
    { card: "Sword of Seeking", quantity: 1 },
    { card: "Purifying Thurible", quantity: 1 },
    { card: "Prismatic Edge", quantity: 1 },
  ],
  sideboard: [
    { card: "Blanche, Sheltering Saint", quantity: 2 },
    { card: "Heavenly Guide", quantity: 1 },
    { card: "Incapacitate", quantity: 2 },
    { card: "Regal Inquisition", quantity: 2 },
    { card: "Dream Fairy", quantity: 2 },
    { card: "Innervate Agility", quantity: 1 },
    { card: "Scatter Essence", quantity: 3 },
    { card: "Stifling Gyre", quantity: 2 },
  ],
};

const COMPARE_DECKS: ComparedDeck[] = [
  { key: "60363:570", label: "BobbyTortilla — Gauntlet 2026 (43rd)", source: { kind: "custom", decklist: COMPARE_DECK_1 } },
  { key: "60488:4261", label: "Zero0000000000 — 2nd at 2026 Worlds", source: { kind: "custom", decklist: COMPARE_DECK_2 } },
];

const COMPARE_DECKLISTS: Map<string, OmnidexDecklist | null> = new Map([
  ["60363:570", COMPARE_DECK_1],
  ["60488:4261", COMPARE_DECK_2],
]);

export default function About() {
  useDocumentTitle(null, "What Fan of Insight is, how it's built, and why it exists.");
  const navigate = useNavigate();
  const featuredSets = useFeaturedSets();
  const latestSet = useMemo(() => latestBoosterSet(featuredSets ?? []), [featuredSets]);
  const [user, setUser] = useState<AccountUser | null | undefined>(undefined);
  const [compareBaselineKey, setCompareBaselineKey] = useState<string | null>(null);

  // Real cards for the Projected Damage / Hypergeometric Calculator walkthrough — resolved from the
  // locally-synced catalog (same lean per-name lookup ComparisonSummary's own card resolution
  // already uses on this page), not the full 90MB+ deck-card-index just to redisplay one hardcoded
  // decklist.
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
                <Link to="/decks/edit" className="rounded-md bg-ctp-blue px-3 py-2 text-sm font-semibold text-ctp-base hover:opacity-90">My Decks</Link>
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
            <Link to="/decks/edit" className="rounded-xl border border-ctp-surface1 bg-ctp-base p-4 hover:border-ctp-yellow">
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

          <div className="mx-auto mt-16 max-w-3xl border-t border-ctp-surface0 pt-10">
            <p className="text-center text-sm text-ctp-subtext1">
              Know how your deck performs before playtesting.
            </p>
            <p className="text-left text-sm text-ctp-subtext2 mt-4">Water Diao Chan (Fractals)</p>
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
              <Link to={`/decks/${WALKTHROUGH_DAMAGE_HASH}`} className="hover:text-ctp-blue hover:underline">
                Open the full deck page &rarr;
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-ctp-surface0 bg-ctp-mantle/40 px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="max-w-2xl">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ctp-subtext0">Compare Decks</h2>
            <Link to={`/compare?add=${COMPARE_ADD_PARAM}`} className="mt-4 inline-block text-sm font-semibold text-ctp-blue hover:underline">
              Open Compare &rarr;
            </Link>
          </div>

          <div className="mt-8">
            <ComparisonSummary
              decks={COMPARE_DECKS}
              decklists={COMPARE_DECKLISTS}
              baselineKey={compareBaselineKey ?? COMPARE_DECKS[0].key}
              onBaselineChange={setCompareBaselineKey}
              onViewAllDifferences={() => navigate(`/compare?add=${COMPARE_ADD_PARAM}`)}
            />
          </div>
        </div>
      </section>
      
      <section className="border-t border-ctp-surface0 bg-ctp-mantle/40 px-4 py-16">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[280px_1fr] lg:items-center">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ctp-subtext0">Guided Deck Builder</h2>
            <p className="mt-2 text-sm text-ctp-subtext1">
              Pick a champion and spirit, then get automatic recommendations for an optimal deck.{" "}
              {WALKTHROUGH_DECK_BUILDER.championName} + {WALKTHROUGH_DECK_BUILDER.spiritName},{" "}
              {WALKTHROUGH_DECK_BUILDER.matchingDecks} matching decks:
            </p>
            <p className="mt-4 text-xs text-ctp-subtext0">
              You can also paste in a decklist to review suggestions.
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
              Open a pack from {latestSet.name}
            </h2>

            <div className="mt-8">
              <PackOpenerWidget setPrefix={latestSet.prefix} buttonLabel={`Open a ${latestSet.name} Pack`} />
            </div>

            <p className="mt-6 text-center text-xs text-ctp-subtext0">
              <Link to="/cards?tab=sets" className="hover:text-ctp-blue hover:underline">
                Open any set's pack &rarr;
              </Link>
            </p>
          </div>
        </section>
      )}

    </div>
  );
}
