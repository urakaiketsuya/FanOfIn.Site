import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { OmnidexDecklist, OmnidexDecklistCardLine, SavedDeckDetail } from "@gatcg/shared";
import { accountApi, AccountApiError } from "../../lib/accountApi";
import { trackEvent } from "../../lib/analytics";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { buildDecklistText } from "../events/DecklistView";
import { parseDecklist } from "../compare/parseDecklist";
import { useCardsByNames } from "../events/useCardsByNames";
import { useCardCatalog } from "../cards/useCardCatalog";
import { findDeckChampionName } from "../../lib/ttsExport";
import UserDeckHeader from "./UserDeckHeader";
import UserDecklistPanel from "./UserDecklistPanel";
import PageLayout from "../../components/layout/PageLayout";
import UserDeckStats from "./UserDeckStats";
import DeckTags from "./DeckTags";
import PrimerMarkdown from "./PrimerMarkdown";
import Tabs from "../../components/ui/Tabs";
import { useTabParam } from "../../lib/useTabParam";
import Panel from "../../components/ui/Panel";
import { EmptyState, InlineState } from "../../components/ui/ContentState";
import DeckVisualStrip from "./DeckVisualStrip";
import { encodeCustomDecks } from "../../lib/compareShareLink";
import DeckSectionBalance from "./DeckSectionBalance";
import { sideboardPointCost } from "../deckbuilder/validateDeck";
import CardSearchPicker from "../../components/CardSearchPicker";
import { EditableDecklistGrid, EDIT_SECTIONS, MaybeboardCardTile, type DeckSectionKey } from "./SavedDeckCardEditor";
import DeckSaveBar from "./DeckSaveBar";

type DeckTab = "overview" | "decklist" | "analysis" | "primer" | "versions" | "settings";
const DECK_TABS = [{ key: "overview", label: "Overview" }, { key: "decklist", label: "Decklist" }, { key: "analysis", label: "Improve" }, { key: "primer", label: "Primer" }, { key: "versions", label: "History" }] satisfies { key: DeckTab; label: string }[];
const DECK_TAB_KEYS: DeckTab[] = [...DECK_TABS.map(({ key }) => key), "settings"];

