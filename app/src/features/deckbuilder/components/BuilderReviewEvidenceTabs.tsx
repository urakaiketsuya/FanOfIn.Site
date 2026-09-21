import type { Card, CardImpactEntry } from "@gatcg/shared";
import { Link } from "react-router-dom";
import CardImpactTable from "../../../components/CardImpactTable";
import type { BuildCounters } from "../useBuildCounters";
import type { NearestDeck } from "../useNearestDecks";

export function BuilderMatchups({ buildCounters, hurtYouCards, hurtYouCardImages }: { buildCounters: BuildCounters; hurtYouCards: CardImpactEntry[]; hurtYouCardImages: Map<string, Card> }) {
  const sourceDeck = buildCounters.sourceDeck;
  if (!sourceDeck || buildCounters.clusterMatchups.length === 0) return null;
  const selectedId = buildCounters.opponentClusterId ?? buildCounters.clusterMatchups[0]?.opponentClusterId;
  return (
    <div className="mt-4 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-4 py-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Counters against this build</h3>
      <p className="mt-1 text-xs text-ctp-subtext0">This build isn't a real decklist yet, so this is proxied off {sourceDeck.championName ?? "the"} deck{sourceDeck.spiritName ? ` (${sourceDeck.spiritName})` : ""} closest to your current picks ({(sourceDeck.similarity * 100).toFixed(0)}% similar), and it may not hold once you finish the build. <Link to="/methodology#classification" className="text-ctp-blue hover:underline">Learn more</Link></p>
      {buildCounters.clusterMatchups.length > 1 && (
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ctp-subtext0">Matchup spread</p>
          <ul className="mt-1.5 space-y-1">
            {[...buildCounters.clusterMatchups].sort((a, b) => b.baselineWinRate - a.baselineWinRate).map((matchup) => {
              const winRatePct = matchup.baselineWinRate * 100;
              const selected = selectedId === matchup.opponentClusterId;
              return <li key={matchup.opponentClusterId}><button type="button" onClick={() => buildCounters.setOpponentClusterId(matchup.opponentClusterId)} aria-pressed={selected} className={`flex w-full items-center gap-2 rounded-md border px-2 py-1 text-left text-xs ${selected ? "border-ctp-blue bg-ctp-blue/10" : "border-ctp-surface1 hover:border-ctp-surface2"}`}><span className="w-28 shrink-0 truncate text-ctp-text">{matchup.opponentClusterName}</span><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ctp-surface1"><span className={`block h-full rounded-full ${winRatePct >= 50 ? "bg-ctp-green" : "bg-ctp-red"}`} style={{ width: `${Math.min(100, Math.max(0, winRatePct))}%` }} /></span><span className={`w-10 shrink-0 text-right font-semibold ${winRatePct >= 50 ? "text-ctp-green" : "text-ctp-red"}`}>{winRatePct.toFixed(0)}%</span><span className="w-16 shrink-0 text-right text-ctp-subtext0">{matchup.games}g</span></button></li>;
            })}
          </ul>
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs"><span className="text-ctp-subtext0">Vs:</span><select value={selectedId ?? ""} aria-label="Opponent build" onChange={(event) => buildCounters.setOpponentClusterId(event.target.value)} className="rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-1 text-xs text-ctp-text">{buildCounters.clusterMatchups.map((matchup) => <option key={matchup.opponentClusterId} value={matchup.opponentClusterId}>{matchup.opponentClusterName} ({matchup.games} games)</option>)}</select>{buildCounters.selectedMatchup && <span className="text-ctp-subtext0">{(buildCounters.selectedMatchup.baselineWinRate * 100).toFixed(0)}% win rate in this matchup</span>}</div>
      {hurtYouCards.length === 0 ? <p className="mt-3 text-sm text-ctp-subtext1">Not enough recorded games yet for a card-by-card breakdown.</p> : <CardImpactTable cards={hurtYouCards} cardImages={hurtYouCardImages} withLabel="Your win rate (they have it)" withoutLabel="Your win rate (they don't)" />}
    </div>
  );
}

export function BuilderSimilarDecks({ nearestDecks, compareLink, onLoad }: { nearestDecks: NearestDeck[]; compareLink: (deck: NearestDeck) => string; onLoad: (deck: NearestDeck) => void }) {
  return (
    <div className="mt-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Nearest similar real decks</h3>
      <p className="mt-1 text-xs text-ctp-subtext0">Real decklists most similar to your accepted cards, shown automatically after two choices. These are references, not a replacement recommendation population. Click "Load" to use one as a new starting point.</p>
      {nearestDecks.length === 0 ? <p className="mt-3 text-sm text-ctp-subtext1">No similar decks found for your choices so far.</p> : <ul className="mt-2 space-y-1">{nearestDecks.map((deck) => <li key={deck.deckId} className="flex flex-wrap items-center gap-1.5 rounded-md border border-ctp-surface1 px-2 py-1 text-sm"><span className="text-ctp-text">{deck.championName ?? "Unknown Champion"}</span>{deck.spiritName && <span className="text-ctp-subtext1">({deck.spiritName})</span>}<span className="text-xs text-ctp-subtext0">{(deck.similarity * 100).toFixed(0)}% similar</span><span className="text-xs text-ctp-subtext0">{(deck.winRate * 100).toFixed(0)}% win rate</span><Link to={compareLink(deck)} className="ml-auto shrink-0 rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-blue">Compare</Link><button type="button" onClick={() => onLoad(deck)} className="shrink-0 rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-blue">Load</button></li>)}</ul>}
    </div>
  );
}
