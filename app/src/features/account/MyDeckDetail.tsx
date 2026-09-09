import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Card, OmnidexDecklist, OmnidexDecklistCardLine, SavedDeckDetail } from "@gatcg/shared";
import { accountApi, AccountApiError } from "../../lib/accountApi";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { buildDecklistText } from "../events/DecklistView";
import { parseDecklist } from "../compare/parseDecklist";
import { useCardsByNames } from "../events/useCardsByNames";
import { useCardCatalog } from "../cards/useCardCatalog";
import { findDeckChampionName } from "../../lib/ttsExport";
import CardImage from "../../components/CardImage";
import CardHoverPreview from "../../components/CardHoverPreview";
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

type DeckTab = "overview" | "decklist" | "analysis" | "primer" | "versions" | "settings";
const DECK_TABS = [{ key: "overview", label: "Overview" }, { key: "decklist", label: "Decklist" }, { key: "analysis", label: "Improve" }, { key: "primer", label: "Primer" }, { key: "versions", label: "History" }] satisfies { key: DeckTab; label: string }[];
const DECK_TAB_KEYS: DeckTab[] = [...DECK_TABS.map(({ key }) => key), "settings"];

type DeckSectionKey = keyof OmnidexDecklist;
const EDIT_SECTIONS: { key: DeckSectionKey; title: string }[] = [{ key: "main", title: "Main" }, { key: "material", title: "Material" }, { key: "sideboard", title: "Sideboard" }];

