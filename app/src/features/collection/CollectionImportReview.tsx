import { collectionEntryKey, finishLabel, type Card, type CollectionEntry, type CollectionUpdateLine } from "@gatcg/shared";
import { Link } from "react-router-dom";
import CardArtTile from "../../components/CardArtTile";
import Button from "../../components/ui/Button";
import DialogSheet from "../../components/ui/DialogSheet";

export default function CollectionImportReview({ lines, entries, savedEntries, nextDrafts, cards, blocked, onConfirm, onDismiss }: {
  lines: CollectionUpdateLine[];
  entries: CollectionEntry[];
  savedEntries: CollectionEntry[];
  nextDrafts: Record<string, CollectionUpdateLine>;
  cards: Card[];
  blocked: string | null;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  const byId = new Map(cards.map(card => [card.uuid, card]));
  const current = new Map(entries.map(entry => [collectionEntryKey(entry), entry]));
  const saved = new Map(savedEntries.map(entry => [collectionEntryKey(entry), entry]));
  const changes = lines.flatMap(line => {
    const key = collectionEntryKey(line);
    const before = current.get(key);
    const after = nextDrafts[key];
    const owned = [before?.ownedQuantity ?? 0, after?.quantity ?? saved.get(key)?.ownedQuantity ?? 0];
    const proxies = [before?.proxyQuantity ?? 0, after?.proxyQuantity ?? saved.get(key)?.proxyQuantity ?? 0];
    return owned[0] !== owned[1] || proxies[0] !== proxies[1] ? [{ key, line, owned, proxies }] : [];
  });
  return <DialogSheet title="Review collection import" dismissLabel="Back to import" onDismiss={onDismiss}
    footer={<div className="space-y-2">
      {blocked && <p role="alert" className="text-sm text-ctp-yellow">{blocked}</p>}
      <Button variant="primary" className="w-full" onClick={onConfirm} disabled={!!blocked || !changes.length}>Stage import</Button>
    </div>}>
    <p className="mb-3 text-sm text-ctp-subtext1">{changes.length ? `${changes.length} quantity ${changes.length === 1 ? "change" : "changes"}` : "These quantities already match your collection and drafts."}</p>
    <ul className="space-y-2">
      {changes.map(({ key, line, owned, proxies }) => {
        const card = byId.get(line.cardUuid);
        const art = <CardArtTile card={card} name={line.cardName} editionUuid={line.editionUuid} />;
        return <li key={key} className="flex items-start gap-3 rounded-xl border border-ctp-surface1 p-3">
          <div className="w-20 shrink-0">{card ? <Link className="block rounded focus-visible:outline-2 focus-visible:outline-ctp-blue" aria-label={`View ${line.cardName} (opens in a new tab)`} to={`/cards/${card.slug}`} target="_blank" rel="noreferrer">{art}</Link> : art}</div>
          <div className="min-w-0 break-words">
            <h3 className="font-semibold">{line.cardName}</h3>
            <p className="text-sm text-ctp-subtext1">{line.setPrefix ? `${line.setPrefix} #${line.collectorNumber}` : "Unspecified printing"} · {finishLabel(line.finish)}</p>
            <p className="mt-2 text-sm">Owned {owned[0]} → {owned[1]}</p>
            {proxies[0] !== proxies[1] && <p className="text-sm">Proxies {proxies[0]} → {proxies[1]}</p>}
          </div>
        </li>;
      })}
    </ul>
  </DialogSheet>;
}
