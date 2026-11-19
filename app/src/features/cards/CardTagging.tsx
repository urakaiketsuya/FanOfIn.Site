import { useBrowseState } from "../../lib/useBrowseState";
import CardQueryInput from "../../components/CardQueryInput";
import { emptyFilterState, filterCards, searchCardPrintings } from "./filters";
import { isPreviewCard, previewCardSet } from "../../lib/previewCards";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { canonicalCardTag, cardTagKey, cardTagCategory, type Card, type TagProposalInput, type TagTarget } from "@gatcg/shared";
import CardResult from "../../components/CardResult";
import DialogSheet from "../../components/ui/DialogSheet";
import Button from "../../components/ui/Button";
import PageLayout from "../../components/layout/PageLayout";
import { accountApi } from "../../lib/accountApi";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useCardCatalog } from "./useCardCatalog";
import { useCardTags } from "./cardTags";
import { tagControl } from "./tagUi";
import TagProposalHistory from "./TagProposalHistory";

type Draft = TagProposalInput;
const draftKey = "community-tag-draft-v1";
const targetKey = (target: TagTarget) => `${target.cardUuid}:${target.editionUuid ?? ""}`;
function initialDraft(params: URLSearchParams): Draft {
  try {
    const raw = JSON.parse(sessionStorage.getItem(draftKey) ?? "null") as Draft | null;
    if (raw && typeof raw.tag === "string" && typeof raw.reason === "string" && (raw.action === "add" || raw.action === "remove") && Array.isArray(raw.targets) && raw.targets.length <= 50 && raw.targets.every(target => typeof target?.cardUuid === "string" && (typeof target.editionUuid === "string" || target.editionUuid === null))) return { ...raw, id: typeof raw.id === "string" ? raw.id : crypto.randomUUID() };
  } catch { /* Storage may be unavailable; manual tagging still works. */ }
  return { id: crypto.randomUUID(), tag: canonicalCardTag(params.get("tag") ?? ""), action: params.get("action") === "remove" ? "remove" : "add", reason: "", targets: params.get("card") && (params.get("edition") || params.get("card")!.startsWith("preview:")) ? [{ cardUuid: params.get("card")!, editionUuid: params.get("edition") }] : [] };
}

