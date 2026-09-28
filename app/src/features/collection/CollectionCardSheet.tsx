import { Link } from "react-router-dom";
import type { Card, CollectionEntry, CollectionUpdateLine } from "@gatcg/shared";
import { useState, type ReactNode } from "react";
import CardArtTile from "../../components/CardArtTile";
import EditorDialog from "../../components/deck-editor/EditorDialog";
import DisclosureChevron from "../../components/DisclosureChevron";
import { completePlaysetLine } from "./collectionPlaysets";
export default function CollectionCardSheet({card, entries, busy, onUpdate, renderTracking, onDismiss}: {
card: Card; entries: CollectionEntry[]; busy: boolean;
onUpdate?: (lines: CollectionUpdateLine[], source: string) => Promise<void>;
renderTracking?: (uuid: string, name: string) => ReactNode; onDismiss: () => void;
}) {
const [printing, setPrinting] = useState("");
const canonical = entries.find(entry => entry.cardUuid === card.uuid && !entry.editionUuid);
const quantity = entries.filter(entry => entry.cardUuid === card.uuid).reduce((sum, entry) => sum + entry.ownedQuantity, 0);
const completionLine = completePlaysetLine(card, entries);
const update = (owned: number, proxies = canonical?.proxyQuantity ?? 0) => onUpdate?.([{cardUuid: card.uuid, cardName: card.name, quantity: Math.max(0, Math.min(9999, Math.floor(owned))), proxyQuantity: Math.max(0, Math.min(9999, Math.floor(proxies)))}], "Collection adjustment");
return ( <EditorDialog title={card.name} doneLabel="Done" onDismiss={() => onDismiss()}><div className="mx-auto w-32"><CardArtTile card={card} name={card.name}/></div><Link to={`/cards/${card.slug}`} className="flex min-h-12 items-center text-sm text-ctp-blue">Card details ↗</Link><p className="mb-3 text-sm">{quantity} physical copies · Changes stay in your quantity draft.</p>
              {completionLine && <button type="button" disabled={busy} onClick={() => void onUpdate?.([completionLine], `Complete playset: ${card.name}`)} className="w-full rounded-lg border border-ctp-surface1 px-2 text-sm">Complete playset</button>}
              <p className="mt-2 text-xs text-ctp-subtext1">Quick additions use unspecified copies. Choose a printing below to adjust tracked copies.</p><label className="mt-2 block text-xs">Unspecified copies<input aria-label={`Owned quantity for ${card.name}`} type="number" min={0} max={9999} disabled={busy} value={canonical?.ownedQuantity ?? 0} onChange={event => void update(Number(event.target.value) || 0)} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-2 text-base" /></label>
              {entries.filter(entry => entry.cardUuid === card.uuid && entry.editionUuid).map(entry => <label key={entry.editionUuid} className="mt-2 block text-xs">{entry.setPrefix} #{entry.collectorNumber}<input aria-label={`Quantity for ${entry.setPrefix} ${entry.collectorNumber}`} type="number" min={0} max={9999} disabled={busy} value={entry.ownedQuantity} onChange={event => void onUpdate?.([{cardUuid: card.uuid, cardName: card.name, editionUuid: entry.editionUuid, setPrefix: entry.setPrefix, collectorNumber: entry.collectorNumber, quantity: Math.max(0, Math.min(9999, Math.floor(Number(event.target.value) || 0))), proxyQuantity: entry.proxyQuantity}], "Printing adjustment")} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-2 text-base"/></label>)}
              <details className="mt-3"><summary className="flex min-h-12 items-center justify-between text-sm">More options<DisclosureChevron/></summary><label className="mt-2 block text-xs">Proxies<input aria-label={`Proxy quantity for ${card.name}`} type="number" min={0} max={9999} disabled={busy} value={canonical?.proxyQuantity ?? 0} onChange={event => void update(canonical?.ownedQuantity ?? 0, Number(event.target.value) || 0)} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-2 text-base" /></label>
              </details>
              <div onClick={event => { if ((event.target as HTMLElement).closest("button:not(:disabled)")) onDismiss(); }}>{renderTracking?.(card.uuid, card.name)}</div>
              <label className="mt-3 block text-sm">Add a specific printing<select aria-label="Printing to add" value={printing} onChange={event => setPrinting(event.target.value)} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-2"><option value="">Choose a printing</option>{card.editions.map(edition => <option key={edition.uuid} value={edition.uuid}>{edition.set.prefix} #{edition.collector_number} · rarity {edition.rarity}</option>)}</select></label>
              {printing && <button type="button" disabled={busy} className="mt-2 min-h-12 rounded-lg border border-ctp-surface1 px-3 text-sm" onClick={() => {const edition = card.editions.find(edition => edition.uuid === printing)!; const existing = entries.find(entry => entry.editionUuid === printing && entry.cardUuid === card.uuid); void onUpdate?.([{cardUuid: card.uuid, cardName: card.name, editionUuid: edition.uuid, setPrefix: edition.set.prefix, collectorNumber: edition.collector_number, quantity: (existing?.ownedQuantity ?? 0) + 1, proxyQuantity: existing?.proxyQuantity ?? 0}], "Printing adjustment");}}>Add one of this printing</button>}
            </EditorDialog>);
}
