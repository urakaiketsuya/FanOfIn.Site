import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { Card, OmnidexDecklist } from "@gatcg/shared";
import CardHoverPreview from "../../components/CardHoverPreview";
import ElementIcon from "../../components/ElementIcon";
import { formatUsd } from "../../lib/format";
import type { RatingPillar } from "../../lib/deckIdentity";
import { useComparisonData, type ComparisonCardEntry } from "./useComparisonData";
import { useComparisonSummary, type ComparisonCardChange } from "./useComparisonSummary";
import type { ComparedDeck } from "./types";

const SECTION_LABEL: Record<"main" | "material" | "sideboard", string> = { main: "Main", material: "Material", sideboard: "Sideboard" };
const PILLARS: { key: RatingPillar; label: string }[] = [
  { key: "aggro", label: "Aggro" },
  { key: "consistency", label: "Consistency" },
  { key: "interaction", label: "Interaction" },
  { key: "resilience", label: "Resilience" },
];

function shortLabel(label: string): string {
  const at = label.indexOf(" @ ");
  return at === -1 ? label : label.slice(0, at);
}

function changeLabel(change: ComparisonCardChange): string {
  const delta = change.targetQty - change.baselineQty;
  const signedDelta = `${delta >= 0 ? "+" : ""}${delta}`;
  switch (change.kind) {
    case "added": return `+${change.targetQty}x ${change.name} · ${SECTION_LABEL[change.targetSection!]}`;
    case "removed": return `-${change.baselineQty}x ${change.name} · ${SECTION_LABEL[change.baselineSection!]}`;
    case "quantity": return `${signedDelta} ${change.name} · ${SECTION_LABEL[change.baselineSection!]}`;
    case "moved": return `${change.name} · ${SECTION_LABEL[change.baselineSection!]} → ${SECTION_LABEL[change.targetSection!]}`;
    case "movedQuantity": return `${change.name} · ${SECTION_LABEL[change.baselineSection!]} → ${SECTION_LABEL[change.targetSection!]} (${signedDelta})`;
  }
}

function featuredChanges(changes: ComparisonCardChange[]): ComparisonCardChange[] {
  const featured = [
    ...changes.filter((change) => change.kind === "moved" || change.kind === "movedQuantity" || change.kind === "quantity").slice(0, 2),
    ...changes.filter((change) => change.kind === "added").slice(0, 3),
    ...changes.filter((change) => change.kind === "removed").slice(0, 3),
  ];
  const included = new Set(featured);
  for (const change of changes) {
    if (featured.length >= 8) break;
    if (!included.has(change)) featured.push(change);
  }
  return featured;
}

function LinkedCard({ name, cardsByName }: { name: string; cardsByName: Map<string, Card> }) {
  const card = cardsByName.get(name);
  if (!card) return <span>{name}</span>;
  return <CardHoverPreview image={card.editions[0]?.image} alt={name}><Link to={`/cards/${card.slug}`} className="hover:text-ctp-blue hover:underline">{name}</Link></CardHoverPreview>;
}

function CardNames({ entries, cardsByName, empty }: { entries: ComparisonCardEntry[]; cardsByName: Map<string, Card>; empty: string }) {
  if (entries.length === 0) return <p className="mt-2 text-sm text-ctp-subtext0">{empty}</p>;
  return <ul className="mt-2 space-y-1 text-sm text-ctp-subtext1">{entries.slice(0, 6).map((entry) => <li key={entry.name}><LinkedCard name={entry.name} cardsByName={cardsByName} /></li>)}</ul>;
}

