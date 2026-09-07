import { useMemo, useState } from "react";
import type { OmnidexDecklist } from "@gatcg/shared";
import { VisualCardTile, type VisualFieldVisibility } from "../../components/VisualCardTile";
import { useComparisonData, type ComparisonCardEntry } from "./useComparisonData";
import type { ComparedDeck } from "./types";
import { InlineState } from "../../components/ui/ContentState";

/** Same " @ " split DeckChip uses, trimmed further for a compact per-card chip label. */
function shortLabel(deck: ComparedDeck): string {
  const atIndex = deck.label.indexOf(" @ ");
  return atIndex === -1 ? deck.label : deck.label.slice(0, atIndex);
}

function isDifferent(card: ComparisonCardEntry): boolean {
  return card.quantities.some((q) => q !== card.quantities[0]);
}

const COMPARISON_CARD_FIELDS: VisualFieldVisibility = {
  cost: false,
  price: false,
  priceTrend: false,
  tags: false,
  simulator: false,
  community: false,
};

/**
 * Card-first comparison for every viewport. Each card uses the same visual tile as decklists, with
 * the compared quantities in a purpose-built footer. This keeps the important question — "what does
 * each deck run for this card?" — scannable without a wide matrix or a second data source.
 */
export default function ComparisonDifferences({
  decks,
  decklists,
}: {
  decks: ComparedDeck[];
  decklists: Map<string, OmnidexDecklist | null>;
}) {
  const { cardsByName, sections } = useComparisonData(decks, decklists);
  const [showAll, setShowAll] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  function toggleSection(key: string) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const sectionCards = useMemo(
    () =>
      sections.map((section) => {
        const all = section.groups.flatMap((g) => g.cards).sort((a, b) => a.name.localeCompare(b.name));
        const diffCount = all.filter(isDifferent).length;
        return { key: section.key, label: section.label, all, diffCount };
      }),
    [sections],
  );

  return (
    <div data-component="ComparisonDifferences">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="shrink-0 rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 hover:text-ctp-text"
        >
          {showAll ? "Show differences only" : "Show all cards"}
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {sectionCards.map(({ key, label, all, diffCount }) => {
          const shown = showAll ? all : all.filter(isDifferent);
          if (all.length === 0) return null;
          const collapsed = collapsedSections.has(key);

          return (
            <div key={key}>
              <button
                type="button"
                onClick={() => toggleSection(key)}
                aria-expanded={!collapsed}
                className="sticky top-14 z-20 flex w-full items-center justify-between gap-2 border-b border-ctp-surface1 bg-ctp-base py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-ctp-subtext0"
              >
                <span>
                  {label} · {showAll ? `${all.length} card${all.length === 1 ? "" : "s"}` : `${diffCount} difference${diffCount === 1 ? "" : "s"}`}
                </span>
                <span className="text-ctp-subtext1">{collapsed ? "▸" : "▾"}</span>
              </button>

              {!collapsed && (
                <>
                  {shown.length === 0 ? (
                    <InlineState className="mt-2 text-sm">No differences in {label.toLowerCase()}.</InlineState>
                  ) : (
                    <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
                      {shown.map((card) => {
                        const cardInfo = cardsByName.get(card.name);
                        const maxQuantity = Math.max(...card.quantities);
                        const quantitySpread = new Set(card.quantities).size > 1;
                        return (
                          <li key={card.name} className="min-w-0">
                            <VisualCardTile
                              line={{ card: card.name, quantity: 1 }}
                              card={cardInfo}
                              unitPrice={undefined}
                              priceTrend={undefined}
                              simulatorEvidence={undefined}
                              communityEntry={undefined}
                              fields={COMPARISON_CARD_FIELDS}
                              footer={
                                <div className="mt-1.5 min-w-0">
                                  <div className="truncate text-sm font-medium text-ctp-text" title={card.name}>{card.name}</div>
                                  <div className="mt-1 space-y-0.5 border-t border-ctp-surface0 pt-1 text-[11px]">
                                    {card.quantities.map((q, i) => (
                                      <div
                                        key={decks[i].key}
                                        className="flex min-w-0 items-center justify-between gap-2"
                                      >
                                        <span className="truncate text-ctp-subtext1" title={shortLabel(decks[i])}>{shortLabel(decks[i])}</span>
                                        <span className={`shrink-0 tabular-nums ${
                                          q === 0
                                            ? "text-ctp-overlay0"
                                            : card.isCore
                                              ? "text-ctp-green"
                                              : card.isUnique
                                                ? "text-ctp-yellow"
                                                : quantitySpread && q === maxQuantity
                                                  ? "font-semibold text-ctp-blue"
                                                  : "text-ctp-text"
                                        }`}>
                                          {q === 0 ? "—" : `${q}×`}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              }
                            />
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
