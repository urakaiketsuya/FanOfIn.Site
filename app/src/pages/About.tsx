import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { OmnidexDecklist } from "@gatcg/shared";
import ClassIcon from "../components/ClassIcon";
import ElementIcon from "../components/ElementIcon";
import CardImage from "../components/CardImage";
import CardHoverPreview from "../components/CardHoverPreview";
import DonutChart, { buildChartSegments } from "../components/DonutChart";
import { useDeckPopularity } from "../features/popular/useDeckPopularity";
import { useCardsByNames } from "../features/events/useCardsByNames";
import { useChampionCardImages } from "../features/players/useChampionCardImages";
import ComparisonGrid from "../features/compare/ComparisonGrid";
import type { ComparedDeck } from "../features/compare/types";
import { computeDeckComposition } from "../lib/deckIdentity";
import { shortHash } from "../lib/hash";
import { useDocumentTitle } from "../lib/useDocumentTitle";

const CLASS_ROW = ["WARRIOR", "MAGE", "CLERIC", "ASSASSIN", "RANGER", "TAMER", "GUARDIAN"];
const ELEMENT_ROW = ["FIRE", "WATER", "WIND", "CRUX", "UMBRA", "EXALTED", "LUXEM", "TERA"];

interface Highlight {
  title: string;
  description: string;
  example: { to: string; label: string };
}

const FEATURES: Highlight[] = [
  {
    title: "Cards",
    description: "The full card database, synced locally for instant filtering — with pricing, related cards, and legality per card.",
    example: { to: "/cards/fan-of-insight", label: "Fan of Insight" },
  },
  {
    title: "Sets",
    description: "Every expansion, browsable alongside the cards printed in it.",
    example: { to: "/sets/DTR", label: "Distorted Reflections" },
  },
  {
    title: "Tournaments",
    description: "Omnidex events — standings, pairings, decklists, and judges, for events live and past.",
    example: { to: "/events/60488", label: "Grand Archive 2026 Worlds" },
  },
  {
    title: "Players",
    description: "Elo ratings, event history, notable upsets, and a full deck history per player.",
    example: { to: "/players/5390", label: "elothere" },
  },
  {
    title: "Judges",
    description: "Certified judges, searchable by level and experience — shared with the player rating system where they overlap.",
    example: { to: "/players/590", label: "Ain" },
  },
  {
    title: "Teams",
    description: "Team registrations from 3v3 events, searchable by team or player.",
    example: { to: "/teams", label: "Browse Teams" },
  },
  {
    title: "Achievements",
    description: "Badges computed automatically from tournament wins, rating milestones, and decklists.",
    example: { to: "/achievements/won-worlds", label: "Won Worlds" },
  },
  {
    title: "Champions",
    description: "Per-Champion stats: most-played cards, performance by season, and standout builds.",
    example: { to: "/champions/Guo%20Jia", label: "Guo Jia" },
  },
  {
    title: "Archetypes",
    description: "Named builds within each Champion, plus the full battle chart of matchups between them.",
    example: { to: "/battle-chart", label: "Battle Chart" },
  },
  {
    title: "Top Decks",
    description: "Every public decklist, filterable by Champion, class, keyword, season, and result.",
    example: { to: "/top-decks", label: "Browse Top Decks" },
  },
  {
    title: "Popular Decks",
    description: "Exact decklists multiple players independently ran, each with its own composition breakdown.",
    example: { to: "/decks/xenbr4", label: "A top Silvie build" },
  },
  {
    title: "Compare",
    description: "Line up any number of decks side-by-side — search by cards, import a player's list, or paste your own.",
    example: { to: "/compare", label: "Open Compare" },
  },
];

const WALKTHROUGH_HASH = "xenbr4";
const COMPARE_HASHES = ["xenbr4", "1xiwetk"];

