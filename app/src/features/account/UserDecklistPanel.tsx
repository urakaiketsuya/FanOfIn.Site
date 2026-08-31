import type { OmnidexDecklist } from "@gatcg/shared";
import type { ReactNode } from "react";
import { useMemo } from "react";
import DecklistView from "../events/DecklistView";
import { useCardsByNames } from "../events/useCardsByNames";

export default function UserDecklistPanel({ decklist, actions, children }: { decklist: OmnidexDecklist; actions?: ReactNode; children?: ReactNode }) {
  const cardNames = useMemo(
    () => [...decklist.main, ...decklist.material, ...decklist.sideboard].map((line) => line.card),
    [decklist],
  );
  const cardsByName = useCardsByNames(cardNames);

  return <section className="mt-6">
    <h2 className="sr-only">Decklist</h2>
    {actions && <div className="mb-4 flex justify-end">{actions}</div>}
    {children ?? <DecklistView decklist={decklist} cardsByName={cardsByName} showThumbnails />}
  </section>;
}
