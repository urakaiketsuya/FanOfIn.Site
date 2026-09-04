import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Card } from "@gatcg/shared";
import CardImpactTable from "../../../components/CardImpactTable";
import Panel from "../../../components/ui/Panel";
import Section from "../../../components/ui/Section";
import { InlineState } from "../../../components/ui/ContentState";
import MethodologyNote from "../../../components/ui/MethodologyNote";
import { useCardsByNames } from "../../events/useCardsByNames";
import DeckWinConditions from "../../decks/DeckWinConditions";
import type { DeckTestResult } from "../../../lib/deckTestResult";
import type { NearestDeck } from "../useNearestDecks";

/**
 * The Guided Deck Builder's "Test" tab — classifies the build-in-progress against the archetype
 * taxonomy and reports how that matched build has actually performed, its matchup spread (both
 * `myCards`/`opponentCards` — `myCards` and per-card `answers` are real pipeline output no other
 * surface renders today), how it wins (folded in here rather than a separate sub-tab, per the
 * "Test This Deck" plan), and the nearest real decks. Owns its own opponent-matchup selection
 * state (unlike `BuilderReviewPanel`'s Matchups sub-tab, which gets `buildCounters` from the
 * parent) since nothing else needs that selection.
 */
export default function BuilderTestPanel({
  deckTestResult,
  loading,
  cardsByName,
  nearestDecks,
  nearestDeckCompareLink,
  onLoadNearestDeck,
}: {
  deckTestResult: DeckTestResult | null;
  loading: boolean;
  cardsByName: Map<string, Card>;
  nearestDecks: NearestDeck[];
  nearestDeckCompareLink: (deck: NearestDeck) => string;
  onLoadNearestDeck: (deck: NearestDeck) => void;
}) {
  const [opponentClusterId, setOpponentClusterId] = useState<string | null>(null);

  const clusterMatchups = deckTestResult?.matchups ?? [];
  const selectedMatchup = clusterMatchups.find((m) => m.opponentClusterId === (opponentClusterId ?? clusterMatchups[0]?.opponentClusterId));
  const matchupCardNames = useMemo(
    () => [...(selectedMatchup?.myCards ?? []), ...(selectedMatchup?.opponentCards ?? [])].map((c) => c.cardName),
    [selectedMatchup],
  );
  const matchupCardImages = useCardsByNames(matchupCardNames);

  if (loading || !deckTestResult) {
    return (
      <div role="tabpanel" id="deck-builder-panel-test" aria-labelledby="deck-builder-tab-test">
        <InlineState className="mt-4 text-sm">Loading historical data…</InlineState>
      </div>
    );
  }

  const { classification, performance, winConditions, cautions } = deckTestResult;
  const cluster = classification.cluster;

  return (
    <div role="tabpanel" id="deck-builder-panel-test" aria-labelledby="deck-builder-tab-test">
      {cautions.length > 0 && (
        <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs text-ctp-subtext0">
          {cautions.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      )}

      {!cluster ? (
        <p className="mt-3 text-sm text-ctp-subtext1">No published build resembles your picks closely enough yet to compare against real results.</p>
      ) : (
        <>
          <Panel padding="sm" className="mt-4">
            <Section heading="dense" title="Historical match" description="Which named build this most resembles, and how that build has actually performed.">
              <p className="mt-2 text-xs text-ctp-subtext0">
                Matches{" "}
                <Link to={`/archetypes/${cluster.id}`} className="text-ctp-blue hover:underline">
                  {cluster.name}
                </Link>{" "}
                ({(classification.similarity * 100).toFixed(0)}% similar{classification.status === "borderline" ? ", borderline" : ""})
              </p>
              {performance && (
                <>
                  <p className="mt-1 text-xs text-ctp-subtext0">
                    {(performance.winRate * 100).toFixed(0)}% avg win rate · {(performance.topCutRate * 100).toFixed(0)}% top cut rate
                    {performance.avgPlacement !== null && ` · avg placement #${performance.avgPlacement.toFixed(0)}`}
                  </p>
                  <p className="mt-1 text-xs text-ctp-subtext0">
                    95% win-rate interval {(performance.interval95.low * 100).toFixed(1)}–{(performance.interval95.high * 100).toFixed(1)}%
                    {` across ${performance.interval95.matches.toLocaleString()} matches`}
                    {` · ${performance.deckCount} decks, ${performance.playerCount} players, ${performance.eventCount} events`}
                    {performance.confidence === "emerging" ? " · emerging signal" : ""}
                  </p>
                  {performance.trend && (
                    <p className="mt-1 text-xs text-ctp-subtext0">
                      {performance.trend.previousSeasonName} → {performance.trend.latestSeasonName}:{" "}
                      <span className={performance.trend.playerCountChange > 0 ? "text-ctp-green" : performance.trend.playerCountChange < 0 ? "text-ctp-red" : ""}>
                        {performance.trend.playerCountChange > 0 ? "+" : ""}
                        {performance.trend.playerCountChange} players
                      </span>{" "}
                      ·{" "}
                      <span className={performance.trend.winRateChangePct > 0 ? "text-ctp-green" : performance.trend.winRateChangePct < 0 ? "text-ctp-red" : ""}>
                        {performance.trend.winRateChangePct > 0 ? "+" : ""}
                        {performance.trend.winRateChangePct.toFixed(1)}pp win rate
                      </span>
                    </p>
                  )}
                </>
              )}
              <MethodologyNote anchor="classification">How this match and its confidence tier are determined.</MethodologyNote>
            </Section>
          </Panel>

          {clusterMatchups.length > 0 && (
            <div className="mt-4 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-4 py-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Matchup spread</h3>
              {clusterMatchups.length > 1 && (
                <ul className="mt-1.5 space-y-1">
                  {[...clusterMatchups]
                    .sort((a, b) => b.baselineWinRate - a.baselineWinRate)
                    .map((m) => {
                      const winRatePct = m.baselineWinRate * 100;
                      const isSelected = (opponentClusterId ?? clusterMatchups[0]?.opponentClusterId) === m.opponentClusterId;
                      return (
                        <li key={m.opponentClusterId}>
                          <button
                            type="button"
                            onClick={() => setOpponentClusterId(m.opponentClusterId)}
                            aria-pressed={isSelected}
                            className={`flex w-full items-center gap-2 rounded-md border px-2 py-1 text-left text-xs ${isSelected ? "border-ctp-blue bg-ctp-blue/10" : "border-ctp-surface1 hover:border-ctp-surface2"}`}
                          >
                            <span className="w-28 shrink-0 truncate text-ctp-text">{m.opponentClusterName}</span>
                            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ctp-surface1">
                              <span
                                className={`block h-full rounded-full ${winRatePct >= 50 ? "bg-ctp-green" : "bg-ctp-red"}`}
                                style={{ width: `${Math.min(100, Math.max(0, winRatePct))}%` }}
                              />
                            </span>
                            <span className={`w-10 shrink-0 text-right font-semibold ${winRatePct >= 50 ? "text-ctp-green" : "text-ctp-red"}`}>{winRatePct.toFixed(0)}%</span>
                            <span className="w-16 shrink-0 text-right text-ctp-subtext0">{m.games}g</span>
                          </button>
                        </li>
                      );
                    })}
                </ul>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-ctp-subtext0">Vs:</span>
                <select
                  value={opponentClusterId ?? clusterMatchups[0]?.opponentClusterId ?? ""}
                  aria-label="Opponent build"
                  onChange={(e) => setOpponentClusterId(e.target.value)}
                  className="rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-1 text-xs text-ctp-text"
                >
                  {clusterMatchups.map((m) => (
                    <option key={m.opponentClusterId} value={m.opponentClusterId}>
                      {m.opponentClusterName} ({m.games} games)
                    </option>
                  ))}
                </select>
                {selectedMatchup && <span className="text-ctp-subtext0">{(selectedMatchup.baselineWinRate * 100).toFixed(0)}% win rate in this matchup</span>}
              </div>

              {selectedMatchup && (
                <>
                  <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-ctp-subtext0">Helpful cards</p>
                  {selectedMatchup.myCards.length === 0 ? (
                    <p className="mt-1 text-sm text-ctp-subtext1">Not enough recorded games yet for a card-by-card breakdown.</p>
                  ) : (
                    <CardImpactTable cards={selectedMatchup.myCards} cardImages={matchupCardImages} withLabel="Your win rate (you have it)" withoutLabel="Your win rate (you don't)" />
                  )}

                  <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-ctp-subtext0">Harmful opponent cards</p>
                  {selectedMatchup.opponentCards.length === 0 ? (
                    <p className="mt-1 text-sm text-ctp-subtext1">Not enough recorded games yet for a card-by-card breakdown.</p>
                  ) : (
                    <CardImpactTable
                      cards={selectedMatchup.opponentCards}
                      cardImages={matchupCardImages}
                      withLabel="Your win rate (they have it)"
                      withoutLabel="Your win rate (they don't)"
                    />
                  )}

                  {selectedMatchup.answers.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-ctp-subtext0">Possible answers</p>
                      <ul className="mt-1 space-y-0.5 text-xs text-ctp-subtext0">
                        {selectedMatchup.answers.map((a) => (
                          <li key={a.opponentCardName}>
                            {a.opponentCardName} is answered by:{" "}
                            {a.answers
                              .map(
                                (ans) =>
                                  `${ans.cardName} (${ans.mitigation >= 0 ? "+" : ""}${(ans.mitigation * 100).toFixed(0)}pp${ans.scope === "champion" ? ", Champion-wide" : ""})`,
                              )
                              .join(", ")}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

      {winConditions.length > 0 && (
        <Panel padding="sm" className="mt-4">
          <Section
            heading="dense"
            collapsible
            defaultOpen={false}
            title="How this deck wins"
            description="Card interactions detected from rules text and, where a real deck confirms them, cross-deck co-occurrence — not a win-rate claim."
          >
            <DeckWinConditions interactions={winConditions} cardsByName={cardsByName} />
          </Section>
        </Panel>
      )}

      <div className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Nearest similar real decks</h3>
        <p className="mt-1 text-xs text-ctp-subtext0">
          Real decklists most similar to your accepted cards. These are references, not a replacement recommendation population. Click "Load" to use one as a new starting
          point.
        </p>
        {nearestDecks.length === 0 ? (
          <p className="mt-3 text-sm text-ctp-subtext1">No similar decks found for your choices so far.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {nearestDecks.map((d) => (
              <li key={d.deckId} className="flex flex-wrap items-center gap-1.5 rounded-md border border-ctp-surface1 px-2 py-1 text-sm">
                <span className="text-ctp-text">{d.championName ?? "Unknown Champion"}</span>
                {d.spiritName && <span className="text-ctp-subtext1">({d.spiritName})</span>}
                <span className="text-xs text-ctp-subtext0">{(d.similarity * 100).toFixed(0)}% similar</span>
                <span className="text-xs text-ctp-subtext0">{(d.winRate * 100).toFixed(0)}% win rate</span>
                <Link
                  to={nearestDeckCompareLink(d)}
                  className="ml-auto shrink-0 rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-blue"
                >
                  Compare
                </Link>
                <button
                  type="button"
                  onClick={() => onLoadNearestDeck(d)}
                  className="shrink-0 rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-blue"
                >
                  Load
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