export default function About() {
  useDocumentTitle("About", "What Fan of Insight is, how it's built, and why it exists.");

  const { decks } = useDeckPopularity(null);
  const walkthroughDeck = useMemo(() => decks.find((d) => shortHash(d.signature) === WALKTHROUGH_HASH), [decks]);
  const walkthroughNames = useMemo(
    () => [...(walkthroughDeck?.main ?? []), ...(walkthroughDeck?.material ?? [])].map((l) => l.name),
    [walkthroughDeck],
  );
  const walkthroughCardsByName = useCardsByNames(walkthroughNames);
  const walkthroughComposition = useMemo(() => {
    if (!walkthroughDeck) return null;
    return computeDeckComposition([...walkthroughDeck.main, ...walkthroughDeck.material], walkthroughCardsByName);
  }, [walkthroughDeck, walkthroughCardsByName]);
  const walkthroughChampionImages = useChampionCardImages(walkthroughDeck?.championName ? [walkthroughDeck.championName] : []);
  const walkthroughChampionCard = walkthroughDeck?.championName
    ? walkthroughChampionImages.get(walkthroughDeck.championName)
    : undefined;

  const compareSourceDecks = useMemo(
    () => COMPARE_HASHES.map((hash) => decks.find((d) => shortHash(d.signature) === hash)).filter((d) => d !== undefined),
    [decks],
  );
  const compareDecks: ComparedDeck[] = useMemo(
    () =>
      compareSourceDecks.map((d, i) => ({
        key: shortHash(d.signature),
        label: `${d.championName ?? "Deck"} build ${i + 1}`,
        source: { kind: "custom", decklist: { main: [], material: [], sideboard: [] } },
      })),
    [compareSourceDecks],
  );
  const compareDecklists = useMemo(() => {
    const map = new Map<string, OmnidexDecklist | null>();
    for (const d of compareSourceDecks) {
      map.set(shortHash(d.signature), {
        main: d.main.map((l) => ({ card: l.name, quantity: l.quantity })),
        material: d.material.map((l) => ({ card: l.name, quantity: l.quantity })),
        sideboard: [],
      });
    }
    return map;
  }, [compareSourceDecks]);

  return (
    <div>
      <section className="relative overflow-hidden border-b border-ctp-surface0">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 60% 50% at 80% 20%, rgba(126,20,255,0.18), transparent)",
          }}
        />
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

      {walkthroughDeck && walkthroughComposition && (
        <section className="border-t border-ctp-surface0 px-4 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-ctp-subtext0">See it in action</h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-sm text-ctp-subtext1">
              This isn't a mockup — it's a real deck's real page, rendered right here. {walkthroughDeck.championName} was
              independently played by {walkthroughDeck.playerCount} players across {walkthroughDeck.eventCount} events.
            </p>

            <div className="mt-8 grid gap-6 lg:grid-cols-[220px_1fr] lg:items-center">
              <div className="flex flex-col items-center text-center">
                <CardHoverPreview
                  image={walkthroughChampionCard?.editions[0]?.image}
                  alt={walkthroughDeck.championName ?? "Champion"}
                >
                  <Link to={`/decks/${WALKTHROUGH_HASH}`}>
                    {walkthroughChampionCard?.editions[0] ? (
                      <CardImage
                        image={walkthroughChampionCard.editions[0].image}
                        alt={walkthroughDeck.championName ?? ""}
                        className="h-40 w-28 rounded-md border border-ctp-surface1 object-cover object-top"
                      />
                    ) : (
                      <div className="h-40 w-28 rounded-md border border-ctp-surface1 bg-ctp-mantle" />
                    )}
                  </Link>
                </CardHoverPreview>
                <Link
                  to={`/decks/${WALKTHROUGH_HASH}`}
                  className="mt-3 text-lg font-semibold text-ctp-text hover:text-ctp-blue"
                >
                  {walkthroughDeck.championName}
                </Link>
                <p className="mt-1 text-xs text-ctp-subtext0">
                  {walkthroughDeck.classes.join("/")} · {walkthroughDeck.elements.join("/")}
                </p>
                <p className="mt-1 text-xs text-ctp-subtext0">
                  {walkthroughDeck.bestPlacement !== null && `Best finish #${walkthroughDeck.bestPlacement} · `}
                  {(walkthroughDeck.avgWinRate * 100).toFixed(0)}% avg win rate
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <DonutChart title="Card Types" segments={buildChartSegments(walkthroughComposition.types)} />
                <DonutChart title="Elements" segments={buildChartSegments(walkthroughComposition.elements)} />
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
      )}

      {compareDecks.length === 2 && (
        <section className="border-t border-ctp-surface0 px-4 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-ctp-subtext0">
              Compare decks, for real
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-sm text-ctp-subtext1">
              Two real, independently popular {compareSourceDecks[0]?.championName} builds, lined up card by card —
              green is in both, yellow is only in one. This is the live Compare tool, not a screenshot — scroll
              within it to see the full card list.
            </p>

            <div className="relative mt-8">
              <div className="max-h-[28rem] overflow-y-auto rounded-lg border border-ctp-surface1">
                <ComparisonGrid decks={compareDecks} decklists={compareDecklists} />
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
      )}

      <section className="border-t border-ctp-surface0 bg-ctp-mantle/40 py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-ctp-subtext0">Explore the site</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-lg border border-ctp-surface1 bg-ctp-base p-4">
                <h3 className="text-sm font-semibold text-ctp-text">{f.title}</h3>
                <p className="mt-1 text-xs text-ctp-subtext1">{f.description}</p>
                <Link to={f.example.to} className="mt-2 inline-block text-xs text-ctp-subtext0 hover:text-ctp-blue hover:underline">
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

      <section className="mx-auto max-w-3xl px-4 py-10 text-center">
        <p className="text-[11px] text-ctp-subtext0/70">
          Grand Archive is a trademark of Weebs of the Shore. Fan of Insight is an unofficial fan project and is not
          affiliated with or endorsed by Weebs of the Shore.
        </p>
      </section>
    </div>
  );
}
