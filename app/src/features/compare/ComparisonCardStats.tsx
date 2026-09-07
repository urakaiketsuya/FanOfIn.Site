import { useMemo, useState } from "react";
import type { OmnidexDecklist } from "@gatcg/shared";
import { VisualCardTile, type VisualFieldVisibility } from "../../components/VisualCardTile";
import { formatUsd } from "../../lib/format";
import { useCardStatsData } from "../archetypes/data";
import { useComparisonData } from "./useComparisonData";
import type { ComparedDeck } from "./types";
import { InlineState } from "../../components/ui/ContentState";

type SortMode = "adjustedWinRate" | "deckCount" | "marketPrice" | "name";
type Scope = "differences" | "shared" | "all";
const SORT_LABELS: Record<SortMode, string> = { adjustedWinRate: "Win rate", deckCount: "Usage", marketPrice: "Price", name: "Name" };
const SCOPE_LABELS: Record<Scope, string> = { differences: "Differences", shared: "Shared", all: "All" };
const CARD_FIELDS: VisualFieldVisibility = { cost: false, price: false, priceTrend: false, tags: false, simulator: false, community: false };

function shortLabel(label: string): string {
  const at = label.indexOf(" @ ");
  return at === -1 ? label : label.slice(0, at);
}

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
  const [scope, setScope] = useState<Scope>("differences");

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
      if (sortMode === "marketPrice") return (b.stat?.marketPrice ?? -1) - (a.stat?.marketPrice ?? -1);
      return (b.stat?.adjustedWinRate ?? -1) - (a.stat?.adjustedWinRate ?? -1);
    });
  }, [decks, decklists, statByName, sortMode]);
  const visibleRows = rows.filter((row) => {
    const presentCount = row.quantities.filter((quantity) => quantity > 0).length;
    const sameQuantity = row.quantities.every((quantity) => quantity === row.quantities[0]);
    if (scope === "shared") return presentCount === decks.length;
    if (scope === "differences") return presentCount !== decks.length || !sameQuantity;
    return true;
  });

  if (rows.length === 0) return <InlineState className="text-sm">No cards to show yet.</InlineState>;

  return <div data-component="ComparisonCardStats">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-ctp-subtext1">Site-wide performance for cards in these decks. <span className="cursor-help text-ctp-subtext0" title="These numbers cover every public tournament deck, not a specific Champion or archetype." aria-label="Stats methodology: site-wide, not Champion-specific">ⓘ</span></p>
      <span className="text-xs tabular-nums text-ctp-subtext0">{visibleRows.length} cards</span>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-0.5 text-ctp-subtext0">Show</span>
        {(Object.keys(SCOPE_LABELS) as Scope[]).map((value) => <button key={value} type="button" aria-pressed={scope === value} onClick={() => setScope(value)} className={`rounded-md border px-2 py-1 ${scope === value ? "border-ctp-blue bg-ctp-blue/10 text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"}`}>{SCOPE_LABELS[value]}</button>)}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-0.5 text-ctp-subtext0">Sort</span>
        {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => <button key={mode} type="button" aria-pressed={sortMode === mode} onClick={() => setSortMode(mode)} className={`rounded-md border px-2 py-1 ${sortMode === mode ? "border-ctp-blue bg-ctp-blue/10 text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"}`}>{SORT_LABELS[mode]}</button>)}
      </div>
    </div>

    {visibleRows.length === 0 ? <InlineState className="mt-5 text-sm">No cards match this view.</InlineState> : <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
      {visibleRows.map((row) => {
        const card = cardsByName.get(row.name);
        return <VisualCardTile key={row.name} line={{ card: row.name, quantity: 1 }} card={card} unitPrice={undefined} priceTrend={undefined} simulatorEvidence={undefined} communityEntry={undefined} fields={CARD_FIELDS} footer={<div className="mt-1.5 min-w-0">
          <div className="truncate text-sm font-medium text-ctp-text" title={row.name}>{row.name}</div>
          {row.stat ? <div className="mt-1.5 grid grid-cols-3 gap-1 border-y border-ctp-surface0 py-1.5 text-center">
            <div><div className="font-semibold tabular-nums text-ctp-text">{(row.stat.adjustedWinRate * 100).toFixed(0)}%</div><div className="text-[10px] text-ctp-subtext0">Win rate</div></div>
            <div><div className="font-semibold tabular-nums text-ctp-text">{row.stat.deckCount}</div><div className="text-[10px] text-ctp-subtext0">Decks</div></div>
            <div><div className="font-semibold tabular-nums text-ctp-text">{row.stat.marketPrice != null ? formatUsd(row.stat.marketPrice) : "—"}</div><div className="text-[10px] text-ctp-subtext0">Price</div></div>
          </div> : <div className="mt-1.5 border-y border-ctp-surface0 py-2 text-center text-xs text-ctp-overlay1">Stats unavailable</div>}
          <div className="mt-1.5 flex flex-wrap gap-1">{row.quantities.map((quantity, index) => <span key={decks[index].key} title={decks[index].label} className={`max-w-full truncate rounded bg-ctp-surface0 px-1.5 py-0.5 text-[10px] ${quantity > 0 ? "text-ctp-subtext1" : "text-ctp-overlay1"}`}>{shortLabel(decks[index].label)} {quantity > 0 ? `${quantity}×` : "—"}</span>)}</div>
        </div>} />;
      })}
    </div>}
  </div>;
}
