import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { Card, CardImpactEntry, CardImpactRole, DeckFormat, OmnidexDecklist } from "@gatcg/shared";
import CardHoverPreview from "../../components/CardHoverPreview";
import { computeDeckIdentity } from "../../lib/deckIdentity";
import { findDeckChampionName } from "../../lib/ttsExport";
import { legalMaxCopies, pickBetterQuantity, type QuantityAdvice } from "../../lib/cardQuantityAdvice";
import { useCardImpactData, useCardQuantityStatsData } from "../archetypes/data";
import { useChampionCardImpact } from "../decks/useChampionCardImpact";
import { useCardsByNames } from "./useCardsByNames";
import Panel from "../../components/ui/Panel";
import Section from "../../components/ui/Section";

const MIN_SUGGESTED_LIFT = 0.02;
const MAX_SUGGESTIONS = 5;
const ROLE_LABEL: Record<CardImpactRole, string> = { main: "Main", material: "Material", sideboard: "Sideboard", mixed: "Mixed" };

interface QuantitySuggestion extends QuantityAdvice {
  cardName: string;
}

function QuantityRow({ suggestion, cardsByName }: { suggestion: QuantitySuggestion; cardsByName: Map<string, Card> }) {
  const card = cardsByName.get(suggestion.cardName);
  return (
    <li className="flex flex-wrap items-center gap-1.5 text-sm">
      {card ? (
        <CardHoverPreview image={card.editions[0]?.image} alt={suggestion.cardName}>
          <Link to={`/cards/${card.slug}`} className="text-ctp-text hover:text-ctp-blue">
            {suggestion.cardName}
          </Link>
        </CardHoverPreview>
      ) : (
        <span className="text-ctp-text">{suggestion.cardName}</span>
      )}
      <span className="ml-auto shrink-0 text-xs text-ctp-subtext0">
        {suggestion.optimizedFrom}x &rarr; <span className="font-semibold text-ctp-blue">{suggestion.quantity}x</span>
      </span>
      <span className="shrink-0 text-xs text-ctp-subtext0">
        ({(suggestion.adjustedWinRate * 100).toFixed(0)}% win rate, {suggestion.sampleSize} decks)
      </span>
    </li>
  );
}

function EvidenceRow({ entry, cardsByName, tone }: { entry: CardImpactEntry; cardsByName: Map<string, Card>; tone: "add" | "review" }) {
  const card = cardsByName.get(entry.cardName);
  return (
    <li className="flex flex-wrap items-center gap-1.5 text-sm">
      {card ? (
        <CardHoverPreview image={card.editions[0]?.image} alt={entry.cardName}>
          <Link to={`/cards/${card.slug}`} className="text-ctp-text hover:text-ctp-blue">
            {entry.cardName}
          </Link>
        </CardHoverPreview>
      ) : (
        <span className="text-ctp-text">{entry.cardName}</span>
      )}
      <span className="rounded-full border border-ctp-surface1 px-1.5 text-[10px] text-ctp-subtext0">{ROLE_LABEL[entry.role]}</span>
      <span className={`ml-auto shrink-0 text-xs ${tone === "add" ? "text-ctp-green" : "text-ctp-yellow"}`}>
        {entry.adjustedLift >= 0 ? "+" : ""}
        {(entry.adjustedLift * 100).toFixed(0)}pp
      </span>
      <span className="shrink-0 text-xs text-ctp-subtext0">
        ({entry.deckCountWith} with vs {entry.deckCountWithout} without)
      </span>
    </li>
  );
}

/**
 * Card-Impact tuning evidence for a decklist page, reusing the Guided Deck Builder / Compare's
 * evidence signal rather than duplicating it. Prefers the precise, pipeline-computed named-build
 * cluster (via `deckId`) when this decklist belongs to one; falls back to the Champion(+Element)
 * -scoped "might help" signal for the majority of decks that aren't part of a cluster — including
 * every saved deck in My Decks, which has no tournament `deckId` at all and previously got no
 * evidence here. Set `championFallback={false}` on a page that already has its own bespoke
 * Champion-fallback UI (`DeckDetail.tsx`'s interactive element-picker + `CardImpactTable`, the
 * "never show both" design its own comment documents) to avoid a second, redundant copy — the new
 * "cards worth reviewing" box has no such precedent anywhere and always runs. Withheld entirely for
 * Pantheon decks: the tournament pipeline this evidence is built from doesn't track that format, so
 * applying it would be misleading rather than merely absent (mirrors Compare's
 * `ComparisonSuggestions` guard).
 */
