import type { CardPrintingAllocation } from "@gatcg/shared";
import EditorModeSwitch from "../../components/deck-editor/EditorModeSwitch";
import DisclosureChevron from "../../components/DisclosureChevron";
import MaybeboardPanel from "./MaybeboardPanel";
import { useDeckEditSession } from "./useDeckEditSession";
import { useSavedDeckDraft } from "./useSavedDeckDraft";
import { printingCardLine, extractDeckPrintings, newlyAddedBannedCards } from "@gatcg/shared";
import { useDeckEditFeedback } from "../../components/deck-editor/useDeckEditFeedback";
import { useActionNotice } from "../../components/ui/toast/useActionNotice";
import { useToast } from "../../components/ui/toast/ToastContext";
import { automaticDeckSection, editDeck, type DeckEdit, type EditableDeck } from "../../lib/deckEditing";
import CardBrowser from "../../components/deck-editor/CardBrowser";
import EditorDialog from "../../components/deck-editor/EditorDialog";
import { useEffect, useMemo, useState, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import type { OmnidexDecklist, OmnidexDecklistCardLine, SavedDeckDetail } from "@gatcg/shared";
import { accountApi, AccountApiError } from "../../lib/accountApi";
import { trackEvent } from "../../lib/analytics";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { buildEditableDeckText as buildDecklistText } from "../events/DecklistView";
import { parseDecklist } from "../compare/parseDecklist";
import { useCardsByNames } from "../events/useCardsByNames";
import { useCardCatalog } from "../cards/useCardCatalog";
import { findDeckChampionName } from "../../lib/ttsExport";
import UserDeckHeader from "./UserDeckHeader";
import UserDecklistPanel from "./UserDecklistPanel";
import PageLayout from "../../components/layout/PageLayout";
import UserDeckStats from "./UserDeckStats";
import DeckPrimerEditor from "./DeckPrimerEditor";
import Tabs from "../../components/ui/Tabs";
import { useTabParam } from "../../lib/useTabParam";
import Panel from "../../components/ui/Panel";
import Button from "../../components/ui/Button";
import { EmptyState, InlineState } from "../../components/ui/ContentState";
import { encodeCustomDecks } from "../../lib/compareShareLink";
import DeckSectionBalance from "./DeckSectionBalance";
import { sideboardPointCost, validateDeck } from "../deckbuilder/validateDeck";
import { EditableDecklistGrid, EDIT_SECTIONS, type DeckCardDestination, type DeckSectionKey } from "../../components/deck-editor/EditableDecklistGrid";
import DeckSaveBar from "./DeckSaveBar";
import { DeckVersionHistory } from "./MyDeckDetailSections";
import DeckMatchLogSummary from "./DeckMatchLogSummary";

type DeckTab = "decklist" | "performance" | "primer" | "manage" | "history";
const DECK_TABS = [{ key: "decklist", label: "Cards" }, { key: "primer", label: "Primer" }, { key: "performance", label: "Analysis" }, { key: "history", label: "History" }, { key: "manage", label: "Sharing" }] satisfies { key: DeckTab; label: string }[];
const DECK_TAB_KEYS: DeckTab[] = DECK_TABS.map(({ key }) => key);

export default function MyDeckDetail() {
  const { id: deckId = "" } = useParams<{ id: string }>();
  const [deck, setDeck] = useState<SavedDeckDetail | null>();
  const [error, setError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadingDeck, setLoadingDeck] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editorMode, setEditorMode] = useState<"cards" | "text">("cards");
  const [maybeboardOpen, setMaybeboardOpen] = useState(false);
  const { deckText, maybeboardText, editHistory, setDeckText, setMaybeboardText, setEditHistory, commit, undo, redo } = useDeckEditSession();
  const [changeNote, setChangeNote] = useState("");
  const [saveAsNewVersion, setSaveAsNewVersion] = useState(false);
  const [saveDetailsOpen, setSaveDetailsOpen] = useState(false);
  const [trimMax, setTrimMax] = useState(3);
  const [renamingTitle, setRenamingTitle] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [primerMarkdown, setPrimerMarkdown] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [busy, setBusy] = useState(false);
  const editFeedback = useDeckEditFeedback();
  const setNotice = useActionNotice();
  const { notify, dismiss } = useToast();
  const actionErrorToast = useRef("");
  const [tab, setTab] = useTabParam<DeckTab>("tab", DECK_TAB_KEYS, "decklist");
  const [cardInput, setCardInput] = useState("");
  const [addDestination, setAddDestination] = useState<"automatic" | "sideboard" | "maybeboard">("automatic");
  const cardCatalog = useCardCatalog();
  const catalogByName = useMemo(() => new Map(cardCatalog.map((card) => [card.name, card])), [cardCatalog]);
  const cardNames = useMemo(() => Array.from(new Set(cardCatalog.map((card) => card.name))).sort(), [cardCatalog]);
  const [browserOpen, setBrowserOpen] = useState(false);
  const editedDecklist = useMemo(() => parseDecklist(deckText).decklist, [deckText]);
  const maybeboardLines = useMemo(() => parseDecklist(`Main\n${maybeboardText}`).decklist.main, [maybeboardText]);
  const trimPreview = useMemo(() => {
    const affected = EDIT_SECTIONS.flatMap((section) => editedDecklist[section.key]).filter((line) => line.quantity > trimMax);
    return { affected, copiesRemoved: affected.reduce((sum, line) => sum + line.quantity - trimMax, 0) };
  }, [editedDecklist, trimMax]);
  const editedCardNames = useMemo(() => [...editedDecklist.main, ...editedDecklist.material, ...editedDecklist.sideboard].map((line) => line.card), [editedDecklist]);
  const editedCardsByName = useCardsByNames(editedCardNames);
  const editedChampionName = useMemo(() => findDeckChampionName(editedDecklist.material, editedCardsByName)?.split(",")[0].trim() ?? null, [editedDecklist.material, editedCardsByName]);
  const editedCardChangeCount = useMemo(() => {
    if (!deck) return 0;
    const quantities = (decklist: OmnidexDecklist) => new Map(EDIT_SECTIONS.flatMap(({ key }) => decklist[key].map((line) => [`${key}:${line.card}`, JSON.stringify([line.quantity, line.printings ?? []])] as const)));
    const before = quantities(deck.decklist);
    const after = quantities(editedDecklist);
    return new Set([...before.keys(), ...after.keys()]).size === 0 ? 0 : [...new Set([...before.keys(), ...after.keys()])].filter((key) => before.get(key) !== after.get(key)).length;
  }, [deck, editedDecklist]);
  const savedMaybeboardText = useMemo(() => deck?.maybeboard.map((line) => printingCardLine(line)).join("\n") ?? "", [deck]);
  const hasUnsavedChanges = JSON.stringify(extractDeckPrintings(editedDecklist)) !== JSON.stringify(extractDeckPrintings(deck?.decklist ?? { main: [], material: [], sideboard: [] })) || editedCardChangeCount > 0 || maybeboardText !== savedMaybeboardText;
  const draft = useSavedDeckDraft(deck, editing, hasUnsavedChanges, { deckText, maybeboardText });
  const previousDecklist = useMemo(() => {
    if (!deck) return undefined;
    const current = deck.versions.find((version) => version.id === deck.currentVersionId);
    if (!current) return undefined;
    return deck.versions.filter((version) => version.versionNumber < current.versionNumber).sort((a, b) => b.versionNumber - a.versionNumber)[0]?.decklist;
  }, [deck]);
  useDocumentTitle(deck?.title ?? "Saved Deck", "View a saved deck and its version history.");

  useEffect(() => {
    let active = true;
    setLoadingDeck(true);
    void accountApi.deck(deckId).then(({ deck: result }) => {
      if (active) { setError(null); setDeck(result); setTitle(result.title); setDescription(result.description); setPrimerMarkdown(result.primerMarkdown); setTagsText(result.tags.join(", ")); setDeckText(buildDecklistText(result.decklist)); setMaybeboardText(result.maybeboard.map((line) => printingCardLine(line)).join("\n")); }
    }).catch((reason: unknown) => {
      if (!active) return;
      setError(reason instanceof AccountApiError && reason.status === 401 ? "Sign in to view this deck." : reason instanceof TypeError ? "We could not connect to your deck. Try loading it again." : reason instanceof Error ? reason.message : "Deck could not be loaded");
      setDeck(null);
    }).finally(() => { if (active) setLoadingDeck(false); });
    return () => { active = false; };
  }, [deckId, loadAttempt, setDeckText, setMaybeboardText]);

  async function saveMaybeboard() {
    const maybeboard = maybeboardLines;
    await run(async () => {
      await accountApi.updateDeckMetadata(deckId, { maybeboard });
      setDeck((current) => current ? { ...current, maybeboard } : current);
      setNotice("Maybeboard saved.");
    });
  }

  function commitEdit(nextDeckText: string, nextMaybeboardText = maybeboardText) {
    if (nextDeckText === deckText && nextMaybeboardText === maybeboardText) return;
    editFeedback.clear();
    commit(nextDeckText, nextMaybeboardText);
  }
  function undoEdit() { editFeedback.clear(); undo(); }
  function redoEdit() { editFeedback.clear(); redo(); }

  function applySharedEdit(action: DeckEdit) {
    const current: EditableDeck = { ...(editing ? editedDecklist : deck!.decklist), maybeboard: maybeboardLines };
    const next = editDeck(current, action, catalogByName);
    if (next === current) { if (action.type === "quantity" || action.type === "move") setNotice("Review the card’s printings before reducing or moving these copies."); return; }
    if (next.maybeboard.reduce((n, line) => n + line.quantity, 0) > current.maybeboard.reduce((n, line) => n + line.quantity, 0)) setMaybeboardOpen(true);
    commitEdit(buildDecklistText(next), next.maybeboard.map((line) => printingCardLine(line)).join("\n"));
    setEditing(true);
    editFeedback.report(current, next, action, catalogByName, deck!.format, () => {
      setDeckText(buildDecklistText(current)); setMaybeboardText(current.maybeboard.map(line => printingCardLine(line)).join("\n"));
      setEditHistory(history => ({ past: history.past.slice(0, -1), future: [{ deckText: buildDecklistText(next), maybeboardText: next.maybeboard.map(line => printingCardLine(line)).join("\n") }] }));
    });
  }
  function changeMaybeboardQuantity(name: string, quantity: number, printings?: CardPrintingAllocation[]) { applySharedEdit({ type: "quantity", section: "maybeboard", name, quantity, printings }); }
  function removeMaybeboardCard(name: string) { applySharedEdit({ type: "remove", section: "maybeboard", name }); }
  function moveMaybeboardCard(line: OmnidexDecklistCardLine, destination: DeckCardDestination, quantity: number, printings?: CardPrintingAllocation[]) { applySharedEdit({ type: "move", section: "maybeboard", name: line.card, destination, quantity, printings }); }

  function startEditing() {
    const savedDeckText = buildDecklistText(deck!.decklist);
    const initial = draft.restore({ deckText: savedDeckText, maybeboardText: savedMaybeboardText });
    setDeckText(initial.deckText); setMaybeboardText(initial.maybeboardText);
    setEditHistory({ past: [], future: [] });
    setSaveAsNewVersion(false);
    setSaveDetailsOpen(false);
    setEditing(true);
    setTab("decklist");
  }

  function cancelEditing() {
    if (hasUnsavedChanges && !window.confirm(`Discard ${editedCardChangeCount || "the"} unsaved deck change${editedCardChangeCount === 1 ? "" : "s"}?`)) return;
    setDeckText(buildDecklistText(deck!.decklist));
    setMaybeboardText(savedMaybeboardText);
    setEditHistory({ past: [], future: [] });
    setCardInput("");
    setAddDestination("automatic");
    editFeedback.clear();
    setEditing(false);
    draft.clear();
  }

  const pendingRestore = useRef<{ key: string; requestId: string } | null>(null);
  const pendingSave = useRef<{ payload: string; requestId: string } | null>(null);

  function restoreVersion(versionId: string) {
    void run(async () => {
      const key = `${deck!.id}:${deck!.revision}:${versionId}`;
      if (pendingRestore.current?.key !== key) pendingRestore.current = { key, requestId: crypto.randomUUID() };
      await accountApi.restoreDeckVersion(deck!.id, versionId, { expectedRevision: deck!.revision, requestId: pendingRestore.current.requestId });
      await refresh();
    });
  }

  function saveEditedDeck() {
    void run(async () => {
      if (editedChampionName !== deck!.championName && !window.confirm(`Change Champion from ${deck!.championName ?? "none"} to ${editedChampionName ?? "none"}?`)) return;
      const input = { decklist: editedDecklist, format: deck!.format, championName: editedChampionName,
        maybeboard: maybeboardLines, expectedRevision: deck!.revision, ...(saveAsNewVersion ? { changeNote } : {}) };
      const payload = JSON.stringify({ deckId: deck!.id, saveAsNewVersion, input });
      if (pendingSave.current?.payload !== payload) pendingSave.current = { payload, requestId: crypto.randomUUID() };
      const command = { ...input, requestId: pendingSave.current.requestId };
      if (saveAsNewVersion) await accountApi.createDeckVersion(deck!.id, command);
      else await accountApi.updateDeckDecklist(deck!.id, command);
      trackEvent(saveAsNewVersion ? "deck_version_saved" : "deck_updated");
      await refresh(); setChangeNote(""); setSaveDetailsOpen(false); setEditing(false);
      setEditHistory({ past: [], future: [] });
      draft.clear();
      editFeedback.clear();
      setNotice(saveAsNewVersion ? "Saved as a new version." : "Deck updated.");
    });
  }

  // Grid tiles edit the same `deckText` the raw textarea and "Add card" bar above it read/write,
  // so all three stay in sync automatically.
  function changeEditedQuantity(section: DeckSectionKey, name: string, quantity: number, printings?: CardPrintingAllocation[]) { applySharedEdit({ type: "quantity", section, name, quantity, printings }); }

  function editSelected(cards: { section: DeckSectionKey; name: string }[], makeAction: (selected: { section: DeckSectionKey; name: string }, quantity: number) => DeckEdit) {
    const initial: EditableDeck = { ...editedDecklist, maybeboard: maybeboardLines };
    let printingConflict = false;
    const next = cards.reduce((current, selected) => {
      const quantity = current[selected.section].find((line) => line.card === selected.name)?.quantity;
      if (quantity === undefined) return current;
      const action = makeAction(selected, quantity);
      const result = editDeck(current, action, catalogByName);
      if (result === current && action.type === "quantity" && action.quantity < quantity) printingConflict = true;
      return result;
    }, initial);
    if (printingConflict) { setNotice("Choose which printings to keep on each card before reducing selected quantities. No bulk changes applied."); return; }
    if (next === initial) return;
    commitEdit(buildDecklistText(next), next.maybeboard.map((line) => printingCardLine(line)).join("\n"));
    const banned = newlyAddedBannedCards(initial, next, catalogByName, deck!.format);
    notify({ message: banned.length ? `Selection updated. ${banned.length} banned card${banned.length === 1 ? "" : "s"} increased; review the deck warnings.` : "Selection updated. Undo is available in the editor.", tone: banned.length ? "warning" : "success", key: "bulk-edit" });
  }
  function adjustSelectedCards(cards: { section: DeckSectionKey; name: string }[], delta: number) {
    editSelected(cards, (selected, quantity) => ({ type: "quantity", ...selected, quantity: Math.max(1, quantity + delta) }));
  }
  function setSelectedCardsQuantity(cards: { section: DeckSectionKey; name: string }[], quantity: number) {
    editSelected(cards, (selected) => ({ type: "quantity", ...selected, quantity }));
  }
  function moveSelectedCards(cards: { section: DeckSectionKey; name: string }[], destination: DeckCardDestination) {
    editSelected(cards, (selected, quantity) => ({ type: "move", ...selected, destination, quantity }));
  }
  function removeSelectedCards(cards: { section: DeckSectionKey; name: string }[]) {
    editSelected(cards, (selected) => ({ type: "remove", ...selected }));
  }

  function moveEditedCard(from: DeckSectionKey, to: DeckCardDestination, name: string, quantity: number, printings?: CardPrintingAllocation[]) { applySharedEdit({ type: "move", section: from, name, destination: to, quantity, printings }); }
  function removeEditedCard(section: DeckSectionKey, name: string) { applySharedEdit({ type: "remove", section, name }); }

  // Only ever lowers a count (min, never max) – a card whose own legal limit is already below
  // `max` (e.g. a UNIQUE 1-of) is left untouched, never bumped up to match.
  function trimToMaxCopies(max: number) {
    const decklist = parseDecklist(deckText).decklist;
    if ([...decklist.main, ...decklist.material, ...decklist.sideboard].some(line => (line.printings ?? []).reduce((sum, p) => sum + p.quantity, 0) > max)) { setNotice("Choose which printings to keep on each card before trimming."); return; }
    for (const section of EDIT_SECTIONS) for (const line of decklist[section.key]) line.quantity = Math.min(line.quantity, max);
    commitEdit(buildDecklistText(decklist));
    setNotice(`Trimmed every card to at most ${max}x.`);
    trackEvent("deck_trimmed", { max });
  }

  async function saveTitle() {
    if (!deck) return;
    const trimmed = title.trim();
    if (!trimmed || trimmed === deck.title) { setTitle(deck.title); setRenamingTitle(false); return; }
    await run(async () => {
      await accountApi.updateDeckMetadata(deck.id, { title: trimmed });
      trackEvent("deck_renamed");
      await refresh();
      setNotice("Deck renamed.");
      setRenamingTitle(false);
    });
  }

  function addMaybeboardToEditor() {
    if (maybeboardLines.length === 0) return;
    const initial: EditableDeck = { ...(editing ? editedDecklist : deck!.decklist), maybeboard: maybeboardLines };
    const next = maybeboardLines.reduce((current, line) => editDeck(current, { type: "move", section: "maybeboard", name: line.card, destination: automaticDeckSection(catalogByName.get(line.card)), quantity: line.quantity }, catalogByName), initial);
    commitEdit(buildDecklistText(next), next.maybeboard.map((line) => printingCardLine(line)).join("\n"));
    setEditing(true);
    setNotice("Maybeboard cards moved to the deck editor. Save deck changes to apply them.");
  }

  async function refresh() {
    const result = await accountApi.deck(deckId);
    setDeck(result.deck);
    setTitle(result.deck.title);
    setDescription(result.deck.description);
    setPrimerMarkdown(result.deck.primerMarkdown);
    setTagsText(result.deck.tags.join(", "));
    setMaybeboardText(result.deck.maybeboard.map((line) => printingCardLine(line)).join("\n"));
    setDeckText(buildDecklistText(result.deck.decklist));
  }

  async function run(action: () => Promise<void>) {
    dismiss(actionErrorToast.current);
    setBusy(true); setError(null);
    try { await action(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Something went wrong"); actionErrorToast.current = notify({ tone: "error", message: reason instanceof Error ? reason.message : "The action failed. Please try again.", key: "action-error" }); }
    finally { setBusy(false); }
  }

  function allowNavigation() {
    return !editing || !hasUnsavedChanges || window.confirm("Leave this page? Your draft will be kept so you can resume it later.");
  }

  if (deck === undefined) return <PageLayout data-component="MyDeckDetail"><InlineState className="mt-10">Loading deck…</InlineState></PageLayout>;
  if (!deck) return <PageLayout data-component="MyDeckDetail"><EmptyState title="Deck unavailable" description={error} action={<div className="flex flex-wrap items-center justify-center gap-3"><Button variant="primary" disabled={loadingDeck} onClick={() => setLoadAttempt((attempt) => attempt + 1)}>{loadingDeck ? "Retrying…" : "Retry loading deck"}</Button><Link to="/decks/edit" className="inline-flex min-h-control items-center text-ctp-blue hover:underline">Back to My Decks</Link></div>} /></PageLayout>;
  const editingValidation = validateDeck({ main: editedDecklist.main.map((line) => ({ cardName: line.card, quantity: line.quantity })), material: editedDecklist.material.map((line) => ({ cardName: line.card, quantity: line.quantity })), sideboard: editedDecklist.sideboard.map((line) => ({ cardName: line.card, quantity: line.quantity })) }, catalogByName, new Set(["NORM"]), deck.format);
  const comparePath = `/compare?custom=${encodeURIComponent(encodeCustomDecks([{ label: deck.title, decklist: deck.decklist, format: deck.format }]))}`;
  const goldfishPath = `/goldfish?deck=${encodeURIComponent(deck.id)}&custom=${encodeURIComponent(encodeCustomDecks([{ label: deck.title, decklist: deck.decklist, format: deck.format }]))}`;
  const sectionCounts = {
    main: deck.decklist.main.reduce((sum, line) => sum + line.quantity, 0),
    material: deck.decklist.material.reduce((sum, line) => sum + line.quantity, 0),
    sideboard: deck.decklist.sideboard.reduce((sum, line) => sum + line.quantity, 0),
    maybeboard: deck.maybeboard.reduce((sum, line) => sum + line.quantity, 0),
  };
  const editedSideboardPoints = cardCatalog.length === 0 ? undefined : editedDecklist.sideboard.reduce((sum, line) => sum + line.quantity * sideboardPointCost(catalogByName.get(line.card)), 0);

  return <PageLayout data-component="MyDeckDetail">
    <Link to="/decks/edit" onClick={(event) => { if (!allowNavigation()) event.preventDefault(); }} className="text-sm text-ctp-blue hover:underline">← My Decks</Link>
    <div className="mt-4">
      <UserDeckHeader decklist={deck.decklist} title={deck.title} championName={deck.championName} format={deck.format} visibility={deck.visibility} prominent />
      {renamingTitle ? (
        <form className="mt-2 flex flex-wrap items-center gap-2" onSubmit={(event) => { event.preventDefault(); void saveTitle(); }}>
          <input autoFocus required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Deck title" className="min-w-0 flex-1 max-w-sm rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-1 text-sm text-ctp-text" />
          <button disabled={busy} type="submit" className="rounded bg-ctp-blue px-2.5 py-1 text-xs font-medium text-ctp-base disabled:opacity-50">Save</button>
          <button type="button" onClick={() => { setTitle(deck.title); setRenamingTitle(false); }} className="rounded border border-ctp-surface1 px-2.5 py-1 text-xs text-ctp-subtext1">Cancel</button>
        </form>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ctp-subtext0"><span>{sectionCounts.main} main</span><span>{sectionCounts.material} material</span>{sectionCounts.sideboard > 0 && <span>{sectionCounts.sideboard} sideboard</span>}<span>Updated {new Date(deck.updatedAt).toLocaleDateString()}</span></div>
    </div>
      <div className="mt-5 flex flex-wrap items-center gap-2">{!editing && <button type="button" onClick={startEditing} className="min-h-12 shrink-0 rounded-lg bg-ctp-blue px-4 py-2 text-sm font-medium text-ctp-base">Edit deck</button>}<Link to={goldfishPath} onClick={(event) => { if (!allowNavigation()) event.preventDefault(); else trackEvent("deck_workflow_opened", { action: "test" }); }} className="min-h-12 inline-flex items-center border border-ctp-surface1 rounded-lg px-3 py-2.5 text-sm text-ctp-subtext1 hover:bg-ctp-mantle">Goldfish test</Link><details className="relative"><summary className="flex min-h-12 cursor-pointer list-none items-center rounded-lg border border-ctp-surface1 px-4 py-2 text-sm font-medium text-ctp-subtext1 [&::-webkit-details-marker]:hidden">More</summary><div className="absolute left-0 top-full z-30 mt-2 grid min-w-52 gap-1 rounded-xl border border-ctp-surface1 bg-ctp-base p-2 shadow-xl"><Link to={`/deck-builder?improveDeck=${encodeURIComponent(deck.id)}`} onClick={(event) => { if (!allowNavigation()) event.preventDefault(); else trackEvent("deck_workflow_opened", { action: "tune" }); }} className="rounded-lg px-3 py-2.5 text-sm text-ctp-subtext1 hover:bg-ctp-mantle">Tune in builder</Link><Link to={`/match-log?deck=${encodeURIComponent(deck.id)}`} onClick={(event) => { if (!allowNavigation()) event.preventDefault(); else trackEvent("deck_workflow_opened", { action: "record" }); }} className="rounded-lg px-3 py-2.5 text-sm text-ctp-blue hover:bg-ctp-mantle">Record a match</Link><Link to={comparePath} className="rounded-lg px-3 py-2.5 text-sm text-ctp-subtext1 hover:bg-ctp-mantle">Compare decks</Link>{deck.publicSlug && deck.visibility !== "private" && <Link to={`/decks/${deck.publicSlug}`} className="rounded-lg px-3 py-2.5 text-sm text-ctp-subtext1 hover:bg-ctp-mantle">View shared deck</Link>}<div className="my-1 border-t border-ctp-surface1" /><button type="button" onClick={() => setRenamingTitle(true)} className="rounded-lg px-3 py-2.5 text-left text-sm text-ctp-subtext1 hover:bg-ctp-mantle">Rename</button><button type="button" onClick={() => setTab("manage")} className="rounded-lg px-3 py-2.5 text-left text-sm text-ctp-subtext1 hover:bg-ctp-mantle">Details &amp; sharing</button></div></details></div>
    {editing && tab !== "decklist" && <button type="button" onClick={() => setTab("decklist")} className="mt-4 min-h-12 rounded-lg border border-ctp-blue px-3 text-sm text-ctp-blue">Return to card draft{hasUnsavedChanges ? " · Unsaved changes" : ""}</button>}
    <div className="mt-6"><Tabs tabs={DECK_TABS} active={tab} onChange={setTab} label="Deck details" baseId="owned-deck" /></div>
    {error && <Panel tone="danger" padding="sm" className="mt-4 text-sm text-ctp-red">{error}</Panel>}

    {tab === "manage" && <section id="owned-deck-panel-manage" role="tabpanel" aria-labelledby="owned-deck-tab-manage" tabIndex={0} className="mt-6 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4">
      <h2 className="font-semibold text-ctp-text">Details and sharing</h2>
      <form className="mt-3 space-y-2" onSubmit={(event) => { event.preventDefault(); void run(async () => { const tags = tagsText.split(",").map((tag) => tag.trim()).filter(Boolean); if (tags.length > 8) throw new Error("Use no more than 8 tags."); if (tags.some((tag) => tag.length < 2 || tag.length > 24)) throw new Error("Each tag must be 2–24 characters."); await accountApi.updateDeckMetadata(deck.id, { title, description, tags }); await refresh(); }); }}>
        <input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Deck title" className="w-full rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm" />
        <textarea rows={3} maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe this deck (optional)" className="w-full rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm" />
        <input value={tagsText} onChange={(event) => setTagsText(event.target.value)} placeholder="Tags separated by commas (up to 8)" aria-label="Deck tags" className="w-full rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm" />
        <p className="text-xs text-ctp-subtext0">Each tag must be 2–24 characters. Examples: Control, Tournament, Budget.</p>
        <button disabled={busy} type="submit" className="rounded border border-ctp-surface1 px-3 py-1.5 text-sm disabled:opacity-50">Save details</button>
      </form>
      <div className="mt-4 border-t border-ctp-surface1 pt-4">
        <label className="text-sm text-ctp-subtext1" htmlFor="deck-visibility">Who can view this deck?</label>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select id="deck-visibility" value={deck.visibility} disabled={busy} onChange={(event) => void run(async () => { const visibility = event.target.value as SavedDeckDetail["visibility"]; await accountApi.publishDeck(deck.id, visibility); trackEvent("deck_published", { visibility }); await refresh(); })} className="rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm">
            <option value="private">Private</option><option value="unlisted">Unlisted – link only</option><option value="public">Public</option>
          </select>
          {deck.publicSlug && deck.visibility !== "private" && <><Link to={`/decks/${deck.publicSlug}`} className="rounded border border-ctp-blue px-3 py-1.5 text-sm text-ctp-blue">View published deck</Link><button type="button" onClick={() => void navigator.clipboard.writeText(`${window.location.origin}/decks/${deck.publicSlug}`).then(() => setNotice("Deck link copied."), () => setError("Could not copy the deck link. Please copy it from the address bar."))} className="rounded border border-ctp-surface1 px-3 py-1.5 text-sm">Copy link</button></>}
        </div>
        <p className="mt-2 text-xs text-ctp-subtext0">New decks are public by default. Once a deck is Public or Unlisted, its link always reflects your latest saved edits – set it to Private to take it down.</p>
      </div>
    </section>}
    {tab === "performance" && <section id="owned-deck-panel-performance" role="tabpanel" aria-labelledby="owned-deck-tab-performance" tabIndex={0}><UserDeckStats decklist={deck.decklist} championName={deck.championName} format={deck.format} title={deck.title} ownerDeckId={deck.id} previousDecklist={previousDecklist} /><DeckMatchLogSummary deckId={deck.id} /></section>}
    {tab === "decklist" && <section id="owned-deck-panel-decklist" role="tabpanel" aria-labelledby="owned-deck-tab-decklist" tabIndex={0}><UserDecklistPanel decklist={deck.decklist} format={deck.format} ownerDeckId={editing ? undefined : deck.id} collectionSource={editing ? undefined : `Deck: ${deck.title}`} showBuilderAction={false} showAnalysis={false}>
      {editing ? <div className="mt-3">
        <div className="mb-3"><h2 className="text-lg font-semibold text-ctp-text">Edit cards</h2><p className="mt-1 text-xs text-ctp-subtext1">Use −/+ for one card, or tap several card images and update them together.</p></div>
        <div className="flex flex-wrap items-center justify-between gap-2"><EditorModeSwitch value={editorMode} onChange={setEditorMode} label="Deck editing mode" /><button type="button" onClick={() => { setCardInput(""); setBrowserOpen(true); }} className="min-h-12 rounded-lg bg-ctp-blue px-4 text-sm font-medium text-ctp-base">Add cards</button></div>
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-ctp-surface1 bg-ctp-base p-2"><span className="mr-auto text-xs text-ctp-subtext1">{hasUnsavedChanges ? "Draft saved on this device" : "No unsaved changes"}</span><button type="button" disabled={editHistory.past.length === 0} onClick={undoEdit} className="min-h-12 rounded-md border border-ctp-surface1 px-3 text-xs disabled:opacity-40">Undo</button><button type="button" disabled={editHistory.future.length === 0} onClick={redoEdit} className="min-h-12 rounded-md border border-ctp-surface1 px-3 text-xs disabled:opacity-40">Redo</button></div>
        <div className="mb-4 rounded-lg border border-ctp-surface1 bg-ctp-base p-3"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Section balance</p><DeckSectionBalance compact sideboardPoints={editedSideboardPoints} counts={{ main: editedDecklist.main.reduce((sum, line) => sum + line.quantity, 0), material: editedDecklist.material.reduce((sum, line) => sum + line.quantity, 0), sideboard: editedDecklist.sideboard.reduce((sum, line) => sum + line.quantity, 0) }} /></div>
        {browserOpen && <EditorDialog count={EDIT_SECTIONS.reduce((sum, { key }) => sum + editedDecklist[key].reduce((n, line) => n + line.quantity, 0), 0)} onDismiss={() => setBrowserOpen(false)}><CardBrowser format={deck.format} query={cardInput} onQuery={setCardInput} destination={addDestination} onDestination={setAddDestination} names={cardNames} catalog={catalogByName} deck={{ ...editedDecklist, maybeboard: maybeboardLines }} onEdit={applySharedEdit} /></EditorDialog>}
        {editingValidation.status === "Illegal" && <div role="status" className="mt-3 rounded-lg border border-ctp-yellow/40 p-3 text-sm text-ctp-yellow">{editingValidation.reasons.map((reason) => <p key={reason}>{reason}</p>)}</div>}

        <div className="mt-4">{editorMode === "text" ? <label className="block text-sm">Deck list text<textarea aria-label="Deck list text" rows={18} value={deckText} onChange={event => commitEdit(event.target.value)} className="mt-2 w-full rounded-md border border-ctp-surface1 bg-ctp-base p-4 font-mono text-sm" /></label> : <EditableDecklistGrid onPrintings={(section, name, printings) => applySharedEdit({ type: "printings", section, name, printings })} format={deck.format} decklist={editedDecklist} cardsByName={editedCardsByName} onChangeQuantity={changeEditedQuantity} onAdjustSelected={adjustSelectedCards} onSetSelected={setSelectedCardsQuantity} onMoveSelected={moveSelectedCards} onRemoveSelected={removeSelectedCards} onMove={moveEditedCard} onRemove={removeEditedCard} />}</div>
        <details className="group mt-3 rounded-lg border border-ctp-surface1 bg-ctp-mantle p-3">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-sm font-medium text-ctp-subtext1 [&::-webkit-details-marker]:hidden">Bulk tools<DisclosureChevron className="group-open:rotate-180" /></summary>
          <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-ctp-subtext1" htmlFor="my-deck-trim-max">Trim every card to at most</label>
          <input id="my-deck-trim-max" type="number" min={1} max={4} value={trimMax} onChange={(event) => { const next = Number(event.target.value); if (Number.isInteger(next)) setTrimMax(Math.max(1, Math.min(4, next))); }} className="w-14 rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-1 text-xs text-ctp-text" />
          <button type="button" disabled={trimPreview.affected.length === 0} onClick={() => trimToMaxCopies(trimMax)} className="min-h-12 rounded-md border border-ctp-surface1 px-2.5 py-1 text-xs text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-text disabled:opacity-40">Apply trim</button>
          </div>
          <p className="mt-2 text-xs text-ctp-subtext0">{trimPreview.affected.length === 0 ? `No cards exceed ${trimMax}×.` : `${trimPreview.affected.length} card${trimPreview.affected.length === 1 ? "" : "s"} will lose ${trimPreview.copiesRemoved} total cop${trimPreview.copiesRemoved === 1 ? "y" : "ies"}: ${trimPreview.affected.slice(0, 4).map((line) => `${line.card} ${line.quantity}×→${trimMax}×`).join(" · ")}${trimPreview.affected.length > 4 ? ` · +${trimPreview.affected.length - 4} more` : ""}`}</p>

        </details>
        <DeckSaveBar busy={busy} changedEntries={editedCardChangeCount + (maybeboardText !== savedMaybeboardText ? 1 : 0)} currentChampion={deck.championName} detectedChampion={editedChampionName} detailsOpen={saveDetailsOpen} saveAsNewVersion={saveAsNewVersion} changeNote={changeNote} onDetailsOpenChange={setSaveDetailsOpen} onSaveModeChange={setSaveAsNewVersion} onChangeNote={setChangeNote} onCancel={cancelEditing} onSave={saveEditedDeck} />
      </div> : undefined}
    </UserDecklistPanel>
      {/* Supplement the decklist; panel children replace it with the editor while editing. */}
      <MaybeboardPanel onPrintings={(name, printings) => applySharedEdit({ type: "printings", section: "maybeboard", name, printings })} open={maybeboardOpen} onOpenChange={setMaybeboardOpen} format={deck.format} editing={editing} busy={busy} maybeboardText={maybeboardText} maybeboardLines={maybeboardLines} cardsByName={catalogByName} onMoveAll={addMaybeboardToEditor} onSave={() => void saveMaybeboard()} onChangeQuantity={changeMaybeboardQuantity} onMove={moveMaybeboardCard} onRemove={removeMaybeboardCard} onTextChange={text => editing ? commitEdit(deckText, text) : setMaybeboardText(text)} />
    </section>}
    <div hidden={tab !== "primer"}><DeckPrimerEditor decklist={deck.decklist} primerMarkdown={primerMarkdown} setPrimerMarkdown={setPrimerMarkdown} savedMarkdown={deck.primerMarkdown} busy={busy} onSave={() => run(async () => { await accountApi.updateDeckMetadata(deck.id, { primerMarkdown }); await refresh(); })} /></div>
    {tab === "history" && <section id="owned-deck-panel-history" role="tabpanel" aria-labelledby="owned-deck-tab-history" tabIndex={0}><DeckVersionHistory key={`${deck.id}:${deck.revision}`} deck={deck} busy={busy} onRestore={restoreVersion} /></section>}
  </PageLayout>;
}