export default function ComparisonSummary({ decks, decklists, baselineKey, onBaselineChange, onViewAllDifferences }: {
  decks: ComparedDeck[];
  decklists: Map<string, OmnidexDecklist | null>;
  baselineKey: string | null;
  onBaselineChange: (key: string) => void;
  onViewAllDifferences: () => void;
}) {
  const { deckStats, sections } = useComparisonData(decks, decklists);
  const { baselineIndex, summaries, cardsByName } = useComparisonSummary(decks, decklists, baselineKey);

  const findings = useMemo(() => {
    const allCards = sections.flatMap((section) => section.groups.flatMap((group) => group.cards));
    const shared = allCards.filter((card) => card.quantities.every((quantity) => quantity > 0));
    const majority = allCards.filter((card) => {
      const present = card.quantities.filter((quantity) => quantity > 0).length;
      return present > 1 && present < decks.length;
    });
    const unique = decks.map((_, deckIndex) => allCards.filter((card) => card.quantities[deckIndex] > 0 && card.quantities.filter((quantity) => quantity > 0).length === 1));
    const quantitySplits = allCards
      .filter((card) => card.quantities.filter((quantity) => quantity > 0).length > 1)
      .map((card) => ({ card, spread: Math.max(...card.quantities) - Math.min(...card.quantities) }))
      .filter(({ spread }) => spread > 0)
      .sort((a, b) => b.spread - a.spread || a.card.name.localeCompare(b.card.name));
    return { shared, majority, unique, quantitySplits };
  }, [decks, sections]);

  if (decks.length < 2) return <p className="text-sm text-ctp-subtext1">Add at least one more deck to see an overview.</p>;

  return <div className="space-y-8">
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Deck overview</h2>
      <div className="mt-2 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {deckStats.map((stats, index) => {
          const summary = summaries[index];
          const spirit = summary?.targetSpirit ?? summary?.baselineSpirit;
          return <article key={stats.key} className="rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3">
            <h3 className="truncate font-semibold text-ctp-text" title={decks[index].label}>{shortLabel(decks[index].label)}</h3>
            <p className="mt-1 truncate text-xs text-ctp-subtext1">{stats.championName ?? "Unknown Champion"}{spirit ? ` · ${spirit}` : ""}</p>
            <div className="mt-2 flex min-h-5 flex-wrap gap-1.5">{stats.elements.filter((element) => element !== "NORM").map((element) => <ElementIcon key={element} element={element} size={16} />)}</div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div><span className="block text-ctp-subtext0">Price</span><span className="font-semibold text-ctp-text">{stats.price > 0 ? formatUsd(stats.price) : "—"}</span></div>
              <div><span className="block text-ctp-subtext0">Power</span><span className="font-semibold text-ctp-text">{stats.rating?.composite.toFixed(1) ?? "—"}</span></div>
              {PILLARS.map(({ key, label }) => <div key={key}><span className="block text-ctp-subtext0">{label}</span><span className="text-ctp-subtext1">{stats.rating?.scores[key] ?? "—"}</span></div>)}
            </div>
          </article>;
        })}
      </div>
    </section>

    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">What separates these decks</h2>
      <div className="mt-2 grid gap-3 md:grid-cols-3">
        <article className="rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3">
          <h3 className="font-semibold text-ctp-text">Shared core <span className="text-sm font-normal text-ctp-subtext0">({findings.shared.length})</span></h3>
          <p className="mt-1 text-xs text-ctp-subtext0">Cards present in every selected deck.</p>
          <CardNames entries={findings.shared} cardsByName={cardsByName} empty="No cards are shared by every deck." />
        </article>
        <article className="rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3">
          <h3 className="font-semibold text-ctp-text">Split decisions <span className="text-sm font-normal text-ctp-subtext0">({findings.majority.length})</span></h3>
          <p className="mt-1 text-xs text-ctp-subtext0">Cards shared by some, but not all, decks.</p>
          <CardNames entries={findings.majority} cardsByName={cardsByName} empty="No partial overlaps in this comparison." />
        </article>
        <article className="rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3">
          <h3 className="font-semibold text-ctp-text">Largest quantity gaps</h3>
          <p className="mt-1 text-xs text-ctp-subtext0">Shared cards with the widest copy-count disagreement.</p>
          {findings.quantitySplits.length === 0 ? <p className="mt-2 text-sm text-ctp-subtext0">Shared cards use matching quantities.</p> : <ul className="mt-2 space-y-1 text-sm text-ctp-subtext1">{findings.quantitySplits.slice(0, 6).map(({ card }) => <li key={card.name} className="flex justify-between gap-2"><LinkedCard name={card.name} cardsByName={cardsByName} /><span className="shrink-0 tabular-nums text-ctp-subtext0">{card.quantities.join(" / ")}</span></li>)}</ul>}
        </article>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {decks.map((deck, index) => {
          const uniqueCards = findings.unique[index];
          const hiddenCount = Math.max(0, uniqueCards.length - 6);
          return <article key={deck.key} className="min-w-0 rounded-lg border border-ctp-surface0 p-3">
            <p className="break-words text-sm font-semibold leading-5 text-ctp-text">{shortLabel(deck.label)}</p>
            <h3 className="mt-1 text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Defining cards ({uniqueCards.length})</h3>
            <p className="mt-1 text-xs text-ctp-overlay1">Cards found only in this deck within the current comparison.</p>
            <CardNames entries={uniqueCards} cardsByName={cardsByName} empty="No cards unique to this deck." />
            {hiddenCount > 0 && <button type="button" onClick={onViewAllDifferences} className="mt-2 text-xs font-medium text-ctp-blue hover:underline">View {hiddenCount} more in Table →</button>}
          </article>;
        })}
      </div>
    </section>

    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Baseline drill-down</h2><p className="mt-1 text-xs text-ctp-subtext0">Choose the deck every change should be measured against.</p></div>
        <div className="flex flex-wrap gap-1.5">{decks.map((deck) => <button key={deck.key} type="button" onClick={() => onBaselineChange(deck.key)} title={deck.label} className={`max-w-56 truncate rounded-full border px-2.5 py-1 text-xs ${deck.key === baselineKey ? "border-ctp-blue bg-ctp-blue/10 text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"}`}>{shortLabel(deck.label)}</button>)}</div>
      </div>
      <div className="mt-3 grid items-start gap-3 lg:grid-cols-3">
        {summaries.map((summary, index) => {
          if (index === baselineIndex) return null;
          const visibleChanges = featuredChanges(summary.changes);
          return <article key={summary.key} className="rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3">
            <h3 className="font-semibold text-ctp-text">{shortLabel(summary.label)}</h3>
            {summary.loading && <p className="mt-2 text-sm text-ctp-subtext1">Loading…</p>}
            {!summary.loading && summary.unavailable && <p className="mt-2 text-sm text-ctp-subtext1">Decklist unavailable.</p>}
            {!summary.loading && !summary.unavailable && <>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                <span className="rounded-full bg-ctp-surface0 px-2 py-1 text-ctp-subtext1">{summary.changes.length} changes</span>
                {summary.priceDelta !== null && <span className="rounded-full bg-ctp-surface0 px-2 py-1 text-ctp-subtext1">{summary.priceDelta >= 0 ? "+" : "−"}{formatUsd(Math.abs(summary.priceDelta))}</span>}
                {summary.compositeDelta !== null && <span className="rounded-full bg-ctp-surface0 px-2 py-1 text-ctp-subtext1">Power {summary.compositeDelta >= 0 ? "+" : ""}{summary.compositeDelta}</span>}
              </div>
              {(summary.championChanged || summary.spiritChanged) && <p className="mt-2 text-xs text-ctp-subtext0">{summary.championChanged && <>Champion: {summary.baselineChampion ?? "—"} → {summary.targetChampion ?? "—"}</>}{summary.championChanged && summary.spiritChanged && <br />}{summary.spiritChanged && <>Spirit: {summary.baselineSpirit ?? "none"} → {summary.targetSpirit ?? "none"}</>}</p>}
              {summary.changes.length === 0 ? <p className="mt-3 text-sm text-ctp-subtext1">No card differences.</p> : <ul className="mt-3 space-y-1 text-sm">{visibleChanges.map((change) => <li key={`${change.name}-${change.baselineSection ?? ""}-${change.targetSection ?? ""}`} className={change.kind === "removed" ? "text-ctp-yellow" : change.kind === "added" ? "text-ctp-blue" : "text-ctp-subtext1"}>{changeLabel(change)}</li>)}</ul>}
              {summary.changes.length > 8 && <button type="button" onClick={onViewAllDifferences} className="mt-3 text-xs font-medium text-ctp-blue hover:underline">View all {summary.changes.length} differences →</button>}
            </>}
          </article>;
        })}
      </div>
    </section>
  </div>;
}
