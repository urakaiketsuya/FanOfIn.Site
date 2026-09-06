import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { Card, OmnidexDecklist } from "@gatcg/shared";
import CardHoverPreview from "../../components/CardHoverPreview";
import ElementIcon from "../../components/ElementIcon";
import { computeCardDecay } from "../../lib/cardDecay";
import { findDeckChampionName } from "../../lib/ttsExport";
import { findSpiritName, useDeckBuilderPopulation } from "../deckbuilder/useDeckBuilderPopulation";
import Panel from "../../components/ui/Panel";
import Section from "../../components/ui/Section";

/**
 * "Potential meta gaps" (the Guided Deck Builder's Stats tab decay report, `computeCardDecay`)
 * filtered down to just this decklist's own cards — this Champion's whole population trending
 * away from a card this list still runs, with its own same-effect-shape "possibly replaced by"
 * pairing where one exists. The signal is population-wide (same for every deck of this Champion,
 * not specific to this one list), and decoding that population (`useDeckBuilderPopulation`) is a
 * real cost — the same class of client-side decode `useChampionCardImpact` pays, so running both
 * on one page roughly doubles it. Callers should render this only on a dedicated single-deck page
 * (currently `DeckDetail.tsx` and `UserDecklistPanel.tsx`), not on list-of-many-decklists rows.
 */
export default function DeckDecaySignals({ decklist, cardsByName }: { decklist: OmnidexDecklist; cardsByName: Map<string, Card> }) {
  const championName = useMemo(
    () => findDeckChampionName(decklist.material, cardsByName)?.split(",")[0].trim() ?? null,
    [decklist.material, cardsByName],
  );
  const spiritName = useMemo(
    () => findSpiritName(decklist.material.map((line) => ({ name: line.card, quantity: line.quantity })), cardsByName),
    [decklist.material, cardsByName],
  );
  const currentNames = useMemo(
    () => new Set([...decklist.main, ...decklist.material, ...decklist.sideboard].map((line) => line.card)),
    [decklist],
  );
  const { rows, loading } = useDeckBuilderPopulation(championName);
  const report = useMemo(() => (loading ? null : computeCardDecay(rows, spiritName, cardsByName)), [rows, loading, spiritName, cardsByName]);
  const signals = useMemo(() => report?.signals.filter((signal) => currentNames.has(signal.cardName)) ?? [], [report, currentNames]);

  if (signals.length === 0) return null;

  return (
    <Panel data-component="DeckDecaySignals" padding="sm" className="mt-4">
      <Section
        heading="dense"
        title="Potential meta gaps"
        description={`Cards in this list whose adoption among other ${championName} decks fell over the last ${report!.recentDeckCount} decks vs. the ${report!.priorDeckCount} before that — a lead to investigate, not proof the card is underplayed.`}
      >
      <ul className="mt-2 space-y-2">
        {signals.map((signal) => {
          const card = cardsByName.get(signal.cardName);
          const replacementCard = signal.replacement ? cardsByName.get(signal.replacement.cardName) : undefined;
          return (
            <li key={signal.cardName} className="text-sm">
              <div className="flex flex-wrap items-center gap-1.5">
                {card && card.element !== "NORM" && <ElementIcon element={card.element} size={14} />}
                {card ? (
                  <CardHoverPreview image={card.editions[0]?.image} alt={signal.cardName}>
                    <Link to={`/cards/${card.slug}`} className="text-ctp-text hover:text-ctp-blue">
                      {signal.cardName}
                    </Link>
                  </CardHoverPreview>
                ) : (
                  <span className="text-ctp-text">{signal.cardName}</span>
                )}
                <span className="ml-auto shrink-0 text-xs text-ctp-yellow">
                  -{(signal.decay * 100).toFixed(0)}pp adoption
                </span>
                <span className="shrink-0 text-xs text-ctp-subtext0">
                  ({(signal.adjustedWinRate * 100).toFixed(0)}% win rate, {signal.deckCount} decks)
                </span>
              </div>
              {signal.replacement && (
                <p className="mt-0.5 text-xs text-ctp-subtext0">
                  Possibly replaced by{" "}
                  {replacementCard && replacementCard.element !== "NORM" && <ElementIcon element={replacementCard.element} size={14} className="inline-block align-text-bottom" />}{" "}
                  {replacementCard ? (
                    <Link to={`/cards/${replacementCard.slug}`} className="text-ctp-text hover:text-ctp-blue">
                      {signal.replacement.cardName}
                    </Link>
                  ) : (
                    <span className="text-ctp-text">{signal.replacement.cardName}</span>
                  )}{" "}
                  (+{(signal.replacement.rise * 100).toFixed(0)}pp) — not proof of a swap.
                </p>
              )}
            </li>
          );
        })}
      </ul>
      </Section>
    </Panel>
  );
}
