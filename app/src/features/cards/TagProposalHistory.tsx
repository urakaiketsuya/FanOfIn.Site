import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Card, TagProposal } from "@gatcg/shared";
import CardResult from "../../components/CardResult";
import CardArtTile from "../../components/CardArtTile";
import DialogSheet from "../../components/ui/DialogSheet";
import { accountApi, AccountApiError } from "../../lib/accountApi";
import { tagAction } from "./tagUi";

const STATUS_STYLE: Record<TagProposal["status"], { icon: string; label: string; className: string }> = {
  pending: { icon: "◷", label: "Pending", className: "bg-ctp-yellow/15 text-ctp-yellow" },
  approved: { icon: "✓", label: "Approved", className: "bg-ctp-green/15 text-ctp-green" },
  rejected: { icon: "✕", label: "Rejected", className: "bg-ctp-red/15 text-ctp-red" },
};
const THUMBNAILS = 4;

/** Status is shown with an icon and a word as well as a color. */
function StatusChip({ status }: { status: TagProposal["status"] }) {
  const style = STATUS_STYLE[status];
  return <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${style.className}`}><span aria-hidden="true">{style.icon}</span>{style.label}</span>;
}

export default function TagProposalHistory({ userId, cards, reviewOnly = false }: { userId: string; cards: Card[]; reviewOnly?: boolean }) {
  const [review, setReview] = useState(reviewOnly);
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<TagProposal>();
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set());
  const [confirming, setConfirming] = useState<"approved" | "rejected">();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["tag-proposals", userId, review, offset], queryFn: () => accountApi.tagProposals(review, offset), retry: false });
  const cardsByUuid = useMemo(() => new Map(cards.map(card => [card.uuid, card])), [cards]);
  const thumb = (target: TagProposal["targets"][number]) => {
    const card = cardsByUuid.get(target.cardUuid);
    const edition = card?.editions.find(item => item.uuid === target.editionUuid);
    return { card: card && edition ? { ...card, editions: [edition] } : card, name: card?.name ?? target.cardUuid };
  };
  const pendingRows = review ? (query.data?.proposals ?? []).filter(row => row.status === "pending") : [];
  const refresh = () => Promise.all([client.invalidateQueries({ queryKey: ["tag-proposals"] }), client.invalidateQueries({ queryKey: ["card-tag-overrides"] })]);
  async function decide(decision: "approved" | "rejected") {
    if (!selected) return;
    setBusy(true); setError("");
    try {
      await accountApi.reviewTagProposal(selected.id, decision);
      await refresh();
      setSelected(undefined);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Review failed"); }
    finally { setBusy(false); }
  }
  /** One request per proposal, in order. Failed ones stay checked so the reviewer can retry them. */
  async function decideChecked(decision: "approved" | "rejected") {
    setBusy(true); setError(""); setNotice(""); setConfirming(undefined);
    const failed = new Set<string>();
    for (const id of checked) {
      try { await accountApi.reviewTagProposal(id, decision); }
      catch { failed.add(id); }
    }
    await refresh();
    setChecked(failed);
    const done = checked.size - failed.size;
    setNotice(`${done} ${done === 1 ? "submission" : "submissions"} ${decision === "approved" ? "approved" : "rejected"}.`);
    if (failed.size) setError(`${failed.size} could not be saved. They stay selected so you can try again.`);
    setBusy(false);
  }
  function toggleChecked(id: string) {
    setConfirming(undefined);
    setChecked(current => { const next = new Set(current); if (!next.delete(id)) next.add(id); return next; });
  }
  const allChecked = pendingRows.length > 0 && pendingRows.every(row => checked.has(row.id));
  return <section className="mt-8 border-t border-ctp-surface1 pt-4">
    <h2 className="text-lg font-semibold">{review ? "Tag review queue" : "My tag submissions"}</h2>
    {!reviewOnly && query.data?.canReview && <button className={`${tagAction} mt-2`} onClick={() => { setReview(value => !value); setOffset(0); setChecked(new Set()); setConfirming(undefined); }}>{review ? "Show my submissions" : "Review pending submissions"}</button>}
    {query.isPending && <p role="status">Loading submissions…</p>}
    {query.isError && <p role="alert">{review && query.error instanceof AccountApiError && query.error.status === 403 ? "Card tag review requires a moderator or staff community role. Administrator access alone does not grant review access." : "Submissions unavailable."} <button className={tagAction} onClick={() => void query.refetch()}>Retry submissions</button></p>}
    {notice && <p role="status" className="mt-3 rounded-lg bg-ctp-surface0 p-2 text-sm">{notice}</p>}
    {error && !selected && <p role="alert" className="mt-3 text-sm text-ctp-red">{error}</p>}
    {pendingRows.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-2" role="group" aria-label="Bulk review">
      <button type="button" className={tagAction} disabled={busy} onClick={() => { setConfirming(undefined); setChecked(allChecked ? new Set() : new Set(pendingRows.map(row => row.id))); }}>{allChecked ? "Clear selection" : `Select all ${pendingRows.length} on this page`}</button>
      <span className="text-sm text-ctp-subtext0" aria-live="polite">{checked.size} selected</span>
      {confirming ? <>
        <button type="button" className={`${tagAction} ${confirming === "approved" ? "border-ctp-green text-ctp-green" : "border-ctp-red text-ctp-red"} font-semibold`} disabled={busy} onClick={() => void decideChecked(confirming)}>{busy ? "Saving…" : `Confirm: ${confirming === "approved" ? "approve" : "reject"} ${checked.size}`}</button>
        <button type="button" className={tagAction} disabled={busy} onClick={() => setConfirming(undefined)}>Cancel</button>
      </> : <>
        <button type="button" className={`${tagAction} text-ctp-green`} disabled={busy || checked.size === 0} onClick={() => setConfirming("approved")}>Approve selected</button>
        <button type="button" className={`${tagAction} text-ctp-red`} disabled={busy || checked.size === 0} onClick={() => setConfirming("rejected")}>Reject selected</button>
      </>}
    </div>}
    <ul className="mt-3 space-y-2">{query.data?.proposals.map(row => {
      const canCheck = review && row.status === "pending";
      return <li key={row.id} className="flex items-stretch gap-2">
        {canCheck && <label className="flex min-h-12 min-w-12 cursor-pointer items-center justify-center rounded-lg transition-colors duration-200 hover:bg-ctp-surface0"><input type="checkbox" className="size-5" checked={checked.has(row.id)} disabled={busy} onChange={() => toggleChecked(row.id)} /><span className="sr-only">Select {row.action === "add" ? "adding" : "removing"} {row.tag} for bulk review</span></label>}
        <button className={`${tagAction} flex min-w-0 flex-1 items-center gap-3 text-left ${checked.has(row.id) ? "border-ctp-blue bg-ctp-blue/10" : ""}`} onClick={() => { setSelected(row); setError(""); }}>
          <span className="flex shrink-0 -space-x-3" aria-hidden="true">{row.targets.slice(0, THUMBNAILS).map(target => { const item = thumb(target); return <span key={`${target.cardUuid}:${target.editionUuid}`} className="block w-9 overflow-hidden rounded ring-2 ring-ctp-mantle"><CardArtTile card={item.card} name={item.name} /></span>; })}</span>
          <span className="min-w-0 flex-1 break-words">{row.action === "add" ? "Add" : "Remove"} {row.tag} · {row.targets.length} {row.targets.length === 1 ? "target" : "targets"}{row.targets.length > THUMBNAILS && <span className="text-ctp-subtext0"> (+{row.targets.length - THUMBNAILS} more cards)</span>}</span>
          <StatusChip status={row.status} />
        </button>
      </li>;
    })}</ul>
    {query.data?.proposals.length === 0 && <p className="mt-3 text-sm">{review ? "No submissions awaiting review." : "No submissions yet."}</p>}
    <div className="mt-3 flex gap-2">{offset > 0 && <button className={tagAction} onClick={() => { setOffset(value => Math.max(0, value - 50)); setChecked(new Set()); }}>Previous</button>}{query.data?.nextOffset != null && <button className={tagAction} onClick={() => { setOffset(query.data!.nextOffset!); setChecked(new Set()); }}>Next</button>}</div>
    {selected && <DialogSheet title={`${selected.action === "add" ? "Add" : "Remove"} ${selected.tag}`} onDismiss={() => setSelected(undefined)} dismissible={!busy} footer={review && selected.status === "pending" ? <div className="flex flex-wrap gap-2"><button disabled={busy} className={`${tagAction} text-ctp-blue`} onClick={() => void decide("approved")}>{busy ? "Saving…" : "Approve all targets"}</button><button disabled={busy} className={tagAction} onClick={() => void decide("rejected")}>Reject submission</button></div> : undefined}>
      <p className="mb-3 flex flex-wrap items-center gap-2 text-sm"><StatusChip status={selected.status} />{new Date(selected.createdAt).toLocaleDateString()}</p>
      <div className="grid grid-cols-2 gap-3">{selected.targets.map(target => {
        const card = cardsByUuid.get(target.cardUuid);
        const edition = card?.editions.find(item => item.uuid === target.editionUuid);
        return <CardResult key={`${target.cardUuid}:${target.editionUuid}`} card={card && edition ? { ...card, editions: [edition] } : card} name={card?.name ?? target.cardUuid} newTab><p className="text-xs">{target.editionUuid ? edition ? `${edition.set.prefix} · ${edition.collector_number}` : `Printing ${target.editionUuid}` : "All printings"}</p></CardResult>;
      })}</div>
      <h3 className="mt-4 font-semibold">Contributor’s explanation</h3><p className="whitespace-pre-wrap break-words text-sm">{selected.reason}</p>
      {review && <p className="mt-4 text-sm text-ctp-subtext0">Check the selected artwork or card text before approving. Approval updates these exact targets and may replace a previous local decision.</p>}
      {error && <p role="alert" className="mt-3 text-ctp-red">{error}</p>}
    </DialogSheet>}
  </section>;
}
