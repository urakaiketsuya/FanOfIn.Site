import { useState } from "react";
import DeckPreviewCard from "../../components/DeckPreviewCard";
import Button from "../../components/ui/Button";
import CardGrid from "../cards/CardGrid";
import type { SyncProgress } from "../../lib/sync/cards";
import type { Card, ChampionSeasonPerformance, ChampionTrend } from "@gatcg/shared";
import ChampionSeasonChart from "./ChampionSeasonChart";
import DisclosureChevron from "../../components/DisclosureChevron";
import Section from "../../components/ui/Section";
import { InlineState } from "../../components/ui/ContentState";

export interface SimilarDeckSummary {
  hash: string;
  championName: string | null;
  eventName: string;
  score: number;
}

export function ChampionSeasonSection({ seasons, trend }: { seasons: ChampionSeasonPerformance[]; trend: ChampionTrend | undefined }) {
  const latest = seasons.at(-1);
  if (!latest) return <InlineState className="mt-6">No season statistics are available for this champion yet.</InlineState>;
  const trendLabels = { rising: "Rising", falling: "Falling", stable: "Stable", new: "New this season", absent: "Absent this season", "insufficient-data": "Not enough data to compare seasons" };
  return (
    <Section className="identity-surface mt-6 rounded-3xl border border-ctp-surface1 p-5 sm:p-6" heading="compact" title="Latest season" description={latest.seasonName}>
      <dl className="mt-5 grid grid-cols-2 gap-5">
        <div><dt className="text-sm text-ctp-subtext1">Weighted result share</dt><dd className="mt-1 text-4xl font-semibold tabular-nums text-ctp-text">{(latest.shareOfSeason * 100).toFixed(1)}%</dd></div>
        <div><dt className="text-sm text-ctp-subtext1">Recorded decks</dt><dd className="mt-1 text-4xl font-semibold tabular-nums text-ctp-text">{latest.deckCount.toLocaleString()}</dd></div>
      </dl>
      <p className="mt-4 text-sm text-ctp-subtext1">Share of all champions' weighted placement scores this season, not the percentage of decks played.</p>
      {latest.deckCount === 0 && <p className="mt-3 text-sm text-ctp-subtext1">No recorded decks for this champion this season.</p>}
      {trend && <p className="mt-3 text-sm font-medium text-ctp-text">{trendLabels[trend.trend]}{trend.trendDeltaPct !== null && trend.trend !== "insufficient-data" && <span className="font-normal text-ctp-subtext1"> · {trend.trendDeltaPct > 0 ? "+" : ""}{trend.trendDeltaPct.toFixed(1)} percentage points of share compared with the previous season</span>}</p>}
      <details className="group mt-5 border-t border-ctp-surface1">
        <summary className="flex min-h-control cursor-pointer list-none items-center justify-between gap-3 rounded text-sm text-ctp-blue focus-visible:outline-2">Season results and history<DisclosureChevron className="group-open:rotate-180" /></summary>
        <ul className="divide-y divide-ctp-surface1">{seasons.toReversed().map((season) => <li key={season.seasonId} className="py-4">
          <h3 className="font-semibold text-ctp-text">{season.seasonName}</h3>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-5">
            {[['Recorded decks', season.deckCount.toLocaleString()], ['Tournament wins', season.winCount.toLocaleString()], ['Top cut', season.topCutCount.toLocaleString()], ['Win rate', season.deckCount > 0 ? `${(season.avgWinRate * 100).toFixed(0)}%` : 'No recorded decks'], ['Weighted share', `${(season.shareOfSeason * 100).toFixed(1)}%`]].map(([label, value]) => <div key={label}><dt className="text-ctp-subtext0">{label}</dt><dd className="mt-1 font-medium tabular-nums text-ctp-text">{value}</dd></div>)}
          </dl>
        </li>)}</ul>
      </details>
      {seasons.length > 1 && <details className="group border-t border-ctp-surface1">
        <summary className="flex min-h-control cursor-pointer list-none items-center justify-between gap-3 rounded text-sm text-ctp-blue focus-visible:outline-2">View season chart<DisclosureChevron className="group-open:rotate-180" /></summary>
        <p className="mb-3 text-sm text-ctp-subtext0">The chart scrolls on smaller screens. All values are also available in Season results and history.</p>
        <div className="min-w-0 overflow-hidden"><ChampionSeasonChart seasons={seasons} /></div>
      </details>}
    </Section>
  );
}

export function SimilarDecksSection({ championName, decks }: { championName: string; decks: SimilarDeckSummary[] }) {
  const [showAll, setShowAll] = useState(false);
  const visibleDecks = showAll ? decks : decks.slice(0, 3);
  return (
    <Section className="mt-6" heading="compact" title="Similar decks" description={`Explore recorded builds that share cards with a ${championName} deck. Similarity describes card overlap, not tournament strength.`}>
      {decks.length === 0 ? <InlineState className="mt-4 text-sm">No similar decks found yet.</InlineState> : <>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{visibleDecks.map((deck) => <DeckPreviewCard key={deck.hash} presentation="cover" model={{
          id: deck.hash,
          title: `${deck.championName ?? "Unknown champion"} build`,
          championName: deck.championName,
          decklist: null,
          source: { kind: "event", label: "Tournament" },
          metadata: <><p>{deck.eventName}</p><p className="font-medium text-ctp-text">{(deck.score * 100).toFixed(0)}% similarity to a {championName} build</p></>,
        }} view={{ to: `/decks/${deck.hash}` }} />)}</div>
        {decks.length > 3 && <Button className="mt-4" aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>{showAll ? "Show fewer decks" : `Show all ${decks.length} similar decks`}</Button>}
      </>}
    </Section>
  );
}

export function ChampionBonusSection({ championName, cards, phase, hasCatalog }: {
  championName: string;
  cards: Card[];
  phase: SyncProgress["phase"];
  hasCatalog: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  return <Section className="identity-surface mt-6 rounded-3xl border border-ctp-surface1 p-5 sm:p-6" heading="compact" title="Bonus cards" description={`Explore cards with a printed ${championName} Bonus effect. Cards are listed alphabetically.`}>
    {phase === "error" ? <div className="mt-4">
      <p role="alert" className="text-sm text-ctp-red">The card catalog could not refresh. {hasCatalog ? "Saved cards remain available, but results may be incomplete." : "Bonus cards are unavailable until the catalog loads."}</p>
      <Button className="mt-3" onClick={() => window.location.reload()}>Reload to retry catalog</Button>
    </div> : (phase !== "done" || !hasCatalog) && <p role="status" className="mt-4 text-sm text-ctp-subtext1">{hasCatalog ? "Refreshing the card catalog. Showing saved cards." : "Loading the card catalog…"}</p>}
    {cards.length > 0 ? <>
      <p className="mt-4 text-sm text-ctp-subtext1">{showAll ? cards.length : Math.min(4, cards.length)} of {cards.length} bonus cards in your local catalog</p>
      <CardGrid cards={showAll ? cards : cards.slice(0, 4)} />
      {cards.length > 4 && <Button className="mt-4" aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>{showAll ? "Show fewer bonus cards" : `Show all ${cards.length} bonus cards`}</Button>}
    </> : phase === "done" && hasCatalog && <InlineState className="mt-4 text-sm">No published cards have a bonus tied to {championName} yet.</InlineState>}
  </Section>;
}
