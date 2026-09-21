import { useMemo, useState } from "react";
import CardHoverPreview from "../../../components/CardHoverPreview";
import type { CardCategoryRecommendation } from "../cardCategoryRecommendations";

export default function BuilderCardExplorer({
  recommendations,
  lockedCards,
  onAddCard,
}: {
  recommendations: CardCategoryRecommendation[];
  lockedCards: Map<string, number>;
  onAddCard: (name: string, quantity?: number, destination?: "automatic" | "maybeboard") => void;
}) {
  const [open, setOpen] = useState(false);
  const [subtype, setSubtype] = useState("");
  const subtypes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of recommendations) counts.set(item.subtype, (counts.get(item.subtype) ?? 0) + 1);
    return Array.from(counts, ([name, count]) => ({ name, count }))
      .filter(({ count }) => count >= 2)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [recommendations]);
  const matches = useMemo(
    () => recommendations.filter((item) => item.subtype === subtype).slice(0, 12),
    [recommendations, subtype],
  );

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-2 text-xs text-ctp-blue hover:underline">
        Browse by subtype
      </button>
    );
  }

  return (
    <section className="mt-3 rounded-lg border border-ctp-surface1 bg-ctp-base p-3" aria-labelledby="builder-card-explorer-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="builder-card-explorer-title" className="text-sm font-semibold text-ctp-text">Explore cards for this deck</h2>
        </div>
        <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="rounded-md border border-ctp-blue/60 px-2.5 py-1 text-xs text-ctp-blue hover:bg-ctp-blue/10">
          Close
        </button>
      </div>
      <>
        <label className="mt-3 block max-w-sm text-xs font-medium text-ctp-subtext1">
          Card family
          <select value={subtype} onChange={(event) => setSubtype(event.target.value)} className="mt-1 block w-full rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-sm text-ctp-text focus:border-ctp-blue focus:outline-none">
            <option value="">Choose a subtype…</option>
            {subtypes.map((option) => <option key={option.name} value={option.name}>{option.name} ({option.count})</option>)}
          </select>
        </label>
        {subtype && <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {matches.map((item, index) => {
            const alreadyChosen = lockedCards.has(item.card.name);
            const evidence = item.tournamentDecks > 0
              ? `${Math.round(item.tournamentRate * 100)}% of matching tournament decks`
              : `${Math.round(item.communityRate * 100)}% community adoption`;
            return <article key={item.card.name} className="rounded-lg border border-ctp-surface1 bg-ctp-mantle p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-ctp-blue">#{index + 1} for {subtype}</p>
                  <CardHoverPreview image={item.card.editions[0]?.image} alt={item.card.name}>
                    <span className="mt-0.5 block truncate text-sm font-medium text-ctp-text">{item.card.name}</span>
                  </CardHoverPreview>
                </div>
                <span className="shrink-0 rounded-full bg-ctp-surface0 px-2 py-0.5 text-[10px] text-ctp-subtext1">{item.recommendedQuantity}×</span>
              </div>
              <p className="mt-1 text-[11px] text-ctp-subtext0">{evidence}</p>
              <div className="mt-2 flex gap-2">
                <button type="button" disabled={alreadyChosen} onClick={() => onAddCard(item.card.name, item.recommendedQuantity, "automatic")} className="rounded border border-ctp-green/60 px-2 py-1 text-xs text-ctp-green enabled:hover:bg-ctp-green/10 disabled:opacity-40">{alreadyChosen ? "Added" : "Add to deck"}</button>
                <button type="button" onClick={() => onAddCard(item.card.name, item.recommendedQuantity, "maybeboard")} className="rounded border border-ctp-yellow/60 px-2 py-1 text-xs text-ctp-yellow hover:bg-ctp-yellow/10">Maybe</button>
              </div>
            </article>;
          })}
          {matches.length === 0 && <p className="text-xs text-ctp-subtext0">No supported {subtype} cards were found for this identity.</p>}
        </div>}
      </>
    </section>
  );
}
