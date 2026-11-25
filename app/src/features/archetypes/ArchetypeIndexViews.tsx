import DisclosureChevron from "../../components/DisclosureChevron";
import Button from "../../components/ui/Button";
import { Link } from "react-router-dom";
import type { ArchetypeCluster, Card, MaterialArchetype } from "@gatcg/shared";
import ArchetypePreview from "./ArchetypePreview";
import ArchetypeElementIcon from "../../components/ArchetypeElementIcon";
import { championNameToSlug } from "../../lib/championSlug";
import type { DisplayRow } from "./ArchetypesIndex";


function CompareButton({ selected, onClick, name }: { selected: boolean; onClick: () => void; name: string }) {
  return <Button size="sm" onClick={onClick} aria-label={`${selected ? "Remove" : "Add"} ${name} ${selected ? "from" : "to"} comparison`} aria-pressed={selected} className={`min-h-control rounded-lg border px-3 py-2 text-xs font-medium ${selected ? "border-ctp-green text-ctp-green" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-blue"}`}>{selected ? "Selected" : "Compare"}</Button>;
}

export function MaterialRouteCard({ route, childBuilds, cardImages, selected, onToggleCompare }: {
  route: MaterialArchetype;
  childBuilds: ArchetypeCluster[];
  cardImages: Map<string, Card>;
  selected: boolean;
  onToggleCompare: () => void;
}) {
  const primaryBuildId = route.buildIds[0];
  const relatedBuilds = childBuilds.filter((build) => build.id !== primaryBuildId).slice(0, 3);
  return (
    <article className="min-w-0 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3 shadow-sm shadow-black/20">
      <ArchetypePreview names={route.definingCards.slice(0, 3).map((card) => card.name)} cardImages={cardImages} />
      <div className="mt-3 flex items-center gap-2 font-medium text-ctp-text">
        <ArchetypeElementIcon name={route.name} />
        <h2 className="min-w-0 break-words">{route.name}</h2>
        {route.confidence === "emerging" && <span className="rounded-full bg-ctp-yellow/15 px-2 py-0.5 text-[10px] text-ctp-yellow">Emerging</span>}
      </div>
      <p className="mt-1 text-sm text-ctp-subtext1">{route.playerCount.toLocaleString()} players · {route.buildIds.length} {route.buildIds.length === 1 ? "build" : "builds"}</p>
      <div className="mt-3 flex gap-2 border-t border-ctp-surface1 pt-3">
        <CompareButton selected={selected} onClick={onToggleCompare} name={route.name} />
        {primaryBuildId && <Link to={`/archetypes/${primaryBuildId}`} aria-label={`View build for ${route.name}`} className="flex min-h-control flex-1 items-center justify-center rounded-lg bg-ctp-blue px-3 py-2 text-sm font-medium text-ctp-base hover:opacity-90">View build</Link>}
      </div>
      <details className="group mt-2 text-xs text-ctp-subtext0">
        <summary className="flex min-h-control cursor-pointer list-none items-center gap-2 hover:text-ctp-blue [&::-webkit-details-marker]:hidden">Route details<DisclosureChevron className="group-open:rotate-180" /></summary>
        <p className="mt-2">{route.deckCount.toLocaleString()} appearances · {route.eventCount.toLocaleString()} events · {(route.avgWinRate * 100).toFixed(0)}% win rate</p>
        {route.spiritBreakdown.length > 0 && <p className="mt-1">Spirits: {route.spiritBreakdown.map((spirit) => spirit.name).join(", ")}</p>}
        {relatedBuilds.length > 0 && <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">{relatedBuilds.map((build) => <Link key={build.id} to={`/archetypes/${build.id}`} className="inline-flex min-h-control items-center text-ctp-blue hover:underline">{build.name}</Link>)}</div>}
      </details>
    </article>
  );
}

export function BuildResultCard({ build, cardImages, selected, onToggleCompare }: { build: DisplayRow; cardImages: Map<string, Card>; selected: boolean; onToggleCompare: () => void }) {
  return (
    <article className="min-w-0 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3 shadow-sm shadow-black/20">
      <ArchetypePreview names={build.definingCards} cardImages={cardImages} />
      <div className="mt-3 flex items-center gap-2 font-medium text-ctp-text">
        <ArchetypeElementIcon name={build.name} />
        <h2 className="min-w-0 break-words">{build.name}</h2>
        {build.confidence === "emerging" && <span className="rounded-full bg-ctp-yellow/15 px-2 py-0.5 text-[10px] text-ctp-yellow">Emerging</span>}
      </div>
      <Link to={`/champions/${championNameToSlug(build.championName)}`} className="inline-flex min-h-control items-center text-sm text-ctp-subtext1 hover:text-ctp-blue">{build.championName}</Link>
      <p className="text-sm text-ctp-text">{build.playerCount.toLocaleString()} players <span className="text-ctp-subtext1">· {(build.avgWinRate * 100).toFixed(0)}% win rate · {build.eventCount.toLocaleString()} events</span></p>
      <div className="mt-3 flex gap-2 border-t border-ctp-surface1 pt-3">
        <CompareButton selected={selected} onClick={onToggleCompare} name={build.name} />
        <Link to={`/archetypes/${build.id}`} aria-label={`View build: ${build.name}`} className="flex min-h-control flex-1 items-center justify-center rounded-lg bg-ctp-blue px-3 py-2 text-sm font-medium text-ctp-base hover:opacity-90">View build</Link>
      </div>
    </article>
  );
}

export function ArchetypeComparisonBar({ selectedIds, kind, onClear }: { selectedIds: Set<string>; kind: "archetypes" | "builds"; onClear: () => void }) {
  if (selectedIds.size === 0) return null;
  return (
    <div className="sticky bottom-4 z-20 mt-6 flex items-center justify-between gap-3 rounded-xl border border-ctp-blue/40 bg-ctp-mantle/95 p-3 shadow-xl backdrop-blur">
      <div className="min-w-0 text-sm"><span className="font-semibold text-ctp-text">{selectedIds.size} of 4 selected</span><span className="ml-2 hidden text-xs text-ctp-subtext0 sm:inline">Choose at least two {kind === "archetypes" ? "material archetypes" : "builds"}.</span></div>
      <div className="flex shrink-0 gap-2">
        <button type="button" onClick={onClear} className="min-h-control min-w-control rounded-md px-2 text-xs text-ctp-subtext1 hover:text-ctp-text">Clear</button>
        {selectedIds.size >= 2 ? <Link to={`/archetypes/compare?type=${kind === "archetypes" ? "route" : "build"}&ids=${Array.from(selectedIds).join(",")}`} className="inline-flex min-h-control items-center rounded-md bg-ctp-blue px-3 text-xs font-semibold text-ctp-base hover:brightness-110">Compare selected →</Link> : <span className="inline-flex min-h-control items-center px-2 text-xs text-ctp-subtext1">Select one more</span>}
      </div>
    </div>
  );
}
