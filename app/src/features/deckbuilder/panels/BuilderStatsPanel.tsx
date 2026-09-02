import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { Card, CompositionWinRateData } from "@gatcg/shared";
import CardHoverPreview from "../../../components/CardHoverPreview";
import ThemaSparkline from "../../thema/ThemaSparkline";
import BarChart from "../../../components/BarChart";
import RankedCompositionChart from "../../../components/RankedCompositionChart";
import { buildChartSegments } from "../../../components/DonutChart";
import { computeDeckComposition, computeMemoryCostCurve, computeReserveCostCurve } from "../../../lib/deckIdentity";
import type { CardDecayReport } from "../../../lib/cardDecay";
import type { DependencyReadiness, SynergyReadiness } from "../synergyReadiness";
import type { NewReleaseCard } from "../newReleaseCards";
import { computeCompositionGaps } from "../engine/builderSelectors";

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
  const composition = useMemo(() => computeDeckComposition(lines, cardsByName), [lines, cardsByName]);
  const memoryCurve = useMemo(() => computeMemoryCostCurve(lines, cardsByName), [lines, cardsByName]);
  const reserveCurve = useMemo(() => computeReserveCostCurve(lines, cardsByName), [lines, cardsByName]);
  const compositionGaps = useMemo(
    () => computeCompositionGaps(mainLines, cardsByName, compositionWinRateData),
    [mainLines, cardsByName, compositionWinRateData],
  );
  // Cross-references between the two independently-computed readiness engines above, keyed by
  // card name — kept as a pure UI lookup here rather than baked into synergyReadiness.ts, so
  // Synergy readiness (Imbue) and Package balance (Token/Subtype/Empower) stay decoupled and this
  // is purely "which of my cards also show up over there," not a new coupling between the modules.
  const crossLinks = useMemo(() => {
    const map = new Map<string, { synergy: { key: string; label: string }[]; dependency: { key: string; label: string }[] }>();
    const ensure = (name: string) => map.get(name) ?? map.set(name, { synergy: [], dependency: [] }).get(name)!;
    for (const synergy of synergyReadiness) {
      for (const line of [...synergy.payoffCards, ...synergy.enablerCards]) {
        const entry = ensure(line.name);
        if (!entry.synergy.some((s) => s.key === synergy.key)) entry.synergy.push({ key: synergy.key, label: synergy.label });
      }
    }
    for (const dependency of dependencyReadiness) {
      for (const line of [...dependency.producers, ...dependency.consumers]) {
        const entry = ensure(line.name);
        if (!entry.dependency.some((d) => d.key === dependency.key)) entry.dependency.push({ key: dependency.key, label: dependency.label });
      }
    }
    return map;
  }, [synergyReadiness, dependencyReadiness]);
  /** Union of the other engine's groups touched by any card in `names` — group-level, not a badge per card mention, since payoff/enabler/producer/consumer lists already render as one joined string. */
  function otherEngineLinks(names: string[], side: "synergy" | "dependency"): { key: string; label: string }[] {
    const seen = new Map<string, string>();
    for (const name of names) {
      const entry = crossLinks.get(name);
      if (!entry) continue;
      for (const ref of entry[side]) seen.set(ref.key, ref.label);
    }
    return Array.from(seen.entries()).map(([key, label]) => ({ key, label }));
  }

  if (lines.length === 0) return <p className="mt-6 text-sm text-ctp-subtext1">Nothing in the build yet.</p>;

  return (
    <div className="mt-6">
      {decayReport && decayReport.signals.length > 0 && (
        <div className="mt-4 rounded-lg border border-ctp-mauve/50 bg-ctp-mantle p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ctp-mauve">Potential meta gaps</h2>
            <span className="text-[10px] text-ctp-subtext0">
              {decayReport.recentStart}–{decayReport.latestDate}
            </span>
          </div>
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
        </div>
      )}

      {newReleaseCards.length > 0 && (
        <div className="mt-4 rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">New from {newReleaseCards[0].setName}</h2>
            <span className="text-[10px] text-ctp-subtext0">{newReleaseCards[0].releaseDate}</span>
          </div>
          <p className="mt-1 text-xs text-ctp-subtext0">
            Cards from the newest set with a designed connection — shared token economy, tribal reference, or named
            reference — to a card already in this build. Too new for tournament data, so this isn't ranked or
            scored, just worth a look.
          </p>
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
        </div>
      )}

      {synergyReadiness.length > 0 && (
        <div className="mt-4 rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Synergy readiness</h2>
          <p className="mt-1 text-xs text-ctp-subtext0">
            Probability of seeing enough eligible cards at several cards-seen checkpoints. This measures availability,
            not guaranteed activation—timing, reserve decisions, and spent cards can lower the real rate.
          </p>
          <div className="mt-3 space-y-3">
            {synergyReadiness.map((synergy) => {
              const shortfall = Math.max(0, synergy.targetEnablers - synergy.enablerCopies);
              const statusColor = synergy.status === "Reliable" ? "text-ctp-green" : synergy.status === "Playable" ? "text-ctp-blue" : synergy.status === "Fragile" ? "text-ctp-yellow" : "text-ctp-red";
              const tenPoint = synergy.curve.find((c) => c.seen === 10);
              const firstPoint = synergy.curve[0];
              const lastPoint = synergy.curve[synergy.curve.length - 1];
              const relatedDependencies = otherEngineLinks(
                [...synergy.payoffCards, ...synergy.enablerCards].map((c) => c.name),
                "dependency",
              );
              return (
                <div key={synergy.key} id={`synergy-${synergy.key}`} className="rounded-md border border-ctp-surface1 px-3 py-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold text-ctp-text">{synergy.label}</p>
                    <p className={`text-sm font-semibold ${statusColor}`}>{synergy.status} · {(synergy.probabilityByTen * 100).toFixed(0)}%</p>
                  </div>
                  {synergy.curve.length >= 2 && (
                    <div className="mt-2">
                      <ThemaSparkline values={synergy.curve.map((c) => c.probability)} height={36} />
                      <div className="mt-1 flex justify-between text-[10px] text-ctp-subtext0">
                        <span>{firstPoint.seen} seen: {(firstPoint.probability * 100).toFixed(0)}%</span>
                        {tenPoint && (
                          <span className="font-semibold text-ctp-text">{tenPoint.seen} seen: {(tenPoint.probability * 100).toFixed(0)}%</span>
                        )}
                        <span>{lastPoint.seen} seen: {(lastPoint.probability * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  )}
                  <p className="mt-1.5 text-xs text-ctp-subtext1">
                    {synergy.enablerCopies}/{synergy.deckSize} eligible cards ({synergy.enablerCards.map((card) => `${card.quantity}× ${card.name}`).join(", ")}) · {synergy.payoffCopies} payoff cop{synergy.payoffCopies === 1 ? "y" : "ies"} ({synergy.payoffCards.map((card) => `${card.quantity}× ${card.name}`).join(", ")})
                  </p>
                  <p className="mt-1 text-xs text-ctp-subtext0">
                    {shortfall > 0 ? `Add about ${shortfall} eligible card${shortfall === 1 ? "" : "s"} to reach 80% theoretical availability.` : "Meets the 80% theoretical-availability target."} {synergy.note} · {synergy.confidence}
                  </p>
                  {synergy.competingPayoffCopies > 0 && (
                    <p className="mt-1 text-xs text-ctp-yellow">
                      Shared resource pool: {synergy.competingPayoffCopies} other payoff cop{synergy.competingPayoffCopies === 1 ? "y" : "ies"} can compete for these enablers.
                    </p>
                  )}
                  {synergy.recommendations.length > 0 && (
                    <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-ctp-subtext0">
                      <span>Compatible options:</span>
                      {synergy.recommendations.map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => onAddCard(name)}
                          className="rounded border border-ctp-blue/40 px-1.5 py-0.5 text-ctp-blue hover:bg-ctp-blue/10"
                        >
                          + {name}
                        </button>
                      ))}
                    </div>
                  )}
                  {relatedDependencies.length > 0 && (
                    <p className="mt-1 text-xs text-ctp-mauve">
                      Also tracked in Package balance:{" "}
                      {relatedDependencies.map((ref, i) => (
                        <span key={ref.key}>
                          {i > 0 && ", "}
                          <a href={`#dependency-${ref.key}`} className="hover:underline">{ref.label}</a>
                        </span>
                      ))}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {dependencyReadiness.length > 0 && (
        <div className="mt-4 rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Package balance</h2>
          <p className="mt-1 text-xs text-ctp-subtext0">
            Explicit producer/consumer relationships found in card text. Copy counts are a structural warning, not an activation forecast.
          </p>
          <div className="mt-3 space-y-2">
            {dependencyReadiness.map((dependency) => {
              const color = dependency.status === "Supported" ? "text-ctp-green" : dependency.status === "Thin" ? "text-ctp-yellow" : "text-ctp-red";
              const relatedSynergies = otherEngineLinks(
                [...dependency.producers, ...dependency.consumers].map((c) => c.name),
                "synergy",
              );
              // Subtype "producers" are every card in the deck carrying that subtype — can run into
              // the dozens, unlike Token/Empower producers which are usually a small, specific
              // handful — so this caps the visible list rather than dumping every name.
              const PRODUCER_NAMES_SHOWN = 5;
              const shownProducers = dependency.producers.slice(0, PRODUCER_NAMES_SHOWN);
              const hiddenProducerCount = dependency.producers.length - shownProducers.length;
              const firstPoint = dependency.producerCurve[0];
              const tenPoint = dependency.producerCurve.find((c) => c.seen === 10);
              const lastPoint = dependency.producerCurve[dependency.producerCurve.length - 1];
              return (
                <div key={dependency.key} id={`dependency-${dependency.key}`} className="rounded-md border border-ctp-surface1 px-3 py-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold capitalize text-ctp-text">{dependency.label}</p>
                    <p className={`text-sm font-semibold ${color}`}>{dependency.status}</p>
                  </div>
                  {dependency.producerCurve.length >= 2 && (
                    <div className="mt-2">
                      <ThemaSparkline values={dependency.producerCurve.map((c) => c.probability)} height={36} />
                      <div className="mt-1 flex justify-between text-[10px] text-ctp-subtext0">
                        <span>{firstPoint.seen} seen: {(firstPoint.probability * 100).toFixed(0)}%</span>
                        {tenPoint && (
                          <span className="font-semibold text-ctp-text">{tenPoint.seen} seen: {(tenPoint.probability * 100).toFixed(0)}%</span>
                        )}
                        <span>{lastPoint.seen} seen: {(lastPoint.probability * 100).toFixed(0)}%</span>
                      </div>
                      <p className="mt-0.5 text-[10px] text-ctp-subtext0">Chance you've drawn at least one producer copy — sequencing, not the copy-count warning below.</p>
                    </div>
                  )}
                  <p className="mt-1.5 text-xs text-ctp-subtext1">
                    {dependency.producerCopies} producer copies ({shownProducers.map((card) => `${card.quantity}× ${card.name}`).join(", ")}
                    {hiddenProducerCount > 0 ? `, +${hiddenProducerCount} more` : ""}) · {dependency.consumerCopies} consumer copies · {dependency.kind}
                  </p>
                  <p className="mt-1 text-xs text-ctp-subtext1">
                    Used by {dependency.consumers.map((card) => `${card.quantity}× ${card.name}`).join(", ")}
                  </p>
                  <p className="mt-1 text-xs text-ctp-subtext0">{dependency.note} · {dependency.confidence}</p>
                  {dependency.recommendations.length > 0 && (
                    <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-ctp-subtext0">
                      <span>Compatible support:</span>
                      {dependency.recommendations.map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => onAddCard(name)}
                          className="rounded border border-ctp-blue/40 px-1.5 py-0.5 text-ctp-blue hover:bg-ctp-blue/10"
                        >
                          + {name}
                        </button>
                      ))}
                    </div>
                  )}
                  {relatedSynergies.length > 0 && (
                    <p className="mt-1 text-xs text-ctp-mauve">
                      Also tracked in Synergy readiness:{" "}
                      {relatedSynergies.map((ref, i) => (
                        <span key={ref.key}>
                          {i > 0 && ", "}
                          <a href={`#synergy-${ref.key}`} className="hover:underline">{ref.label}</a>
                        </span>
                      ))}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {compositionGaps.length > 0 && (
        <div className="mt-4 rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4">
          <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">Composition suggestions</h2>
          <p className="mt-1 text-xs text-ctp-subtext0">
            Across every public main deck (not scoped to this Champion), win rate by what share of the deck each
            card type makes up — correlational, not causal, same as everywhere else on this site.
          </p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {compositionGaps.map((g) => (
              <li key={g.type} className="text-ctp-subtext1">
                <span className="font-semibold text-ctp-text capitalize">{g.type.toLowerCase()}</span> is {g.currentBucket} of your main deck
                ({(g.currentWinRate * 100).toFixed(0)}% win rate) — decks at {g.bestBucket} average{" "}
                <span className="font-semibold text-ctp-green">{(g.bestWinRate * 100).toFixed(0)}%</span>.
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <BarChart title="Memory Cost Curve" bars={memoryCurve} />
        <BarChart title="Reserve Cost Curve" bars={reserveCurve} />
        <RankedCompositionChart title="Card Types" segments={buildChartSegments(composition.types)} />
        <RankedCompositionChart title="Elements" segments={buildChartSegments(composition.elements)} />
        <RankedCompositionChart title="Card Subtypes" segments={buildChartSegments(composition.subtypes)} />
      </div>
    </div>
  );
}
