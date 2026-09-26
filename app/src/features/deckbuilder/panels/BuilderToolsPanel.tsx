import { Link } from "react-router-dom";
import type { DeckFormat } from "@gatcg/shared";
import type { ArchetypeTuningOption, CollectionMode, PopulationSource } from "../model/builderTypes";

export default function ToolsPanel({ archetypeId, archetypeOptions, onArchetypeChange, deckFormat, populationSource, onChangePopulationSource, collectionMode, onCollectionModeChange }: {
  archetypeId: string | null;
  archetypeOptions: ArchetypeTuningOption[];
  onArchetypeChange: (archetypeId: string | null) => void;
  deckFormat: DeckFormat;
  populationSource: PopulationSource;
  onChangePopulationSource: (source: PopulationSource, label: string) => void;
  collectionMode: CollectionMode;
  onCollectionModeChange: (mode: CollectionMode) => void;
}) {
  return <section className="mt-4 space-y-5 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4" aria-label="Recommendation settings">
    <div>
      <h2 className="font-semibold text-ctp-text">Recommendation settings</h2>
      <p className="mt-1 text-sm text-ctp-subtext1">These apply when you request cards. Your deck stays as you built it.</p>
    </div>
    <label className="block text-sm text-ctp-subtext1">Card evidence
      <select value={deckFormat === "PANTHEON" ? "community" : populationSource === "simulator" ? "community" : populationSource} disabled={deckFormat === "PANTHEON"} onChange={(event) => onChangePopulationSource(event.target.value as PopulationSource, event.target.selectedOptions[0].text)} className="mt-2 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-base text-ctp-text">
        <option value="balanced">Tournament + community</option><option value="tournament">Tournament decks</option><option value="community">Community decks</option>
      </select>
      <span className="mt-2 block text-xs">{deckFormat === "PANTHEON" ? "Pantheon uses community decks from its own format." : "Ranks cards by how often they appear in these decks."}</span>
    </label>
    <label className="block text-sm text-ctp-subtext1">Your collection
      <select value={collectionMode} onChange={(event) => onCollectionModeChange(event.target.value as CollectionMode)} className="mt-2 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-base text-ctp-text">
        <option value="all">All cards</option><option value="prioritize">Show owned cards first</option><option value="owned-only">Only cards I own</option>
      </select>
      <span className="mt-2 block text-xs">Owned-only suggestions use quantities from your collection. <Link to="/collection" className="inline-flex min-h-12 items-center text-ctp-blue underline">Manage collection</Link></span>
    </label>
    {deckFormat === "STANDARD" && (populationSource === "balanced" || populationSource === "tournament") && archetypeOptions.length > 0 && <label className="block text-sm text-ctp-subtext1">Archetype (optional)
      <select value={archetypeId ?? ""} onChange={(event) => onArchetypeChange(event.target.value || null)} className="mt-2 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-base text-ctp-text">
        <option value="">All matching decks</option>{archetypeOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
      </select>
    </label>}
  </section>;
}
