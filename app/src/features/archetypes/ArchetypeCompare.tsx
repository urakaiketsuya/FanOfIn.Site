import { Link, useSearchParams } from "react-router-dom";
import { ARCHETYPE_NEAR_DUPLICATE_THRESHOLD, type Card, type ArchetypeCluster, type MaterialArchetype } from "@gatcg/shared";
import { useArchetypeTaxonomyData } from "./data";
import { useCardsByNames } from "../events/useCardsByNames";
import CardHoverPreview from "../../components/CardHoverPreview";
import ElementIcon from "../../components/ElementIcon";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import ArchetypeElementIcon from "../../components/ArchetypeElementIcon";
import PageLayout from "../../components/layout/PageLayout";
import Panel from "../../components/ui/Panel";
import { InlineState } from "../../components/ui/ContentState";

type CompareItem = ArchetypeCluster | MaterialArchetype;

function averageQuantity(item: ArchetypeCluster, section: "main" | "material", name: string) {
  const cards = section === "main" ? item.mainDeckAverageCards : item.materialDeckAverageCards;
  return cards.find((card) => card.name === name)?.quantity ?? 0;
}

function centroidSimilarity(left: ArchetypeCluster, right: ArchetypeCluster) {
  const leftCards = new Map(left.mainDeckAverageCards.map((card) => [card.name, card.quantity]));
  const rightCards = new Map(right.mainDeckAverageCards.map((card) => [card.name, card.quantity]));
  let intersection = 0;
  let union = 0;
  for (const name of new Set([...leftCards.keys(), ...rightCards.keys()])) {
    const leftQuantity = leftCards.get(name) ?? 0;
    const rightQuantity = rightCards.get(name) ?? 0;
    intersection += Math.min(leftQuantity, rightQuantity);
    union += Math.max(leftQuantity, rightQuantity);
  }
  return union > 0 ? intersection / union : 0;
}

function quantityRows(items: ArchetypeCluster[], section: "main" | "material", limit: number) {
  const names = new Set(items.flatMap((item) => (section === "main" ? item.mainDeckAverageCards : item.materialDeckAverageCards).map((card) => card.name)));
  return Array.from(names, (name) => {
    const quantities = items.map((item) => averageQuantity(item, section, name));
    return { name, quantities, delta: Math.max(...quantities) - Math.min(...quantities) };
  })
    .filter((row) => row.delta >= 0.05)
    .sort((a, b) => b.delta - a.delta || a.name.localeCompare(b.name))
    .slice(0, limit);
}

function metricValue(item: CompareItem, metric: "players" | "appearances" | "events" | "winRate") {
  if (metric === "players") return item.playerCount.toLocaleString();
  if (metric === "appearances") return item.deckCount.toLocaleString();
  if (metric === "events") return item.eventCount.toLocaleString();
  return `${(item.avgWinRate * 100).toFixed(1)}%`;
}

