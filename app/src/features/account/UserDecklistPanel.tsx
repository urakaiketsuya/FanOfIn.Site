import type { DeckFormat, OmnidexDecklist } from "@gatcg/shared";
import type { ReactNode } from "react";
import { useMemo } from "react";
import DecklistView from "../events/DecklistView";
import DeckDecaySignals from "../events/DeckDecaySignals";
import { useCardsByNames } from "../events/useCardsByNames";
import { Link } from "react-router-dom";
import { buildDeckBuilderPath, deckBuilderParamsFromDecklist } from "../../lib/deckBuilderLink";
import DeckCollectionTools from "../collection/DeckCollectionTools";
import { useDecklistEvidencePrefs } from "../../lib/decklistEvidencePrefs";

export default function UserDecklistPanel({ decklist, format, actions, children, ownerDeckId, collectionSource }: { decklist: OmnidexDecklist; format?: DeckFormat; actions?: ReactNode; children?: ReactNode; ownerDeckId?: string; collectionSource?: string }) {
  const evidencePrefs = useDecklistEvidencePrefs();
  const cardNames = useMemo(
    () => [...decklist.main, ...decklist.material, ...decklist.sideboard].map((line) => line.card),
    [decklist],
  );
  const cardsByName = useCardsByNames(cardNames);
  const builderParams = useMemo(() => deckBuilderParamsFromDecklist(decklist, cardsByName), [decklist, cardsByName]);
  const canImprove = Boolean(builderParams?.spiritFilter);

  return <section className="mt-6">
    <h2 className="sr-only">Decklist</h2>
    {(actions || builderParams) && <div className="mb-4 flex flex-wrap justify-end gap-2">{builderParams && <Link to={buildDeckBuilderPath(builderParams.championName, builderParams.spiritFilter, builderParams.lockedCards, builderParams.lockedSections, canImprove && ownerDeckId ? { mode: "improve", sourceDeckId: ownerDeckId } : undefined)} className="rounded border border-ctp-blue px-2 py-1 text-xs text-ctp-blue">{canImprove && ownerDeckId ? "Improve this deck" : "Tune in Deck Builder"}</Link>}{ownerDeckId && !canImprove && <span className="self-center text-xs text-ctp-subtext0">Choose a Spirit in the decklist to unlock improvement review.</span>}{actions}</div>}
    {collectionSource && <div className="mb-4"><DeckCollectionTools decklist={decklist} cardsByName={cardsByName} source={collectionSource} /></div>}
    {children ?? <DecklistView decklist={decklist} cardsByName={cardsByName} showThumbnails format={format} showMetaGapsToggle={format !== "PANTHEON"} />}
    {format !== "PANTHEON" && evidencePrefs.metaGaps && <DeckDecaySignals decklist={decklist} cardsByName={cardsByName} />}
  </section>;
}
