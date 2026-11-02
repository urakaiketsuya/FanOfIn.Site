import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { printingCardLine, type DeckFormat } from "@gatcg/shared";
import PageLayout from "../../components/layout/PageLayout";
import Button from "../../components/ui/Button";
import Tabs, { TabPanel } from "../../components/ui/Tabs";
import DialogSheet from "../../components/ui/DialogSheet";
import DeckEditor from "../../components/deck-editor/DeckEditor";
import CardBrowser from "../../components/deck-editor/CardBrowser";
import EditorDialog from "../../components/deck-editor/EditorDialog";
import DeckStats from "../../components/DeckStats";
import CardLayoutControls from "../../components/CardLayoutControls";
import { useDecklistDisplayPrefs } from "../../lib/decklistDisplayPrefs";
import { editDeck, type DeckEdit, type EditableDeck } from "../../lib/deckEditing";
import { accountApi, AccountApiError } from "../../lib/accountApi";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { findDeckChampionName } from "../../lib/ttsExport";
import { trackEvent } from "../../lib/analytics";
import { useCardCatalog } from "../cards/useCardCatalog";
import { parseDecklist } from "../compare/parseDecklist";
import { buildEditableDeckText } from "../events/DecklistView";
import UserDeckHeader from "./UserDeckHeader";
import { useDeckEditSession } from "./useDeckEditSession";
import { NEW_DECK_DRAFT_KEY, readNewDeckDraft, newDeckTitleError, type NewDeckDraft } from "./newDeckDraft";
import { ExistingDeckError, saveNewDeck } from "./saveNewDeck";

const TABS: { key: "deck" | "stats"; label: string }[] = [{ key: "deck", label: "Deck" }, { key: "stats", label: "Stats" }];