export default function ArchetypeCompare() {
  useDocumentTitle("Compare Archetypes", "Compare Grand Archive material archetypes or concrete deck builds side by side.");
  const data = useArchetypeTaxonomyData();
  const [params] = useSearchParams();
  const type = params.get("type") === "route" ? "route" : "build";
  const ids = (params.get("ids") ?? "").split(",").filter(Boolean).slice(0, 4);
  const items: CompareItem[] = data
    ? ids.map((id) => type === "route" ? data.materialArchetypes.find((item) => item.id === id) : data.clusters.find((item) => item.id === (data.aliases[id] ?? id))).filter((item): item is CompareItem => !!item)
    : [];
  const cardRows = Array.from(new Set(items.flatMap((item) => item.definingCards.slice(0, 10).map((card) => card.name))))
    .map((name) => ({ name, prevalence: items.map((item) => item.definingCards.find((card) => card.name === name)?.prevalence ?? 0) }))
    .sort((a, b) => Math.max(...b.prevalence) - Math.max(...a.prevalence));
  const spiritRows = type === "route"
    ? Array.from(new Set((items as MaterialArchetype[]).flatMap((item) => item.spiritBreakdown.map((spirit) => spirit.name))))
        .map((name) => ({ name, counts: (items as MaterialArchetype[]).map((item) => item.spiritBreakdown.find((spirit) => spirit.name === name)?.playerCount ?? 0) }))
        .sort((a, b) => Math.max(...b.counts) - Math.max(...a.counts))
    : [];
  const builds = type === "build" ? items as ArchetypeCluster[] : [];
  const similarityRows = builds.flatMap((left, leftIndex) => builds.slice(leftIndex + 1).map((right) => ({
    label: `${left.name} ↔ ${right.name}`,
    similarity: centroidSimilarity(left, right),
  })));
  const mainQuantityRows = quantityRows(builds, "main", 20);
  const materialQuantityRows = quantityRows(builds, "material", 16);
  const cardsByName = useCardsByNames([
    ...spiritRows.map((row) => row.name),
    ...materialQuantityRows.map((row) => row.name),
    ...mainQuantityRows.map((row) => row.name),
    ...cardRows.map((row) => row.name),
  ]);

  return (
    <PageLayout width="wide">
      <Link to="/archetypes" className="text-sm text-ctp-blue hover:underline">&larr; Back to archetypes</Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-widest text-ctp-mauve uppercase">Side-by-side</p>
          <h1 className="mt-1 text-2xl font-bold text-ctp-text">Compare {type === "route" ? "material archetypes" : "builds"}</h1>
          <p className="mt-1 max-w-2xl text-sm text-ctp-subtext1">{type === "route" ? "Compare Champion routes, their Spirit populations, and signature material packages." : "Compare concrete main-deck populations and the cards that distinguish each build."}</p>
        </div>
        <span className="rounded-full bg-ctp-surface0 px-3 py-1 text-xs text-ctp-subtext0">{items.length} selected</span>
      </div>

      {!data && <InlineState className="mt-8">Loading…</InlineState>}
      {data && items.length < 2 && <Panel tone="warning" className="mt-8 text-sm text-ctp-subtext1">Choose at least two {type === "route" ? "material archetypes" : "builds"} from the <Link to="/archetypes" className="text-ctp-blue hover:underline">Archetypes page</Link>.</Panel>}
      {items.length >= 2 && (
        <>
          <div className={`mt-6 grid gap-3 ${items.length === 2 ? "sm:grid-cols-2" : items.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
            {items.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-xl border border-ctp-surface1 bg-ctp-base">
                <div className="h-1 bg-gradient-to-r from-ctp-mauve to-ctp-blue" />
                <div className="p-4">
                  <h2 className="flex items-start gap-2 font-semibold text-ctp-text"><ArchetypeElementIcon name={item.name} /><span>{item.name}</span></h2>
                  <p className="mt-1 text-xs text-ctp-subtext0">{item.championName}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                    {(["players", "appearances", "events", "winRate"] as const).map((metric) => <div key={metric} className="rounded-md bg-ctp-mantle p-2"><strong className="block text-sm text-ctp-text">{metricValue(item, metric)}</strong><span className="text-[10px] text-ctp-subtext0">{metric === "winRate" ? "win rate" : metric}</span></div>)}
                  </div>
                  {type === "build" && <Link to={`/archetypes/${item.id}`} className="mt-3 inline-block text-xs text-ctp-blue hover:underline">Open build &rarr;</Link>}
                </div>
              </article>
            ))}
          </div>

          {type === "route" && spiritRows.length > 0 && (
            <section className="mt-8">
              <h2 className="text-sm font-semibold tracking-wide text-ctp-blue uppercase">Spirit populations</h2>
              <p className="mt-1 text-xs text-ctp-subtext0">Unique players observed with each Spirit inside the material route.</p>
              <ComparisonTable firstColumn="Spirit" names={items.map((item) => item.name)} rows={spiritRows.map((row) => ({ label: row.name, values: row.counts.map((count) => count ? `${count}p` : "—") }))} cardsByName={cardsByName} />
            </section>
          )}

          {type === "build" && (
            <>
              <section className="mt-8">
                <h2 className="text-sm font-semibold tracking-wide text-ctp-mauve uppercase">Why these are separate</h2>
                <p className="mt-1 text-xs text-ctp-subtext0">The pipeline merges same-route builds only when their average main-deck quantities reach {(ARCHETYPE_NEAR_DUPLICATE_THRESHOLD * 100).toFixed(0)}% weighted-Jaccard similarity.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {similarityRows.map((row) => {
                    const merges = row.similarity >= ARCHETYPE_NEAR_DUPLICATE_THRESHOLD;
                    return <div key={row.label} className={`rounded-xl border p-4 ${merges ? "border-ctp-green/30 bg-ctp-green/5" : "border-ctp-peach/30 bg-ctp-peach/5"}`}>
                      <p className="text-xs text-ctp-subtext0">{row.label}</p>
                      <div className="mt-2 flex items-baseline justify-between gap-3"><strong className="text-xl text-ctp-text">{(row.similarity * 100).toFixed(1)}%</strong><span className={`text-xs font-semibold ${merges ? "text-ctp-green" : "text-ctp-peach"}`}>{merges ? "meets merge threshold" : `${((ARCHETYPE_NEAR_DUPLICATE_THRESHOLD - row.similarity) * 100).toFixed(1)} points below merge`}</span></div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ctp-surface0"><div className={merges ? "h-full bg-ctp-green" : "h-full bg-ctp-peach"} style={{ width: `${row.similarity * 100}%` }} /></div>
                    </div>;
                  })}
                </div>
              </section>

              {materialQuantityRows.length > 0 && <section className="mt-8">
                <h2 className="text-sm font-semibold tracking-wide text-ctp-blue uppercase">Material progression differences</h2>
                <p className="mt-1 text-xs text-ctp-subtext0">Average copies per submitted material deck. This exposes Champion levels and route cards that defining-card prevalence can hide.</p>
                <ComparisonTable firstColumn="Material card" names={builds.map((item) => item.name)} rows={materialQuantityRows.map((row) => ({ label: row.name, values: row.quantities.map(formatQuantity), strengths: row.quantities.map((quantity) => quantity / Math.max(1, ...row.quantities)) }))} cardsByName={cardsByName} />
              </section>}

              {mainQuantityRows.length > 0 && <section className="mt-8">
                <h2 className="text-sm font-semibold tracking-wide text-ctp-peach uppercase">Largest main-deck differences</h2>
                <p className="mt-1 text-xs text-ctp-subtext0">Average copies per deck, ordered by the largest gap between selected builds—not merely whether a card appears.</p>
                <ComparisonTable firstColumn="Main-deck card" names={builds.map((item) => item.name)} rows={mainQuantityRows.map((row) => ({ label: row.name, values: row.quantities.map(formatQuantity), strengths: row.quantities.map((quantity) => quantity / Math.max(1, ...row.quantities)) }))} cardsByName={cardsByName} />
              </section>}
            </>
          )}

          <section className="mt-8">
            <h2 className="text-sm font-semibold tracking-wide text-ctp-green uppercase">Defining-card overlap</h2>
            <p className="mt-1 text-xs text-ctp-subtext0">Presence within each selected {type === "route" ? "route" : "build"}. A dash means the card is not one of that population's defining cards.</p>
            <ComparisonTable firstColumn="Card" names={items.map((item) => item.name)} rows={cardRows.map((row) => ({ label: row.name, values: row.prevalence.map((value) => value ? `${(value * 100).toFixed(0)}%` : "—"), strengths: row.prevalence }))} cardsByName={cardsByName} />
          </section>
        </>
      )}
    </PageLayout>
  );
}

function formatQuantity(quantity: number) {
  return quantity >= 0.05 ? quantity.toFixed(2) : "—";
}

function ComparisonTable({ firstColumn, names, rows, cardsByName }: { firstColumn: string; names: string[]; rows: { label: string; values: string[]; strengths?: number[] }[]; cardsByName?: Map<string, Card> }) {
  return <div className="mt-3 overflow-x-auto rounded-xl border border-ctp-surface1"><table className="min-w-full text-sm"><thead><tr className="bg-ctp-mantle text-left text-xs text-ctp-subtext0"><th className="min-w-44 p-3">{firstColumn}</th>{names.map((name) => <th key={name} className="min-w-36 p-3">{name}</th>)}</tr></thead><tbody className="divide-y divide-ctp-surface0">{rows.map((row) => {
    const card = cardsByName?.get(row.label);
    return <tr key={row.label}><th className="p-3 text-left font-medium text-ctp-text">{card ? <span className="inline-flex items-center gap-1.5">{card.element !== "NORM" && <ElementIcon element={card.element} size={14} />}<CardHoverPreview image={card.editions[0]?.image} alt={row.label}><Link to={`/cards/${card.slug}`} className="hover:text-ctp-blue">{row.label}</Link></CardHoverPreview></span> : row.label}</th>{row.values.map((value, index) => <td key={`${row.label}-${names[index]}`} className="relative p-3 text-ctp-subtext1"><span className="relative z-10">{value}</span>{row.strengths?.[index] ? <span className="absolute inset-y-1 left-1 rounded bg-ctp-green/10" style={{ width: `${Math.max(4, row.strengths[index] * 100)}%` }} /> : null}</td>)}</tr>;
  })}</tbody></table></div>;
}
