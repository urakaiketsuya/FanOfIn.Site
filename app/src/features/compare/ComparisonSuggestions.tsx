import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { Card, CardImpactEntry, CardImpactRole, OmnidexDecklist } from "@gatcg/shared";
import type { ComparedDeck } from "./types";
import { useComparisonData, type ComparisonDeckStats } from "./useComparisonData";
import { useChampionCardImpact } from "../decks/useChampionCardImpact";
import { useCardsByNames } from "../events/useCardsByNames";
import CardHoverPreview from "../../components/CardHoverPreview";

const ROLE_LABEL: Record<CardImpactRole, string> = { main: "Main", material: "Material", sideboard: "Sideboard", mixed: "Mixed" };

interface KnownDeck extends ComparisonDeckStats {
  winRate: number;
  championName: string;
}

function SuggestionList({ cards, cardsByName, sign }: { cards: CardImpactEntry[]; cardsByName: Map<string, Card>; sign: "positive" | "negative" }) {
  return (
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
            <span className={`ml-auto shrink-0 text-xs ${sign === "positive" ? "text-ctp-green" : "text-ctp-red"}`}>
              {c.adjustedLift >= 0 ? "+" : ""}
              {(c.adjustedLift * 100).toFixed(0)}pp
            </span>
            <span className="shrink-0 text-xs text-ctp-subtext0">
              ({c.deckCountWith} with vs {c.deckCountWithout} without)
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Two lenses on the compared set, both built from useChampionCardImpact (the same hook powering
 * the Champion+Element fallback recommendation on deck pages) — no new scoring/pipeline code:
 * "help" for the lowest-win-rate deck (cards that correlate with its own Champion winning more,
 * not already in it), and "hurt" for the highest-win-rate deck (cards that correlate with *its*
 * Champion winning *less* — tech ideas against them, not already in their own list).
 */
export default function ComparisonSuggestions({
  decks,
  decklists,
}: {
  decks: ComparedDeck[];
  decklists: Map<string, OmnidexDecklist | null>;
}) {
  const { deckStats } = useComparisonData(decks, decklists);

  const known = useMemo(
    () => deckStats.filter((d): d is KnownDeck => d.winRate !== null && d.championName !== null),
    [deckStats],
  );

  // A tie for lowest/highest is ambiguous about which deck to target — say nothing for that side
  // rather than guess.
  const target = useMemo(() => {
    if (known.length < 2) return null;
    const sorted = [...known].sort((a, b) => a.winRate - b.winRate);
    return sorted[0].winRate === sorted[1].winRate ? null : sorted[0];
  }, [known]);
  const opponent = useMemo(() => {
    if (known.length < 2) return null;
    const sorted = [...known].sort((a, b) => b.winRate - a.winRate);
    if (sorted[0].winRate === sorted[1].winRate) return null;
    // Same deck can't be both the worst and the best performer (only possible if every known deck
    // is tied, which the checks above already rule out) — guarded anyway for safety.
    return sorted[0].key === target?.key ? null : sorted[0];
  }, [known, target]);

  // `championName` is the specific print resolved by findDeckChampionName (e.g. "Guo Jia, Heaven's
  // Favored") — every dataset useChampionCardImpact reads is keyed by the base Champion name
  // instead (e.g. "Guo Jia"), same convention used for Spirit/paste-decklist detection elsewhere.
  const targetChampion = target ? target.championName.split(",")[0].trim() : null;
  const opponentChampion = opponent ? opponent.championName.split(",")[0].trim() : null;

  const targetExclude = useMemo(() => {
    const list = target ? decklists.get(target.key) : null;
    return list ? new Set([...list.main, ...list.material].map((l) => l.card)) : new Set<string>();
  }, [target, decklists]);
  const opponentExclude = useMemo(() => {
    const list = opponent ? decklists.get(opponent.key) : null;
    return list ? new Set([...list.main, ...list.material].map((l) => l.card)) : new Set<string>();
  }, [opponent, decklists]);

  const help = useChampionCardImpact(targetChampion, [], targetExclude, "best");
  const hurt = useChampionCardImpact(opponentChampion, [], opponentExclude, "worst");
  const cardsByName = useCardsByNames(
    useMemo(() => [...help.cards, ...hurt.cards].map((c) => c.cardName), [help.cards, hurt.cards]),
  );

  const targetLabel = target ? decks.find((d) => d.key === target.key)?.label : undefined;
  const opponentLabel = opponent ? decks.find((d) => d.key === opponent.key)?.label : undefined;

  if (!target || !targetLabel) {
    return (
      <p className="text-sm text-ctp-subtext1">
        Suggestions need at least two decks with a known win rate (real tournament sightings, not pasted decks) and
        no tie for lowest — add another sighting deck to see this.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">
          Suggestions for {targetLabel} ({(target.winRate * 100).toFixed(0)}% win rate)
        </h2>
        {help.cards.length > 0 ? (
          <>
            <p className="mt-1 text-xs text-ctp-subtext0">
              Cards from {help.totalDecks} other {targetChampion} decks that tended to win more, not already in this
              deck — correlational, not a guarantee.
            </p>
            <SuggestionList cards={help.cards} cardsByName={cardsByName} sign="positive" />
          </>
        ) : (
          <p className="mt-1 text-sm text-ctp-subtext1">
            No card clears the sample bar for a useful suggestion against {targetLabel}'s Champion yet.
          </p>
        )}
      </div>

      {opponent && opponentLabel && (
        <div>
          <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">
            Cards that hurt {opponentLabel} ({(opponent.winRate * 100).toFixed(0)}% win rate)
          </h2>
          {hurt.cards.length > 0 ? (
            <>
              <p className="mt-1 text-xs text-ctp-subtext0">
                Cards from {hurt.totalDecks} other {opponentChampion} decks that correlate with a *lower* win rate
                when included, not already in {opponentLabel}'s list — tech ideas to watch for or play around,
                correlational, not a guarantee.
              </p>
              <SuggestionList cards={hurt.cards} cardsByName={cardsByName} sign="negative" />
            </>
          ) : (
            <p className="mt-1 text-sm text-ctp-subtext1">
              No card clears the sample bar for this against {opponentLabel}'s Champion yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
