import { useState } from "react";
import type { Card } from "@gatcg/shared";
import CardResult from "../../components/CardResult";
import Button from "../../components/ui/Button";
import DialogSheet from "../../components/ui/DialogSheet";
import { buildTcgplayerMassEntryUrl } from "../../lib/tcgplayerMassEntry";
import { formatUsd } from "../../lib/format";
import { shoppingBatches } from "./collectionShopping";

/** Shared presentation; each controller keeps its own save/draft and retry semantics. */
export default function MissingCardsReview({ lines, cardsByName, onDismiss, onAdd, busy = false, blocked, error, draft = false, estimatedCost }: {
  lines: { card: string; missing: number }[]; cardsByName: ReadonlyMap<string, Card>;
  onDismiss: () => void; onAdd: () => void; busy?: boolean; blocked?: string; error?: string | null; draft?: boolean; estimatedCost?: number;
}) {
  const [query, setQuery] = useState("");
  const copies = lines.reduce((sum, line) => sum + line.missing, 0);
  const visible = lines.filter(line => line.card.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const batches = shoppingBatches(lines.map(line => ({ name: line.card, quantity: line.missing })));
  return <DialogSheet title="Shop missing cards" onDismiss={onDismiss} dismissible={!busy} footer={<div className="space-y-2">
    {error && <p role="alert" className="text-sm text-ctp-red">{error}</p>}
    {batches.length === 1 && <ShopLink lines={batches[0]} />}
    <Button variant="primary" className="w-full" disabled={busy || !!blocked || !lines.length} onClick={onAdd}>{busy ? "Adding…" : draft ? "Add missing copies to draft" : "Add missing copies to collection"}</Button>
  </div>}>
    <p className="mb-3 text-sm text-ctp-subtext1">Shop for these cards, then add them when you have them. Opening the shop leaves your collection unchanged.{draft && " Additions join your quantity draft; use Save quantities to save them."}</p>
    {blocked && <p role="status" className="mb-3 text-sm text-ctp-yellow">{blocked}</p>}
    {!lines.length ? <p role="status">Your {draft ? "saved quantities and draft" : "collection"} already cover this list.</p> : <>
      <p className="mb-3 text-sm">{copies} missing {copies === 1 ? "copy" : "copies"} across {lines.length} {lines.length === 1 ? "card" : "cards"}{estimatedCost ? ` · about ${formatUsd(estimatedCost)}` : ""}.</p>
      {batches.length > 1 && <div className="mb-3 space-y-2"><p className="text-sm">Open each of these {batches.length} shopping batches to include every card.</p><div className="flex flex-wrap gap-2">{batches.map((batch, index) => <ShopLink key={index} lines={batch} batch={index + 1} />)}</div></div>}
      <label className="mb-3 block text-sm">Find a missing card<input type="search" value={query} onChange={event => setQuery(event.target.value)} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 text-base focus-visible:outline-2 focus-visible:outline-ctp-blue" /></label>
      {query && <p role="status" className="mb-3 text-xs text-ctp-subtext1">Showing {visible.length} of {lines.length} cards. Shopping and adding include the full missing list.</p>}
      <div className="grid grid-cols-2 items-start gap-3">{visible.map(line => <CardResult key={line.card} card={cardsByName.get(line.card)} name={line.card} newTab><p className="text-sm">{line.missing}× missing</p></CardResult>)}</div>
      {!visible.length && <p className="my-3 text-sm">No missing cards match your search.</p>}
      <p className="mt-3 text-xs text-ctp-subtext1">Adding fills only the missing physical copies as unspecified printings. Existing printings, extra copies, and proxies are preserved.{!draft && " You can undo the update."}</p>
    </>}
  </DialogSheet>;
}
function ShopLink({ lines, batch }: { lines: { name: string; quantity: number }[]; batch?: number }) {
  return <a href={buildTcgplayerMassEntryUrl(lines)} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-lg px-3 text-sm text-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue">Shop on TCGplayer{batch ? ` · batch ${batch}` : ""} ↗</a>;
}
