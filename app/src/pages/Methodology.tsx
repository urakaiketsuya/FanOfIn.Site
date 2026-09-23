import { useEffect, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import PageLayout from "../components/layout/PageLayout";
import PageHeader from "../components/ui/PageHeader";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { useDecklistCoverage } from "../features/tournaments/useDecklistCoverage";

const TOPICS = [
  { id: "cards", label: "Cards" },
  { id: "champions", label: "Top Champions" },
  { id: "decks", label: "Decks" },
  { id: "competition", label: "Competition" },
  { id: "tools", label: "Tools" },
  { id: "account", label: "Account" },
] as const;

function TopicLinks() {
  return <ul className="space-y-1">{TOPICS.map(({ id, label }) => <li key={id}><a href={`#${id}`} className="block rounded-lg px-3 py-2 text-sm text-ctp-subtext1 hover:bg-forest-surface/40 hover:text-ctp-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">{label}</a></li>)}</ul>;
}

function Topic({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-28 border-b border-ctp-surface0 pb-9 last:border-0">
    <h2 id={`${id}-heading`} className="text-xl font-semibold text-ctp-text">{title}</h2>
    <div className="mt-3 space-y-3 text-sm leading-6 text-ctp-subtext1">{children}</div>
  </section>;
}

function Evidence({ source, limit }: { source: string; limit: string }) {
  return <div className="mt-4 grid gap-3 text-sm leading-6 sm:grid-cols-2">
    <div className="rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4"><h3 className="font-semibold text-ctp-text">Where the evidence comes from</h3><p className="mt-1 text-ctp-subtext1">{source}</p></div>
    <div className="rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4"><h3 className="font-semibold text-ctp-text">What it cannot establish</h3><p className="mt-1 text-ctp-subtext1">{limit}</p></div>
  </div>;
}

function Detail({ title, children }: { title: string; children: ReactNode }) {
  return <details className="mt-4 rounded-xl border border-ctp-surface1 bg-ctp-mantle/50 p-4 text-sm leading-6 text-ctp-subtext1">
    <summary className="cursor-pointer font-semibold text-ctp-text">{title}</summary>
    <div className="mt-3 space-y-3">{children}</div>
  </details>;
}

function Anchor({ id }: { id: string }) {
  return <span id={id} className="block scroll-mt-28" />;
}

export default function Methodology() {
  useDocumentTitle("How the Numbers Work", "What each part of Fan of Insight offers, where its evidence comes from, and what its numbers cannot prove.");
  const location = useLocation();
  const coverage = useDecklistCoverage();

  useEffect(() => {
    if (!location.hash) return;
    document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }, [location.hash]);

  return <PageLayout data-component="Methodology" width="wide" className="py-10">
    <PageHeader eyebrow="About the data" title="How the numbers work" description="Start with the part of the site you are using. Each section explains what it offers, where its evidence comes from, and what you should not infer from it." />
    <div className="mb-8 rounded-2xl border border-forest-surface bg-forest-surface/30 p-5 sm:p-6">
      <p className="text-sm font-semibold text-ctp-text">Before you use a number</p>
      <ul className="mt-3 grid gap-3 text-sm leading-6 text-ctp-subtext1 sm:grid-cols-3 sm:gap-5">
        <li><strong className="text-ctp-blue">Check the source.</strong> Tournament results, simulator games, card catalog facts, and your own saved data answer different questions.</li>
        <li><strong className="text-ctp-blue">Check the sample.</strong> A percentage from a few decks or games is less stable than one from many independent players and events.</li>
        <li><strong className="text-ctp-blue">Check the claim.</strong> An observed association, a probability forecast, and a suggested edit are not promises of an outcome.</li>
      </ul>
    </div>
    <details className="mb-8 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4 lg:hidden">
      <summary className="cursor-pointer text-sm font-semibold text-ctp-text">Jump to a section</summary>
      <nav aria-label="Methodology sections" className="mt-3 border-t border-ctp-surface0 pt-2"><TopicLinks /></nav>
    </details>
    <div className="grid gap-10 lg:grid-cols-[200px_minmax(0,1fr)]">
      <nav aria-label="Methodology sections" className="hidden self-start lg:sticky lg:top-28 lg:block">
        <p className="px-3 text-xs font-semibold uppercase tracking-widest text-ctp-subtext0">On this page</p>
        <div className="mt-3 border-l border-ctp-surface1"><TopicLinks /></div>
      </nav>
      <div className="min-w-0 space-y-9">
        <Topic id="cards" title="Cards">
          <p><Link to="/cards" className="text-ctp-blue hover:underline">Browse Cards</Link> shows catalog information; <Link to="/cards/stats" className="text-ctp-blue hover:underline">Top Cards</Link> adds usage and results from submitted tournament decks. <Link to="/cards/packages" className="text-ctp-blue hover:underline">Card Packages</Link> shows explicit groups used by deck-review guardrails.</p>
          <Evidence source="Card details come from the card catalog. Usage, win-rate, and Card Impact figures come from tournament decklists and recorded results, not every game played." limit="A card appearing in successful decks does not prove it caused those wins. Champion, build, matchup, and player choices can all affect the comparison." />
          <Anchor id="small-samples" />
          <Detail title="Why is an adjusted win rate different from the observed rate?"><p>Small-sample win rates are pulled toward a baseline so a short streak does not dominate the ranking. The target is 50% for meta-wide card stats and the Champion's own average for Champion-scoped card stats. Recorded results carry more weight as the sample grows.</p></Detail>
        </Topic>
        <Topic id="champions" title="Top Champions">
          <p><Link to="/champions" className="text-ctp-blue hover:underline">Top Champions</Link> compares tournament performance and trends. A Champion page also connects its builds and commonly played cards.</p>
          <Evidence source="Champion results are derived from tracked tournament entries and match outcomes; card breakdowns additionally require submitted decklists." limit="A leaderboard does not identify the strongest Champion in every format, matchup, or local field. Fewer recorded results mean more uncertainty." />
        </Topic>
        <Topic id="decks" title="Decks">
          <p><Link to="/decks" className="text-ctp-blue hover:underline">Tournament Decks</Link> explores submitted lists and recurring builds. <Link to="/pantheon/decks" className="text-ctp-blue hover:underline">Pantheon Decks</Link> are a separate deck source, while <Link to="/decks/shared" className="text-ctp-blue hover:underline">Shared Decks</Link> are published by site users.</p>
          <Evidence source="Tournament build statistics use events with submitted decklists. Build clusters compare main and material cards; sideboards do not define build identity." limit="Decklist-enabled events are a subset of tracked events, and a cluster is an algorithmic grouping—not a manually verified archetype or proof that every list plays alike." />
          <Anchor id="coverage" />
          <Detail title="How much of the event data includes decklists?"><p>{coverage.loading ? "Loading current coverage from the published event index…" : `${(coverage.coverageRate * 100).toFixed(1)}% of ${coverage.totalEvents.toLocaleString()} tracked events are marked as allowing decklists${coverage.latestSeasonCoverageRate === null ? "." : `; ${coverage.latestSeasonName ?? "the latest listed season"} is ${(coverage.latestSeasonCoverageRate * 100).toFixed(1)}%.`}`} This is event-level availability, not the share of players who submitted a list. Card- and build-specific statistics use the lists actually available.</p></Detail>
          <Anchor id="classification" /><Anchor id="confidence-tiers" />
          <Detail title="How are builds matched and labeled?"><p>Submitted lists are grouped by card overlap. A tested list can be matched to the closest existing build, but a borderline match should not be read as the same strategy.</p><p>Published recurring builds start at 5 distinct players. A build is labeled <strong>Established</strong> at 50 distinct players across at least 2 events by default; smaller published builds are <strong>Emerging</strong>. These labels apply to build clusters, not to every statistic on the site. Build win rates also show a 95% Wilson interval over recorded match outcomes, counting ties as half a win.</p></Detail>
        </Topic>
        <Topic id="competition" title="Competition">
          <p><Link to="/seasons" className="text-ctp-blue hover:underline">Seasons</Link>, <Link to="/players" className="text-ctp-blue hover:underline">Players and Judges</Link>, <Link to="/teams" className="text-ctp-blue hover:underline">Teams</Link>, and <Link to="/regions" className="text-ctp-blue hover:underline">Regional Analysis</Link> organize recorded competition. <Link to="/timelines" className="text-ctp-blue hover:underline">Match Timelines</Link> reconstruct selected broadcast matches.</p>
          <Evidence source="Event, standing, pairing, and rating-change data come from the tournament source. Regional views depend on recorded event locations. Broadcast timelines are human annotations of selected VODs." limit="Tracked events are not every Grand Archive event. Regional comparisons reflect the recorded field, and a timeline is not a complete match log or official ruling record." />
          <Anchor id="elo" />
          <Detail title="How do player ratings work?"><p>Players start at 1500. The site replays rating changes supplied for each match by Omnidex in event-date order; it does not compute those changes from its own Elo formula. Ratings with fewer than 10 recorded matches are marked <strong>Provisional</strong>.</p></Detail>
          <Anchor id="broadcast-data" />
          <Detail title="What is a match timeline?"><p>A timeline is a human reconstruction of an on-stream feature match, including notable plays and commentary. It covers selected broadcasts rather than every table, and on-camera actions can be misread. User-created recipes in Combo Lab are a different source.</p></Detail>
        </Topic>
        <Topic id="tools" title="Tools">
          <p><Link to="/compare" className="text-ctp-blue hover:underline">Compare Decks</Link> shows differences between lists. <Link to="/deck-builder" className="text-ctp-blue hover:underline">Deck Builder</Link> creates and edits a list; <Link to="/deck-analysis" className="text-ctp-blue hover:underline">Deck Analysis</Link> measures its consistency and timing; <Link to="/deck-review" className="text-ctp-blue hover:underline">Deck Review</Link> suggests changes. <Link to="/combo-lab" className="text-ctp-blue hover:underline">Combo Lab</Link> and <Link to="/goldfish" className="text-ctp-blue hover:underline">Goldfish Test</Link> test access and draws. <Link to="/card-discovery" className="text-ctp-blue hover:underline">Find New Cards</Link> explores candidates, while <Link to="/looking-for" className="text-ctp-blue hover:underline">Looking For</Link> makes a shareable wishlist.</p>
          <Evidence source="The tools combine your selected deck, card-catalog facts, probability calculations, and—where labeled—tournament or experimental simulator evidence. Each tool has a different input and purpose." limit="Draw odds and resource forecasts are models of a specified deck and assumptions, not predicted match wins. Suggestions are candidates to test, not guarantees that an edit improves your deck." />
          <Anchor id="simulator-data" />
          <Detail title="Where does simulator evidence appear?"><p>Anonymous Clarent telemetry is experimental and kept separate from tournament win rates and Card Impact. In the Guided Deck Builder it can reorder eligible card options inside a tournament-derived legal shell; it does not supply tournament outcomes or establish that a card is best for a particular Champion. Look for the experimental label where it appears.</p></Detail>
        </Topic>
        <Topic id="account" title="Account">
          <p><Link to="/decks/edit" className="text-ctp-blue hover:underline">My Decks</Link> stores and edits your lists, <Link to="/collection" className="text-ctp-blue hover:underline">My Collection</Link> tracks cards you own, and <Link to="/settings" className="text-ctp-blue hover:underline">Settings</Link> controls preferences.</p>
          <Evidence source="These pages primarily use information you enter or save, rather than treating your personal lists or collection as tournament submissions." limit="A saved deck or owned card is not evidence of tournament usage or performance. A published community deck remains user-provided content unless separately backed by tournament data." />
        </Topic>
        <p className="text-xs leading-5 text-ctp-subtext0">Tournament analytics are refreshed on a daily schedule when source data is available. A scheduled run can be delayed or yield no new results; the numbers shown are the latest published snapshot.</p>
      </div>
    </div>
  </PageLayout>;
}