export default function CardTagging() {
  useDocumentTitle("Contribute card tags");
  const [params] = useSearchParams();
  const [draft, setDraft] = useState(() => initialDraft(params));
  const [search, setSearch] = useBrowseState('cards/CardTagging.search', "");
  const [set, setSet] = useBrowseState('cards/CardTagging.set', "");
  const [untagged, setUntagged] = useBrowseState('cards/CardTagging.untagged', false);
  const [limit, setLimit] = useState(24);
  const [pending, startTransition] = useTransition();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState(false);
  const client = useQueryClient();
  const cards = useCardCatalog();
  const { data, lookup, status, local } = useCardTags();
  const session = useQuery({ queryKey: ["tag-session"], queryFn: accountApi.session, retry: false });
  const gameplay = cardTagCategory(draft.tag) === "Gameplay";
  const targets = useMemo(() => [...new Map(draft.targets.map(target => {
    const value = { ...target, editionUuid: gameplay ? null : target.editionUuid };
    return [targetKey(value), value];
  })).values()], [draft.targets, gameplay]);
  const sets = useMemo(() => [...new Set(cards.flatMap(card => [...card.editions.map(edition => edition.set.prefix), ...(previewCardSet(card) ? [previewCardSet(card)!] : [])]))].sort(), [cards]);
  const rows = useMemo(() => cards.flatMap<{ card: Card; edition?: Card["editions"][number] }>(card => {
    if (isPreviewCard(card) && !card.editions.length) {
      return (!set || previewCardSet(card) === set)
        && (!untagged || !lookup?.cards.get(card.uuid)?.size)
        && filterCards([card], { ...emptyFilterState(), name: search }, lookup).length
        ? [{ card }] : [];
    }
    return searchCardPrintings(card, search, lookup).filter(edition => (!set || edition.set.prefix === set) && (!untagged || !lookup?.editions.get(edition.uuid)?.size)).map(edition => ({ card, edition }));
  }), [cards, search, set, untagged, lookup]);
  useEffect(() => {
    try { sessionStorage.setItem(draftKey, JSON.stringify(draft)); setStorageError(false); }
    catch { setStorageError(true); }
  }, [draft]);
  const update = (patch: Partial<Draft>) => { setDraft(value => ({ ...value, ...patch, id: crypto.randomUUID() })); setError(""); setNotice(""); };
  function toggle(target: TagTarget) {
    const exists = draft.targets.some(row => targetKey(row) === targetKey(target));
    if (!exists && draft.targets.length >= 50) { setError("Select up to 50 cards or printings per submission."); return; }
    update({ targets: exists ? draft.targets.filter(row => targetKey(row) !== targetKey(target)) : [...draft.targets, target] });
  }
  async function submit() {
    setBusy(true); setError("");
    try {
      const result = await accountApi.submitTagProposal({ ...draft, tag: canonicalCardTag(draft.tag), targets });
      setDraft(value => ({ ...value, id: crypto.randomUUID(), targets: [], reason: "" }));
      setNotice(result.proposal.status === "approved" ? "Approved and published." : "Submitted for review.");
      if (result.proposal.status === "approved") await local.refetch();
      setReviewOpen(false);
      await client.invalidateQueries({ queryKey: ["tag-proposals"] });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Submission failed. Your draft is preserved."); }
    finally { setBusy(false); }
  }
  const validTag = draft.tag.trim().length > 0 && draft.tag.length <= 100 && (draft.action === "add" || data?.tags.some(tag => cardTagKey(tag.name) === cardTagKey(draft.tag)));
  const missingTargets = cards.length > 0 && draft.targets.some(target => !cards.some(card => card.uuid === target.cardUuid && (target.editionUuid === null ? isPreviewCard(card) : card.editions.some(edition => edition.uuid === target.editionUuid))));
  const needsPrinting = !gameplay && draft.targets.some(target => target.editionUuid === null);
  return <PageLayout width="full">
    <Link className="inline-flex min-h-12 items-center text-ctp-blue" to="/cards/tags">Tag galleries</Link>
    <h1 className="text-2xl font-bold">Contribute card tags</h1>
    <p className="mt-2 text-sm text-ctp-subtext0">Select up to 50 cards or printings, then suggest a tag or request a correction. Administrator submissions publish automatically; other submissions are reviewed.</p>
    {notice && <p role="status" className="mt-3 rounded-xl bg-ctp-surface0 p-3">{notice}</p>}
    {storageError && <p role="status">Draft storage is unavailable. Keep this page open to preserve your selections.</p>}
    {!data && <p role="status" className="mt-3">{status.phase === "error" ? <>Tags unavailable. <button className={tagControl} onClick={status.retry}>Retry tags</button></> : "Loading tags…"}</p>}
    {local.isError && <p role="status" className="mt-3">Local contributions are unavailable. Imported tags are still visible. <button className={tagControl} onClick={() => void local.refetch()}>Retry contributions</button></p>}
    <div className="my-4 flex flex-wrap gap-3">
      <label className="flex min-w-0 flex-col gap-1 text-sm">Find cards<CardQueryInput tagsAvailable className={tagControl} value={search} onChange={event => { const value = event.target.value; startTransition(() => { setSearch(value); setLimit(24); }); }} /></label>
      <label className="flex flex-col gap-1 text-sm">Printing set<select className={tagControl} value={set} onChange={event => { setSet(event.target.value); setLimit(24); }}><option value="">All sets</option>{sets.map(prefix => <option key={prefix}>{prefix}</option>)}</select></label>
      <label className="flex min-h-12 items-center gap-2 text-sm"><input type="checkbox" checked={untagged} disabled={!data} onChange={event => { setUntagged(event.target.checked); setLimit(24); }} />Only untagged</label>
    </div>
    {pending && <p role="status">Recalculating…</p>}
    <p className="my-3 text-sm text-ctp-subtext0">{rows.length} results · {draft.targets.length} selected. Selections stay when filters change.</p>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{rows.slice(0, limit).map(({ card, edition }) => {
      const target = { cardUuid: card.uuid, editionUuid: edition?.uuid ?? null };
      return <CardResult key={targetKey(target)} card={edition ? { ...card, editions: [edition] } : card} name={card.name} selected={draft.targets.some(row => targetKey(row) === targetKey(target))} onSelect={() => toggle(target)}>
        <p className="mt-2 text-xs text-ctp-subtext0">{edition ? `${edition.set.prefix} · ${edition.collector_number}` : "Gameplay tags only"}</p>
        <Link to={`/cards/${card.slug}`} target="_blank" rel="noreferrer" className="flex min-h-12 items-center text-sm text-ctp-blue">Card details<span className="sr-only"> in a new tab</span></Link>
      </CardResult>;
    })}</div>
    {!rows.length && <p role="status" className="mt-4">{cards.length ? "No matching cards or printings. Change the filters to find more cards." : "Loading card catalog…"}</p>}
    {rows.length > limit && <button className={`${tagControl} mt-4`} onClick={() => setLimit(value => value + 24)}>Show more cards</button>}
    <div className="sticky bottom-0 z-10 mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-ctp-surface1 bg-ctp-base p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg">
      <span className="text-sm">{draft.targets.length} selected</span>
      <button className={`${tagControl} text-ctp-blue`} disabled={!draft.targets.length || !data} onClick={() => { setError(""); setReviewOpen(true); }}>Review tag suggestion</button>
    </div>
    {error && !reviewOpen && <p role="alert" className="mt-3 text-ctp-red">{error}</p>}
    {session.data?.user && <TagProposalHistory userId={session.data.user.id} cards={cards} />}
    {reviewOpen && <DialogSheet title="Review tag suggestion" onDismiss={() => setReviewOpen(false)} dismissible={!busy} footer={<Button variant="primary" className="w-full" disabled={busy || !session.data?.user || !validTag || !targets.length || missingTargets || needsPrinting || !cards.length || draft.reason.trim().length < 3} onClick={() => void submit()}>{busy ? "Submitting…" : `Submit ${targets.length} ${gameplay ? targets.length === 1 ? "card" : "cards" : targets.length === 1 ? "printing" : "printings"}`}</Button>}>
      <p className="mb-3 text-sm">Your draft is saved in this browser tab. Closing this review keeps it.</p>
      <div className="grid grid-cols-2 gap-3">{draft.targets.map(target => {
        const card = cards.find(row => row.uuid === target.cardUuid);
        const edition = card?.editions.find(row => row.uuid === target.editionUuid);
        return <CardResult key={targetKey(target)} card={card && edition ? { ...card, editions: [edition] } : card} name={card?.name ?? target.cardUuid} newTab><p className="text-xs">{edition ? `${edition.set.prefix} · ${edition.collector_number}` : target.editionUuid === null ? "Gameplay tags only" : "Printing unavailable"}</p><p className="mt-2 break-words text-xs text-ctp-subtext0">Current tags: {[...(target.editionUuid === null ? lookup?.cards.get(target.cardUuid) : lookup?.editions.get(target.editionUuid)) ?? []].join(", ") || "None recorded"}</p><button className={`${tagControl} mt-2 w-full`} disabled={busy} onClick={() => toggle(target)}>Remove selection</button></CardResult>;
      })}</div>
      <fieldset disabled={busy} className="mt-4 space-y-4">
        <label className="flex flex-col gap-1 text-sm">Action<select className={tagControl} value={draft.action} onChange={event => update({ action: event.target.value as Draft["action"] })}><option value="add">Suggest adding a tag</option><option value="remove">Report an incorrect tag</option></select></label>
        <label className="flex flex-col gap-1 text-sm">Tag<input className={tagControl} list="contribution-tags" value={draft.tag} onChange={event => update({ tag: event.target.value })} maxLength={100} placeholder="Search or suggest a tag" /><datalist id="contribution-tags">{data?.tags.map(tag => <option key={tag.name} value={tag.name} />)}</datalist></label>
        {draft.tag && !validTag && <p role="alert" className="text-sm text-ctp-red">Enter a tag, or choose an existing tag to remove.</p>}
        <p className="text-sm text-ctp-subtext0">{gameplay ? `Gameplay tag: applies to ${targets.length} distinct ${targets.length === 1 ? "card" : "cards"} across every printing. Include supporting card text below.` : "Art, character, and other tags apply only to the selected printings."}</p>
        <label className="flex flex-col gap-1 text-sm">{draft.action === "remove" ? "Why is this tag incorrect?" : "Why does this tag fit?"}<textarea className={`${tagControl} min-h-28`} maxLength={1000} value={draft.reason} onChange={event => update({ reason: event.target.value })} /></label>
      </fieldset>
      {needsPrinting && <p role="alert" className="mt-3 text-ctp-red">Previews support gameplay tags only. Choose a gameplay tag or remove the preview selections.</p>}
      {missingTargets && <p role="alert" className="mt-3 text-ctp-red">A selected card or printing is unavailable. Remove it before submitting.</p>}
      {session.isPending && <p role="status">Checking sign-in…</p>}
      {session.isError && <p role="alert">Account unavailable. <button className={tagControl} onClick={() => void session.refetch()}>Retry account</button></p>}
      {session.data && !session.data.user && <p className="mt-3 text-sm"><Link className="inline-flex min-h-12 items-center text-ctp-blue" to="/account" target="_blank" rel="noreferrer">Sign in in a new tab</Link>, then <button className={tagControl} onClick={() => void session.refetch()}>Check sign-in</button>. Your draft stays here.</p>}
      {error && <p role="alert" className="mt-3 text-ctp-red">{error}</p>}
    </DialogSheet>}
  </PageLayout>;
}
