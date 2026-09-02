import { Link } from "react-router-dom";
import type { Card, DeckFormat } from "@gatcg/shared";
import HypergeometricCalculator from "../HypergeometricCalculator";
import type { DeckRating, RatingPillar } from "../../../lib/deckIdentity";
import type { DeckValidationResult } from "../validateDeck";
import type { ArchetypeTuningOption, CollectionMode, PopulationSource } from "../model/builderTypes";
import Panel from "../../../components/ui/Panel";
import Section from "../../../components/ui/Section";

const PILLAR_OPTIONS: RatingPillar[] = ["durability", "interaction", "aggro", "opportunity"];

export default function ToolsPanel({
  rating,
  mainLines,
  materialLines,
  catalogByName,
  pillarBias,
  onPillarBiasChange,
  archetypeId,
  archetypeOptions,
  onArchetypeChange,
  championLevelCap,
  onChampionLevelCapChange,
  validation,
  unresolvedMain,
  deckFormat,
  populationSource,
  onChangePopulationSource,
  collectionMode,
  onCollectionModeChange,
}: {
  rating: DeckRating;
  mainLines: { name: string; quantity: number }[];
  materialLines: { name: string; quantity: number }[];
  catalogByName: Map<string, Card>;
  pillarBias: RatingPillar | null;
  onPillarBiasChange: (pillar: RatingPillar | null) => void;
  archetypeId: string | null;
  archetypeOptions: ArchetypeTuningOption[];
  onArchetypeChange: (archetypeId: string | null) => void;
  championLevelCap: number | null;
  onChampionLevelCapChange: (cap: number | null) => void;
  validation: DeckValidationResult;
  unresolvedMain: number;
  deckFormat: DeckFormat;
  populationSource: PopulationSource;
  onChangePopulationSource: (source: PopulationSource, label: string) => void;
  collectionMode: CollectionMode;
  onCollectionModeChange: (mode: CollectionMode) => void;
}) {
  return (
    <div className="mt-6">
      <Panel>
        <Section heading="dense" title="DIAO Score" actions={<span className="text-2xl font-bold text-ctp-blue">{rating.composite.toFixed(2)}</span>}>
        <div className="mt-3 space-y-2">
          {(["durability", "interaction", "aggro", "opportunity"] as RatingPillar[]).map((pillar) => (
            <div key={pillar} className="flex items-center gap-2 text-sm">
              <span className="w-24 shrink-0 capitalize text-ctp-subtext1">{pillar}</span>
              <div className="h-2 flex-1 rounded-full bg-ctp-surface0">
                <div className="h-2 rounded-full bg-ctp-blue" style={{ width: `${(rating.scores[pillar] / 10) * 100}%` }} />
              </div>
              <span className="w-6 shrink-0 text-right text-ctp-subtext0">{rating.scores[pillar]}</span>
            </div>
          ))}
        </div>
        </Section>
      </Panel>

      <details className={`mt-4 rounded-md border px-3 py-2 text-sm ${validation.status === "Legal" ? "border-ctp-green" : validation.status === "Illegal" ? "border-ctp-red" : "border-ctp-yellow"}`}>
        <summary className="flex cursor-pointer items-center justify-between gap-3">
          <span className="font-semibold">{validation.status === "Incomplete" && unresolvedMain > 0 ? `${unresolvedMain} main-deck slots remaining` : validation.status}</span>
          <span className="text-xs font-normal text-ctp-subtext0">View validation</span>
        </summary>
        {validation.reasons.length > 0 && <ul className="mt-2 list-disc pl-5 text-xs text-ctp-subtext1">{validation.reasons.slice(0, 8).map((reason) => <li key={reason}>{reason}</li>)}</ul>}
        <p className="mt-2 text-xs text-ctp-subtext0">Standard construction checks only; not tournament certification.</p>
      </details>

      <Panel className="mt-4">
        <Section
          heading="dense"
          title="Tuning"
          description="Bias the Build tab's ranked suggestions toward one DIAO Score pillar — a small nudge among cards that already clear the real win-rate bar, never a filter or override, so it never surfaces a card the data doesn't support. Applies to Tournament and Balanced data only; Community decks carry no win rates to bias."
        >
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => onPillarBiasChange(null)}
            className={`rounded-md border px-2 py-1 text-xs capitalize ${
              pillarBias === null ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            Balanced
          </button>
          {PILLAR_OPTIONS.map((pillar) => (
            <button
              key={pillar}
              type="button"
              onClick={() => onPillarBiasChange(pillar)}
              className={`rounded-md border px-2 py-1 text-xs capitalize ${
                pillarBias === pillar ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
              }`}
            >
              {pillar}
            </button>
          ))}
        </div>
        <div className="mt-4 border-t border-ctp-surface1 pt-3">
          <label htmlFor="archetype-inspiration" className="text-xs font-semibold text-ctp-subtext1">
            Build path
          </label>
          <select
            id="archetype-inspiration"
            value={archetypeId ?? ""}
            onChange={(e) => onArchetypeChange(e.target.value || null)}
            disabled={deckFormat !== "STANDARD" || archetypeOptions.length === 0}
            className="mt-1 block w-full rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-1.5 text-xs text-ctp-text disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">None — use the full Champion/Spirit evidence</option>
            {archetypeOptions.map((option) => {
              const isEstablished = option.confidence === "established";
              return (
                <option key={option.id} value={option.id}>
                  {option.routeName} → {option.name}
                  {isEstablished ? ` · ${option.deckCount} established decks` : ` · ${option.deckCount} emerging build`}
                  {option.routeDeckCount > 0 && ` (${option.routeDeckCount} route matches)`}
                </option>
              );
            })}
          </select>
          <p className="mt-1 text-[11px] text-ctp-subtext0">
            {deckFormat !== "STANDARD"
              ? "Archetype taxonomy is based on Standard tournament decklists."
              : populationSource === "community" || populationSource === "simulator"
                ? "Your choice is saved, but only affects Tournament and Balanced suggestions."
                : "Filters suggestions to decks matching this archetype's card combinations. Your Spirit selection still remains a hard boundary."}
          </p>
          <p className="mt-0.5 text-[10px] text-ctp-subtext1">
            An archetype groups decks that run similar card combinations. The "route" represents a specific play pattern within the archetype. Selecting an archetype filters suggestions toward cards commonly run in that build path.
          </p>
        </div>
        <div className="mt-4 border-t border-ctp-surface1 pt-3">
          <label htmlFor="champion-level-cap" className="text-xs font-semibold text-ctp-subtext1">Champion progression</label>
          <select
            id="champion-level-cap"
            value={championLevelCap ?? ""}
            onChange={(e) => onChampionLevelCapChange(e.target.value ? Number(e.target.value) : null)}
            className="mt-1 block w-full rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-1.5 text-xs text-ctp-text"
          >
            <option value="">Auto — use this evidence pool&apos;s common progression</option>
            <option value="1">Level 1 only</option>
            <option value="2">Up to Level 2</option>
            <option value="3">Up to Level 3</option>
          </select>
          <p className="mt-1 text-[11px] text-ctp-subtext0">This controls which Champion levels are proposed. Remove a proposed print to reject that specific version; choose a lower cap to omit higher levels entirely.</p>
        </div>
        </Section>
      </Panel>

      <div className="mt-4 flex flex-col items-start gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Data source</span>
        <p className="text-xs text-ctp-subtext0 max-w-xs">
          {populationSource === "tournament"
            ? "Real tournament win-rate data. Most reliable for meta analysis."
            : populationSource === "balanced"
              ? "Tournament win rates nudged by community popularity. Good all-rounder."
              : populationSource === "community"
                ? "Community popularity (Shout At Your Decks). No win/loss data, just play frequency."
                : "Simulator (Experimental). Community-built legal shell with card-level evidence."}
        </p>
        <div role="group" aria-label="Data source" className="inline-flex max-w-full flex-wrap rounded-md border border-ctp-surface1 bg-ctp-base p-0.5">
          <button
            type="button"
            aria-pressed={populationSource === "balanced"}
            onClick={() => onChangePopulationSource("balanced", "Balanced")}
            className={`rounded px-3 py-1 text-xs font-medium ${
              populationSource === "balanced" ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            Balanced
          </button>
          <button
            type="button"
            aria-pressed={populationSource === "tournament"}
            onClick={() => onChangePopulationSource("tournament", "Tournament")}
            className={`rounded px-3 py-1 text-xs font-medium ${
              populationSource === "tournament" ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            Tournament
          </button>
          <button
            type="button"
            aria-pressed={populationSource === "community"}
            onClick={() => onChangePopulationSource("community", "Community")}
            className={`rounded px-3 py-1 text-xs font-medium ${
              populationSource === "community" ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            Community
          </button>
          {deckFormat === "STANDARD" && <button
            type="button"
            aria-pressed={populationSource === "simulator"}
            onClick={() => onChangePopulationSource("simulator", "Simulator")}
            className={`rounded px-3 py-1 text-xs font-medium ${
              populationSource === "simulator" ? "bg-ctp-mauve text-ctp-base" : "text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            Simulator <span className="font-normal">(Experimental)</span>
          </button>}
        </div>

        <div className="w-full max-w-xs border-t border-ctp-surface1 pt-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Build from collection</span>
          <div role="group" aria-label="Build from collection" className="mt-2 inline-flex max-w-full flex-wrap rounded-md border border-ctp-surface1 bg-ctp-base p-0.5">
            {([["all", "All cards"], ["prioritize", "Prioritize owned"], ["owned-only", "Owned only"]] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={collectionMode === value}
                onClick={() => onCollectionModeChange(value)}
                className={`rounded px-3 py-1 text-xs font-medium ${collectionMode === value ? "bg-ctp-green text-ctp-base" : "text-ctp-subtext1 hover:text-ctp-text"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-ctp-subtext0">
            {collectionMode === "owned-only"
              ? "Auto-suggestions are capped to physical copies you own. Locked cards remain, and shortages stay visible as unresolved slots."
              : collectionMode === "prioritize"
                ? "Owned cards win close recommendation ties; performance evidence still leads."
                : "Suggestions draw from every legal card, regardless of what you own."}
            {" "}<Link to="/collection" className="text-ctp-blue hover:underline">Manage collection</Link>
          </p>
        </div>
      </div>

      <HypergeometricCalculator mainLines={mainLines} materialLines={materialLines} catalogByName={catalogByName} />
    </div>
  );
}
