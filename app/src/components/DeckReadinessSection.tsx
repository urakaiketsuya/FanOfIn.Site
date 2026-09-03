import type { DependencyReadiness, SynergyReadiness } from "../features/deckbuilder/synergyReadiness";
import ThemaSparkline from "../features/thema/ThemaSparkline";
import Panel from "./ui/Panel";

type Ref = { key: string; label: string };
export type ReadinessCrossLinks = Map<string, { synergy: Ref[]; dependency: Ref[] }>;

/** Cross-references between the two independently-computed readiness engines, keyed by card name —
 * a pure UI lookup, not baked into `synergyReadiness.ts`, so Synergy readiness (Imbue) and Package
 * balance (Token/Subtype/Empower) stay decoupled and this is purely "which of my cards also show up
 * over there." Only meaningful for the "detailed" variant, where both lists render together. */
export function computeReadinessCrossLinks(synergyReadiness: SynergyReadiness[], dependencyReadiness: DependencyReadiness[]): ReadinessCrossLinks {
  const map: ReadinessCrossLinks = new Map();
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
}

/** Union of the other engine's groups touched by any card in `names` — group-level, not a badge per
 * card mention, since payoff/enabler/producer/consumer lists already render as one joined string. */
function otherEngineLinks(crossLinks: ReadinessCrossLinks, names: string[], side: "synergy" | "dependency"): Ref[] {
  const seen = new Map<string, string>();
  for (const name of names) {
    const entry = crossLinks.get(name);
    if (!entry) continue;
    for (const ref of entry[side]) seen.set(ref.key, ref.label);
  }
  return Array.from(seen.entries()).map(([key, label]) => ({ key, label }));
}

type Variant = "detailed" | "compact";

/** Renders `SynergyReadiness[]` entries. "detailed" (Guided Deck Builder, mid-build) shows a
 * probability sparkline, "+Add" buttons for recommendations/shortfalls, and cross-links into
 * Package balance. "compact" (account/public read-only deck views) is a terser summary card with
 * no add-actions and no cross-links. */
export function SynergyReadinessEntries({
  items,
  variant,
  onAddCard,
  crossLinks,
}: {
  items: SynergyReadiness[];
  variant: Variant;
  onAddCard?: (name: string) => void;
  crossLinks?: ReadinessCrossLinks;
}) {
  if (variant === "compact") {
    return <>{items.map((entry) => (
      <Panel as="article" key={entry.key}>
        <div className="flex flex-wrap justify-between gap-2">
          <h3 className="font-semibold text-ctp-text">{entry.label}</h3>
          <span className={entry.status === "Reliable" ? "text-ctp-green" : entry.status === "Playable" ? "text-ctp-blue" : "text-ctp-yellow"}>
            {entry.status} · {(entry.probabilityByTen * 100).toFixed(0)}% by 10 seen
          </span>
        </div>
        <p className="mt-2 text-xs text-ctp-subtext1">{entry.enablerCopies} eligible copies · {entry.payoffCopies} payoff copies. {entry.note}</p>
        {entry.recommendations.length > 0 && <p className="mt-1 text-xs text-ctp-blue">Potential enablers to review: {entry.recommendations.join(", ")}</p>}
      </Panel>
    ))}</>;
  }

  return <>{items.map((synergy) => {
    const shortfall = Math.max(0, synergy.targetEnablers - synergy.enablerCopies);
    const statusColor = synergy.status === "Reliable" ? "text-ctp-green" : synergy.status === "Playable" ? "text-ctp-blue" : synergy.status === "Fragile" ? "text-ctp-yellow" : "text-ctp-red";
    const tenPoint = synergy.curve.find((c) => c.seen === 10);
    const firstPoint = synergy.curve[0];
    const lastPoint = synergy.curve[synergy.curve.length - 1];
    const relatedDependencies = crossLinks ? otherEngineLinks(crossLinks, [...synergy.payoffCards, ...synergy.enablerCards].map((c) => c.name), "dependency") : [];
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
        {onAddCard && synergy.recommendations.length > 0 && (
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
  })}</>;
}

/** Renders `DependencyReadiness[]` entries — the "Package balance" side. Same detailed/compact split
 * as `SynergyReadinessEntries`, mirroring its reasoning. */
export function DependencyReadinessEntries({
  items,
  variant,
  onAddCard,
  crossLinks,
}: {
  items: DependencyReadiness[];
  variant: Variant;
  onAddCard?: (name: string) => void;
  crossLinks?: ReadinessCrossLinks;
}) {
  if (variant === "compact") {
    return <>{items.map((entry) => (
      <Panel as="article" key={entry.key}>
        <div className="flex flex-wrap justify-between gap-2">
          <h3 className="font-semibold capitalize text-ctp-text">{entry.label}</h3>
          <span className={entry.status === "Supported" ? "text-ctp-green" : "text-ctp-yellow"}>{entry.status}</span>
        </div>
        <p className="mt-2 text-xs text-ctp-subtext1">{entry.producerCopies} producer copies · {entry.consumerCopies} consumer copies. {entry.note}</p>
        {entry.recommendations.length > 0 && <p className="mt-1 text-xs text-ctp-blue">Potential support to review: {entry.recommendations.join(", ")}</p>}
      </Panel>
    ))}</>;
  }

  // Subtype "producers" are every card in the deck carrying that subtype — can run into the
  // dozens, unlike Token/Empower producers which are usually a small, specific handful — so this
  // caps the visible list rather than dumping every name.
  const PRODUCER_NAMES_SHOWN = 5;

  return <>{items.map((dependency) => {
    const color = dependency.status === "Supported" ? "text-ctp-green" : dependency.status === "Thin" ? "text-ctp-yellow" : "text-ctp-red";
    const relatedSynergies = crossLinks ? otherEngineLinks(crossLinks, [...dependency.producers, ...dependency.consumers].map((c) => c.name), "synergy") : [];
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
        {onAddCard && dependency.recommendations.length > 0 && (
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
  })}</>;
}
