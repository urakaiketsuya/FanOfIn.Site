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

type DeckTab = "decklist" | "analysis" | "primer" | "versions" | "settings";
const DECK_TABS = [{ key: "decklist", label: "Decklist" }, { key: "analysis", label: "Analysis" }, { key: "primer", label: "Primer" }, { key: "versions", label: "Versions" }, { key: "settings", label: "Settings" }] satisfies { key: DeckTab; label: string }[];

type DeckSectionKey = keyof OmnidexDecklist;
const EDIT_SECTIONS: { key: DeckSectionKey; title: string }[] = [{ key: "main", title: "Main" }, { key: "material", title: "Material" }, { key: "sideboard", title: "Sideboard" }];

/** One card tile in the editable deck grid — same full-image tile as the Guided Deck Builder's CardTile, but with a plain quantity/remove editor instead of a suggestion-model footer. */
function EditableCardTile({ line, card, onChangeQuantity, onRemove }: { line: OmnidexDecklistCardLine; card: Card | undefined; onChangeQuantity: (quantity: number) => void; onRemove: () => void }) {
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
      <button type="button" onClick={onRemove} className="w-full border-t border-ctp-surface1 py-1.5 text-xs text-ctp-subtext1 hover:text-ctp-red">Remove</button>
    </div>
  );
}

