import { useBrowseState } from "../../lib/useBrowseState";
import CardQueryInput from "../../components/CardQueryInput";
import { emptyFilterState, filterCards, searchCardPrintings } from "./filters";
import { isPreviewCard, previewCardSet } from "../../lib/previewCards";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { canonicalCardTag, cardTagKey, cardTagCategory, type Card, type CardTagLookup, type TagProposalInput, type TagTarget } from "@gatcg/shared";
import CardResult from "../../components/CardResult";
import DialogSheet from "../../components/ui/DialogSheet";
import Button from "../../components/ui/Button";
import PageLayout from "../../components/layout/PageLayout";
import { accountApi } from "../../lib/accountApi";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useCardCatalog } from "./useCardCatalog";
import { useCardTags } from "./cardTags";
import { tagAction, tagChoice, tagControl, tagGalleryUrl } from "./tagUi";
import TagCombobox, { nearDuplicateTag } from "./TagCombobox";
import { useToast } from "../../components/ui/toast/ToastContext";
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

const tagChip = "inline-flex max-w-full items-center rounded-md border px-2 py-1 text-xs break-words transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-ctp-blue";
const COLLAPSED_TAGS = 3;

function CurrentTags({ target, lookup, failed, highlight }: { target: TagTarget; lookup?: CardTagLookup; failed: boolean; highlight?: string }) {
  const [expanded, setExpanded] = useState(false);
  const tags = [...(target.editionUuid === null ? lookup?.cards.get(target.cardUuid) : lookup?.editions.get(target.editionUuid)) ?? []]
    .sort((a, b) => Number(b === highlight) - Number(a === highlight) || a.localeCompare(b));
  const shown = expanded ? tags : tags.slice(0, COLLAPSED_TAGS);
  const hidden = tags.length - shown.length;
  return <div className="mt-2 text-xs text-ctp-subtext0">
    <p>Current tags{lookup && tags.length > 0 ? ` (${tags.length})` : ""}</p>
    {!lookup ? <p>{failed ? "Tags unavailable" : "Loading tags…"}</p> : tags.length ? <ul className="mt-1 flex flex-wrap gap-1" aria-label="Current tags">
      {shown.map(tag => <li key={tag} className="max-w-full"><Link to={tagGalleryUrl(tag)} target="_blank" rel="noreferrer" className={`${tagChip} ${tag === highlight ? "border-ctp-blue bg-ctp-blue/10 font-semibold text-ctp-blue" : "border-ctp-surface1 bg-ctp-surface0 text-ctp-text"}`}>{tag === highlight && <span aria-hidden="true" className="mr-1">✓</span>}{tag}<span className="sr-only"> gallery, opens in a new tab</span></Link></li>)}
      {hidden > 0 && <li><button type="button" aria-expanded={false} className={`${tagChip} border-ctp-surface2 bg-ctp-mantle text-ctp-blue`} onClick={() => setExpanded(true)}>+{hidden}<span className="sr-only"> more tags</span></button></li>}
      {expanded && tags.length > COLLAPSED_TAGS && <li><button type="button" aria-expanded className={`${tagChip} border-ctp-surface2 bg-ctp-mantle text-ctp-blue`} onClick={() => setExpanded(false)}>Show fewer</button></li>}
    </ul> : <p>None recorded</p>}
  </div>;
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
  const [formOpen, setFormOpen] = useState(false);
  const { notify } = useToast();
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState(false);
  const client = useQueryClient();
  const cards = useCardCatalog();
  const { data, lookup, status, local } = useCardTags();
  const [lastIndex, setLastIndex] = useState<number | null>(null);
  const session = useQuery({ queryKey: ["tag-session"], queryFn: accountApi.session, retry: false });
  const gameplay = cardTagCategory(draft.tag) === "Gameplay";
  const targets = useMemo(() => [...new Map(draft.targets.map(target => {
    const value = { ...target, editionUuid: gameplay ? null : target.editionUuid };
    return [targetKey(value), value];
  })).values()], [draft.targets, gameplay]);
  const sets = useMemo(() => [...new Set(cards.flatMap(card => [...card.editions.map(edition => edition.set.prefix), ...(previewCardSet(card) ? [previewCardSet(card)!] : [])]))].sort(), [cards]);
  // Resolve the typed tag to the published spelling so lookups match case-insensitively.
  const tagName = useMemo(() => data?.tags.find(tag => cardTagKey(tag.name) === cardTagKey(draft.tag))?.name ?? "", [data, draft.tag]);
  const targetHasTag = useCallback((target: TagTarget) => {
    if (!lookup || !tagName) return false;
    const tags = gameplay || target.editionUuid === null ? lookup.cards.get(target.cardUuid) : lookup.editions.get(target.editionUuid);
    return !!tags?.has(tagName);
  }, [lookup, tagName, gameplay]);
  const showOnlyTagged = draft.action === "remove" && !!tagName;
  const rows = useMemo(() => cards.flatMap<{ card: Card; edition?: Card["editions"][number] }>(card => {
    const list: { card: Card; edition?: Card["editions"][number] }[] = isPreviewCard(card) && !card.editions.length
      ? (!set || previewCardSet(card) === set)
        && (!untagged || !lookup?.cards.get(card.uuid)?.size)
        && filterCards([card], { ...emptyFilterState(), name: search }, lookup).length
        ? [{ card }] : []
      : searchCardPrintings(card, search, lookup).filter(edition => (!set || edition.set.prefix === set) && (!untagged || !lookup?.editions.get(edition.uuid)?.size)).map(edition => ({ card, edition }));
    const filtered = showOnlyTagged ? list.filter(row => targetHasTag({ cardUuid: card.uuid, editionUuid: row.edition?.uuid ?? null })) : list;
    // A gameplay tag belongs to the card, so one tile stands for every printing.
    return gameplay ? filtered.slice(0, 1) : filtered;
  }), [cards, search, set, untagged, lookup, showOnlyTagged, targetHasTag, gameplay]);
  useEffect(() => {
    try { sessionStorage.setItem(draftKey, JSON.stringify(draft)); setStorageError(false); }
    catch { setStorageError(true); }
  }, [draft]);
  const update = (patch: Partial<Draft>) => { setDraft(value => ({ ...value, ...patch, id: crypto.randomUUID() })); setError(""); };
  const sameTile = (row: TagTarget, target: TagTarget) => gameplay ? row.cardUuid === target.cardUuid : targetKey(row) === targetKey(target);
  const isSelected = (target: TagTarget) => draft.targets.some(row => sameTile(row, target));
  const alreadyTagged = (target: TagTarget) => draft.action === "add" && targetHasTag(target);
  const visible = rows.slice(0, limit).map(({ card, edition }) => ({ card, edition, target: { cardUuid: card.uuid, editionUuid: edition?.uuid ?? null } as TagTarget }));
  function addMany(list: TagTarget[]) {
    const next = [...draft.targets];
    let skipped = 0;
    for (const target of list) {
      if (next.some(row => sameTile(row, target)) || alreadyTagged(target)) continue;
      if (next.length >= 50) { skipped++; continue; }
      next.push(target);
    }
    update({ targets: next });
    if (skipped) setError(`Only 50 can be selected. ${skipped} ${skipped === 1 ? "card was" : "cards were"} not added.`);
  }
  function toggle(target: TagTarget, index?: number, range = false) {
    if (range && lastIndex !== null && index !== undefined) {
      const [from, to] = lastIndex < index ? [lastIndex, index] : [index, lastIndex];
      addMany(visible.slice(from, to + 1).map(row => row.target));
      setLastIndex(index);
      return;
    }
    const exists = isSelected(target);
    if (!exists && alreadyTagged(target)) { notify({ tone: "info", message: `That ${gameplay ? "card" : "printing"} already has “${tagName}”.`, key: "already-tagged" }); return; }
    if (!exists && draft.targets.length >= 50) { setError("Select up to 50 cards or printings per submission."); return; }
    update({ targets: exists ? draft.targets.filter(row => !sameTile(row, target)) : [...draft.targets, target] });
    if (index !== undefined) setLastIndex(index);
  }
  async function submit() {
    setBusy(true); setError("");
    try {
      const result = await accountApi.submitTagProposal({ ...draft, tag: canonicalCardTag(draft.tag), targets });
      setDraft(value => ({ ...value, id: crypto.randomUUID(), targets: [], reason: "" }));
      notify({ message: result.proposal.status === "approved" ? "Approved and published. Tag and action are kept for the next batch." : "Submitted for review. Tag and action are kept for the next batch.", action: { label: "Tag another batch", onClick: () => { setSearch(""); setUntagged(true); setLimit(24); window.scrollTo({ top: 0, behavior: "smooth" }); } } });
      if (result.proposal.status === "approved") await local.refetch();
      setReviewOpen(false);
      await client.invalidateQueries({ queryKey: ["tag-proposals"] });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Submission failed. Your draft is preserved."); }
    finally { setBusy(false); }
  }
  const validTag = draft.tag.trim().length > 0 && draft.tag.length <= 100 && (draft.action === "add" || data?.tags.some(tag => cardTagKey(tag.name) === cardTagKey(draft.tag)));
  const missingTargets = cards.length > 0 && draft.targets.some(target => !cards.some(card => card.uuid === target.cardUuid && (target.editionUuid === null ? isPreviewCard(card) : card.editions.some(edition => edition.uuid === target.editionUuid))));
  const needsPrinting = !gameplay && draft.targets.some(target => target.editionUuid === null);
  const missing = [
    !draft.targets.length && "Select at least one card or printing",
    draft.tag.trim() ? !validTag && "Pick an existing tag to remove" : "Choose a tag",
    draft.reason.trim().length < 3 && "Add a reason (3 or more characters)",
    needsPrinting && "Previews support gameplay tags only",
    missingTargets && "Remove unavailable selections",
    !data && "Wait for tags to load",
  ].filter((item): item is string => !!item);
  const similar = draft.action === "add" && data ? nearDuplicateTag(draft.tag, data.tags) : undefined;
  const actionLabel = draft.action === "add" ? "Add" : "Remove";
  const form = <div className="space-y-4">
    <div role="radiogroup" aria-label="Action" className="flex gap-2">
      <button type="button" role="radio" aria-checked={draft.action === "add"} className={tagChoice(draft.action === "add")} onClick={() => update({ action: "add" })}>{draft.action === "add" && <span aria-hidden="true">✓</span>}Suggest a tag</button>
      <button type="button" role="radio" aria-checked={draft.action === "remove"} className={tagChoice(draft.action === "remove")} onClick={() => update({ action: "remove" })}>{draft.action === "remove" && <span aria-hidden="true">✓</span>}Report incorrect</button>
    </div>
    <TagCombobox value={draft.tag} onChange={tag => update({ tag })} tags={data?.tags ?? []} allowCreate={draft.action === "add"} />
    {similar && <p role="status" className="text-sm">A similar tag exists. <button type="button" className={`${tagAction} ml-1`} onClick={() => update({ tag: similar })}>Use “{similar}”</button></p>}
    {draft.tag && !validTag && <p role="alert" className="text-sm text-ctp-red">Choose an existing tag to remove.</p>}
    {draft.tag.trim() && <p className="rounded-lg bg-ctp-surface0 p-2 text-sm text-ctp-subtext0"><span className="font-semibold text-ctp-text">{cardTagCategory(draft.tag)}</span> · {gameplay ? `Applies to all printings of ${targets.length} distinct ${targets.length === 1 ? "card" : "cards"}. Include supporting card text below.` : "Applies only to the selected printings."}</p>}
    <label className="flex flex-col gap-1 text-sm">{draft.action === "remove" ? "Why is this tag incorrect?" : "Why does this tag fit?"}<textarea className={`${tagControl} min-h-28`} maxLength={1000} value={draft.reason} onChange={event => update({ reason: event.target.value })} /></label>
    <div>
      <p className="flex justify-between text-sm"><span>Selected</span><span className="font-semibold">{targets.length} / 50</span></p>
      <div aria-hidden="true" className="mt-1 h-2 overflow-hidden rounded-full bg-ctp-surface0"><div className="h-full rounded-full bg-ctp-blue transition-all duration-200" style={{ width: `${targets.length * 2}%` }} /></div>
      {draft.targets.length > 0 && <button type="button" className={`${tagAction} mt-2 w-full`} onClick={() => update({ targets: [] })}>Clear selection</button>}
    </div>
    <div>
      <Button variant="primary" className="w-full" disabled={missing.length > 0} aria-describedby={missing.length ? "tag-missing" : undefined} onClick={() => { setError(""); setFormOpen(false); setReviewOpen(true); }}>Review suggestion</Button>
      {missing.length > 0 && <ul id="tag-missing" className="mt-2 space-y-1 text-xs text-ctp-subtext0">{missing.map(item => <li key={item}><span aria-hidden="true">○ </span>{item}</li>)}</ul>}
    </div>
  </div>;
  return <PageLayout width="full">
    <Link className="inline-flex min-h-12 items-center text-ctp-blue" to="/cards/tags">Tag galleries</Link>
    <h1 className="text-2xl font-bold">Contribute card tags</h1>
    <p className="mt-2 text-sm text-ctp-subtext0">Select up to 50 cards or printings, then suggest a tag or request a correction. Administrator submissions publish automatically; other submissions are reviewed.</p>
    {storageError && <p role="status">Draft storage is unavailable. Keep this page open to preserve your selections.</p>}
    {!data && <p role="status" className="mt-3">{status.phase === "error" ? <>Tags unavailable. <button className={tagAction} onClick={status.retry}>Retry tags</button></> : "Loading tags…"}</p>}
    {local.isError && <p role="status" className="mt-3">Local contributions are unavailable. Imported tags are still visible. <button className={tagAction} onClick={() => void local.refetch()}>Retry contributions</button></p>}
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start lg:gap-6">
      <div className="min-w-0">
        <div className="my-4 flex flex-wrap gap-3">
          <label className="flex min-w-0 flex-col gap-1 text-sm">Find cards<CardQueryInput tagsAvailable className={tagControl} value={search} onChange={event => { const value = event.target.value; startTransition(() => { setSearch(value); setLimit(24); }); }} /></label>
          <label className="flex flex-col gap-1 text-sm">Printing set<select className={tagControl} value={set} onChange={event => { setSet(event.target.value); setLimit(24); }}><option value="">All sets</option>{sets.map(prefix => <option key={prefix}>{prefix}</option>)}</select></label>
          <label className="flex min-h-12 items-center gap-2 text-sm"><input type="checkbox" checked={untagged} disabled={!data} onChange={event => { setUntagged(event.target.checked); setLimit(24); }} />Only untagged</label>
        </div>
        {pending && <p role="status">Recalculating…</p>}
        <p className="my-3 text-sm text-ctp-subtext0">{rows.length} {gameplay ? "cards" : "results"} · {targets.length} selected. Selections stay when filters change.</p>
        {showOnlyTagged && <p role="status" className="mb-3 rounded-lg bg-ctp-surface0 p-2 text-sm">Showing only {gameplay ? "cards" : "printings"} that have “{tagName}”. Choose “Suggest a tag” to see every card.</p>}
        {gameplay && <p role="status" className="mb-3 rounded-lg bg-ctp-surface0 p-2 text-sm">Gameplay tag: one tile stands for every printing of a card.</p>}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button type="button" className={tagAction} disabled={!visible.length} onClick={() => addMany(visible.map(row => row.target))}>Select all visible ({visible.length})</button>
          <button type="button" className={tagAction} disabled={!draft.targets.length} onClick={() => update({ targets: [] })}>Clear selection</button>
          <span className="text-xs text-ctp-subtext0">Shift-click a card to select a range.</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{visible.map(({ card, edition, target }, index) => <CardResult key={targetKey(target)} card={edition ? { ...card, editions: [edition] } : card} name={card.name} selected={isSelected(target)} onSelect={event => toggle(target, index, event.shiftKey)}>
          <p className="mt-2 text-xs text-ctp-subtext0">{edition ? gameplay ? "All printings" : `${edition.set.prefix} · ${edition.collector_number}` : "Gameplay tags only"}</p>
          {alreadyTagged(target) && <p className="mt-1 text-xs font-semibold text-ctp-green"><span aria-hidden="true">✓ </span>Already tagged “{tagName}”</p>}
          <CurrentTags target={gameplay ? { ...target, editionUuid: null } : target} lookup={lookup} failed={status.phase === "error"} highlight={tagName || undefined} />
          <Link to={`/cards/${card.slug}`} target="_blank" rel="noreferrer" className="flex min-h-12 items-center text-sm text-ctp-blue">Card details<span className="sr-only"> in a new tab</span></Link>
        </CardResult>)}</div>
        {!rows.length && <p role="status" className="mt-4">{cards.length ? "No matching cards or printings. Change the filters to find more cards." : "Loading card catalog…"}</p>}
        {rows.length > limit && <button className={`${tagAction} mt-4`} onClick={() => setLimit(value => value + 24)}>Show more cards</button>}
      </div>
      <aside aria-label="Tag details" className="sticky top-4 hidden rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4 shadow-md lg:block">
        <h2 className="mb-3 text-lg font-semibold">Tag details</h2>
        {form}
      </aside>
    </div>
    <div className="sticky bottom-0 z-10 mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-ctp-surface1 bg-ctp-base p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg lg:hidden">
      <span className="min-w-0 flex-1 break-words text-sm"><span className="font-semibold">{draft.tag.trim() ? `${actionLabel} “${draft.tag.trim()}”` : "No tag chosen"}</span> · {targets.length} / 50</span>
      <button className={`${tagAction} text-ctp-blue`} onClick={() => setFormOpen(true)}>Edit tag</button>
      <Button variant="primary" disabled={missing.length > 0} onClick={() => { setError(""); setReviewOpen(true); }}>Review</Button>
    </div>
    {error && !reviewOpen && <p role="alert" className="mt-3 text-ctp-red">{error}</p>}
    {session.data?.user && <TagProposalHistory userId={session.data.user.id} cards={cards} />}
    {formOpen && <DialogSheet title="Tag details" onDismiss={() => setFormOpen(false)} footer={<Button variant="primary" className="w-full" onClick={() => setFormOpen(false)}>Done</Button>}>{form}</DialogSheet>}
    {reviewOpen && <DialogSheet title="Review tag suggestion" onDismiss={() => setReviewOpen(false)} dismissible={!busy} footer={<Button variant="primary" className="w-full" disabled={busy || !session.data?.user || missing.length > 0 || !cards.length} onClick={() => void submit()}>{busy ? "Submitting…" : `Submit ${targets.length} ${gameplay ? targets.length === 1 ? "card" : "cards" : targets.length === 1 ? "printing" : "printings"}`}</Button>}>
      <p className="text-sm"><span className="font-semibold">{actionLabel} “{draft.tag.trim()}”</span> · {cardTagCategory(draft.tag)}</p>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-ctp-subtext0">{draft.reason}</p>
      <p className="my-3 text-sm">Your draft is saved in this browser tab. Closing this review keeps it.</p>
      <div className="grid grid-cols-2 gap-3">{draft.targets.map(target => {
        const card = cards.find(row => row.uuid === target.cardUuid);
        const edition = card?.editions.find(row => row.uuid === target.editionUuid);
        return <CardResult key={targetKey(target)} card={card && edition ? { ...card, editions: [edition] } : card} name={card?.name ?? target.cardUuid} newTab><p className="text-xs">{edition ? `${edition.set.prefix} · ${edition.collector_number}` : target.editionUuid === null ? "Gameplay tags only" : "Printing unavailable"}</p><CurrentTags target={gameplay ? { ...target, editionUuid: null } : target} lookup={lookup} failed={status.phase === "error"} highlight={tagName || undefined} /><button className={`${tagAction} mt-2 w-full`} disabled={busy} onClick={() => toggle(target)}>Remove selection</button></CardResult>;
      })}</div>
      {missing.length > 0 && <ul role="alert" className="mt-3 space-y-1 text-sm text-ctp-red">{missing.map(item => <li key={item}>{item}</li>)}</ul>}
      {session.isPending && <p role="status">Checking sign-in…</p>}
      {session.isError && <p role="alert">Account unavailable. <button className={tagAction} onClick={() => void session.refetch()}>Retry account</button></p>}
      {session.data && !session.data.user && <p className="mt-3 text-sm"><Link className="inline-flex min-h-12 items-center text-ctp-blue" to="/account" target="_blank" rel="noreferrer">Sign in in a new tab</Link>, then <button className={tagAction} onClick={() => void session.refetch()}>Check sign-in</button>. Your draft stays here.</p>}
      {error && <p role="alert" className="mt-3 text-ctp-red">{error}</p>}
    </DialogSheet>}
  </PageLayout>;
}