export default function DeckTuningEvidence({
  decklist,
  cardsByName,
  deckId,
  format,
  championFallback = true,
}: {
  decklist: OmnidexDecklist;
  cardsByName: Map<string, Card>;
  deckId?: string;
  format?: DeckFormat;
  championFallback?: boolean;
}) {
  const isPantheon = format === "PANTHEON";
  const cardImpactData = useCardImpactData();
  const currentNames = useMemo(
    () => new Set([...decklist.main, ...decklist.material, ...decklist.sideboard].map((line) => line.card)),
    [decklist],
  );
  const championName = useMemo(
    () => findDeckChampionName(decklist.material, cardsByName)?.split(",")[0].trim() ?? null,
    [decklist.material, cardsByName],
  );
  const identityElements = useMemo(
    () =>
      computeDeckIdentity([...decklist.main, ...decklist.material].map((line) => ({ name: line.card, quantity: line.quantity })), cardsByName).elements.filter(
        (element) => element !== "NORM",
      ),
    [decklist, cardsByName],
  );
  const noExclusions = useMemo(() => new Set<string>(), []);

  const clusterSuggestions = useMemo(() => {
    if (!deckId || !cardImpactData) return [];
    const clusterId = cardImpactData.deckClusterIndex[deckId];
    if (!clusterId) return [];
    const cluster = cardImpactData.clusters.find((c) => c.clusterId === clusterId);
    if (!cluster) return [];
    return cluster.cards.filter((c) => c.adjustedLift >= MIN_SUGGESTED_LIFT && !currentNames.has(c.cardName)).slice(0, MAX_SUGGESTIONS);
  }, [deckId, cardImpactData, currentNames]);

  const fallbackAddChampion = championFallback && !isPantheon && clusterSuggestions.length === 0 ? championName : null;
  const fallbackAdd = useChampionCardImpact(fallbackAddChampion, identityElements, currentNames, "best");
  const review = useChampionCardImpact(isPantheon ? null : championName, identityElements, noExclusions, "worst");

  const addCards =
    clusterSuggestions.length > 0
      ? clusterSuggestions
      : fallbackAdd.cards.filter((entry) => entry.adjustedLift > 0).slice(0, MAX_SUGGESTIONS);
  const reviewCards = useMemo(
    () => review.cards.filter((entry) => entry.adjustedLift < 0 && currentNames.has(entry.cardName)).slice(0, MAX_SUGGESTIONS),
    [review.cards, currentNames],
  );

  const cardQuantityStatsData = useCardQuantityStatsData();
  const quantitySuggestions = useMemo((): QuantitySuggestion[] => {
    if (!cardQuantityStatsData) return [];
    const bucketsByName = new Map(cardQuantityStatsData.cards.map((c) => [c.name, c.quantities]));
    const suggestions: QuantitySuggestion[] = [];
    for (const line of [...decklist.main, ...decklist.material, ...decklist.sideboard]) {
      const card = cardsByName.get(line.card);
      const advice = pickBetterQuantity(line.quantity, bucketsByName.get(line.card), legalMaxCopies(card));
      if (advice) suggestions.push({ ...advice, cardName: line.card });
    }
    return suggestions.sort((a, b) => b.adjustedWinRate - a.adjustedWinRate).slice(0, MAX_SUGGESTIONS);
  }, [decklist, cardsByName, cardQuantityStatsData]);

  const evidenceCardsByName = useCardsByNames(useMemo(() => [...addCards, ...reviewCards].map((entry) => entry.cardName), [addCards, reviewCards]));
  const mergedCardsByName = useMemo(() => new Map([...cardsByName, ...evidenceCardsByName]), [cardsByName, evidenceCardsByName]);

  if (isPantheon || (addCards.length === 0 && reviewCards.length === 0 && quantitySuggestions.length === 0)) return null;

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {addCards.length > 0 && (
        <Panel padding="sm">
          <Section
            heading="dense"
            title="Cards that might help"
            description={
              <>
                {clusterSuggestions.length > 0
                  ? "Decks in this build that ran these cards tended to win more."
                  : `Other ${championName} decks that ran these cards tended to win more.`}{" "}
                <Link to="/methodology#classification" className="text-ctp-blue hover:underline">Learn more</Link>
              </>
            }
          >
            <ul className="mt-2 space-y-1.5">
              {addCards.map((entry) => <EvidenceRow key={entry.cardName} entry={entry} cardsByName={mergedCardsByName} tone="add" />)}
            </ul>
          </Section>
        </Panel>
      )}
      {reviewCards.length > 0 && (
        <Panel padding="sm">
          <Section
            heading="dense"
            title="Cards worth reviewing"
            description={`Cards in this list that correlate with weaker results in other ${championName} decks. A review signal, not an automatic cut.`}
          >
            <ul className="mt-2 space-y-1.5">
              {reviewCards.map((entry) => <EvidenceRow key={entry.cardName} entry={entry} cardsByName={mergedCardsByName} tone="review" />)}
            </ul>
          </Section>
        </Panel>
      )}
      {quantitySuggestions.length > 0 && (
        <Panel padding="sm">
          <Section
            heading="dense"
            title="Quantities worth adjusting"
            description="This card's own win rate by copy count (any Champion, any deck) supports a different count than this list runs."
          >
            <ul className="mt-2 space-y-1.5">
              {quantitySuggestions.map((suggestion) => <QuantityRow key={suggestion.cardName} suggestion={suggestion} cardsByName={mergedCardsByName} />)}
            </ul>
          </Section>
        </Panel>
      )}
    </div>
  );
}