/** One card tile in the editable deck grid — same full-image tile as the Guided Deck Builder's CardTile, but with a plain quantity/remove editor instead of a suggestion-model footer. */
function EditableCardTile({ line, card, section, onChangeQuantity, onMove, onRemove }: { line: OmnidexDecklistCardLine; card: Card | undefined; section: DeckSectionKey; onChangeQuantity: (quantity: number) => void; onMove: (section: DeckSectionKey) => void; onRemove: () => void }) {
  const maxQuantity = Math.max(1, Math.min(card?.legality?.STANDARD?.limit ?? 4, 4));
  return (
    <div className="overflow-hidden rounded-lg border border-ctp-surface1">
      <div className="relative aspect-[5/7] bg-ctp-surface0">
        <CardHoverPreview image={card?.editions[0]?.image} alt={line.card}>
          {card ? (
            <Link to={`/cards/${card.slug}`} title={line.card} className="block h-full w-full">
              {card.editions[0] ? <CardImage image={card.editions[0].image} alt={line.card} className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center p-2 text-center text-xs text-ctp-subtext0">{line.card}</span>}
            </Link>
          ) : (
            <span className="flex h-full items-center justify-center p-2 text-center text-xs text-ctp-subtext0">{line.card}</span>
          )}
        </CardHoverPreview>
        <input
          type="number"
          min={1}
          max={maxQuantity}
          value={line.quantity}
          aria-label={`Copies of ${line.card}`}
          onChange={(event) => { const next = Number(event.target.value); if (Number.isInteger(next) && next >= 1) onChangeQuantity(Math.min(next, maxQuantity)); }}
          className="absolute right-1.5 top-1.5 w-11 rounded border border-ctp-surface1 bg-ctp-base/90 px-1 py-0.5 text-right text-xs text-ctp-text focus:border-ctp-blue focus:outline-none"
        />
      </div>
      <div className="grid grid-cols-[1fr_auto] border-t border-ctp-surface1">
        <select value={section} onChange={(event) => onMove(event.target.value as DeckSectionKey)} aria-label={`Move ${line.card} to section`} className="min-w-0 bg-ctp-base px-2 py-2 text-xs text-ctp-subtext1 focus:outline-none"><option value="main">Main</option><option value="material">Material</option><option value="sideboard">Sideboard</option></select>
        <button type="button" onClick={onRemove} className="border-l border-ctp-surface1 px-2 py-1.5 text-xs text-ctp-subtext1 hover:bg-ctp-red/10 hover:text-ctp-red" aria-label={`Remove ${line.card}`}>×</button>
      </div>
    </div>
  );
}

/** Visual, click-to-edit alternative to hand-editing the raw decklist text — the same full-image grid used elsewhere in the app (BuilderCardGrid, DecklistView's Visual mode), wired directly to the "Add card" bar above it via `deckText`. */
function EditableDecklistGrid({ decklist, cardsByName, onChangeQuantity, onMove, onRemove }: { decklist: OmnidexDecklist; cardsByName: Map<string, Card>; onChangeQuantity: (section: DeckSectionKey, name: string, quantity: number) => void; onMove: (from: DeckSectionKey, to: DeckSectionKey, name: string) => void; onRemove: (section: DeckSectionKey, name: string) => void }) {
  const sections = EDIT_SECTIONS.map((section) => ({ ...section, lines: decklist[section.key] })).filter((section) => section.lines.length > 0);
  if (sections.length === 0) return <p className="text-sm text-ctp-subtext1">No cards yet — add one above, or paste a decklist using "Edit as text" below.</p>;
  return (
    <div className="space-y-5">
      {sections.map((section) => (
        <div key={section.key}>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">{section.title} ({section.lines.reduce((n, l) => n + l.quantity, 0)})</h4>
          <div className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {section.lines.map((line) => (
              <EditableCardTile key={line.card} line={line} card={cardsByName.get(line.card)} section={section.key} onChangeQuantity={(quantity) => onChangeQuantity(section.key, line.card, quantity)} onMove={(destination) => onMove(section.key, destination, line.card)} onRemove={() => onRemove(section.key, line.card)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MyDeckDetail() {
  const { id: deckId = "" } = useParams<{ id: string }>();
  const [deck, setDeck] = useState<SavedDeckDetail | null>();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [deckText, setDeckText] = useState("");
  const [maybeboardText, setMaybeboardText] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const [saveAsNewVersion, setSaveAsNewVersion] = useState(false);
  const [trimMax, setTrimMax] = useState(3);
  const [renamingTitle, setRenamingTitle] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [primerMarkdown, setPrimerMarkdown] = useState("");
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
  const editedDecklist = useMemo(() => parseDecklist(deckText).decklist, [deckText]);
  const trimPreview = useMemo(() => {
    const affected = EDIT_SECTIONS.flatMap((section) => editedDecklist[section.key]).filter((line) => line.quantity > trimMax);
    return { affected, copiesRemoved: affected.reduce((sum, line) => sum + line.quantity - trimMax, 0) };
  }, [editedDecklist, trimMax]);
  const editedCardNames = useMemo(() => [...editedDecklist.main, ...editedDecklist.material, ...editedDecklist.sideboard].map((line) => line.card), [editedDecklist]);
  const editedCardsByName = useCardsByNames(editedCardNames);
  const editedChampionName = useMemo(() => findDeckChampionName(editedDecklist.material, editedCardsByName)?.split(",")[0].trim() ?? null, [editedDecklist.material, editedCardsByName]);
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
    const maybeboard = parseDecklist(`Main\n${maybeboardText}`).decklist.main;
    await run(async () => {
      await accountApi.updateDeckMetadata(deckId, { maybeboard });
      setDeck((current) => current ? { ...current, maybeboard } : current);
      setNotice("Maybeboard saved.");
    });
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
  }

  async function saveTitle() {
    if (!deck) return;
    const trimmed = title.trim();
    if (!trimmed || trimmed === deck.title) { setTitle(deck.title); setRenamingTitle(false); return; }
    await run(async () => {
      await accountApi.updateDeckMetadata(deck.id, { title: trimmed });
      await refresh();
      setNotice("Deck renamed.");
      setRenamingTitle(false);
    });
  }

  function addMaybeboardToEditor() {
    const lines = maybeboardText.trim();
    if (!lines) return;
    setDeckText(`${buildDecklistText(deck!.decklist).trim()}\n\nMain\n${lines}\n`);
    setEditing(true);
    setNotice("Maybeboard cards were added to the deck editor. Save a new version when you are ready.");
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
    <div className="mt-5 flex flex-wrap items-center gap-2"><button type="button" onClick={() => setTab("decklist")} className="rounded-md bg-ctp-blue px-3 py-2 text-sm font-medium text-ctp-base">Edit deck</button><Link to={`/deck-builder?improveDeck=${encodeURIComponent(deck.id)}`} className="rounded-md border border-ctp-surface1 px-3 py-2 text-sm font-medium text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-text">Tune in builder</Link><Link to={comparePath} className="rounded-md border border-ctp-surface1 px-3 py-2 text-sm font-medium text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-text">Compare</Link><Link to={goldfishPath} className="rounded-md border border-ctp-surface1 px-3 py-2 text-sm font-medium text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-text">Goldfish test</Link><button type="button" onClick={() => setTab("settings")} className="ml-auto rounded-md px-3 py-2 text-sm text-ctp-subtext1 hover:bg-ctp-mantle hover:text-ctp-text">Settings</button></div>
    <div className="mt-6"><Tabs tabs={DECK_TABS} active={tab === "settings" ? "overview" : tab} onChange={setTab} label="Deck details" baseId="owned-deck" /></div>
    {error && <Panel tone="danger" padding="sm" className="mt-4 text-sm text-ctp-red">{error}</Panel>}
    {notice && <Panel tone="success" padding="sm" className="mt-4 text-sm text-ctp-green">{notice}</Panel>}
    {tab === "overview" && <section id="owned-deck-panel-overview" role="tabpanel" aria-labelledby="owned-deck-tab-overview" tabIndex={0} className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)]">
      <Panel><h2 className="text-lg font-semibold text-ctp-text">Deck at a glance</h2><DeckVisualStrip decklist={deck.decklist} championName={deck.championName} /><DeckSectionBalance counts={sectionCounts} sideboardPoints={sideboardPoints} maybeboard={sectionCounts.maybeboard} /></Panel>
      <Panel><h2 className="text-lg font-semibold text-ctp-text">Continue working</h2><div className="mt-3 space-y-2"><button type="button" onClick={() => setTab("decklist")} className="block w-full rounded-lg bg-ctp-blue px-3 py-2.5 text-left text-sm font-medium text-ctp-base">Edit cards</button><button type="button" onClick={() => setTab("analysis")} className="block w-full rounded-lg border border-ctp-surface1 px-3 py-2.5 text-left text-sm text-ctp-subtext1 hover:border-ctp-blue">Review analysis</button><Link to={`/deck-builder?improveDeck=${encodeURIComponent(deck.id)}`} className="block rounded-lg border border-ctp-surface1 px-3 py-2.5 text-sm text-ctp-subtext1 hover:border-ctp-blue">Tune with recommendations</Link><Link to={comparePath} className="block rounded-lg border border-ctp-surface1 px-3 py-2.5 text-sm text-ctp-subtext1 hover:border-ctp-blue">Compare with another deck</Link></div><p className="mt-4 text-xs text-ctp-subtext0">{deck.versions.length} version{deck.versions.length === 1 ? "" : "s"} · Updated {new Date(deck.updatedAt).toLocaleDateString()}</p></Panel>
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
          <select id="deck-visibility" value={deck.visibility} disabled={busy} onChange={(event) => void run(async () => { await accountApi.publishDeck(deck.id, event.target.value as SavedDeckDetail["visibility"]); await refresh(); })} className="rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm">
            <option value="private">Private</option><option value="unlisted">Unlisted — link only</option><option value="public">Public</option>
          </select>
          {deck.publicSlug && deck.visibility !== "private" && <><Link to={`/decks/${deck.publicSlug}`} className="rounded border border-ctp-blue px-3 py-1.5 text-sm text-ctp-blue">View published deck</Link><button type="button" onClick={() => void navigator.clipboard.writeText(`${window.location.origin}/decks/${deck.publicSlug}`).then(() => setNotice("Deck link copied."), () => setError("Could not copy the deck link. Please copy it from the address bar."))} className="rounded border border-ctp-surface1 px-3 py-1.5 text-sm">Copy link</button></>}
        </div>
        <p className="mt-2 text-xs text-ctp-subtext0">New decks are public by default. Once a deck is Public or Unlisted, its link always reflects your latest saved edits — set it to Private to take it down.</p>
      </div>
    </section>}
    {tab === "analysis" && <section id="owned-deck-panel-analysis" role="tabpanel" aria-labelledby="owned-deck-tab-analysis" tabIndex={0}><UserDeckStats decklist={deck.decklist} championName={deck.championName} format={deck.format} title={deck.title} ownerDeckId={deck.id} previousDecklist={previousDecklist} /></section>}
    {tab === "decklist" && <><UserDecklistPanel decklist={deck.decklist} format={deck.format} ownerDeckId={deck.id} collectionSource={`Deck: ${deck.title}`} actions={<button type="button" onClick={() => { setDeckText(buildDecklistText(deck.decklist)); setSaveAsNewVersion(false); setEditing((value) => !value); }} className={`rounded px-2 py-1 text-xs ${editing ? "border border-ctp-surface1 text-ctp-subtext1" : "bg-ctp-blue text-ctp-base"}`}>{editing ? "Cancel" : "Edit deck"}</button>}>
      {editing ? <div className="mt-3">
        <div className="mb-4 rounded-lg border border-ctp-surface1 bg-ctp-base p-3"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Section balance</p><DeckSectionBalance compact sideboardPoints={editedSideboardPoints} counts={{ main: editedDecklist.main.reduce((sum, line) => sum + line.quantity, 0), material: editedDecklist.material.reduce((sum, line) => sum + line.quantity, 0), sideboard: editedDecklist.sideboard.reduce((sum, line) => sum + line.quantity, 0) }} /></div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="text" list="my-deck-card-options" value={cardInput} onChange={(event) => setCardInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); if (cardNameSet.has(cardInput)) addCard(cardInput); } }} placeholder="Add a card by name…" aria-label="Add a card by name" className="min-w-0 flex-1 rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm" />
          <datalist id="my-deck-card-options">{cardNames.map((name) => <option key={name} value={name} />)}</datalist>
          <div role="group" aria-label="Card destination" className="inline-flex rounded-md border border-ctp-surface1 bg-ctp-base p-0.5">
            <button type="button" aria-pressed={addDestination === "automatic"} onClick={() => setAddDestination("automatic")} className={`rounded px-2 py-1.5 text-xs ${addDestination === "automatic" ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1 hover:text-ctp-text"}`}>Automatic</button>
            <button type="button" aria-pressed={addDestination === "sideboard"} onClick={() => setAddDestination("sideboard")} className={`rounded px-2 py-1.5 text-xs ${addDestination === "sideboard" ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1 hover:text-ctp-text"}`}>Sideboard</button>
            <button type="button" aria-pressed={addDestination === "maybeboard"} onClick={() => setAddDestination("maybeboard")} className={`rounded px-2 py-1.5 text-xs ${addDestination === "maybeboard" ? "bg-ctp-yellow text-ctp-base" : "text-ctp-subtext1 hover:text-ctp-text"}`}>Maybeboard</button>
          </div>
          <button type="button" disabled={!cardNameSet.has(cardInput)} onClick={() => addCard(cardInput)} className="rounded-md border border-ctp-green/60 px-3 py-2 text-sm text-ctp-green hover:bg-ctp-green/10 disabled:cursor-not-allowed disabled:opacity-50">Add card</button>
        </div>
        <div className="mt-3 rounded-lg border border-ctp-surface1 bg-ctp-mantle p-3">
          <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-ctp-subtext1" htmlFor="my-deck-trim-max">Trim every card to at most</label>
          <input id="my-deck-trim-max" type="number" min={1} max={4} value={trimMax} onChange={(event) => { const next = Number(event.target.value); if (Number.isInteger(next)) setTrimMax(Math.max(1, Math.min(4, next))); }} className="w-14 rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-1 text-xs text-ctp-text" />
          <button type="button" disabled={trimPreview.affected.length === 0} onClick={() => trimToMaxCopies(trimMax)} className="min-h-10 rounded-md border border-ctp-surface1 px-2.5 py-1 text-xs text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-text disabled:opacity-40">Apply trim</button>
          </div>
          <p className="mt-2 text-xs text-ctp-subtext0">{trimPreview.affected.length === 0 ? `No cards exceed ${trimMax}×.` : `${trimPreview.affected.length} card${trimPreview.affected.length === 1 ? "" : "s"} will lose ${trimPreview.copiesRemoved} total cop${trimPreview.copiesRemoved === 1 ? "y" : "ies"}: ${trimPreview.affected.slice(0, 4).map((line) => `${line.card} ${line.quantity}×→${trimMax}×`).join(" · ")}${trimPreview.affected.length > 4 ? ` · +${trimPreview.affected.length - 4} more` : ""}`}</p>
        </div>
        <div className="mt-4"><EditableDecklistGrid decklist={editedDecklist} cardsByName={editedCardsByName} onChangeQuantity={changeEditedQuantity} onMove={moveEditedCard} onRemove={removeEditedCard} /></div>
        <details className="mt-4 rounded-md border border-ctp-surface1 bg-ctp-mantle p-3">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Edit as text</summary>
          <textarea rows={18} required value={deckText} onChange={(event) => setDeckText(event.target.value)} className="mt-3 w-full rounded-md border border-ctp-surface1 bg-ctp-base p-4 font-mono text-sm text-ctp-text" />
        </details>
        <form className="sticky bottom-3 z-20 mt-4 rounded-xl border border-ctp-blue/40 bg-ctp-mantle/95 p-3 shadow-xl backdrop-blur" onSubmit={(event) => { event.preventDefault(); void run(async () => {
          if (editedChampionName !== deck.championName && !window.confirm(`Change Champion from ${deck.championName ?? "none"} to ${editedChampionName ?? "none"}?`)) return;
          if (saveAsNewVersion) await accountApi.createDeckVersion(deck.id, { decklist: editedDecklist, format: deck.format, championName: editedChampionName, changeNote });
          else await accountApi.updateDeckDecklist(deck.id, { decklist: editedDecklist, format: deck.format, championName: editedChampionName });
          await refresh(); setChangeNote(""); setEditing(false);
          setNotice(saveAsNewVersion ? "Saved as a new version." : "Deck updated.");
        }); }}>
          <p className="text-xs font-semibold uppercase tracking-wide text-ctp-blue">Unsaved deck changes</p>
          <p className={`text-sm ${editedChampionName ? editedChampionName === deck.championName ? "text-ctp-subtext1" : "text-ctp-yellow" : "text-ctp-yellow"}`}>{editedChampionName ? `Champion detected: ${editedChampionName}${editedChampionName !== deck.championName ? ` (currently ${deck.championName ?? "none"})` : ""}` : `No Champion detected${deck.championName ? ` (currently ${deck.championName})` : ""}.`}</p>
          <div className="mt-3 inline-flex rounded-lg border border-ctp-surface1 bg-ctp-base p-1" role="group" aria-label="Save mode">
            <button type="button" aria-pressed={!saveAsNewVersion} onClick={() => setSaveAsNewVersion(false)} className={`min-h-10 rounded-md px-3 text-xs font-medium ${!saveAsNewVersion ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1"}`}>Update current deck</button>
            <button type="button" aria-pressed={saveAsNewVersion} onClick={() => setSaveAsNewVersion(true)} className={`min-h-10 rounded-md px-3 text-xs font-medium ${saveAsNewVersion ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1"}`}>Create new version</button>
          </div>
          <p className="mt-1 text-xs text-ctp-subtext0">{saveAsNewVersion ? "Keeps the current snapshot in version history." : "Replaces the current deck without adding a history snapshot."}</p>
          {saveAsNewVersion && <input value={changeNote} maxLength={240} onChange={(event) => setChangeNote(event.target.value)} placeholder="What changed? (optional)" className="mt-2 w-full rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm" />}
          <button disabled={busy} type="submit" className="mt-3 rounded-md bg-ctp-blue px-3 py-2 text-sm text-ctp-base disabled:opacity-50">{saveAsNewVersion ? "Save new version" : "Save changes"}</button>
        </form>
      </div> : undefined}
    </UserDecklistPanel>
      {/* Supplement the decklist; panel children replace it with the editor while editing. */}
      <section className="mt-5 rounded-lg border border-dashed border-ctp-yellow/60 bg-ctp-yellow/5 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-medium text-ctp-yellow">Maybeboard</h3><p className="mt-1 text-xs text-ctp-subtext1">Keep cards under consideration outside the deck. One line per card, for example <span className="font-mono">2x Card Name</span>.</p></div><button type="button" disabled={!maybeboardText.trim()} onClick={addMaybeboardToEditor} className="rounded border border-ctp-blue px-2 py-1 text-xs text-ctp-blue disabled:opacity-50">Add to deck editor</button></div>
        <textarea rows={5} value={maybeboardText} onChange={(event) => setMaybeboardText(event.target.value)} onBlur={() => void saveMaybeboard()} placeholder={"2x Card to test\n4x Another option"} aria-label="Maybeboard" className="mt-3 w-full rounded-md border border-ctp-surface1 bg-ctp-base p-3 font-mono text-sm" />
        <p className="mt-2 text-xs text-ctp-subtext0">Saved to this deck, independently of version history. It never affects legality, statistics, exports, or publishing.</p>
      </section>
    </>}
    {tab === "primer" && <section id="owned-deck-panel-primer" role="tabpanel" aria-labelledby="owned-deck-tab-primer" tabIndex={0} className="mt-6 grid gap-5 lg:grid-cols-2">
      <form className="rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4" onSubmit={(event) => { event.preventDefault(); void run(async () => { await accountApi.updateDeckMetadata(deck.id, { primerMarkdown }); await refresh(); }); }}>
        <h2 className="font-semibold text-ctp-text">Edit primer</h2><p className="mt-1 text-xs text-ctp-subtext1">Markdown supports headings, lists, links, emphasis, quotes, code blocks, and highlighted deck concepts.</p>
        <div className="mt-3 flex flex-wrap gap-2" aria-label="Insert primer highlight"><button type="button" onClick={() => addPrimerHighlight("combo")} className="rounded-md border border-ctp-mauve/60 bg-ctp-mauve/10 px-2.5 py-1.5 text-xs text-ctp-mauve">+ Combo</button><button type="button" onClick={() => addPrimerHighlight("package")} className="rounded-md border border-ctp-teal/60 bg-ctp-teal/10 px-2.5 py-1.5 text-xs text-ctp-teal">+ Card package</button></div>
        <textarea rows={24} maxLength={50000} value={primerMarkdown} onChange={(event) => setPrimerMarkdown(event.target.value)} placeholder={"# Game plan\n\nExplain opening turns, key interactions, matchups, and substitutions."} className="mt-3 w-full rounded-md border border-ctp-surface1 bg-ctp-base p-4 font-mono text-sm" />
        <div className="mt-2 flex items-center justify-between gap-3"><span className="text-xs text-ctp-subtext0">{primerMarkdown.length.toLocaleString()} / 50,000</span><button disabled={busy || primerMarkdown === deck.primerMarkdown} type="submit" className="rounded-md bg-ctp-blue px-3 py-2 text-sm text-ctp-base disabled:opacity-50">Save primer</button></div>
      </form>
      <section className="rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4"><h2 className="font-semibold text-ctp-text">Preview</h2><div className="mt-4">{primerMarkdown.trim() ? <PrimerMarkdown markdown={primerMarkdown} /> : <p className="text-sm text-ctp-subtext1">Your primer preview will appear here.</p>}</div></section>
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
