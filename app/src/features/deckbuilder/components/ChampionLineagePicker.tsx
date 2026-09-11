import { useMemo } from "react";
import type { Card, DeckFormat } from "@gatcg/shared";
import type { SuggestedCard } from "../useSuggestedBuild";

interface LineageLevel {
  level: number;
  candidates: Card[];
  selected: Card | null;
  explicitlySelected: boolean;
}

function identityName(name: string): string {
  return name.includes(",") ? name.split(",")[0].trim() : name;
}

function printName(name: string): string {
  return name.includes(",") ? name.slice(name.indexOf(",") + 1).trim() : name;
}

function isLegalInFormat(card: Card, format: DeckFormat): boolean {
  return card.legality?.[format]?.limit !== 0;
}

function deriveLineageLevels(
  championName: string,
  cardsByName: ReadonlyMap<string, Card>,
  material: readonly SuggestedCard[],
  lockedCards: ReadonlyMap<string, number>,
  format: DeckFormat,
): LineageLevel[] {
  const candidatesByLevel = new Map<number, Card[]>();
  for (const card of cardsByName.values()) {
    if (!card.types.includes("CHAMPION") || card.subtypes.includes("SPIRIT") || card.level == null) continue;
    if (identityName(card.name) !== championName || !isLegalInFormat(card, format)) continue;
    const candidates = candidatesByLevel.get(card.level) ?? [];
    candidates.push(card);
    candidatesByLevel.set(card.level, candidates);
  }

  const materialNames = new Set(material.map((card) => card.cardName));
  return Array.from(candidatesByLevel, ([level, candidates]) => {
    candidates.sort((a, b) => a.name.localeCompare(b.name));
    const explicitlySelected = candidates.find((card) => lockedCards.has(card.name)) ?? null;
    const suggested = candidates.find((card) => materialNames.has(card.name)) ?? null;
    return { level, candidates, selected: explicitlySelected ?? suggested, explicitlySelected: explicitlySelected !== null };
  }).sort((a, b) => a.level - b.level);
}

export default function ChampionLineagePicker({
  championName,
  cardsByName,
  material,
  lockedCards,
  format,
  onSelect,
  onUseSuggested,
}: {
  championName: string;
  cardsByName: ReadonlyMap<string, Card>;
  material: readonly SuggestedCard[];
  lockedCards: ReadonlyMap<string, number>;
  format: DeckFormat;
  onSelect: (cardName: string) => void;
  onUseSuggested: (level: number) => void;
}) {
  const levels = useMemo(
    () => deriveLineageLevels(championName, cardsByName, material, lockedCards, format),
    [championName, cardsByName, material, lockedCards, format],
  );
  const branchingLevels = levels.filter((level) => level.candidates.length > 1);
  if (branchingLevels.length === 0) return null;

  const summary = levels
    .filter((level) => level.selected)
    .map((level) => `L${level.level} ${printName(level.selected!.name)}`)
    .join(" · ");

  return (
    <details data-component="ChampionLineagePicker" className="mt-3 rounded-lg border border-ctp-surface1 bg-ctp-mantle">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5">
        <span className="min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-ctp-subtext0">Champion lineage</span>
          <span className="mt-0.5 block truncate text-xs text-ctp-text">{summary || "Suggested path is loading…"}</span>
        </span>
        <span className="shrink-0 text-xs font-medium text-ctp-blue">Change <span aria-hidden="true">▾</span></span>
      </summary>

      <div className="border-t border-ctp-surface1 px-3 py-3">
        <p className="text-xs text-ctp-subtext1">Choose one Champion print at each branching level. Fixed levels stay compact; your choices are kept in the Material deck.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {levels.map((lineageLevel) => {
            const hasChoice = lineageLevel.candidates.length > 1;
            return (
              <fieldset key={lineageLevel.level} className="min-w-0">
                <legend className="mb-1.5 flex w-full items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wide text-ctp-subtext0">
                  <span>Level {lineageLevel.level}</span>
                  <span className={hasChoice ? "text-ctp-blue" : undefined}>{hasChoice ? `${lineageLevel.candidates.length} paths` : "Fixed"}</span>
                </legend>
                <div className="space-y-1.5">
                  {lineageLevel.candidates.map((card) => {
                    const selected = lineageLevel.selected?.name === card.name;
                    return (
                      <button
                        key={card.name}
                        type="button"
                        aria-pressed={selected}
                        disabled={!hasChoice}
                        onClick={() => onSelect(card.name)}
                        className={`flex min-h-11 w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left text-xs ${selected ? "border-ctp-blue bg-ctp-blue/10 text-ctp-text" : "border-ctp-surface1 bg-ctp-base text-ctp-subtext1 enabled:hover:border-ctp-blue enabled:hover:text-ctp-text disabled:cursor-default"}`}
                      >
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded text-[10px] font-bold ${selected ? "bg-ctp-blue text-ctp-base" : "bg-ctp-surface0 text-ctp-subtext0"}`}>L{lineageLevel.level}</span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{printName(card.name)}</span>
                          {selected && <span className="mt-0.5 block text-[10px] text-ctp-subtext0">{lineageLevel.explicitlySelected ? "Your choice" : "Suggested"}</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {hasChoice && lineageLevel.explicitlySelected && (
                  <button type="button" onClick={() => onUseSuggested(lineageLevel.level)} className="mt-1.5 text-[11px] text-ctp-blue hover:underline">Use suggested Level {lineageLevel.level} print</button>
                )}
              </fieldset>
            );
          })}
        </div>
      </div>
    </details>
  );
}
