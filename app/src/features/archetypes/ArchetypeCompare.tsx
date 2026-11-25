import PublishedSourceStatus from "../../components/PublishedSourceStatus";
import { usePublishedDataStatus } from "../../lib/sync/usePublishedData";
import { useMemo } from "react";
import BuildCopyComparison from "./BuildCopyComparison";
import { Link, useSearchParams } from "react-router-dom";
import { type Card, type ArchetypeCluster, type MaterialArchetype } from "@gatcg/shared";
import { useArchetypeTaxonomyData } from "./data";
import { useCardsByNames } from "../events/useCardsByNames";
import CardArtTile from "../../components/CardArtTile";
import ArchetypePreview from "./ArchetypePreview";
import PageHeader from "../../components/ui/PageHeader";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import ArchetypeElementIcon from "../../components/ArchetypeElementIcon";
import PageLayout from "../../components/layout/PageLayout";
import Panel from "../../components/ui/Panel";

type CompareItem = ArchetypeCluster | MaterialArchetype;

function metricValue(item: CompareItem, metric: "players" | "appearances" | "events" | "winRate") {
  if (metric === "players") return item.playerCount.toLocaleString();
  if (metric === "appearances") return item.deckCount.toLocaleString();
  if (metric === "events") return item.eventCount.toLocaleString();
  return `${(item.avgWinRate * 100).toFixed(1)}%`;
}

