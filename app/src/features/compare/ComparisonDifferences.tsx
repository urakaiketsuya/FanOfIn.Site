import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { OmnidexDecklist } from "@gatcg/shared";
import CardHoverPreview from "../../components/CardHoverPreview";
import CardImage from "../../components/CardImage";
import ElementIcon from "../../components/ElementIcon";
import { formatUsd } from "../../lib/format";
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

/**
 * Mobile-oriented alternative to the Table view: instead of a wide matrix that shrinks each deck's
 * column down to fit, this lists cards one at a time with each deck's quantity as a chip underneath
 * — the comparison a viewer actually wants ("what does each deck run for this card") stays readable
 * at phone width without horizontal scrolling. Reuses the same `useComparisonData` the Table/Cards
 * views already pull from, so there's no new dataset and nothing here can drift from them.
 */
export default function ComparisonDifferences({
  decks,
  decklists,
}: {
  decks: ComparedDeck[];
  decklists: Map<string, OmnidexDecklist | null>;
}) {
  const { cardsByName, deckStats, sections } = useComparisonData(decks, decklists);
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
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {deckStats.map((s, i) => (
            <div
              key={s.key}
              className="shrink-0 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-2.5 py-1.5 text-xs"
            >
              <div className="max-w-[9rem] truncate font-medium text-ctp-text">{shortLabel(decks[i])}</div>
              <div className="mt-0.5 flex gap-2 text-ctp-subtext1">
                <span>{s.winRate !== null ? `${(s.winRate * 100).toFixed(0)}%` : "—"}</span>
                <span>{s.price > 0 ? formatUsd(s.price) : "—"}</span>
                <span>{s.rating ? s.rating.composite.toFixed(1) : "—"}</span>
              </div>
            </div>
          ))}
        </div>
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
                    <ul className="mt-2 grid grid-cols-2 gap-3">
                      {shown.map((card) => {
                        const cardInfo = cardsByName.get(card.name);
                        const image = cardInfo?.editions[0]?.image;
                        return (
                          <li key={card.name} className="rounded-md border border-ctp-surface1 p-2">
                            <CardHoverPreview image={image} alt={card.name}>
                              {image ? (
                                <CardImage image={image} alt={card.name} className="aspect-[5/7] w-full rounded object-cover" />
                              ) : (
                                <div className="aspect-[5/7] w-full rounded bg-ctp-surface0" />
                              )}
                            </CardHoverPreview>
                            <div className="mt-1.5 min-w-0">
                              <div className="flex items-center gap-1 truncate">
                                {cardInfo && cardInfo.element !== "NORM" && <ElementIcon element={cardInfo.element} size={14} />}
                                {cardInfo?.slug ? (
                                  <Link to={`/cards/${cardInfo.slug}`} className="truncate text-sm text-ctp-text hover:text-ctp-blue">
                                    {card.name}
                                  </Link>
                                ) : (
                                  <span className="truncate text-sm text-ctp-text">{card.name}</span>
                                )}
                              </div>
                              <div className="mt-1 flex flex-col gap-0.5 text-xs">
                                {card.quantities.map((q, i) => (
                                  <span
                                    key={decks[i].key}
                                    className={q === 0 ? "text-ctp-surface1" : card.isCore ? "text-ctp-green" : card.isUnique ? "text-ctp-yellow" : "text-ctp-subtext1"}
                                  >
                                    {shortLabel(decks[i])} {q === 0 ? "—" : `${q}x`}
                                  </span>
                                ))}
                              </div>
                            </div>
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