export default function MyDeckDetail() {
  const { id: deckId = "" } = useParams<{ id: string }>();
  const [deck, setDeck] = useState<SavedDeckDetail | null>();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [deckText, setDeckText] = useState("");
  const [maybeboardText, setMaybeboardText] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const [saveAsNewVersion, setSaveAsNewVersion] = useState(false);
  const [saveDetailsOpen, setSaveDetailsOpen] = useState(false);
  const [trimMax, setTrimMax] = useState(3);
  const [renamingTitle, setRenamingTitle] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [primerMarkdown, setPrimerMarkdown] = useState("");
  const [comboBuilderOpen, setComboBuilderOpen] = useState(false);
  const [comboTitle, setComboTitle] = useState("");
  const [comboAnchor, setComboAnchor] = useState("");
  const [comboOptions, setComboOptions] = useState<string[]>([]);
  const [tagsText, setTagsText] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [tab, setTab] = useTabParam<DeckTab>("tab", DECK_TAB_KEYS, "overview");
  const [cardInput, setCardInput] = useState("");
  const [addDestination, setAddDestination] = useState<"automatic" | "sideboard" | "maybeboard">("automatic");
  const cardCatalog = useCardCatalog();
  const catalogByName = useMemo(() => new Map(cardCatalog.map((card) => [card.name, card])), [cardCatalog]);
  const cardNames = useMemo(() => Array.from(new Set(cardCatalog.map((card) => card.name))).sort(), [cardCatalog]);
  const cardNameSet = useMemo(() => new Set(cardNames), [cardNames]);
  const primerMainCardNames = useMemo(() => deck?.decklist.main.map((line) => line.card).sort() ?? [], [deck]);
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
    const quantities = (decklist: OmnidexDecklist) => new Map(EDIT_SECTIONS.flatMap(({ key }) => decklist[key].map((line) => [`${key}:${line.card}`, line.quantity] as const)));
    const before = quantities(deck.decklist);
    const after = quantities(editedDecklist);
    return new Set([...before.keys(), ...after.keys()]).size === 0 ? 0 : [...new Set([...before.keys(), ...after.keys()])].filter((key) => before.get(key) !== after.get(key)).length;
  }, [deck, editedDecklist]);
  const previousDecklist = useMemo(() => {
    if (!deck) return undefined;
    const current = deck.versions.find((version) => version.id === deck.currentVersionId);
    if (!current) return undefined;
    return deck.versions.filter((version) => version.versionNumber < current.versionNumber).sort((a, b) => b.versionNumber - a.versionNumber)[0]?.decklist;
  }, [deck]);
  useDocumentTitle(deck?.title ?? "Saved Deck", "View a saved deck and its version history.");

  useEffect(() => {
    let active = true;
    void accountApi.deck(deckId).then(({ deck: result }) => {
      if (active) { setDeck(result); setTitle(result.title); setDescription(result.description); setPrimerMarkdown(result.primerMarkdown); setTagsText(result.tags.join(", ")); setMaybeboardText(result.maybeboard.map((line) => `${line.quantity}x ${line.card}`).join("\n")); }
    }).catch((reason: unknown) => {
      if (!active) return;
      setError(reason instanceof AccountApiError && reason.status === 401 ? "Sign in to view this deck." : reason instanceof Error ? reason.message : "Deck could not be loaded");
      setDeck(null);
    });
    return () => { active = false; };
  }, [deckId]);

  async function saveMaybeboard() {
    const maybeboard = maybeboardLines;
    await run(async () => {
      await accountApi.updateDeckMetadata(deckId, { maybeboard });
      setDeck((current) => current ? { ...current, maybeboard } : current);
      setNotice("Maybeboard saved.");
    });
  }

  function setMaybeboardLines(lines: OmnidexDecklistCardLine[]) {
    setMaybeboardText(lines.map((line) => `${line.quantity}x ${line.card}`).join("\n"));
  }

  function changeMaybeboardQuantity(name: string, quantity: number) {
    setMaybeboardLines(maybeboardLines.map((line) => line.card === name ? { ...line, quantity } : line));
  }

  function removeMaybeboardCard(name: string) {
    setMaybeboardLines(maybeboardLines.filter((line) => line.card !== name));
  }

  function moveMaybeboardCard(line: OmnidexDecklistCardLine) {
    const nextDecklist = editing ? parseDecklist(deckText).decklist : structuredClone(deck!.decklist);
    const card = catalogByName.get(line.card);
    const section: DeckSectionKey = card && (card.types.includes("CHAMPION") || card.types.includes("REGALIA")) ? "material" : "main";
    const existing = nextDecklist[section].find((candidate) => candidate.card === line.card);
    if (existing) existing.quantity += line.quantity;
    else nextDecklist[section].push({ ...line });
    setDeckText(buildDecklistText(nextDecklist));
    removeMaybeboardCard(line.card);
    setEditing(true);
    setNotice(`${line.card} moved to the ${section} editor. Save deck changes to apply it.`);
  }

  // Mirrors the Guided Deck Builder's "Destination: Automatic/Sideboard/Maybeboard" convention
  // (DeckBuilderIndex.tsx's own addCard) so the same choice means the same thing in both editors.
  // Maybeboard has its own persistence path (updateDeckMetadata), independent of decklist version
  // history, matching saveMaybeboard()/addMaybeboardToEditor() below.
  function addCard(name: string) {
    if (!cardNameSet.has(name)) return;
    const card = cardCatalog.find((candidate) => candidate.name === name);
    const isMaterial = card ? card.types.includes("CHAMPION") || card.types.includes("REGALIA") : false;
    const defaultQty = isMaterial ? 1 : 4;
    if (addDestination === "maybeboard") {
      const maybeboard = parseDecklist(`Main\n${maybeboardText}`).decklist.main;
      const existing = maybeboard.find((line) => line.card === name);
      if (existing) existing.quantity += defaultQty;
      else maybeboard.push({ card: name, quantity: defaultQty });
      setMaybeboardText(maybeboard.map((line) => `${line.quantity}x ${line.card}`).join("\n"));
      setCardInput("");
      setAddDestination("automatic");
      void run(async () => {
        await accountApi.updateDeckMetadata(deckId, { maybeboard });
        setDeck((current) => (current ? { ...current, maybeboard } : current));
        setNotice(`${name} added to the maybeboard.`);
      });
      return;
    }
    const section = addDestination === "sideboard" ? "sideboard" : isMaterial ? "material" : "main";
    const decklist = parseDecklist(deckText).decklist;
    const existing = decklist[section].find((line) => line.card === name);
    if (existing) existing.quantity += defaultQty;
    else decklist[section].push({ card: name, quantity: defaultQty });
    setDeckText(buildDecklistText(decklist));
    setCardInput("");
    setAddDestination("automatic");
  }

  function startEditing() {
    setDeckText(buildDecklistText(deck!.decklist));
    setSaveAsNewVersion(false);
    setSaveDetailsOpen(false);
    setEditing(true);
    setTab("decklist");
  }

  function cancelEditing() {
    setDeckText(buildDecklistText(deck!.decklist));
    setCardInput("");
    setAddDestination("automatic");
    setEditing(false);
  }

  function saveEditedDeck() {
    void run(async () => {
      if (editedChampionName !== deck!.championName && !window.confirm(`Change Champion from ${deck!.championName ?? "none"} to ${editedChampionName ?? "none"}?`)) return;
      if (saveAsNewVersion) await accountApi.createDeckVersion(deck!.id, { decklist: editedDecklist, format: deck!.format, championName: editedChampionName, changeNote });
      else await accountApi.updateDeckDecklist(deck!.id, { decklist: editedDecklist, format: deck!.format, championName: editedChampionName });
      await accountApi.updateDeckMetadata(deck!.id, { maybeboard: maybeboardLines });
      trackEvent(saveAsNewVersion ? "deck_version_saved" : "deck_updated");
      await refresh(); setChangeNote(""); setSaveDetailsOpen(false); setEditing(false);
      setNotice(saveAsNewVersion ? "Saved as a new version." : "Deck updated.");
    });
  }

  // Grid tiles edit the same `deckText` the raw textarea and "Add card" bar above it read/write,
  // so all three stay in sync automatically.
  function changeEditedQuantity(section: DeckSectionKey, name: string, quantity: number) {
    const decklist = parseDecklist(deckText).decklist;
    const line = decklist[section].find((l) => l.card === name);
    if (line) line.quantity = quantity;
    setDeckText(buildDecklistText(decklist));
  }

  function moveEditedCard(from: DeckSectionKey, to: DeckSectionKey, name: string) {
    if (from === to) return;
    const decklist = parseDecklist(deckText).decklist;
    const line = decklist[from].find((candidate) => candidate.card === name);
    if (!line) return;
    decklist[from] = decklist[from].filter((candidate) => candidate.card !== name);
    const existing = decklist[to].find((candidate) => candidate.card === name);
    if (existing) existing.quantity += line.quantity;
    else decklist[to].push({ ...line });
    setDeckText(buildDecklistText(decklist));
    setNotice(`${name} moved to ${to}.`);
  }

  function removeEditedCard(section: DeckSectionKey, name: string) {
    const decklist = parseDecklist(deckText).decklist;
    decklist[section] = decklist[section].filter((l) => l.card !== name);
    setDeckText(buildDecklistText(decklist));
  }

  // Only ever lowers a count (min, never max) — a card whose own legal limit is already below
  // `max` (e.g. a UNIQUE 1-of) is left untouched, never bumped up to match.
  function trimToMaxCopies(max: number) {
    const decklist = parseDecklist(deckText).decklist;
    for (const section of EDIT_SECTIONS) for (const line of decklist[section.key]) line.quantity = Math.min(line.quantity, max);
    setDeckText(buildDecklistText(decklist));
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
    const nextDecklist = editing ? parseDecklist(deckText).decklist : structuredClone(deck!.decklist);
    for (const line of maybeboardLines) {
      const card = catalogByName.get(line.card);
      const section: DeckSectionKey = card && (card.types.includes("CHAMPION") || card.types.includes("REGALIA")) ? "material" : "main";
      const existing = nextDecklist[section].find((candidate) => candidate.card === line.card);
      if (existing) existing.quantity += line.quantity;
      else nextDecklist[section].push({ ...line });
    }
    setDeckText(buildDecklistText(nextDecklist));
    setMaybeboardLines([]);
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
    setMaybeboardText(result.deck.maybeboard.map((line) => `${line.quantity}x ${line.card}`).join("\n"));
    setDeckText(buildDecklistText(result.deck.decklist));
  }

  async function run(action: () => Promise<void>) {
    setBusy(true); setError(null);
    try { await action(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Something went wrong"); }
    finally { setBusy(false); }
  }

  function addPrimerHighlight(kind: "combo" | "package") {
    const template = kind === "combo" ? ":::combo Combo name\n- Card A\n- Card B\n\nExplain how the interaction works.\n:::" : ":::package Package name\n- 3x Card A\n- 2x Card B\n\nExplain the package's role and when to use it.\n:::";
    setPrimerMarkdown((current) => `${current}${current.trim() ? "\n\n" : ""}${template}`);
  }

  function insertConditionalCombo() {
    const options = comboOptions.filter((name) => name !== comboAnchor);
    if (!comboAnchor || options.length === 0) return;
    const title = comboTitle.trim() || `${comboAnchor} combo`;
    const block = `:::combo ${title}\n- ${comboAnchor}\n- one of: ${options.join(" | ")}\n\nExplain how the interaction works.\n:::`;
    setPrimerMarkdown((current) => `${current}${current.trim() ? "\n\n" : ""}${block}`);
    setComboBuilderOpen(false);
    setComboTitle("");
    setComboAnchor("");
    setComboOptions([]);
  }

  if (deck === undefined) return <PageLayout data-component="MyDeckDetail"><InlineState className="mt-10">Loading deck…</InlineState></PageLayout>;
  if (!deck) return <PageLayout data-component="MyDeckDetail"><EmptyState title="Deck unavailable" description={error} action={<Link to="/decks/edit" className="text-ctp-blue hover:underline">Back to My Decks</Link>} /></PageLayout>;
  const comparePath = `/compare?custom=${encodeURIComponent(encodeCustomDecks([{ label: deck.title, decklist: deck.decklist, format: deck.format }]))}`;
  const goldfishPath = `/goldfish?custom=${encodeURIComponent(encodeCustomDecks([{ label: deck.title, decklist: deck.decklist, format: deck.format }]))}`;
  const sectionCounts = {
    main: deck.decklist.main.reduce((sum, line) => sum + line.quantity, 0),
    material: deck.decklist.material.reduce((sum, line) => sum + line.quantity, 0),
    sideboard: deck.decklist.sideboard.reduce((sum, line) => sum + line.quantity, 0),
    maybeboard: deck.maybeboard.reduce((sum, line) => sum + line.quantity, 0),
  };
  const sideboardPoints = cardCatalog.length === 0 ? undefined : deck.decklist.sideboard.reduce((sum, line) => sum + line.quantity * sideboardPointCost(catalogByName.get(line.card)), 0);
  const editedSideboardPoints = cardCatalog.length === 0 ? undefined : editedDecklist.sideboard.reduce((sum, line) => sum + line.quantity * sideboardPointCost(catalogByName.get(line.card)), 0);

  return <PageLayout data-component="MyDeckDetail">
    <Link to="/decks/edit" className="text-sm text-ctp-blue hover:underline">← My Decks</Link>
    <div className="mt-4">
      <UserDeckHeader title={deck.title} championName={deck.championName} format={deck.format} description={deck.description} visibility={deck.visibility} />
      {renamingTitle ? (
        <form className="mt-2 flex flex-wrap items-center gap-2" onSubmit={(event) => { event.preventDefault(); void saveTitle(); }}>
          <input autoFocus required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Deck title" className="min-w-0 flex-1 max-w-sm rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-1 text-sm text-ctp-text" />
          <button disabled={busy} type="submit" className="rounded bg-ctp-blue px-2.5 py-1 text-xs font-medium text-ctp-base disabled:opacity-50">Save</button>
          <button type="button" onClick={() => { setTitle(deck.title); setRenamingTitle(false); }} className="rounded border border-ctp-surface1 px-2.5 py-1 text-xs text-ctp-subtext1">Cancel</button>
        </form>
      ) : (
        <button type="button" onClick={() => setRenamingTitle(true)} className="mt-2 text-xs font-medium text-ctp-blue hover:underline">Rename deck</button>
      )}
      <DeckTags tags={deck.tags} /><div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2"><p className="text-xs text-ctp-subtext0">Updated {new Date(deck.updatedAt).toLocaleDateString()} · {deck.versions.length} version{deck.versions.length === 1 ? "" : "s"}</p>{deck.publicSlug && deck.visibility !== "private" && <Link to={`/decks/${deck.publicSlug}`} className="text-sm font-medium text-ctp-blue hover:underline">{deck.visibility === "public" ? "View public deck →" : "View shared deck →"}</Link>}</div>
    </div>
    <div className="mt-5 flex items-center gap-2">{!editing && <button type="button" onClick={startEditing} className="shrink-0 rounded-md bg-ctp-blue px-3 py-2 text-sm font-medium text-ctp-base">Edit deck</button>}<details className="relative"><summary className="cursor-pointer list-none rounded-md border border-ctp-surface1 px-3 py-2 text-sm font-medium text-ctp-subtext1 [&::-webkit-details-marker]:hidden">More</summary><div className="absolute left-0 top-full z-30 mt-2 grid min-w-48 gap-1 rounded-lg border border-ctp-surface1 bg-ctp-base p-2 shadow-xl"><Link to={`/deck-builder?improveDeck=${encodeURIComponent(deck.id)}`} className="rounded px-3 py-2 text-sm text-ctp-subtext1 hover:bg-ctp-mantle">Tune in builder</Link><Link to={comparePath} className="rounded px-3 py-2 text-sm text-ctp-subtext1 hover:bg-ctp-mantle">Compare</Link><Link to={goldfishPath} className="rounded px-3 py-2 text-sm text-ctp-subtext1 hover:bg-ctp-mantle">Goldfish test</Link></div></details><button type="button" onClick={() => setTab("settings")} className="ml-auto rounded-md px-3 py-2 text-sm text-ctp-subtext1 hover:bg-ctp-mantle hover:text-ctp-text">Settings</button></div>
    <div className="mt-6"><Tabs tabs={DECK_TABS} active={tab === "settings" ? "overview" : tab} onChange={setTab} label="Deck details" baseId="owned-deck" /></div>
    {error && <Panel tone="danger" padding="sm" className="mt-4 text-sm text-ctp-red">{error}</Panel>}
    {notice && <Panel tone="success" padding="sm" className="mt-4 text-sm text-ctp-green">{notice}</Panel>}
    {tab === "overview" && <section id="owned-deck-panel-overview" role="tabpanel" aria-labelledby="owned-deck-tab-overview" tabIndex={0} className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)]">
      <Panel><h2 className="text-lg font-semibold text-ctp-text">Deck at a glance</h2><DeckVisualStrip decklist={deck.decklist} championName={deck.championName} /><DeckSectionBalance counts={sectionCounts} sideboardPoints={sideboardPoints} maybeboard={sectionCounts.maybeboard} /></Panel>
      <Panel><h2 className="text-lg font-semibold text-ctp-text">Explore this deck</h2><div className="mt-3 space-y-2"><Link to={`/deck-analysis?deck=${encodeURIComponent(deck.id)}`} className="block rounded-lg border border-ctp-surface1 px-3 py-2.5 text-sm text-ctp-subtext1 hover:border-ctp-blue">Analyze deck</Link><Link to={`/combo-lab?deck=${encodeURIComponent(deck.id)}`} className="block rounded-lg border border-ctp-surface1 px-3 py-2.5 text-sm text-ctp-subtext1 hover:border-ctp-mauve">Test combos</Link><Link to={`/deck-review?deck=${encodeURIComponent(deck.id)}`} className="block rounded-lg border border-ctp-surface1 px-3 py-2.5 text-sm text-ctp-subtext1 hover:border-ctp-blue">Review suggestions</Link></div><p className="mt-4 text-xs text-ctp-subtext0">{deck.versions.length} version{deck.versions.length === 1 ? "" : "s"} · Updated {new Date(deck.updatedAt).toLocaleDateString()}</p></Panel>
    </section>}
    {tab === "settings" && <section id="owned-deck-panel-settings" role="tabpanel" aria-labelledby="owned-deck-tab-settings" tabIndex={0} className="mt-6 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4">
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
            <option value="private">Private</option><option value="unlisted">Unlisted — link only</option><option value="public">Public</option>
          </select>
          {deck.publicSlug && deck.visibility !== "private" && <><Link to={`/decks/${deck.publicSlug}`} className="rounded border border-ctp-blue px-3 py-1.5 text-sm text-ctp-blue">View published deck</Link><button type="button" onClick={() => void navigator.clipboard.writeText(`${window.location.origin}/decks/${deck.publicSlug}`).then(() => setNotice("Deck link copied."), () => setError("Could not copy the deck link. Please copy it from the address bar."))} className="rounded border border-ctp-surface1 px-3 py-1.5 text-sm">Copy link</button></>}
        </div>
        <p className="mt-2 text-xs text-ctp-subtext0">New decks are public by default. Once a deck is Public or Unlisted, its link always reflects your latest saved edits — set it to Private to take it down.</p>
      </div>
    </section>}
    {tab === "analysis" && <section id="owned-deck-panel-analysis" role="tabpanel" aria-labelledby="owned-deck-tab-analysis" tabIndex={0}><UserDeckStats decklist={deck.decklist} championName={deck.championName} format={deck.format} title={deck.title} ownerDeckId={deck.id} previousDecklist={previousDecklist} /></section>}
    {tab === "decklist" && <><UserDecklistPanel decklist={deck.decklist} format={deck.format} ownerDeckId={editing ? undefined : deck.id} collectionSource={editing ? undefined : `Deck: ${deck.title}`}>
      {editing ? <div className="mt-3 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-0">
        <div className="mb-3"><h2 className="text-lg font-semibold text-ctp-text">Edit cards</h2><p className="mt-1 text-xs text-ctp-subtext1">Search for a card, then adjust quantities directly in each section.</p></div>
        <div className="mb-4 rounded-lg border border-ctp-surface1 bg-ctp-base p-3"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Section balance</p><DeckSectionBalance compact sideboardPoints={editedSideboardPoints} counts={{ main: editedDecklist.main.reduce((sum, line) => sum + line.quantity, 0), material: editedDecklist.material.reduce((sum, line) => sum + line.quantity, 0), sideboard: editedDecklist.sideboard.reduce((sum, line) => sum + line.quantity, 0) }} /></div>
        <CardSearchPicker options={cardNames} value={cardInput} onChange={setCardInput} onSelect={addCard} placeholder="Search cards to add…" ariaLabel="Search cards to add" />
        <label className="mt-2 flex items-center justify-between gap-3 text-xs text-ctp-subtext1">Add to<select value={addDestination} onChange={(event) => setAddDestination(event.target.value as typeof addDestination)} aria-label="Card destination" className="rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-2 text-sm text-ctp-text"><option value="automatic">Automatic (recommended)</option><option value="sideboard">Sideboard</option><option value="maybeboard">Maybeboard</option></select></label>
        <details className="mt-3 rounded-lg border border-ctp-surface1 bg-ctp-mantle p-3">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">More editing tools</summary>
          <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-ctp-subtext1" htmlFor="my-deck-trim-max">Trim every card to at most</label>
          <input id="my-deck-trim-max" type="number" min={1} max={4} value={trimMax} onChange={(event) => { const next = Number(event.target.value); if (Number.isInteger(next)) setTrimMax(Math.max(1, Math.min(4, next))); }} className="w-14 rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-1 text-xs text-ctp-text" />
          <button type="button" disabled={trimPreview.affected.length === 0} onClick={() => trimToMaxCopies(trimMax)} className="min-h-10 rounded-md border border-ctp-surface1 px-2.5 py-1 text-xs text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-text disabled:opacity-40">Apply trim</button>
          </div>
          <p className="mt-2 text-xs text-ctp-subtext0">{trimPreview.affected.length === 0 ? `No cards exceed ${trimMax}×.` : `${trimPreview.affected.length} card${trimPreview.affected.length === 1 ? "" : "s"} will lose ${trimPreview.copiesRemoved} total cop${trimPreview.copiesRemoved === 1 ? "y" : "ies"}: ${trimPreview.affected.slice(0, 4).map((line) => `${line.card} ${line.quantity}×→${trimMax}×`).join(" · ")}${trimPreview.affected.length > 4 ? ` · +${trimPreview.affected.length - 4} more` : ""}`}</p>
          <details className="mt-3 border-t border-ctp-surface1 pt-3"><summary className="cursor-pointer text-xs text-ctp-subtext1">Edit as text</summary><textarea rows={18} required value={deckText} onChange={(event) => setDeckText(event.target.value)} className="mt-3 w-full rounded-md border border-ctp-surface1 bg-ctp-base p-4 font-mono text-sm text-ctp-text" /></details>
        </details>
        <div className="mt-4"><EditableDecklistGrid decklist={editedDecklist} cardsByName={editedCardsByName} onChangeQuantity={changeEditedQuantity} onMove={moveEditedCard} onRemove={removeEditedCard} /></div>
        <DeckSaveBar busy={busy} changedEntries={editedCardChangeCount} currentChampion={deck.championName} detectedChampion={editedChampionName} detailsOpen={saveDetailsOpen} saveAsNewVersion={saveAsNewVersion} changeNote={changeNote} onDetailsOpenChange={setSaveDetailsOpen} onSaveModeChange={setSaveAsNewVersion} onChangeNote={setChangeNote} onCancel={cancelEditing} onSave={saveEditedDeck} />
      </div> : undefined}
    </UserDecklistPanel>
      {/* Supplement the decklist; panel children replace it with the editor while editing. */}
      <section className="mt-5 rounded-lg border border-dashed border-ctp-yellow/60 bg-ctp-yellow/5 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-medium text-ctp-yellow">Maybeboard <span className="text-sm font-normal text-ctp-subtext0">({maybeboardLines.reduce((sum, line) => sum + line.quantity, 0)})</span></h3><p className="mt-1 text-xs text-ctp-subtext1">Cards under consideration, outside construction and analysis.</p></div><div className="flex gap-2"><button type="button" disabled={!maybeboardText.trim()} onClick={addMaybeboardToEditor} className="min-h-10 rounded border border-ctp-blue px-2 text-xs text-ctp-blue disabled:opacity-50">Move all to editor</button><button type="button" disabled={busy} onClick={() => void saveMaybeboard()} className="min-h-10 rounded bg-ctp-yellow px-3 text-xs font-medium text-ctp-base disabled:opacity-50">Save maybeboard</button></div></div>
        {maybeboardLines.length > 0 ? <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">{maybeboardLines.map((line) => <MaybeboardCardTile key={line.card} line={line} card={catalogByName.get(line.card)} onChangeQuantity={(quantity) => changeMaybeboardQuantity(line.card, quantity)} onMove={() => moveMaybeboardCard(line)} onRemove={() => removeMaybeboardCard(line.card)} />)}</div> : <InlineState className="mt-3">No cards in the maybeboard.</InlineState>}
        <details className="mt-3"><summary className="cursor-pointer text-xs text-ctp-subtext0">Edit maybeboard as text</summary><textarea rows={5} value={maybeboardText} onChange={(event) => setMaybeboardText(event.target.value)} placeholder={"2x Card to test\n4x Another option"} aria-label="Maybeboard" className="mt-2 w-full rounded-md border border-ctp-surface1 bg-ctp-base p-3 font-mono text-sm" /></details>
        <p className="mt-2 text-xs text-ctp-subtext0">Saved to this deck, independently of version history. It never affects legality, statistics, exports, or publishing.</p>
      </section>
    </>}
    {tab === "primer" && <section id="owned-deck-panel-primer" role="tabpanel" aria-labelledby="owned-deck-tab-primer" tabIndex={0} className="mt-6 grid gap-5 lg:grid-cols-2">
      <form className="rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4" onSubmit={(event) => { event.preventDefault(); void run(async () => { await accountApi.updateDeckMetadata(deck.id, { primerMarkdown }); await refresh(); }); }}>
        <h2 className="font-semibold text-ctp-text">Edit primer</h2><p className="mt-1 text-xs text-ctp-subtext1">Markdown supports headings, lists, links, emphasis, quotes, code blocks, and highlighted deck concepts.</p>
        <div className="mt-3 flex flex-wrap gap-2" aria-label="Insert primer highlight"><button type="button" onClick={() => setComboBuilderOpen((open) => !open)} className="rounded-md border border-ctp-mauve/60 bg-ctp-mauve/10 px-2.5 py-1.5 text-xs text-ctp-mauve">+ Combo</button><button type="button" onClick={() => addPrimerHighlight("package")} className="rounded-md border border-ctp-teal/60 bg-ctp-teal/10 px-2.5 py-1.5 text-xs text-ctp-teal">+ Card package</button></div>
        {comboBuilderOpen && <div className="mt-3 rounded-lg border border-ctp-mauve/40 bg-ctp-mauve/5 p-3"><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-ctp-subtext1">Combo name<input value={comboTitle} onChange={(event) => setComboTitle(event.target.value)} placeholder="Bloom setup" className="mt-1 block w-full rounded-md border border-ctp-surface1 bg-ctp-base px-2.5 py-2 text-sm text-ctp-text" /></label><label className="text-xs text-ctp-subtext1">Required card<select value={comboAnchor} onChange={(event) => { setComboAnchor(event.target.value); setComboOptions((current) => current.filter((name) => name !== event.target.value)); }} className="mt-1 block w-full rounded-md border border-ctp-surface1 bg-ctp-base px-2.5 py-2 text-sm text-ctp-text"><option value="">Choose a card…</option>{primerMainCardNames.map((name) => <option key={name} value={name}>{name}</option>)}</select></label></div><label className="mt-3 block text-xs text-ctp-subtext1">Pair with one or more of<select multiple size={Math.min(6, Math.max(3, primerMainCardNames.length))} value={comboOptions} onChange={(event) => setComboOptions(Array.from(event.target.selectedOptions, (option) => option.value))} className="mt-1 block w-full rounded-md border border-ctp-surface1 bg-ctp-base px-2.5 py-2 text-sm text-ctp-text">{primerMainCardNames.filter((name) => name !== comboAnchor).map((name) => <option key={name} value={name}>{name}</option>)}</select><span className="mt-1 block text-[10px] text-ctp-subtext0">Use Shift or Command/Ctrl to select several alternatives.</span></label><div className="mt-3 flex gap-2"><button type="button" disabled={!comboAnchor || comboOptions.length === 0} onClick={insertConditionalCombo} className="rounded-md bg-ctp-mauve px-3 py-1.5 text-xs font-medium text-ctp-base disabled:opacity-40">Insert combo</button><button type="button" onClick={() => addPrimerHighlight("combo")} className="rounded-md border border-ctp-surface1 px-3 py-1.5 text-xs text-ctp-subtext1">Insert simple template</button></div></div>}
        <textarea rows={24} maxLength={50000} value={primerMarkdown} onChange={(event) => setPrimerMarkdown(event.target.value)} placeholder={"# Game plan\n\nExplain opening turns, key interactions, matchups, and substitutions."} className="mt-3 w-full rounded-md border border-ctp-surface1 bg-ctp-base p-4 font-mono text-sm" />
        <div className="mt-2 flex items-center justify-between gap-3"><span className="text-xs text-ctp-subtext0">{primerMarkdown.length.toLocaleString()} / 50,000</span><button disabled={busy || primerMarkdown === deck.primerMarkdown} type="submit" className="rounded-md bg-ctp-blue px-3 py-2 text-sm text-ctp-base disabled:opacity-50">Save primer</button></div>
      </form>
      <section className="rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4"><h2 className="font-semibold text-ctp-text">Preview</h2><div className="mt-4">{primerMarkdown.trim() ? <PrimerMarkdown markdown={primerMarkdown} decklist={deck.decklist} /> : <p className="text-sm text-ctp-subtext1">Your primer preview will appear here.</p>}</div></section>
    </section>}
    {tab === "versions" && <section id="owned-deck-panel-versions" role="tabpanel" aria-labelledby="owned-deck-tab-versions" tabIndex={0} className="mt-6">
      <h2 className="text-lg font-semibold text-ctp-text">Version history</h2>
      <div className="mt-3 space-y-2">{deck.versions.map((version) => <details key={version.id} className="rounded-lg border border-ctp-surface1 bg-ctp-mantle p-3" open={version.id === deck.currentVersionId}>
        <summary className="cursor-pointer text-sm"><span className="font-medium">Version {version.versionNumber}</span><span className="ml-2 text-ctp-subtext1">{new Date(version.createdAt).toLocaleString()} · {version.changeNote || "Deck updated"}</span>{version.id === deck.currentVersionId && <span className="ml-2 text-ctp-green">Current</span>}</summary>
        <UserDecklistPanel decklist={version.decklist} format={version.format} />
        {version.id !== deck.currentVersionId && <button disabled={busy} type="button" onClick={() => void run(async () => { await accountApi.restoreDeckVersion(deck.id, version.id); await refresh(); })} className="mt-2 rounded border border-ctp-blue px-2 py-1 text-xs text-ctp-blue disabled:opacity-50">Restore as new version</button>}
      </details>)}</div>
    </section>}
  </PageLayout>;
}
