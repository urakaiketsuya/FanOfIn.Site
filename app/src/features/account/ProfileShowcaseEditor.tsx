import { Link } from "react-router-dom";
import DeckPreviewCard from "../../components/DeckPreviewCard";
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { AccountUser, ProfileShowcase, PublicDeckSummary } from "@gatcg/shared";
import { accountApi } from "../../lib/accountApi";
import { db } from "../../lib/db";
import DialogSheet from "../../components/ui/DialogSheet";
import Button from "../../components/ui/Button";
import CardResult from "../../components/CardResult";
import { InlineState } from "../../components/ui/ContentState";
import { useToast } from "../../components/ui/toast/ToastContext";

export default function ProfileShowcaseEditor({ user, onDismiss }: { user: AccountUser; onDismiss: () => void }) {
  const [saved, setSaved] = useState<ProfileShowcase>();
  const [draft, setDraft] = useState<ProfileShowcase>();
  const [decks, setDecks] = useState<PublicDeckSummary[]>([]);
  const [query, setQuery] = useState("");
  const [deckQuery, setDeckQuery] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [confirmReload, setConfirmReload] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { notify } = useToast();
  const catalog = useLiveQuery(() => db.cards.toArray(), []);
  useEffect(() => {
    let active = true;
    void Promise.all([accountApi.showcase(), accountApi.bookmarks(), user.profileDiscoverable ? accountApi.publicProfile(user.profileSlug) : Promise.resolve({ profile: null })]).then(([result, bookmarks, own]) => {
      if (!active) return;
      setSaved(result.showcase); setDraft(result.showcase); setError(undefined);
      setDecks([...new Map([...bookmarks.decks.filter(deck => deck.visibility === "public"), ...(own.profile?.decks ?? []), ...(own.profile?.featuredDecks ?? [])].map(deck => [deck.publicSlug, deck])).values()]);
    }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Showcase could not be loaded"); });
    return () => { active = false; };
  }, [user.profileSlug, user.profileDiscoverable, attempt]);
  const dirty = JSON.stringify(saved) !== JSON.stringify(draft);
  function toggle(key: "cardIds" | "deckSlugs", id: string, max: number) {
    if (!draft) return;
    const values = draft[key];
    if (!values.includes(id) && values.length >= max) { setError(`Choose up to ${max} ${key === "cardIds" ? "cards" : "decks"}. Remove one first.`); return; }
    setError(undefined); setDraft({ ...draft, [key]: values.includes(id) ? values.filter(value => value !== id) : [...values, id] });
  }
  async function save() {
    if (!draft) return;
    setBusy(true); setError(undefined);
    try { const result = await accountApi.saveShowcase(draft); setSaved(result.showcase); setDraft(result.showcase); notify({ tone: "success", message: "Profile showcase saved." }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Your showcase could not be saved. Your selections are kept."); }
    finally { setBusy(false); }
  }
  const matches = (catalog ?? []).filter(card => card.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 12);
  return <DialogSheet title="Your profile showcase" onDismiss={onDismiss} dirty={dirty} dismissible={!busy} footer={<><p className="mb-2 text-xs text-ctp-subtext1">{draft?.cardIds.length ?? 0}/6 cards · {draft?.deckSlugs.length ?? 0}/3 decks{dirty ? " · Unsaved changes" : ""}</p>{error && <InlineState tone="danger" className="mb-2">{error}</InlineState>}<div className="flex flex-wrap gap-2"><Button variant="primary" disabled={!draft || !dirty || busy} onClick={() => void save()}>{busy ? "Saving…" : "Save showcase"}</Button>{error && <Button disabled={busy} onClick={() => { if (dirty && !confirmReload) { setConfirmReload(true); return; } setConfirmReload(false); setAttempt(value => value + 1); }}>{confirmReload ? "Discard draft and reload" : "Reload saved showcase"}</Button>}</div></>}>
    {!draft ? <InlineState>Loading showcase…</InlineState> : <fieldset disabled={busy}>
      <p className="text-sm text-ctp-subtext1">Choose what visitors see. Your other favorites remain private. Selections appear in the order you choose them.</p>
      {!user.profileDiscoverable && <InlineState className="mt-3">Your profile is hidden. Enable profile discovery in Account to share your showcase.</InlineState>}
      <h3 className="mt-5 text-lg font-semibold">Favorite cards</h3>
      <div className="mt-3 grid grid-cols-2 gap-3">{draft.cardIds.map(id => { const card = catalog?.find(item => item.uuid === id); return <CardResult key={id} card={card} name={card?.name ?? "Card unavailable"} selected onSelect={() => toggle("cardIds", id, 6)}>{card && <Link className="flex min-h-control items-center text-sm text-ctp-blue underline" to={`/cards/${card.slug}`} target="_blank" rel="noreferrer">Card details<span className="sr-only"> in a new tab</span></Link>}</CardResult>; })}</div>
      <label className="mt-3 block text-sm">Find a card<input className="mt-1 min-h-control w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search card names" /></label>
      {query.trim() && <><p className="mt-2 text-xs text-ctp-subtext1">Showing up to 12 matching cards. Refine your search to find more.</p><div className="mt-3 grid grid-cols-2 gap-3">{matches.map(card => <CardResult key={card.uuid} card={card} name={card.name} selected={draft.cardIds.includes(card.uuid)} onSelect={() => toggle("cardIds", card.uuid, 6)}><Link className="flex min-h-control items-center text-sm text-ctp-blue underline" to={`/cards/${card.slug}`} target="_blank" rel="noreferrer">Card details<span className="sr-only"> in a new tab</span></Link></CardResult>)}</div>{!matches.length && <InlineState>No matching cards in the loaded catalog.</InlineState>}</>}
      <h3 className="mt-6 text-lg font-semibold">Featured decks</h3><p className="mt-1 text-sm text-ctp-subtext1">Choose from your published decks and public community favorites. Deck previews open in a new tab. Decks that become private are hidden automatically.</p>
      <div className="mt-3 flex flex-wrap gap-2">{draft.deckSlugs.map(slug => <Button key={slug} onClick={() => toggle("deckSlugs", slug, 3)}>Remove {decks.find(deck => deck.publicSlug === slug)?.title ?? "unavailable deck"}</Button>)}</div>
      <label className="mt-3 block text-sm">Find a deck<input className="mt-1 min-h-control w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3" value={deckQuery} onChange={event => setDeckQuery(event.target.value)} /></label>
      <p className="mt-2 text-xs text-ctp-subtext1">Showing up to 20 matching decks. Refine your search to find more.</p><div className="mt-3 space-y-2">{decks.filter(deck => deck.title.toLowerCase().includes(deckQuery.toLowerCase())).slice(0, 20).map(deck => <div key={deck.publicSlug}><DeckPreviewCard model={{ id: deck.publicSlug, title: deck.title, decklist: null, championName: deck.championName, source: { kind: "community", label: deck.owner.displayName }, materialPreview: deck.materialPreview }} presentation="cover" view={{ to: `/decks/${deck.publicSlug}`, newTab: true }} /><Button className="mt-2 w-full justify-start whitespace-normal text-left" aria-pressed={draft.deckSlugs.includes(deck.publicSlug)} onClick={() => toggle("deckSlugs", deck.publicSlug, 3)}>{draft.deckSlugs.includes(deck.publicSlug) ? "Selected: " : "Feature: "}{deck.title}</Button></div>)}</div>
      {!decks.length && <InlineState>Publish a deck or favorite a public community deck to feature it here.</InlineState>}
    </fieldset>}
  </DialogSheet>;
}
