import { computeDeckCollectionStatus, type CollectionEntry, type DeckFormat, type OmnidexDecklist } from "@gatcg/shared";
import type { ReactNode } from "react";
import { useId, useMemo, useState } from "react";
import DecklistView from "../events/DecklistView";
import DeckDecaySignals from "../events/DeckDecaySignals";
import { useCardsByNames } from "../events/useCardsByNames";
import { Link } from "react-router-dom";
import { buildDeckBuilderPath, deckBuilderParamsFromDecklist } from "../../lib/deckBuilderLink";
import DeckCollectionTools from "../collection/DeckCollectionTools";
import { useDecklistDisplayPrefs } from "../../lib/decklistDisplayPrefs";
import DisclosureChevron from "../../components/DisclosureChevron";

export default function UserDecklistPanel({ decklist, deckTitle, format, actions, children, ownerDeckId, collectionSource, showBuilderAction = true, showAnalysis = true }: { decklist: OmnidexDecklist; deckTitle?: string; format?: DeckFormat; actions?: ReactNode; children?: ReactNode; ownerDeckId?: string; collectionSource?: string; showBuilderAction?: boolean; showAnalysis?: boolean }) {
  const displayPrefs = useDecklistDisplayPrefs();
  const cardNames = useMemo(
    () => [...decklist.main, ...decklist.material, ...decklist.sideboard].map((line) => line.card),
    [decklist],
  );
  const cardsByName = useCardsByNames(cardNames);
  const builderParams = useMemo(() => deckBuilderParamsFromDecklist(decklist, cardsByName), [decklist, cardsByName]);
  const canImprove = Boolean(builderParams?.spiritFilter);
  const [showCollection, setShowCollection] = useState(false);
  const [collection, setCollection] = useState<CollectionEntry[] | null>(null);
  const [includeSideboard, setIncludeSideboard] = useState(true);
  const collectionId = useId();
  const ownershipByName = useMemo(() => {
    if (!showCollection || !collection) return undefined;
    return new Map(computeDeckCollectionStatus(decklist, collection, includeSideboard).lines.map((line) => [line.card, line]));
  }, [collection, decklist, showCollection, includeSideboard]);

  return <section data-component="UserDecklistPanel" className="mt-6">
    <h2 className="sr-only">Decklist</h2>
    {children ?? <DecklistView
      decklist={decklist} deckTitle={deckTitle} cardsByName={cardsByName} showAnalysis={showAnalysis} showThumbnails format={format} ownershipByName={ownershipByName}
      collectionControl={collectionSource && <button type="button" aria-expanded={showCollection} aria-controls={collectionId} onClick={() => { setShowCollection(value => !value); setCollection(null); setIncludeSideboard(true); }} className={`inline-flex min-h-12 items-center gap-2 rounded-md px-3 text-sm focus-visible:outline-2 focus-visible:outline-ctp-blue ${showCollection ? "bg-ctp-green/10 text-ctp-green" : "text-ctp-subtext1 hover:bg-ctp-surface0"}`}>Collection & ownership<DisclosureChevron className={showCollection ? "rotate-180" : ""} /></button>}
      collectionPanel={collectionSource && showCollection && <div id={collectionId}><DeckCollectionTools ownerDeckId={ownerDeckId} decklist={decklist} cardsByName={cardsByName} source={collectionSource} onCollectionChange={setCollection} onIncludeSideboardChange={setIncludeSideboard} /></div>}
      toolbarActions={<>{showBuilderAction && builderParams && <Link to={buildDeckBuilderPath(builderParams.championName, builderParams.spiritFilter, builderParams.lockedCards, builderParams.lockedSections, { printings: builderParams.printings, ...(canImprove && ownerDeckId ? { mode: "improve" as const, sourceDeckId: ownerDeckId } : {}) })} className="rounded px-3 py-2 text-sm text-ctp-blue hover:bg-ctp-surface0">{canImprove && ownerDeckId ? "Improve this deck" : "Tune in Deck Builder"}</Link>}{actions}</>}
    />}
    {showAnalysis && format !== "PANTHEON" && displayPrefs.metaGaps && <DeckDecaySignals decklist={decklist} cardsByName={cardsByName} />}
  </section>;
}
