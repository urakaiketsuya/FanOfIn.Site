import type { Card, CollectionEntry, CollectionUpdateLine } from "@gatcg/shared";
import { Link } from "react-router-dom";
import CardArtTile from "../../components/CardArtTile";
import EditorDialog from "../../components/deck-editor/EditorDialog";

export default function CollectionChangesReview({ drafts, savedEntries, cards, busy, locked = false, notice, onRevert, onSave, onDismiss }: {
  drafts: Record<string, CollectionUpdateLine>; savedEntries: CollectionEntry[]; cards: Card[];
  busy: boolean; locked?: boolean; notice: string | null; onRevert: (key: string) => void; onSave: () => void; onDismiss: () => void;
}) {
  const rows = Object.entries(drafts).sort(([, a], [, b]) => a.cardName.localeCompare(b.cardName));
  return <EditorDialog title="Unsaved collection changes" doneLabel="Back to collection" dismissible={!busy} onDismiss={onDismiss} footer={<>    {notice && <p role="status" className="mb-4 rounded-lg bg-ctp-surface0 p-3 text-sm">{notice}</p>}{rows.length > 0 && <button type="button" disabled={busy} onClick={onSave} className="mt-4 min-h-12 w-full rounded-lg bg-ctp-blue px-3 text-sm font-semibold text-ctp-base disabled:opacity-40">{busy ? "Saving…" : locked ? "Retry save" : `Save ${rows.length} ${rows.length === 1 ? "change" : "changes"}`}</button>}</>}>
    {rows.length > 0 && <p className="mb-4 text-sm text-ctp-subtext1">Review saved quantities → new quantities. {locked ? "The last save is unconfirmed. Retry saving to confirm it before editing." : "These changes have not been saved."} Cards outside your current filters are included.</p>}

    {!rows.length ? <p role="status">No unsaved changes remain.</p> : <>
      <div className="space-y-3">{rows.map(([key, line]) => {
        const saved = savedEntries.find(entry => entry.cardUuid === line.cardUuid && (entry.editionUuid ?? null) === (line.editionUuid ?? null));
        const original = cards.find(card => card.uuid === line.cardUuid);
        const edition = original?.editions.find(edition => edition.uuid === line.editionUuid);
        const card = original && edition ? {...original, editions:[edition]} : original;
        const before = saved?.ownedQuantity ?? 0, after = line.quantity;
        const beforeProxy = saved?.proxyQuantity ?? 0, afterProxy = line.proxyQuantity ?? 0;
        return <article key={key} className="flex gap-3 rounded-xl border border-ctp-surface1 p-3">
          <div className="w-20 shrink-0">{card ? <Link to={`/cards/${card.slug}`} target="_blank" rel="noreferrer" aria-label={`Card details: ${line.cardName} (opens in a new tab)`} className="block rounded focus-visible:outline-2 focus-visible:outline-ctp-blue"><CardArtTile card={card} name={line.cardName}/></Link> : <CardArtTile card={undefined} name={line.cardName}/>}</div>
          <div className="min-w-0 flex-1"><h3 className="break-words text-sm font-semibold">{line.cardName}</h3>
            <p className="mt-1 break-words text-xs text-ctp-subtext1">{line.editionUuid ? `${edition?.set.prefix ?? line.setPrefix ?? saved?.setPrefix ?? "Specific printing"} #${edition?.collector_number ?? line.collectorNumber ?? saved?.collectorNumber ?? "?"}` : "Unspecified printing"}</p>
            <dl className="mt-3 space-y-1 text-sm"><div><dt className="inline">Owned: </dt><dd className="inline font-semibold">{before} → {after}</dd>{before !== after && <span className="ml-2 text-xs">({after > before ? "+" : ""}{after - before})</span>}</div>
              {(beforeProxy !== afterProxy || beforeProxy > 0) && <div><dt className="inline">Proxies: </dt><dd className="inline font-semibold">{beforeProxy} → {afterProxy}</dd></div>}
            </dl>
            <button type="button" disabled={busy || locked} onClick={() => onRevert(key)} aria-label={`Revert all quantity changes for ${line.cardName}`} className="mt-2 min-h-12 rounded-lg px-3 text-sm text-ctp-blue hover:bg-ctp-surface0 focus-visible:outline-2 focus-visible:outline-ctp-blue disabled:opacity-40">Revert this card’s changes</button>
          </div>
        </article>;
      })}</div>

    </>}
  </EditorDialog>;
}
