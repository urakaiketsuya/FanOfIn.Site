import ProfileHeader from "./ProfileHeader";
import ProfileAppearanceEditor from "./ProfileAppearanceEditor";
import { Link } from "react-router-dom";
import DeckPreviewCard from "../../components/DeckPreviewCard";
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { AccountUser, ProfileShowcase, PublicDeckSummary, TournamentDeckFavorite } from "@gatcg/shared";
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
  const [tournamentDecks, setTournamentDecks] = useState<TournamentDeckFavorite[]>([]);
  const [tournamentLoading, setTournamentLoading] = useState(true);
  const [tournamentError, setTournamentError] = useState(false);
  const [announcement, setAnnouncement] = useState("");
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
    setTournamentError(false);
    setTournamentLoading(true);
    void accountApi.tournamentFavorites().then(result => { if (active) setTournamentDecks(result.decks); }).catch(() => { if (active) setTournamentError(true); }).finally(() => { if (active) setTournamentLoading(false); });
    void Promise.all([accountApi.showcase(), accountApi.bookmarks(), user.profileDiscoverable ? accountApi.publicProfile(user.profileSlug) : Promise.resolve({ profile: null })]).then(([result, bookmarks, own]) => {
      if (!active) return;
      setSaved(result.showcase); setDraft(result.showcase); setError(undefined);
      setDecks([...new Map([...bookmarks.decks.filter(deck => deck.visibility === "public"), ...(own.profile?.decks ?? []), ...(own.profile?.featuredDecks ?? [])].map(deck => [deck.publicSlug, deck])).values()]);
    }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Showcase could not be loaded"); });
    return () => { active = false; };
  }, [user.profileSlug, user.profileDiscoverable, attempt]);
  const dirty = JSON.stringify(saved) !== JSON.stringify(draft);
  function toggle(key: "cardIds" | "deckSlugs" | "tournamentHashes", id: string, max: number) {
    if (!draft) return;
    const values = draft[key] ?? [];
    const count = key === "cardIds" ? values.length : draft.deckSlugs.length + (draft.tournamentHashes?.length ?? 0);
    if (!values.includes(id) && count >= max) { setError(`Choose up to ${max} ${key === "cardIds" ? "cards" : "decks"}. Remove one first.`); return; }
    const next = values.includes(id) ? values.filter(value => value !== id) : [...values, id];
    const order = draft.deckOrder ?? [...draft.deckSlugs, ...(draft.tournamentHashes ?? [])];
    setError(undefined); setDraft({ ...draft, [key]: next, ...(key !== "cardIds" ? { deckOrder: values.includes(id) ? order.filter(value => value !== id) : [...order, id] } : {}) });
  }
  function move(key: "cardIds" | "deckOrder", id: string, direction: number, name: string, control: HTMLButtonElement) {
    if (!draft) return;
    const values = [...(key === "cardIds" ? draft.cardIds : draft.deckOrder ?? [...draft.deckSlugs, ...(draft.tournamentHashes ?? [])])];
    const index = values.indexOf(id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= values.length) return;
    [values[index], values[target]] = [values[target], values[index]];
    setDraft({ ...draft, [key]: values });
    setAnnouncement(`${name} moved to position ${target + 1} of ${values.length}.`);
    requestAnimationFrame(() => control.focus());
  }
  function orderControls(key: "cardIds" | "deckOrder", id: string, name: string, index: number, count: number) {
    return <div className="mt-2 flex flex-wrap gap-2"><Button className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50" aria-label={`Move ${name} earlier`} aria-disabled={index === 0} onClick={event => move(key, id, -1, name, event.currentTarget)}>Earlier</Button><Button className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50" aria-label={`Move ${name} later`} aria-disabled={index === count - 1} onClick={event => move(key, id, 1, name, event.currentTarget)}>Later</Button></div>;
  }
  async function save() {
    if (!draft) return;
    setBusy(true); setError(undefined);
    try { const result = await accountApi.saveShowcase(draft); setSaved(result.showcase); setDraft(result.showcase); notify({ tone: "success", message: "Profile saved." }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Your showcase could not be saved. Your selections are kept."); }
    finally { setBusy(false); }
  }
  const matchingTournamentDecks = tournamentDecks.filter(deck => `${deck.championName ?? ""} ${deck.title}`.toLowerCase().includes(deckQuery.trim().toLowerCase())).slice(0, 20);
  const matches = (catalog ?? []).filter(card => card.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 12);
  return <DialogSheet title="Edit profile" onDismiss={onDismiss} dirty={dirty} dismissible={!busy} footer={<><p className="mb-2 text-xs text-ctp-subtext1">{draft?.cardIds.length ?? 0}/6 cards · {(draft?.deckSlugs.length ?? 0) + (draft?.tournamentHashes?.length ?? 0)}/3 decks{dirty ? " · Unsaved changes" : ""}</p>{error && <InlineState tone="danger" className="mb-2">{error}</InlineState>}<div className="flex flex-wrap gap-2"><Button variant="primary" disabled={!draft || !dirty || busy} onClick={() => void save()}>{busy ? "Saving…" : "Save profile"}</Button>{(error || tournamentError) && <Button disabled={busy} onClick={() => { if (dirty && !confirmReload) { setConfirmReload(true); return; } setConfirmReload(false); setAttempt(value => value + 1); }}>{confirmReload ? "Discard draft and reload" : "Reload saved showcase"}</Button>}</div></>}>
    {!draft ? <InlineState>Loading showcase…</InlineState> : <fieldset disabled={busy}>
      <p className="mb-2 text-sm font-semibold">Profile preview</p>
      <ProfileHeader displayName={user.displayName} element={draft.element} portraitCardId={draft.portraitCardId} />
      <ProfileAppearanceEditor draft={draft} catalog={catalog} onChange={setDraft} />
      <p className="mt-4 text-sm text-ctp-subtext1">Choose what visitors see. Your other favorites remain private. Use Earlier and Later to set the order visitors see.</p>
      {!user.profileDiscoverable && <InlineState className="mt-3">Your profile is hidden. Enable profile discovery in Account to share your showcase.</InlineState>}
      <p role="status" className="sr-only">{announcement}</p>
      <h3 className="mt-5 text-lg font-semibold">Favorite cards</h3>
      <div className="mt-3 grid grid-cols-2 gap-3">{draft.cardIds.map((id, index) => { const card = catalog?.find(item => item.uuid === id); return <CardResult key={id} card={card} name={card?.name ?? "Card unavailable"} selected onSelect={() => toggle("cardIds", id, 6)}><p className="text-xs text-ctp-subtext1">Position {index + 1} of {draft.cardIds.length}</p>{orderControls("cardIds", id, card?.name ?? "Unavailable card", index, draft.cardIds.length)}{card && <Link className="flex min-h-control items-center text-sm text-ctp-blue underline" to={`/cards/${card.slug}`} target="_blank" rel="noreferrer">Card details<span className="sr-only"> in a new tab</span></Link>}</CardResult>; })}</div>
      <label className="mt-3 block text-sm">Find a card<input className="mt-1 min-h-control w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search card names" /></label>
      {query.trim() && <><p className="mt-2 text-xs text-ctp-subtext1">Showing up to 12 matching cards. Refine your search to find more.</p><div className="mt-3 grid grid-cols-2 gap-3">{matches.map(card => <CardResult key={card.uuid} card={card} name={card.name} selected={draft.cardIds.includes(card.uuid)} onSelect={() => toggle("cardIds", card.uuid, 6)}><Link className="flex min-h-control items-center text-sm text-ctp-blue underline" to={`/cards/${card.slug}`} target="_blank" rel="noreferrer">Card details<span className="sr-only"> in a new tab</span></Link></CardResult>)}</div>{!matches.length && <InlineState>No matching cards in the loaded catalog.</InlineState>}</>}
      <h3 className="mt-6 text-lg font-semibold">Featured decks</h3><p className="mt-1 text-sm text-ctp-subtext1">Choose from your published decks and public community favorites, or tournament favorites. Tournament decks use their published champion name. Deck previews open in a new tab. Decks that become private are hidden automatically.</p>
      <ol className="mt-3 space-y-3">{(draft.deckOrder ?? [...draft.deckSlugs, ...(draft.tournamentHashes ?? [])]).map((id, index, order) => {
        const community = decks.find(deck => deck.publicSlug === id);
        const tournament = tournamentDecks.find(deck => deck.deckHash === id);
        const name = community?.title ?? (tournament ? `${tournament.championName ?? "Tournament"} deck` : "Unavailable deck");
        return <li key={id} className="rounded-xl border border-ctp-surface1 p-3">
          <p className="mb-2 text-xs text-ctp-subtext1">Position {index + 1} of {order.length}</p>
          <DeckPreviewCard presentation="cover" model={{ id, title: name, decklist: tournament?.decklist ?? null, championName: community?.championName ?? tournament?.championName, materialPreview: community?.materialPreview, source: { kind: draft.deckSlugs.includes(id) ? "community" : "event", label: draft.deckSlugs.includes(id) ? "Community" : "Tournament" } }} view={{ to: `/decks/${id}`, newTab: true }} />
          {orderControls("deckOrder", id, name, index, order.length)}
          <Button className="mt-2" aria-label={`Remove ${name}`} onClick={() => toggle(draft.deckSlugs.includes(id) ? "deckSlugs" : "tournamentHashes", id, 3)}>Remove</Button>
        </li>;
      })}</ol>
      <label className="mt-3 block text-sm">Find a deck<input className="mt-1 min-h-control w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3" value={deckQuery} onChange={event => setDeckQuery(event.target.value)} /></label>
      <p className="mt-2 text-xs text-ctp-subtext1">Showing up to 20 matching decks. Refine your search to find more.</p><div className="mt-3 space-y-2">{decks.filter(deck => deck.title.toLowerCase().includes(deckQuery.toLowerCase())).slice(0, 20).map(deck => <div key={deck.publicSlug}><DeckPreviewCard model={{ id: deck.publicSlug, title: deck.title, decklist: null, championName: deck.championName, source: { kind: "community", label: deck.owner.displayName }, materialPreview: deck.materialPreview }} presentation="cover" view={{ to: `/decks/${deck.publicSlug}`, newTab: true }} /><Button className="mt-2 w-full justify-start whitespace-normal text-left" aria-pressed={draft.deckSlugs.includes(deck.publicSlug)} onClick={() => toggle("deckSlugs", deck.publicSlug, 3)}>{draft.deckSlugs.includes(deck.publicSlug) ? "Selected: " : "Feature: "}{deck.title}</Button></div>)}</div>
      <h4 className="mt-5 font-semibold">Tournament favorites</h4>

      {tournamentError && <InlineState tone="danger">Tournament favorites could not be loaded. Your saved selections are kept. Use Reload saved showcase to retry.</InlineState>}
      <div className="mt-3 space-y-3">{matchingTournamentDecks.map(deck => <div key={deck.deckHash}>
        <DeckPreviewCard presentation="cover" model={{ id: deck.deckHash, title: `${deck.championName ?? "Tournament"} deck`, decklist: deck.decklist, championName: deck.championName, source: { kind: "event", label: "Tournament" } }} view={{ to: `/decks/${deck.deckHash}`, newTab: true }} />
        <Button className="mt-2 w-full whitespace-normal text-left" aria-pressed={draft.tournamentHashes?.includes(deck.deckHash) ?? false} onClick={() => toggle("tournamentHashes", deck.deckHash, 3)}>{draft.tournamentHashes?.includes(deck.deckHash) ? "Selected: " : "Feature: "}{deck.championName ?? "Tournament"} deck</Button>
      </div>)}</div>
      {tournamentLoading && <InlineState>Loading tournament favorites…</InlineState>}
      {!tournamentLoading && !tournamentError && !tournamentDecks.length && <InlineState>Favorite a tournament deck to choose it here.</InlineState>}
      {!tournamentLoading && !tournamentError && !!tournamentDecks.length && !matchingTournamentDecks.length && <InlineState>No tournament favorites match your search.</InlineState>}
    </fieldset>}
  </DialogSheet>;
}
