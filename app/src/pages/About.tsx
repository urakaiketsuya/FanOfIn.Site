import { Link } from "react-router-dom";
import ClassIcon from "../components/ClassIcon";
import ElementIcon from "../components/ElementIcon";
import { useDocumentTitle } from "../lib/useDocumentTitle";

const CLASS_ROW = ["WARRIOR", "MAGE", "CLERIC", "ASSASSIN", "RANGER", "TAMER", "GUARDIAN"];
const ELEMENT_ROW = ["FIRE", "WATER", "WIND", "CRUX", "UMBRA", "EXALTED", "LUXEM", "TERA"];

interface Highlight {
  title: string;
  description: string;
  example: { to: string; label: string };
}

const HIGHLIGHTS: Highlight[] = [
  {
    title: "Clustered, not curated",
    description:
      "Named builds are grouped from real decklists by how similar their card lists actually are, not hand-picked ahead of time.",
    example: { to: "/archetypes/14lh0s0", label: "Tera Silvie" },
  },
  {
    title: "What's trending",
    description: "Card usage compares the last 30 days against the 30 before it, so you can see what's actually rising.",
    example: { to: "/cards/scepter-of-fascination", label: "Scepter of Fascination" },
  },
  {
    title: "Season over season",
    description: "Every Champion's performance is broken down by season, so a swing in the meta is visible, not buried.",
    example: { to: "/champions/Tristan", label: "Tristan's season trend" },
  },
  {
    title: "Bring your own list",
    description: "The comparison tool works with a deck that was never even submitted to Omnidex — paste it in directly.",
    example: { to: "/compare", label: "Try Compare" },
  },
];

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

export default function About() {
  useDocumentTitle("About", "What Fan of Insight is, how it's built, and why it exists.");

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

      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-ctp-subtext0">Why use it</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {HIGHLIGHTS.map((h) => (
            <div key={h.title} className="rounded-lg border border-ctp-surface1 bg-ctp-mantle p-5">
              <h3 className="text-lg font-semibold text-ctp-text">{h.title}</h3>
              <p className="mt-1.5 text-sm text-ctp-subtext1">{h.description}</p>
              <Link to={h.example.to} className="mt-3 inline-block text-xs text-ctp-subtext0 hover:text-ctp-blue hover:underline">
                Example: {h.example.label} &rarr;
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-ctp-surface0 bg-ctp-mantle/40 py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-ctp-subtext0">Every feature</h2>
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
