import { computeDeckCollectionStatus, type CollectionEntry, type DeckFormat, type OmnidexDecklist } from "@gatcg/shared";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import DecklistView from "../events/DecklistView";
import DeckDecaySignals from "../events/DeckDecaySignals";
import { useCardsByNames } from "../events/useCardsByNames";
import { Link } from "react-router-dom";
import { buildDeckBuilderPath, deckBuilderParamsFromDecklist } from "../../lib/deckBuilderLink";
import DeckCollectionTools from "../collection/DeckCollectionTools";
import { useDecklistDisplayPrefs } from "../../lib/decklistDisplayPrefs";
import { accountApi } from "../../lib/accountApi";

export default function UserDecklistPanel({ decklist, format, actions, children, ownerDeckId, collectionSource, showBuilderAction = true, showAnalysis = true }: { decklist: OmnidexDecklist; format?: DeckFormat; actions?: ReactNode; children?: ReactNode; ownerDeckId?: string; collectionSource?: string; showBuilderAction?: boolean; showAnalysis?: boolean }) {
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
  useEffect(() => {
    // Collection comparison is useful anywhere a real decklist is shown, not only on the
    // owner's editable deck page. Signed-out requests fail quietly; signed-in viewers then get
    // the same shortage highlighting on tournament, Pantheon, and shared community lists.
    if (!showCollection || (!ownerDeckId && !collectionSource)) return;
    let active = true;
    const refresh = () => { void accountApi.collection().then((result) => { if (active) setCollection(result.entries); }).catch(() => { if (active) setCollection(null); }); };
    refresh();
    window.addEventListener("fanofin:collection-updated", refresh);
    return () => { active = false; window.removeEventListener("fanofin:collection-updated", refresh); };
  }, [collectionSource, ownerDeckId, showCollection]);
  const ownershipByName = useMemo(() => {
    if (!showCollection || !collection) return undefined;
    return new Map(computeDeckCollectionStatus(decklist, collection, true).lines.map((line) => [line.card, line]));
  }, [collection, decklist, showCollection]);

  return <section data-component="UserDecklistPanel" className="mt-6">
    <h2 className="sr-only">Decklist</h2>
    {children ?? <DecklistView
      decklist={decklist} cardsByName={cardsByName} showAnalysis={showAnalysis} showThumbnails format={format} ownershipByName={ownershipByName}
      collectionControl={collectionSource && <button type="button" aria-expanded={showCollection} onClick={() => setShowCollection((value) => !value)} className={`inline-flex min-h-11 items-center rounded-md px-3 text-xs ${showCollection ? "bg-ctp-green/10 text-ctp-green" : "text-ctp-subtext1 hover:bg-ctp-surface0"}`}>Collection</button>}
      collectionPanel={collectionSource && showCollection && <DeckCollectionTools decklist={decklist} cardsByName={cardsByName} source={collectionSource} />}
      toolbarActions={<>{showBuilderAction && builderParams && <Link to={buildDeckBuilderPath(builderParams.championName, builderParams.spiritFilter, builderParams.lockedCards, builderParams.lockedSections, canImprove && ownerDeckId ? { mode: "improve", sourceDeckId: ownerDeckId } : undefined)} className="rounded px-3 py-2 text-sm text-ctp-blue hover:bg-ctp-surface0">{canImprove && ownerDeckId ? "Improve this deck" : "Tune in Deck Builder"}</Link>}{actions}</>}
    />}
    {showAnalysis && format !== "PANTHEON" && displayPrefs.metaGaps && <DeckDecaySignals decklist={decklist} cardsByName={cardsByName} />}
  </section>;
}
