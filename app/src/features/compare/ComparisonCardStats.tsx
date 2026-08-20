import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { OmnidexDecklist } from "@gatcg/shared";
import CardHoverPreview from "../../components/CardHoverPreview";
import { formatUsd } from "../../lib/format";
import { useCardStatsData } from "../archetypes/data";
import { useComparisonData } from "./useComparisonData";
import type { ComparedDeck } from "./types";

type SortMode = "adjustedWinRate" | "deckCount" | "name";
const SORT_LABELS: Record<SortMode, string> = { adjustedWinRate: "Win rate", deckCount: "Usage", name: "Name" };

/** Every distinct card across the compared decks (any section, quantities summed), joined against
 * the site-wide Card Stats dataset — "is this card actually good across the whole meta," not just
 * "who has it," complementing the presence-only Table/Cards views. */
export default function ComparisonCardStats({
  decks,
  decklists,
}: {
  decks: ComparedDeck[];
  decklists: Map<string, OmnidexDecklist | null>;
}) {
  const { cardsByName } = useComparisonData(decks, decklists);
  const cardStatsData = useCardStatsData();
  const [sortMode, setSortMode] = useState<SortMode>("adjustedWinRate");

  const statByName = useMemo(() => {
    const map = new Map<string, NonNullable<typeof cardStatsData>["cards"][number]>();
    for (const s of cardStatsData?.cards ?? []) map.set(s.name, s);
    return map;
  }, [cardStatsData]);

  const rows = useMemo(() => {
    const names = new Set<string>();
    for (const d of decks) {
      const list = decklists.get(d.key);
      if (!list) continue;
      for (const line of [...list.main, ...list.material, ...list.sideboard]) names.add(line.card);
    }
    const result = Array.from(names).map((name) => {
      const quantities = decks.map((d) => {
        const list = decklists.get(d.key);
        if (!list) return 0;
        return [...list.main, ...list.material, ...list.sideboard].filter((l) => l.card === name).reduce((sum, l) => sum + l.quantity, 0);
      });
      return { name, quantities, stat: statByName.get(name) };
    });
    return result.sort((a, b) => {
      if (sortMode === "name") return a.name.localeCompare(b.name);
      if (sortMode === "deckCount") return (b.stat?.deckCount ?? 0) - (a.stat?.deckCount ?? 0);
      return (b.stat?.adjustedWinRate ?? -1) - (a.stat?.adjustedWinRate ?? -1);
    });
  }, [decks, decklists, statByName, sortMode]);

  if (rows.length === 0) return <p className="text-sm text-ctp-subtext1">No cards to show yet.</p>;

  return (
    <div>
      <p className="text-xs text-ctp-subtext0">
        Every card across the compared decks, with its own site-wide usage and win rate — not scoped to any one
        Champion or build, so a card that's great for one deck here may just be a staple everywhere.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-ctp-subtext0">Sort by:</span>
        {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setSortMode(mode)}
            className={`rounded-md border px-2 py-1 ${
              sortMode === mode ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            {SORT_LABELS[mode]}
          </button>
        ))}
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-max min-w-full text-sm">
          <thead>
            <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
              <th className="sticky left-0 z-10 bg-ctp-base py-1 pr-6">Card</th>
              {decks.map((d) => (
                <th key={d.key} className="py-1 pr-6 font-medium normal-case text-ctp-text">
                  {d.label}
                </th>
              ))}
              <th className="py-1 pr-6">Decks</th>
              <th className="py-1 pr-6">Win rate</th>
              <th className="py-1 pr-6">Adjusted</th>
              <th className="py-1">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ctp-surface0 [&>tr:nth-child(even)]:bg-ctp-mantle">
            {rows.map((r) => {
              const card = cardsByName.get(r.name);
              return (
                <tr key={r.name}>
                  <td className="sticky left-0 z-10 bg-ctp-base py-1.5 pr-6 whitespace-nowrap">
                    <CardHoverPreview image={card?.editions[0]?.image} alt={r.name}>
                      {card?.slug ? (
                        <Link to={`/cards/${card.slug}`} className="text-ctp-text hover:text-ctp-blue">
                          {r.name}
                        </Link>
                      ) : (
                        <span className="text-ctp-text">{r.name}</span>
                      )}
                    </CardHoverPreview>
                  </td>
                  {r.quantities.map((q, i) => (
                    <td key={decks[i].key} className={`py-1.5 pr-6 ${q === 0 ? "text-ctp-surface1" : "text-ctp-text"}`}>
                      {q === 0 ? "—" : `${q}x`}
                    </td>
                  ))}
                  <td className="py-1.5 pr-6 text-ctp-subtext1">{r.stat ? r.stat.deckCount : "—"}</td>
                  <td className="py-1.5 pr-6 text-ctp-subtext1">{r.stat ? `${(r.stat.avgWinRate * 100).toFixed(0)}%` : "—"}</td>
                  <td className="py-1.5 pr-6 text-ctp-subtext1">{r.stat ? `${(r.stat.adjustedWinRate * 100).toFixed(0)}%` : "—"}</td>
                  <td className="py-1.5 text-ctp-subtext1">{r.stat?.marketPrice != null ? formatUsd(r.stat.marketPrice) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
