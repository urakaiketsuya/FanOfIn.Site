import { Link } from "react-router-dom";
import type { ArchetypeCluster, Card, MaterialArchetype } from "@gatcg/shared";
import CardImage from "../../components/CardImage";
import ArchetypeElementIcon from "../../components/ArchetypeElementIcon";
import { championNameToSlug } from "../../lib/championSlug";
import { formatUsd } from "../../lib/format";
import type { DisplayRow } from "./ArchetypesIndex";

function DefiningCardArt({ names, cardImages }: { names: string[]; cardImages: Map<string, Card> }) {
  return (
    <div className="grid grid-cols-3 gap-2" aria-label="Defining cards">
      {Array.from({ length: 3 }, (_, index) => {
        const name = names[index];
        const card = name ? cardImages.get(name) : undefined;
        return card?.editions[0]?.image ? (
          <Link key={name} to={`/cards/${card.slug}`} className="min-w-0" aria-label={`View ${name}`}>
            <CardImage image={card.editions[0].image} alt={name} className="aspect-[5/7] w-full rounded-md object-cover object-top" />
          </Link>
        ) : <div key={name ?? index} className="aspect-[5/7] rounded-md bg-ctp-surface0" />;
      })}
    </div>
  );
}

function CompareButton({ selected, onClick, name }: { selected: boolean; onClick: () => void; name: string }) {
  return <button type="button" onClick={onClick} aria-label={`${selected ? "Remove" : "Add"} ${name} ${selected ? "from" : "to"} comparison`} aria-pressed={selected} className={`min-h-10 rounded-lg border px-3 py-2 text-xs font-medium ${selected ? "border-ctp-green text-ctp-green" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-blue"}`}>{selected ? "Selected" : "Compare"}</button>;
}

