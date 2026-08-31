import type { OmnidexDecklist } from "@gatcg/shared";
import type { ReactNode } from "react";
import { useMemo } from "react";
import DecklistView from "../events/DecklistView";
import { useCardsByNames } from "../events/useCardsByNames";
import { Link } from "react-router-dom";
import { buildDeckBuilderPath, deckBuilderParamsFromDecklist } from "../../lib/deckBuilderLink";
import DeckCollectionTools from "../collection/DeckCollectionTools";

export default function UserDecklistPanel({ decklist, actions, children, ownerDeckId, collectionSource }: { decklist: OmnidexDecklist; actions?: ReactNode; children?: ReactNode; ownerDeckId?: string; collectionSource?: string }) {
  const cardNames = useMemo(
    () => [...decklist.main, ...decklist.material, ...decklist.sideboard].map((line) => line.card),
    [decklist],
  );
  const cardsByName = useCardsByNames(cardNames);
  const builderParams = useMemo(() => deckBuilderParamsFromDecklist(decklist, cardsByName), [decklist, cardsByName]);

  return <section className="mt-6">
    <h2 className="sr-only">Decklist</h2>
    {(actions || builderParams) && <div className="mb-4 flex flex-wrap justify-end gap-2">{builderParams && <Link to={buildDeckBuilderPath(builderParams.championName, builderParams.spiritFilter, builderParams.lockedCards, builderParams.lockedSections, ownerDeckId ? { mode: "improve", sourceDeckId: ownerDeckId } : undefined)} className="rounded border border-ctp-blue px-2 py-1 text-xs text-ctp-blue">{ownerDeckId ? "Improve this deck" : "Tune in Deck Builder"}</Link>}{actions}</div>}
    {children ?? <DecklistView decklist={decklist} cardsByName={cardsByName} showThumbnails />}
    {collectionSource && <DeckCollectionTools decklist={decklist} cardsByName={cardsByName} source={collectionSource} />}
  </section>;
}
