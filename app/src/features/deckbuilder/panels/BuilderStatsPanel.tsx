import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { Card, CompositionWinRateData } from "@gatcg/shared";
import CardHoverPreview from "../../../components/CardHoverPreview";
import { computeReadinessCrossLinks, DependencyReadinessEntries, SynergyReadinessEntries } from "../../../components/DeckReadinessSection";
import { CompositionChartsSection, CompositionSuggestionsSection } from "./CompositionPanels";
import type { CardDecayReport } from "../../../lib/cardDecay";
import type { DependencyReadiness, SynergyReadiness } from "../synergyReadiness";
import type { NewReleaseCard } from "../newReleaseCards";
import Panel from "../../../components/ui/Panel";
import Section from "../../../components/ui/Section";
import { InlineState } from "../../../components/ui/ContentState";

export default function StatsPanel({
  lines,
  mainLines,
  cardsByName,
  catalogByName,
  synergyReadiness,
  dependencyReadiness,
  newReleaseCards,
  compositionWinRateData,
  onAddCard,
  decayReport,
}: {
  lines: { name: string; quantity: number }[];
  mainLines: { name: string; quantity: number }[];
  cardsByName: Map<string, Card>;
  catalogByName: Map<string, Card>;
  synergyReadiness: SynergyReadiness[];
  dependencyReadiness: DependencyReadiness[];
  newReleaseCards: NewReleaseCard[];
  compositionWinRateData: CompositionWinRateData | undefined;
  onAddCard: (name: string) => void;
  decayReport: CardDecayReport | null;
}) {
  const readinessCrossLinks = useMemo(() => computeReadinessCrossLinks(synergyReadiness, dependencyReadiness), [synergyReadiness, dependencyReadiness]);

  if (lines.length === 0) return <InlineState className="mt-6 text-sm">Nothing in the build yet.</InlineState>;

  return (
    <div className="mt-6">
      {decayReport && decayReport.signals.length > 0 && (
        <div className="mt-4 rounded-lg border border-ctp-mauve/50 bg-ctp-mantle p-4">
          {/* Kept as a hand-rolled <details> rather than Section — this header's mauve title
            * color is a genuine one-off Section can't reproduce (its title color is fixed). */}
          <details className="group">
            <summary className="flex flex-wrap cursor-pointer list-none items-baseline justify-between gap-2 [&::-webkit-details-marker]:hidden">
              <span className="flex items-baseline gap-1.5">
                <span aria-hidden="true" className="inline-block text-ctp-mauve transition-transform group-open:rotate-90">&#9656;</span>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-ctp-mauve">Potential meta gaps</h2>
              </span>
              <span className="text-[10px] text-ctp-subtext0">
                {decayReport.recentStart}–{decayReport.latestDate}
              </span>
            </summary>
          <p className="mt-1 text-xs text-ctp-subtext0">
            Successful cards whose inclusion rate fell in the latest 90 days versus the preceding 90 days. Rates are
            normalized by deck count; win rates are sample-adjusted. A gap is a prompt to investigate, not proof the
            metagame is wrong.
          </p>
          <div className="mt-3 space-y-2">
            {decayReport.signals.map((signal) => {
              const card = catalogByName.get(signal.cardName);
              const replacementCard = signal.replacement ? catalogByName.get(signal.replacement.cardName) : undefined;
              return (
                <div key={signal.cardName}>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-ctp-surface1 px-3 py-2 text-xs">
                    {card ? (
                      <CardHoverPreview image={card.editions[0]?.image} alt={signal.cardName}>
                        <Link to={`/cards/${card.slug}`} className="font-semibold text-ctp-text hover:text-ctp-blue">
                          {signal.cardName}
                        </Link>
                      </CardHoverPreview>
                    ) : (
                      <span className="font-semibold text-ctp-text">{signal.cardName}</span>
                    )}
                    <span className="text-ctp-subtext1">
                      {(signal.priorRate * 100).toFixed(0)}% → {(signal.recentRate * 100).toFixed(0)}%
                    </span>
                    <span className="font-semibold text-ctp-red">−{(signal.decay * 100).toFixed(1)}%</span>
                    <span className="text-ctp-green">{(signal.adjustedWinRate * 100).toFixed(0)}% adjusted win rate</span>
                    <span className="text-ctp-subtext0">{signal.deckCount} decks</span>
                    <button
                      type="button"
                      onClick={() => onAddCard(signal.cardName)}
                      className="ml-auto rounded border border-ctp-blue/40 px-1.5 py-0.5 text-ctp-blue hover:bg-ctp-blue/10"
                    >
                      + Add
                    </button>
                  </div>
                  {signal.replacement && (
                    <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 pl-3 text-[11px] text-ctp-subtext0">
                      <span>possibly replaced by</span>
                      {replacementCard ? (
                        <CardHoverPreview image={replacementCard.editions[0]?.image} alt={signal.replacement.cardName}>
                          <Link to={`/cards/${replacementCard.slug}`} className="font-medium text-ctp-text hover:text-ctp-blue">
                            {signal.replacement.cardName}
                          </Link>
                        </CardHoverPreview>
                      ) : (
                        <span className="font-medium text-ctp-text">{signal.replacement.cardName}</span>
                      )}
                      <span className="text-ctp-green">
                        {(signal.replacement.priorRate * 100).toFixed(0)}% → {(signal.replacement.recentRate * 100).toFixed(0)}%
                      </span>
                      <span>· same effect shape, not proof of a swap</span>
                      <button
                        type="button"
                        onClick={() => onAddCard(signal.replacement!.cardName)}
                        className="ml-auto rounded border border-ctp-surface1 px-1.5 py-0.5 text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-blue"
                      >
                        + Add
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] text-ctp-subtext0">
            Compared {decayReport.recentDeckCount} recent decks with {decayReport.priorDeckCount} prior-period decks
            for this Champion and Spirit.
          </p>
          </details>
        </div>
      )}

      {newReleaseCards.length > 0 && (
        <Panel className="mt-4">
          <Section
            heading="dense"
            collapsible
            defaultOpen={false}
            title={`New from ${newReleaseCards[0].setName}`}
            description="Cards from the newest set with a designed connection — shared token economy, tribal reference, or named reference — to a card already in this build. Too new for tournament data, so this isn't ranked or scored, just worth a look."
            actions={<span className="text-[10px] text-ctp-subtext0">{newReleaseCards[0].releaseDate}</span>}
          >
          <div className="mt-3 space-y-2">
            {newReleaseCards.map(({ card, combos }) => (
              <div key={card.name} className="rounded-md border border-ctp-surface1 px-3 py-2 text-xs">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <CardHoverPreview image={card.editions[0]?.image} alt={card.name}>
                    <Link to={`/cards/${card.slug}`} className="font-semibold text-ctp-text hover:text-ctp-blue">
                      {card.name}
                    </Link>
                  </CardHoverPreview>
                  <button
                    type="button"
                    onClick={() => onAddCard(card.name)}
                    className="ml-auto rounded border border-ctp-blue/40 px-1.5 py-0.5 text-ctp-blue hover:bg-ctp-blue/10"
                  >
                    + Add
                  </button>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-1.5 gap-y-1 text-[11px] text-ctp-subtext0">
                  {combos.map((combo) => (
                    <span key={`${combo.with.uuid}-${combo.via}`}>
                      combos with{" "}
                      <Link to={`/cards/${combo.with.slug}`} className="text-ctp-subtext1 hover:text-ctp-blue">
                        {combo.with.name}
                      </Link>{" "}
                      via {combo.via}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          </Section>
        </Panel>
      )}

      {synergyReadiness.length > 0 && (
        <Panel className="mt-4">
          <Section
            heading="dense"
            collapsible
            title="Synergy readiness"
            description="Probability of seeing enough eligible cards at several cards-seen checkpoints. This measures availability, not guaranteed activation—timing, reserve decisions, and spent cards can lower the real rate."
          >
          <div className="mt-3 space-y-3">
            <SynergyReadinessEntries items={synergyReadiness} variant="detailed" onAddCard={onAddCard} crossLinks={readinessCrossLinks} />
          </div>
          </Section>
        </Panel>
      )}

      {dependencyReadiness.length > 0 && (
        <Panel className="mt-4">
          <Section
            heading="dense"
            collapsible
            title="Package balance"
            description="Explicit producer/consumer relationships found in card text. Copy counts are a structural warning, not an activation forecast."
          >
          <div className="mt-3 space-y-2">
            <DependencyReadinessEntries items={dependencyReadiness} variant="detailed" onAddCard={onAddCard} crossLinks={readinessCrossLinks} />
          </div>
          </Section>
        </Panel>
      )}

      <CompositionSuggestionsSection mainLines={mainLines} cardsByName={cardsByName} compositionWinRateData={compositionWinRateData} />

      <CompositionChartsSection lines={lines} cardsByName={cardsByName} />
    </div>
  );
}