export function MaterialRouteCard({ route, childBuilds, cardImages, selected, onToggleCompare }: {
  route: MaterialArchetype;
  childBuilds: ArchetypeCluster[];
  cardImages: Map<string, Card>;
  selected: boolean;
  onToggleCompare: () => void;
}) {
  const primaryBuildId = route.buildIds[0];
  return (
    <article className="min-w-0 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3 shadow-sm shadow-black/20">
      <DefiningCardArt names={route.definingCards.map((card) => card.name)} cardImages={cardImages} />
      <div className="mt-3 flex items-center gap-2 font-medium text-ctp-text">
        <ArchetypeElementIcon name={route.name} />
        {primaryBuildId ? <Link to={`/archetypes/${primaryBuildId}`} className="hover:text-ctp-blue">{route.name}</Link> : route.name}
        {route.confidence === "emerging" && <span className="rounded-full bg-ctp-yellow/15 px-2 py-0.5 text-[10px] text-ctp-yellow">Emerging</span>}
      </div>
      <p className="mt-1 text-sm text-ctp-subtext1">{route.playerCount.toLocaleString()} players · {route.buildIds.length} {route.buildIds.length === 1 ? "build" : "builds"}</p>
      <div className="mt-3 flex gap-2 border-t border-ctp-surface1 pt-3">
        <CompareButton selected={selected} onClick={onToggleCompare} name={route.name} />
        {primaryBuildId && <Link to={`/archetypes/${primaryBuildId}`} className="flex min-h-10 flex-1 items-center justify-center rounded-lg bg-ctp-blue px-3 py-2 text-sm font-medium text-ctp-base hover:opacity-90">Explore route →</Link>}
      </div>
      <details className="mt-2 text-xs text-ctp-subtext0">
        <summary className="w-fit cursor-pointer py-1 hover:text-ctp-blue">Route details</summary>
        <p className="mt-2">{route.deckCount.toLocaleString()} appearances · {route.eventCount.toLocaleString()} events · {(route.avgWinRate * 100).toFixed(0)}% win rate</p>
        {route.spiritBreakdown.length > 0 && <p className="mt-1">Spirits: {route.spiritBreakdown.map((spirit) => spirit.name).join(", ")}</p>}
        {childBuilds.length > 0 && <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">{childBuilds.slice(0, 3).map((build) => <Link key={build.id} to={`/archetypes/${build.id}`} className="text-ctp-blue hover:underline">{build.name}</Link>)}</div>}
      </details>
    </article>
  );
}

export function BuildResultCard({ build, cardImages, selected, onToggleCompare }: { build: DisplayRow; cardImages: Map<string, Card>; selected: boolean; onToggleCompare: () => void }) {
  return (
    <article className="min-w-0 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3 shadow-sm shadow-black/20">
      <DefiningCardArt names={build.definingCards} cardImages={cardImages} />
      <div className="mt-3 flex items-center gap-2 font-medium text-ctp-text">
        <ArchetypeElementIcon name={build.name} />
        <Link to={`/archetypes/${build.id}`} className="hover:text-ctp-blue">{build.name}</Link>
        {build.confidence === "emerging" && <span className="rounded-full bg-ctp-yellow/15 px-2 py-0.5 text-[10px] text-ctp-yellow">Emerging</span>}
      </div>
      <Link to={`/champions/${championNameToSlug(build.championName)}`} className="mt-1 block text-xs text-ctp-subtext1 hover:text-ctp-blue">{build.championName}</Link>
      <p className="mt-2 text-sm text-ctp-text">{build.playerCount.toLocaleString()} players <span className="text-ctp-subtext1">· {(build.avgWinRate * 100).toFixed(0)}% win rate</span></p>
      <div className="mt-3 flex gap-2 border-t border-ctp-surface1 pt-3">
        <CompareButton selected={selected} onClick={onToggleCompare} name={build.name} />
        <Link to={`/archetypes/${build.id}`} className="flex min-h-10 flex-1 items-center justify-center rounded-lg bg-ctp-blue px-3 py-2 text-sm font-medium text-ctp-base hover:opacity-90">View build →</Link>
      </div>
      <details className="mt-2 text-xs text-ctp-subtext0">
        <summary className="w-fit cursor-pointer py-1 hover:text-ctp-blue">Build details</summary>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          <span>{build.deckCount.toLocaleString()} appearances</span>
          <span>{build.eventCount.toLocaleString()} events</span>
          {build.metaShare !== undefined && <span>{(build.metaShare * 100).toFixed(1)}% meta share</span>}
          {build.topCutRate !== undefined && <span>{(build.topCutRate * 100).toFixed(0)}% top cut</span>}
          {build.avgPlacement != null && <span>Average #{build.avgPlacement.toFixed(0)}</span>}
          {build.avgPrice != null && <span>{formatUsd(build.avgPrice)} average price</span>}
          {build.winRateInterval && <span title={`${build.winRateInterval.matches} matches`}>95% win-rate interval {(build.winRateInterval.low * 100).toFixed(0)}–{(build.winRateInterval.high * 100).toFixed(0)}%</span>}
        </div>
        {build.otherChampions.length > 0 && <p className="mt-2">Also played under {build.otherChampions.map((entry) => entry.championName).join(", ")}</p>}
      </details>
    </article>
  );
}

export function ArchetypeComparisonBar({ selectedIds, kind, onClear }: { selectedIds: Set<string>; kind: "archetypes" | "builds"; onClear: () => void }) {
  if (selectedIds.size === 0) return null;
  return (
    <div className="sticky bottom-4 z-20 mt-6 flex items-center justify-between gap-3 rounded-xl border border-ctp-blue/40 bg-ctp-mantle/95 p-3 shadow-xl backdrop-blur">
      <div className="min-w-0 text-sm"><span className="font-semibold text-ctp-text">{selectedIds.size} of 4 selected</span><span className="ml-2 hidden text-xs text-ctp-subtext0 sm:inline">Choose at least two {kind === "archetypes" ? "material archetypes" : "builds"}.</span></div>
      <div className="flex shrink-0 gap-2">
        <button type="button" onClick={onClear} className="rounded-md px-2 py-1.5 text-xs text-ctp-subtext1 hover:text-ctp-text">Clear</button>
        {selectedIds.size >= 2 ? <Link to={`/archetypes/compare?type=${kind === "archetypes" ? "route" : "build"}&ids=${Array.from(selectedIds).join(",")}`} className="rounded-md bg-ctp-blue px-3 py-1.5 text-xs font-semibold text-ctp-base hover:brightness-110">Compare selected →</Link> : <span className="rounded-md bg-ctp-surface1 px-3 py-1.5 text-xs font-semibold text-ctp-overlay1">Select one more</span>}
      </div>
    </div>
  );
}