/** Visual, click-to-edit alternative to hand-editing the raw decklist text — the same full-image grid used elsewhere in the app (BuilderCardGrid, DecklistView's Visual mode), wired directly to the "Add card" bar above it via `deckText`. */
function EditableDecklistGrid({ decklist, cardsByName, onChangeQuantity, onRemove }: { decklist: OmnidexDecklist; cardsByName: Map<string, Card>; onChangeQuantity: (section: DeckSectionKey, name: string, quantity: number) => void; onRemove: (section: DeckSectionKey, name: string) => void }) {
  const sections = EDIT_SECTIONS.map((section) => ({ ...section, lines: decklist[section.key] })).filter((section) => section.lines.length > 0);
  if (sections.length === 0) return <p className="text-sm text-ctp-subtext1">No cards yet — add one above, or paste a decklist using "Edit as text" below.</p>;
  return (
    <div className="space-y-5">
      {sections.map((section) => (
        <div key={section.key}>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">{section.title} ({section.lines.reduce((n, l) => n + l.quantity, 0)})</h4>
          <div className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {section.lines.map((line) => (
              <EditableCardTile key={line.card} line={line} card={cardsByName.get(line.card)} onChangeQuantity={(quantity) => onChangeQuantity(section.key, line.card, quantity)} onRemove={() => onRemove(section.key, line.card)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MyDeckDetail() {
  const { deckId = "" } = useParams<{ deckId: string }>();
  const [deck, setDeck] = useState<SavedDeckDetail | null>();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [deckText, setDeckText] = useState("");
  const [maybeboardText, setMaybeboardText] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [primerMarkdown, setPrimerMarkdown] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [tab, setTab] = useTabParam<DeckTab>("tab", DECK_TABS.map(({ key }) => key), "decklist");
  const [cardInput, setCardInput] = useState("");
  const [addDestination, setAddDestination] = useState<"automatic" | "sideboard" | "maybeboard">("automatic");
  const cardCatalog = useCardCatalog();
  const cardNames = useMemo(() => Array.from(new Set(cardCatalog.map((card) => card.name))).sort(), [cardCatalog]);
  const cardNameSet = useMemo(() => new Set(cardNames), [cardNames]);
  const editedDecklist = useMemo(() => parseDecklist(deckText).decklist, [deckText]);
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

  function removeEditedCard(section: DeckSectionKey, name: string) {
    const decklist = parseDecklist(deckText).decklist;
    decklist[section] = decklist[section].filter((l) => l.card !== name);
    setDeckText(buildDecklistText(decklist));
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
  if (!deck) return <PageLayout data-component="MyDeckDetail"><EmptyState title="Deck unavailable" description={error} action={<Link to="/my-decks" className="text-ctp-blue hover:underline">Back to My Decks</Link>} /></PageLayout>;

  return <PageLayout data-component="MyDeckDetail">
    <Link to="/my-decks" className="text-sm text-ctp-blue hover:underline">← My Decks</Link>
    <div className="mt-4"><UserDeckHeader title={deck.title} championName={deck.championName} format={deck.format} description={deck.description} visibility={deck.visibility} /><DeckTags tags={deck.tags} /><div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2"><p className="text-xs text-ctp-subtext0">Updated {new Date(deck.updatedAt).toLocaleDateString()} · {deck.versions.length} version{deck.versions.length === 1 ? "" : "s"}</p>{deck.publicSlug && deck.visibility !== "private" && <Link to={`/decklists/${deck.publicSlug}`} className="text-sm font-medium text-ctp-blue hover:underline">{deck.visibility === "public" ? "View public deck →" : "View shared deck →"}</Link>}</div></div>
    <div className="mt-6"><Tabs tabs={DECK_TABS} active={tab} onChange={setTab} label="Deck details" baseId="owned-deck" /></div>
    {error && <Panel tone="danger" padding="sm" className="mt-4 text-sm text-ctp-red">{error}</Panel>}
    {notice && <Panel tone="success" padding="sm" className="mt-4 text-sm text-ctp-green">{notice}</Panel>}
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
          {deck.publicSlug && deck.visibility !== "private" && <><Link to={`/decklists/${deck.publicSlug}`} className="rounded border border-ctp-blue px-3 py-1.5 text-sm text-ctp-blue">View published deck</Link><button type="button" onClick={() => void navigator.clipboard.writeText(`${window.location.origin}/decklists/${deck.publicSlug}`).then(() => setNotice("Deck link copied."), () => setError("Could not copy the deck link. Please copy it from the address bar."))} className="rounded border border-ctp-surface1 px-3 py-1.5 text-sm">Copy link</button></>}
        </div>
        <p className="mt-2 text-xs text-ctp-subtext0">New decks are public by default. Once a deck is Public or Unlisted, its link always reflects your latest saved edits — set it to Private to take it down.</p>
      </div>
    </section>}
    {tab === "analysis" && <section id="owned-deck-panel-analysis" role="tabpanel" aria-labelledby="owned-deck-tab-analysis" tabIndex={0}><UserDeckStats decklist={deck.decklist} championName={deck.championName} format={deck.format} title={deck.title} ownerDeckId={deck.id} previousDecklist={previousDecklist} /></section>}
    {tab === "decklist" && <><UserDecklistPanel decklist={deck.decklist} format={deck.format} ownerDeckId={deck.id} collectionSource={`Deck: ${deck.title}`} actions={<button type="button" onClick={() => { setDeckText(buildDecklistText(deck.decklist)); setEditing((value) => !value); }} className={`rounded px-2 py-1 text-xs ${editing ? "border border-ctp-surface1 text-ctp-subtext1" : "bg-ctp-blue text-ctp-base"}`}>{editing ? "Cancel" : "Edit deck"}</button>}>
      {editing ? <div className="mt-3">
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
        <div className="mt-4"><EditableDecklistGrid decklist={editedDecklist} cardsByName={editedCardsByName} onChangeQuantity={changeEditedQuantity} onRemove={removeEditedCard} /></div>
        <details className="mt-4 rounded-md border border-ctp-surface1 bg-ctp-mantle p-3">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Edit as text</summary>
          <textarea rows={18} required value={deckText} onChange={(event) => setDeckText(event.target.value)} className="mt-3 w-full rounded-md border border-ctp-surface1 bg-ctp-base p-4 font-mono text-sm text-ctp-text" />
        </details>
        <form className="mt-3" onSubmit={(event) => { event.preventDefault(); void run(async () => { if (editedChampionName !== deck.championName && !window.confirm(`Change Champion from ${deck.championName ?? "none"} to ${editedChampionName ?? "none"}?`)) return; await accountApi.createDeckVersion(deck.id, { decklist: editedDecklist, format: deck.format, championName: editedChampionName, changeNote }); await refresh(); setChangeNote(""); setEditing(false); }); }}>
          <p className={`text-sm ${editedChampionName ? editedChampionName === deck.championName ? "text-ctp-subtext1" : "text-ctp-yellow" : "text-ctp-yellow"}`}>{editedChampionName ? `Champion detected: ${editedChampionName}${editedChampionName !== deck.championName ? ` (currently ${deck.championName ?? "none"})` : ""}` : `No Champion detected${deck.championName ? ` (currently ${deck.championName})` : ""}.`}</p>
          <input value={changeNote} maxLength={240} onChange={(event) => setChangeNote(event.target.value)} placeholder="What changed? (optional)" className="mt-2 w-full rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm" />
          <button disabled={busy} type="submit" className="mt-3 rounded-md bg-ctp-blue px-3 py-2 text-sm text-ctp-base disabled:opacity-50">Save new version</button>
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
