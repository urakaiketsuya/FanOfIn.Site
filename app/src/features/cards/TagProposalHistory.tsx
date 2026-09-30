import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Card, TagProposal } from "@gatcg/shared";
import CardResult from "../../components/CardResult";
import DialogSheet from "../../components/ui/DialogSheet";
import { accountApi } from "../../lib/accountApi";
import { tagControl } from "./tagUi";

export default function TagProposalHistory({ userId, cards }: { userId: string; cards: Card[] }) {
  const [review, setReview] = useState(false);
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<TagProposal>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["tag-proposals", userId, review, offset], queryFn: () => accountApi.tagProposals(review, offset), retry: false });
  async function decide(decision: "approved" | "rejected") {
    if (!selected) return;
    setBusy(true); setError("");
    try {
      await accountApi.reviewTagProposal(selected.id, decision);
      await Promise.all([client.invalidateQueries({ queryKey: ["tag-proposals"] }), client.invalidateQueries({ queryKey: ["card-tag-overrides"] })]);
      setSelected(undefined);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Review failed"); }
    finally { setBusy(false); }
  }
  return <section className="mt-8 border-t border-ctp-surface1 pt-4">
    <h2 className="text-lg font-semibold">{review ? "Tag review queue" : "My tag submissions"}</h2>
    {query.data?.canReview && <button className={`${tagControl} mt-2`} onClick={() => { setReview(value => !value); setOffset(0); }}>{review ? "Show my submissions" : "Review pending submissions"}</button>}
    {query.isPending && <p role="status">Loading submissions…</p>}
    {query.isError && <p role="alert">Submissions unavailable. <button className={tagControl} onClick={() => void query.refetch()}>Retry submissions</button></p>}
    <div className="mt-3 space-y-2">{query.data?.proposals.map(row => <button key={row.id} className={`${tagControl} flex w-full flex-wrap justify-between gap-2 text-left`} onClick={() => { setSelected(row); setError(""); }}><span>{row.action === "add" ? "Add" : "Remove"} {row.tag} · {row.targets.length} targets</span><span>{row.status}</span></button>)}</div>
    {query.data?.proposals.length === 0 && <p className="mt-3 text-sm">{review ? "No submissions awaiting review." : "No submissions yet."}</p>}
    <div className="mt-3 flex gap-2">{offset > 0 && <button className={tagControl} onClick={() => setOffset(value => Math.max(0, value - 50))}>Previous</button>}{query.data?.nextOffset != null && <button className={tagControl} onClick={() => setOffset(query.data!.nextOffset!)}>Next</button>}</div>
    {selected && <DialogSheet title={`${selected.action === "add" ? "Add" : "Remove"} ${selected.tag}`} onDismiss={() => setSelected(undefined)} dismissible={!busy} footer={review && selected.status === "pending" ? <div className="flex flex-wrap gap-2"><button disabled={busy} className={`${tagControl} text-ctp-blue`} onClick={() => void decide("approved")}>{busy ? "Saving…" : "Approve all targets"}</button><button disabled={busy} className={tagControl} onClick={() => void decide("rejected")}>Reject submission</button></div> : undefined}>
      <p className="mb-3 text-sm">{selected.status} · {new Date(selected.createdAt).toLocaleDateString()}</p>
      <div className="grid grid-cols-2 gap-3">{selected.targets.map(target => {
        const card = cards.find(item => item.uuid === target.cardUuid);
        const edition = card?.editions.find(item => item.uuid === target.editionUuid);
        return <CardResult key={`${target.cardUuid}:${target.editionUuid}`} card={card && edition ? { ...card, editions: [edition] } : card} name={card?.name ?? target.cardUuid} newTab><p className="text-xs">{target.editionUuid ? edition ? `${edition.set.prefix} · ${edition.collector_number}` : `Printing ${target.editionUuid}` : "All printings"}</p></CardResult>;
      })}</div>
      <h3 className="mt-4 font-semibold">Contributor’s explanation</h3><p className="whitespace-pre-wrap break-words text-sm">{selected.reason}</p>
      {review && <p className="mt-4 text-sm text-ctp-subtext0">Check the selected artwork or card text before approving. Approval updates these exact targets and may replace a previous local decision.</p>}
      {error && <p role="alert" className="mt-3 text-ctp-red">{error}</p>}
    </DialogSheet>}
  </section>;
}
