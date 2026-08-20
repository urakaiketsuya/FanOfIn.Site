import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { CardImpactRole, OmnidexDecklist } from "@gatcg/shared";
import type { ComparedDeck } from "./types";
import { useComparisonData, type ComparisonDeckStats } from "./useComparisonData";
import { useChampionCardImpact } from "../decks/useChampionCardImpact";
import { useCardsByNames } from "../events/useCardsByNames";
import CardHoverPreview from "../../components/CardHoverPreview";

const ROLE_LABEL: Record<CardImpactRole, string> = { main: "Main", material: "Material", sideboard: "Sideboard", mixed: "Mixed" };

interface TargetDeck extends ComparisonDeckStats {
  winRate: number;
  championName: string;
}

/**
 * Suggests cards for the single compared deck with the lowest known win rate — reuses
 * useChampionCardImpact (the same hook powering the Champion+Element fallback recommendation on
 * deck pages) scoped to that deck's own Champion, excluding cards already in it. No new
 * scoring/pipeline code, just wiring two already-existing pieces together.
 */
export default function ComparisonSuggestions({
  decks,
  decklists,
}: {
  decks: ComparedDeck[];
  decklists: Map<string, OmnidexDecklist | null>;
}) {
  const { deckStats } = useComparisonData(decks, decklists);

  const target = useMemo((): TargetDeck | null => {
    const known = deckStats.filter(
      (d): d is TargetDeck => d.winRate !== null && d.championName !== null,
    );
    if (known.length < 2) return null;
    const sorted = [...known].sort((a, b) => a.winRate - b.winRate);
    // A tie for lowest is ambiguous about which deck to target — say nothing rather than guess.
    if (sorted[0].winRate === sorted[1].winRate) return null;
    return sorted[0];
  }, [deckStats]);

  // `target.championName` is the specific print resolved by findDeckChampionName (e.g. "Guo Jia,
  // Heaven's Favored") — every dataset useChampionCardImpact reads is keyed by the base Champion
  // name instead (e.g. "Guo Jia"), same convention used for Spirit/paste-decklist detection
  // elsewhere in this app.
  const baseChampionName = target ? target.championName.split(",")[0].trim() : null;

  const excludeNames = useMemo(() => {
    const list = target ? decklists.get(target.key) : null;
    return list ? new Set([...list.main, ...list.material].map((l) => l.card)) : new Set<string>();
  }, [target, decklists]);

  const { cards, totalDecks } = useChampionCardImpact(baseChampionName, [], excludeNames);
  const cardsByName = useCardsByNames(useMemo(() => cards.map((c) => c.cardName), [cards]));
  const targetLabel = target ? decks.find((d) => d.key === target.key)?.label : undefined;

  if (!target || !targetLabel || cards.length === 0) return null;

  return (
    <div className="mt-6 rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4">
      <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">
        Suggestions for {targetLabel} ({(target.winRate * 100).toFixed(0)}% win rate)
      </h2>
      <p className="mt-1 text-xs text-ctp-subtext0">
        Cards from {totalDecks} other {baseChampionName} decks that tended to win more, not already in this deck —
        correlational, not a guarantee.
      </p>
      <ul className="mt-2 space-y-1">
        {cards.map((c) => {
          const card = cardsByName.get(c.cardName);
          return (
            <li key={c.cardName} className="flex flex-wrap items-center gap-1.5 text-sm">
              {card ? (
                <CardHoverPreview image={card.editions[0]?.image} alt={c.cardName}>
                  <Link to={`/cards/${card.slug}`} className="text-ctp-text hover:text-ctp-blue">
                    {c.cardName}
                  </Link>
                </CardHoverPreview>
              ) : (
                <span className="text-ctp-text">{c.cardName}</span>
              )}
              <span className="rounded-full border border-ctp-surface1 px-1.5 text-[10px] text-ctp-subtext0">{ROLE_LABEL[c.role]}</span>
              <span className="ml-auto shrink-0 text-xs text-ctp-green">+{(c.adjustedLift * 100).toFixed(0)}pp</span>
              <span className="shrink-0 text-xs text-ctp-subtext0">
                ({c.deckCountWith} with vs {c.deckCountWithout} without)
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
