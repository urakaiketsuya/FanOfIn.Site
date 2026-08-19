import { Link } from "react-router-dom";

interface SectionLink {
  to: string;
  label: string;
}

interface Section {
  title: string;
  description: string;
  to: string;
  links?: SectionLink[];
}

const SECTIONS: Section[] = [
  // Card catalog
  {
    title: "Cards",
    description:
      "Browse and search the full card database, synced locally for instant filtering — with pricing, related cards, and legality on every card page.",
    to: "/cards",
    links: [
      { to: "/cards/stats", label: "Usage & win rates" },
      { to: "/cards/fan-of-insight", label: "Example: Fan of Insight" },
    ],
  },
  {
    title: "Sets",
    description: "Browse expansions and the cards printed in each one.",
    to: "/sets",
  },
  // Tournaments & people
  {
    title: "Tournaments",
    description: "Look up Omnidex tournament events — standings, pairings, decklists, and judges.",
    to: "/tournaments",
    links: [{ to: "/seasons", label: "Browse by season" }],
  },
  {
    title: "Players",
    description:
      "Player index with Elo ratings, event history, and notable upsets — plus each player's full deck history: champions played and most-used cards.",
    to: "/players",
    links: [{ to: "/players/5390", label: "Example: elothere" }],
  },
  {
    title: "Judges",
    description: "Roster of certified judges, searchable by level and experience.",
    to: "/judges",
  },
  {
    title: "Teams",
    description: "Team registrations from 3v3 team-format events, searchable by team or player.",
    to: "/teams",
  },
  {
    title: "Achievements",
    description: "Badges computed automatically from tournament wins, ratings, and decklists — tournament tiers, rating milestones, and more.",
    to: "/achievements",
  },
  // Deck analysis
  {
    title: "Champions",
    description: "Per-Champion stats: most-played cards by deck section, performance trends by season, and standout builds.",
    to: "/champions",
    links: [{ to: "/champions/Guo%20Jia", label: "Example: Guo Jia" }],
  },
  {
    title: "Archetypes",
    description: "Named builds within each Champion, derived from real decklists, with sample decklists and matchup data.",
    to: "/archetypes",
    links: [
      { to: "/battle-chart", label: "Battle chart" },
      { to: "/archetypes/14lh0s0", label: "Example: Tera Silvie" },
    ],
  },
  {
    title: "Top Decks",
    description: "Every publicly sighted decklist, filterable by Champion, season, event type, and result.",
    to: "/top-decks",
  },
  {
    title: "Popular Decks",
    description:
      "Exact decklists multiple players independently ran — each has its own page with composition charts, price, and a popularity trend.",
    to: "/popular-decks",
    links: [{ to: "/decks/xenbr4", label: "Example: a top Silvie build" }],
  },
  // Tools
  {
    title: "Compare",
    description: "Line up any number of decks side-by-side — search by cards, import a player's list, or paste your own.",
    to: "/compare",
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold text-ctp-blue">Fan of Insight</h1>
      <p className="mt-2 text-ctp-subtext1">
        Card database, sets, and tournament data — synced locally for fast, offline-friendly browsing.
      </p>
      <p className="mt-2 text-xs text-ctp-subtext0">
        A few things worth knowing: archetypes are clustered from real decklists rather than hand-picked (e.g.{" "}
        <Link to="/archetypes/14lh0s0" className="hover:text-ctp-blue hover:underline">
          Tera Silvie
        </Link>
        ), Card Stats tracks recent vs. prior usage to surface what's trending (e.g.{" "}
        <Link to="/cards/scepter-of-fascination" className="hover:text-ctp-blue hover:underline">
          Scepter of Fascination
        </Link>
        ), Champion pages break performance down by season (e.g.{" "}
        <Link to="/champions/Tristan" className="hover:text-ctp-blue hover:underline">
          Tristan
        </Link>
        ), and Compare accepts a decklist even if it's never been submitted to Omnidex.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((section) => (
          <div
            key={section.to}
            className="flex flex-col rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4 transition-colors hover:border-ctp-blue"
          >
            <Link to={section.to} className="text-lg font-semibold text-ctp-blue hover:underline">
              {section.title}
            </Link>
            <p className="mt-1 flex-1 text-sm text-ctp-subtext1">{section.description}</p>
            {section.links && section.links.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-ctp-surface0 pt-2">
                {section.links.map((link) => (
                  <Link key={link.to} to={link.to} className="text-xs text-ctp-subtext0 hover:text-ctp-blue hover:underline">
                    {link.label} &rarr;
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