export default function ArchetypeCompare() {
  useDocumentTitle("Compare Archetypes", "Compare Grand Archive material archetypes or concrete deck builds side by side.");
  const data = useArchetypeTaxonomyData();
  const taxonomyStatus = usePublishedDataStatus("analysis-archetype-taxonomy", "/data/analysis/archetype-taxonomy.json");
  const [params] = useSearchParams();
  const type = params.get("type") === "route" ? "route" : "build";
  const requestedIds = params.get("ids") ?? "";
  const ids = useMemo(() => [...new Set(requestedIds.split(",").filter(Boolean))].slice(0, 4), [requestedIds]);
  const items: CompareItem[] = useMemo(() => data
    ? ids.map((id) => type === "route" ? data.materialArchetypes.find((item) => item.id === id) : data.clusters.find((item) => item.id === (data.aliases[id] ?? id))).filter((item): item is CompareItem => !!item).filter((item, i, all) => all.findIndex(other => other.id === item.id) === i)
    : [], [data, type, ids]);
  const cardRows = Array.from(new Set(items.flatMap((item) => item.definingCards.slice(0, 10).map((card) => card.name))))
    .map((name) => ({ name, prevalence: items.map((item) => item.definingCards.find((card) => card.name === name)?.prevalence ?? 0) }))
    .sort((a, b) => Math.max(...b.prevalence) - Math.max(...a.prevalence));
  const spiritRows = type === "route"
    ? Array.from(new Set((items as MaterialArchetype[]).flatMap((item) => item.spiritBreakdown.map((spirit) => spirit.name))))
        .map((name) => ({ name, counts: (items as MaterialArchetype[]).map((item) => item.spiritBreakdown.find((spirit) => spirit.name === name)?.playerCount ?? 0) }))
        .sort((a, b) => Math.max(...b.counts) - Math.max(...a.counts))
    : [];
  const builds = useMemo(() => type === "build" ? items as ArchetypeCluster[] : [], [type, items]);
  const cardsByName = useCardsByNames([
    ...spiritRows.map((row) => row.name),
    ...cardRows.map((row) => row.name),
  ]);

  return (
    <PageLayout data-component="ArchetypeCompare" width="wide">
      <PageHeader title={type === "route" ? "Compare archetypes" : "Compare builds"} />

      <PublishedSourceStatus label="Build populations" status={taxonomyStatus} hasData={!!data} />
      {data && items.length < 2 && <Panel tone="warning" className="mt-8 text-sm text-ctp-subtext1">Choose at least two {type === "route" ? "material archetypes" : "builds"} from the <Link to="/archetypes" className="text-ctp-blue hover:underline">Archetypes page</Link>.</Panel>}
      {items.length >= 2 && (
        <>
          <div className={`mt-6 grid gap-3 ${items.length === 2 ? "sm:grid-cols-2" : items.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
            {items.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-xl border border-ctp-surface1 bg-ctp-base">
                <div className="p-4">
                  <ArchetypePreview names={item.definingCards.slice(0, 2).map(card => card.name)} cardImages={cardsByName} />
                  <h2 className="mt-3 flex items-start gap-2 font-semibold text-ctp-text"><ArchetypeElementIcon name={item.name} /><span>{item.name}</span></h2>
                  <p className="mt-1 text-xs text-ctp-subtext0">{item.championName}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                    {(["players", "appearances", "events", "winRate"] as const).map((metric) => <div key={metric} className="rounded-md bg-ctp-mantle p-2"><strong className="block text-sm text-ctp-text">{metricValue(item, metric)}</strong><span className="text-[10px] text-ctp-subtext0">{metric === "winRate" ? "win rate" : metric}</span></div>)}
                  </div>
                  {type === "build" && <Link to={`/archetypes/${item.id}`} className="mt-3 inline-flex min-h-12 items-center text-sm text-ctp-blue hover:underline">Open build &rarr;</Link>}
                </div>
              </article>
            ))}
          </div>

          {type === "route" && spiritRows.length > 0 && (
            <section className="mt-8">
              <h2 className="text-sm font-semibold tracking-wide text-ctp-blue uppercase">Spirit populations</h2>
              <CardComparison items={items} rows={spiritRows.map((row) => ({ name: row.name, values: row.counts.map(count => `${count} ${count === 1 ? "player" : "players"}`) }))} cardsByName={cardsByName} />
            </section>
          )}

          {type === "build" && <BuildCopyComparison builds={builds} />}

          {type === "route" && <section className="mt-8">
            <h2 className="text-sm font-semibold tracking-wide text-ctp-green uppercase">Defining-card overlap</h2>
            <CardComparison items={items} rows={cardRows.map((row) => ({ name: row.name, values: row.prevalence.map(value => value ? `${(value * 100).toFixed(0)}%` : "Outside defining cards"), strengths: row.prevalence }))} cardsByName={cardsByName} />
          </section>}
        </>
      )}
    </PageLayout>
  );
}

interface ComparisonRow {
  name: string;
  values: string[];
  strengths?: number[];
}

function CardComparison({ items, rows, cardsByName }: {
  items: CompareItem[];
  rows: ComparisonRow[];
  cardsByName: Map<string, Card>;
}) {
  return <div className="mt-3 space-y-2">
    {rows.map(row => {
      const card = cardsByName.get(row.name);
      const art = <CardArtTile card={card} name={row.name} />;
      return <article key={row.name} className="grid grid-cols-[3.75rem_minmax(0,1fr)] items-start gap-3 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3 sm:grid-cols-[4.5rem_minmax(0,1fr)]">
        {card ? <Link to={`/cards/${card.slug}`} aria-label={row.name} className="rounded focus-visible:outline-2">{art}</Link> : art}
        <div>
          <h3 className="break-words font-semibold">{row.name}</h3>
          <dl className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((item, index) => <div key={item.id} className="min-w-0 rounded-md bg-ctp-base px-2 py-1.5 text-sm">
              <dt className="break-words text-xs text-ctp-subtext1">{item.name}</dt>
              <dd className="font-medium tabular-nums">{row.values[index]}</dd>
              {!!row.strengths?.[index] && <div aria-hidden="true" className="mt-1 h-1 rounded bg-ctp-surface0">
                <div className="h-full rounded bg-ctp-green" style={{ width: `${row.strengths[index] * 100}%` }} />
              </div>}
            </div>)}
          </dl>
        </div>
      </article>;
    })}
  </div>;
}
