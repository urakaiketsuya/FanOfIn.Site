import { Link } from "react-router-dom";
import type { ArchetypeCluster, MaterialArchetype } from "@gatcg/shared";

export function MaterialRouteCard({ route, childBuilds, largestPlayerCount, selected, onToggleCompare }: {
  route: MaterialArchetype;
  childBuilds: ArchetypeCluster[];
  largestPlayerCount: number;
  selected: boolean;
  onToggleCompare: () => void;
}) {
  const primaryBuildId = route.buildIds[0];
  return (
    <article className="group relative overflow-hidden rounded-xl border border-ctp-surface1 bg-ctp-base shadow-sm transition hover:-translate-y-0.5 hover:border-ctp-blue/50 hover:shadow-md">
      <div className="h-1 bg-ctp-surface0"><div className="h-full rounded-r bg-gradient-to-r from-ctp-mauve to-ctp-blue" style={{ width: `${Math.max(4, (route.playerCount / largestPlayerCount) * 100)}%` }} /></div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-semibold tracking-widest text-ctp-mauve uppercase">Material route</p>
            <h2 className="flex items-center gap-2 text-base font-semibold text-ctp-text">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-ctp-mauve/25 to-ctp-blue/20 text-xs font-bold text-ctp-mauve" aria-hidden="true">{route.championName.slice(0, 1)}</span>
              {primaryBuildId ? <Link to={`/archetypes/${primaryBuildId}`} className="hover:text-ctp-blue">{route.name}</Link> : route.name}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {route.confidence === "emerging" && <span className="rounded-full bg-ctp-yellow/15 px-2 py-1 text-[10px] font-medium text-ctp-yellow">Emerging</span>}
            <button type="button" onClick={onToggleCompare} aria-pressed={selected} className={`rounded-md border px-2 py-1 text-[10px] font-medium ${selected ? "border-ctp-green bg-ctp-green/10 text-ctp-green" : "border-ctp-surface1 text-ctp-subtext0 hover:border-ctp-blue hover:text-ctp-blue"}`}>{selected ? "Selected" : "Compare"}</button>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 divide-x divide-ctp-surface1 rounded-lg bg-ctp-mantle py-2 text-center">
          <div><strong className="block text-sm text-ctp-text">{route.playerCount.toLocaleString()}</strong><span className="text-[10px] text-ctp-subtext0">players</span></div>
          <div><strong className="block text-sm text-ctp-text">{route.deckCount.toLocaleString()}</strong><span className="text-[10px] text-ctp-subtext0">appearances</span></div>
          <div><strong className="block text-sm text-ctp-text">{route.buildIds.length}</strong><span className="text-[10px] text-ctp-subtext0">{route.buildIds.length === 1 ? "build" : "builds"}</span></div>
        </div>
        <div className="mt-4"><p className="text-[10px] font-semibold tracking-wider text-ctp-blue uppercase">Spirits</p><div className="mt-1.5 flex flex-wrap gap-1.5">{route.spiritBreakdown.slice(0, 4).map((spirit) => <span key={spirit.name} className="rounded-full border border-ctp-blue/25 bg-ctp-blue/5 px-2 py-1 text-xs text-ctp-subtext1">{spirit.name} <span className="text-ctp-subtext0">{spirit.playerCount}p</span></span>)}</div></div>
        <div className="mt-4"><p className="text-[10px] font-semibold tracking-wider text-ctp-mauve uppercase">Signature material cards</p><div className="mt-1.5 flex flex-wrap gap-1.5">{route.definingCards.slice(0, 4).map((card) => <span key={card.name} className="rounded-md bg-ctp-surface0 px-2 py-1 text-xs text-ctp-subtext1">{card.name} <span className="text-ctp-subtext0">{(card.prevalence * 100).toFixed(0)}%</span></span>)}</div></div>
        <div className="mt-4 border-t border-ctp-surface0 pt-3"><p className="text-[10px] font-semibold tracking-wider text-ctp-green uppercase">Main-deck builds</p><div className="mt-1.5 space-y-1">{childBuilds.slice(0, 3).map((build) => <Link key={build.id} to={`/archetypes/${build.id}`} className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-xs text-ctp-subtext1 hover:bg-ctp-surface0 hover:text-ctp-blue"><span className="truncate">{build.name}</span><span className="shrink-0 text-ctp-subtext0">{build.playerCount}p &rarr;</span></Link>)}{childBuilds.length > 3 && <p className="px-2 pt-1 text-[10px] text-ctp-subtext0">+{childBuilds.length - 3} more builds</p>}</div></div>
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
        <button type="button" onClick={onClear} className="rounded-md px-2 py-1.5 text-xs text-ctp-subtext1 hover:text-ctp-text">Clear</button>
        {selectedIds.size >= 2 ? <Link to={`/archetypes/compare?type=${kind === "archetypes" ? "route" : "build"}&ids=${Array.from(selectedIds).join(",")}`} className="rounded-md bg-ctp-blue px-3 py-1.5 text-xs font-semibold text-ctp-base hover:brightness-110">Compare selected &rarr;</Link> : <span className="rounded-md bg-ctp-surface1 px-3 py-1.5 text-xs font-semibold text-ctp-overlay1">Select one more</span>}
      </div>
    </div>
  );
}
