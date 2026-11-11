import { useCardCatalog } from "./useCardCatalog";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Card, SavedDeck } from "@gatcg/shared";
import { accountApi, AccountApiError } from "../../lib/accountApi";
import { automaticDeckSection, EDITOR_SECTIONS, type DeckEditSection } from "../../lib/deckEditing";
import { deckDestinationEligibility } from "../../lib/deckSectionEligibility";
import { addCardToSnapshot } from "../account/cardDeckDraft";
import { NEW_DECK_DRAFT_KEY, readNewDeckDraft } from "../account/newDeckDraft";
import Button from "../../components/ui/Button";
import DialogSheet from "../../components/ui/DialogSheet";
import CardResult from "../../components/CardResult";

export default function AddCardToDeck({ card }: { card: Card }) {
  const [open, setOpen] = useState(false);
  return <><Button onClick={() => setOpen(true)}>Add to deck</Button>{open && <DeckPicker card={card} onDismiss={() => setOpen(false)} />}</>;
}
function DeckPicker({ card, onDismiss }: { card: Card; onDismiss: () => void }) {
  const navigate = useNavigate();
  const catalog = useCardCatalog();
  const [decks, setDecks] = useState<SavedDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signIn, setSignIn] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [target, setTarget] = useState("");
  const [query, setQuery] = useState("");
  const [section, setSection] = useState<DeckEditSection>(automaticDeckSection(card));
  const [quantity, setQuantity] = useState(1);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setSignIn(false);
    void accountApi.decks().then(result => { if (active) setDecks(result.decks); }).catch(reason => {
      if (!active) return;
      if (reason instanceof AccountApiError && reason.status === 401) setSignIn(true);
      else setError("Your decks could not load.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);
  function add() {
    const addition = { card, section, quantity };
    if (target) { navigate(`/decks/${encodeURIComponent(target)}`, { state: { edit: true, cardAddition: addition } }); return; }
    try {
      const base = readNewDeckDraft(localStorage) ?? { sourceId: crypto.randomUUID(), title: "Untitled deck", format: "STANDARD", deckText: "", maybeboardText: "" };
      localStorage.setItem(NEW_DECK_DRAFT_KEY, JSON.stringify({ ...base, ...addCardToSnapshot(base, addition, new Map(catalog.map(item => [item.name, item]))) }));
      navigate("/decks/new");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save the draft on this device."); }
  }
  const control = "min-h-12 w-full min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-base px-3";
  return <DialogSheet title="Add to deck" onDismiss={onDismiss} dirty={!!target || quantity !== 1 || section !== automaticDeckSection(card)} footer={<Button variant="primary" disabled={!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99} onClick={add}>Add and open editor</Button>}>
    <div className="mx-auto mb-4 max-w-48"><CardResult card={card} name={card.name} /></div>
    <div className="grid gap-3">
      <label>Find a deck<input className={control} value={query} onChange={event => setQuery(event.target.value)} /></label>
      <label>Deck<select aria-label="Deck" className={control} value={target} onChange={event => setTarget(event.target.value)}><option value="">New deck / current draft</option>{decks.filter(deck => deck.id === target || deck.title.toLowerCase().includes(query.toLowerCase())).map(deck => <option key={deck.id} value={deck.id}>{deck.title}</option>)}</select></label>
      {loading && <p role="status">Loading your decks…</p>}
      {signIn && <Link className="flex min-h-12 items-center text-ctp-blue" to="/account">Sign in to choose a saved deck</Link>}
      {!loading && !signIn && !error && !decks.length && <p>No saved decks yet.</p>}
      {error && <div role="alert">{error}<Button onClick={() => setAttempt(value => value + 1)}>Retry</Button></div>}
      <label>Section<select aria-label="Section" className={control} value={section} onChange={event => setSection(event.target.value as DeckEditSection)}>{EDITOR_SECTIONS.filter(item => deckDestinationEligibility(card, item.key).allowed).map(item => <option key={item.key} value={item.key}>{item.title}</option>)}</select></label>
      <label>Copies<input className={control} type="number" min={1} max={99} value={quantity} onChange={event => setQuantity(Number(event.target.value))} /></label>
    </div>
  </DialogSheet>;
}