export default function NewDeck() {
  useDocumentTitle("New deck", "Build a deck from an empty card list.");
  const navigate = useNavigate();
  const [initial] = useState<NewDeckDraft>(() => {
    try { const saved = readNewDeckDraft(localStorage); if (saved) return saved; } catch { /* Storage may be unavailable. */ }
    return { sourceId: crypto.randomUUID(), title: "Untitled deck", format: "STANDARD", deckText: "", maybeboardText: "" };
  });
  const session = useDeckEditSession(initial);
  const [title, setTitle] = useState(initial.title);
  const [format, setFormat] = useState<DeckFormat>(initial.format);
  const [tab, setTab] = useState<"deck" | "stats">("deck");
  const [rename, setRename] = useState(false);
  const [browser, setBrowser] = useState(false);
  const [query, setQuery] = useState("");
  const [destination, setDestination] = useState<keyof EditableDeck | "automatic">("automatic");
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const completed = useRef(false);
  const [error, setError] = useState("");
  const [signIn, setSignIn] = useState(false);
  const [existingId, setExistingId] = useState("");
  const [storageError, setStorageError] = useState(false);
  const prefs = useDecklistDisplayPrefs();
  const cards = useCardCatalog();
  const catalog = useMemo(() => new Map(cards.map(card => [card.name, card])), [cards]);
  const names = useMemo(() => [...catalog.keys()].sort(), [catalog]);
  const decklist = useMemo(() => parseDecklist(session.deckText).decklist, [session.deckText]);
  const deck = useMemo<EditableDeck>(() => ({ ...decklist, maybeboard: parseDecklist(`Main\n${session.maybeboardText}`).decklist.main }), [decklist, session.maybeboardText]);
  const champion = findDeckChampionName(deck.material, catalog)?.split(",")[0].trim() ?? null;
  const count = Object.values(deck).flat().reduce((total, line) => total + line.quantity, 0);
  const canSave = deck.main.length + deck.material.length > 0;
  const snapshot = useMemo<NewDeckDraft>(() => ({ sourceId: initial.sourceId, title, format, deckText: session.deckText, maybeboardText: session.maybeboardText }), [initial.sourceId, title, format, session.deckText, session.maybeboardText]);

  useEffect(() => {
    if (completed.current) return;
    try { localStorage.setItem(NEW_DECK_DRAFT_KEY, JSON.stringify(snapshot)); setStorageError(false); }
    catch { setStorageError(true); }
  }, [snapshot]);
  useEffect(() => {
    if (!storageError) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [storageError]);

  function applyEdit(action: DeckEdit) {
    if (saving.current) return;
    const next = editDeck(deck, action, catalog);
    if (next === deck) return;
    session.commit(buildEditableDeckText(next), next.maybeboard.map(printingCardLine).join("\n"));
  }
  async function save() {
    if (saving.current) return;
    saving.current = true; setBusy(true); setError(""); setSignIn(false); setExistingId("");
    try {
      const id = await saveNewDeck(accountApi, snapshot, champion);
      completed.current = true;
      try { localStorage.removeItem(NEW_DECK_DRAFT_KEY); } catch { /* Saved deck is already durable. */ }
      trackEvent("deck_created", { source: "empty-editor" });
      navigate(`/decks/${id}`, { replace: true, state: { edit: true } });
    } catch (reason) {
      setError(reason instanceof TypeError ? "Could not connect to save your deck. Your draft is kept; try again." : reason instanceof Error ? reason.message : "Could not save the deck. Please try again.");
      if (reason instanceof AccountApiError && reason.status === 401) setSignIn(true);
      if (reason instanceof ExistingDeckError) setExistingId(reason.deckId);
    } finally { saving.current = false; setBusy(false); }
  }

  return <PageLayout width="fluid" data-component="NewDeck" className="[&_.deck-panorama-art:empty]:hidden">
    <Link to="/decks/edit" className="inline-flex min-h-control items-center text-sm text-ctp-blue hover:underline">← My Decks</Link>
    <UserDeckHeader title={title || "Untitled deck"} championName={champion} format={format} decklist={decklist} actions={<Button disabled={busy} onClick={() => setRename(true)}>Rename</Button>} />
    <div className="my-4 flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-sm text-ctp-subtext1">Format<select aria-label="Deck format" disabled={busy} value={format} onChange={event => setFormat(event.target.value as DeckFormat)} className="min-h-control rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-ctp-text"><option value="STANDARD">Standard</option><option value="PANTHEON">Pantheon</option><option value="UNKNOWN">Unspecified</option></select></label>
      <span className="text-sm text-ctp-subtext1">{count} {count === 1 ? "card" : "cards"}</span>
      <span role="status" className="text-sm text-ctp-subtext1">{storageError ? "Draft storage unavailable. Keep this page open." : "Draft saved on this device"}</span>
      <Button variant="primary" disabled={busy || !canSave} onClick={() => void save()}>{busy ? "Saving…" : "Save deck"}</Button>
    </div>
    {!canSave && <p className="mb-4 text-sm text-ctp-subtext1">Add a Main or Material card to save to My Decks.</p>}
    {error && <div role="alert" className="mb-4 rounded-lg border border-ctp-red/40 p-3 text-sm text-ctp-red">{error}{signIn && <Link to="/account" className="flex min-h-control items-center text-ctp-blue underline">Sign in to save</Link>}{existingId && <Link to={`/decks/${existingId}`} className="flex min-h-control items-center text-ctp-blue underline">Open existing deck</Link>}</div>}
    <Tabs tabs={TABS} active={tab} onChange={setTab} baseId="new-deck" label="Deck views" />
    <TabPanel baseId="new-deck" tab="deck" active={tab} keepMounted>
      <fieldset disabled={busy} className="min-w-0 border-0 p-0">
        <legend className="sr-only">Deck cards</legend>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <CardLayoutControls value={prefs.visualCardSize === "rows" ? "Rows" : prefs.displayMode === "detailed" ? "List" : "Grid"} onChange={layout => { prefs.setDisplayMode(layout === "List" ? "detailed" : "visual"); prefs.setVisualCardSize(layout === "Rows" ? "rows" : "large"); }} />
          <div className="flex gap-2"><Button disabled={busy || !session.editHistory.past.length} onClick={session.undo}>Undo</Button><Button disabled={busy || !session.editHistory.future.length} onClick={session.redo}>Redo</Button></div>
        </div>
        <DeckEditor deck={deck} catalog={catalog} format={format} onEdit={applyEdit} viewMode={prefs.visualCardSize === "rows" || prefs.displayMode === "detailed" ? "list" : "grid"} onAdd={section => { setDestination(section); setBrowser(true); }} />
      </fieldset>
    </TabPanel>
    <TabPanel baseId="new-deck" tab="stats" active={tab} keepMounted><DeckStats decklist={decklist} cardsByName={catalog} format={format} championName={champion} /></TabPanel>
    {browser && <EditorDialog count={count} onDismiss={() => setBrowser(false)}><CardBrowser format={format} query={query} onQuery={setQuery} destination={destination} onDestination={setDestination} names={names} catalog={catalog} deck={deck} onEdit={applyEdit} /></EditorDialog>}
    {rename && <RenameDeck title={title} onDismiss={() => setRename(false)} onApply={value => { setTitle(value); setRename(false); }} />}
  </PageLayout>;
}

function RenameDeck({ title, onDismiss, onApply }: { title: string; onDismiss: () => void; onApply: (title: string) => void }) {
  const [value, setValue] = useState(title);
  const [error, setError] = useState<string | null>(null);
  function apply() { const problem = newDeckTitleError(value); setError(problem); if (!problem) onApply(value.trim()); }
  return <DialogSheet title="Rename deck" onDismiss={onDismiss} dirty={value !== title} footer={<Button variant="primary" onClick={apply}>Apply name</Button>}>
    <form onSubmit={event => { event.preventDefault(); apply(); }}><label className="block text-sm text-ctp-subtext1">Deck name<input autoFocus required maxLength={160} value={value} onChange={event => setValue(event.target.value)} className="mt-2 min-h-control w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-base text-ctp-text" /></label>{error && <p role="alert" className="mt-2 text-sm text-ctp-red">{error}</p>}</form>
  </DialogSheet>;
}
