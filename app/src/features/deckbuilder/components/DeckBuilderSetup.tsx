import { useState } from "react";
import MenuDetails from "../../../components/ui/MenuDetails";
import DisclosureChevron from "../../../components/DisclosureChevron";
import Button from "../../../components/ui/Button";
import CardArtTile from "../../../components/CardArtTile";

import { Link } from "react-router-dom";
import { useDeckBuilder } from "../useDeckBuilder";

export function DeckBuilderHeader() {
  const b = useDeckBuilder();
  const c = b.copyPanel;
  const saveLabel = c.saveState === "saving" ? "Saving…" : c.saveState === "saved" ? "Saved" : "Save";
  const [renaming, setRenaming] = useState(false);
  const identity = [...b.editor.deck.material].sort((a, z) => {
    const rank = (name: string) => { const card = b.catalogByName.get(name); return card?.types.includes("CHAMPION") ? (card.subtypes.includes("SPIRIT") ? 1 : 2) : 0; };
    return rank(z.card) - rank(a.card);
  })[0];
  const identityCard = identity ? b.catalogByName.get(identity.card) : undefined;
  return <header className="identity-surface rounded-2xl border border-ctp-surface1 p-3 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-x-4 sm:p-4">
    <div className="flex items-start gap-3 sm:row-span-2 sm:gap-4">
    {identity && <div className="w-20 shrink-0 sm:w-24">{identityCard ? <Link to={`/cards/${identityCard.slug}`} target="_blank" rel="noreferrer" aria-label={`${identity.card} card details`} className="block rounded focus-visible:outline-2 focus-visible:outline-ctp-blue"><CardArtTile card={identityCard} name={identity.card} editionUuid={identity.printings?.[0]?.editionUuid} /></Link> : <CardArtTile card={undefined} name={identity.card} />}</div>}
    <div className="min-w-0 flex-1">
    <p className="text-xs font-medium uppercase tracking-wide text-ctp-subtext0">Deck Workbench</p>
    <div className="mt-1 flex flex-wrap items-center gap-2">
      <div className="min-w-0 basis-full sm:flex-1 sm:basis-48">
        {renaming ? <input autoFocus aria-label="Deck name" value={c.saveTitle} onChange={event => c.setSaveTitle(event.target.value)} onBlur={() => setRenaming(false)} onKeyDown={event => { if (event.key === "Enter" || event.key === "Escape") { setRenaming(false); requestAnimationFrame(() => document.getElementById("workbench-rename")?.focus()); } }} placeholder={b.championName ? `${b.championName} deck` : "Untitled deck"} maxLength={160} className="min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 text-base" /> : <h1><button id="workbench-rename" type="button" aria-label={`Rename deck: ${c.saveTitle.trim() || (b.championName ? `${b.championName} deck` : "Untitled deck")}`} onClick={() => setRenaming(true)} className="min-h-12 w-full break-words text-left text-2xl font-bold tracking-tight">{c.saveTitle.trim() || (b.championName ? `${b.championName} deck` : "Untitled deck")}</button></h1>}
      </div>

    </div>
    {identity && <p className="mt-1 break-words text-xs text-ctp-subtext1">{identity.card}</p>}
    </div></div>
    <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-0 sm:self-end">
      <label><span className="sr-only">Deck format</span><select aria-label="Deck format" value={b.deckFormat} onChange={event=>{const format=event.target.value as "STANDARD"|"PANTHEON";b.setDeckFormat(format);if(format==="PANTHEON")b.setPopulationSource("community");const next=new URLSearchParams(b.searchParams);if(format==="PANTHEON")next.set("format","pantheon");else next.delete("format");b.setSearchParams(next,{replace:true});}} className="min-h-12 rounded-lg border border-ctp-surface1 bg-ctp-base pl-3 pr-9 text-sm"><option value="STANDARD">Standard</option><option value="PANTHEON">Pantheon</option></select></label>
      <Button variant="primary" disabled={!c.saveCopyCount || c.saveState === "saving" || c.saveState === "saved"} onClick={()=>void c.handleSaveToMyDecks()}>{saveLabel}</Button>
      <MenuDetails className="relative"><summary className="flex min-h-12 cursor-pointer list-none items-center gap-1 rounded-lg border border-ctp-surface1 px-3 text-sm" aria-label="Deck actions">More<DisclosureChevron /></summary><div className="absolute right-0 top-full z-30 mt-1 w-56 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-2 shadow-xl">
        <button type="button" onClick={()=>b.setTab("copy")} className="block w-full rounded-lg px-3 text-left text-sm">Export & share</button>
        <button type="button" onClick={()=>b.setTab("log")} className="block w-full rounded-lg px-3 text-left text-sm">Change history</button>
        <Link to="/deck-analysis" className="flex min-h-12 items-center rounded-lg px-3 text-sm">Analyze this deck</Link>
        <Link to="/deck-review" className="flex min-h-12 items-center rounded-lg px-3 text-sm">Review this deck</Link>
      </div></MenuDetails>
    </div>
    <div className="mt-2 flex items-center gap-3 sm:justify-end sm:self-start">

    <p role="status" className="text-xs text-ctp-subtext1">{c.saveState === "saved" ? "Saved" : c.saveState === "saving" ? "Saving…" : b.sessionRecoveryAvailable === false ? "Browser recovery unavailable. Save or export to keep your work." : "Unsaved draft"}</p></div>
    {c.saveState === "failed" && <p role="alert" className="mt-2 text-sm text-ctp-red sm:col-span-2">Could not save. Your current deck is still here; try Save again.</p>}
    {c.saveState === "sign-in" && <p role="alert" className="mt-2 text-sm text-ctp-yellow sm:col-span-2"><Link to="/decks/edit" className="underline">Sign in from My Decks</Link>, then return here to save. Keep this tab open until your deck is saved.</p>}
  </header>;
}

export function DeckFormatPicker() {
  const { deckFormat, searchParams, setDeckFormat, setPopulationSource, setSearchParams } = useDeckBuilder();
  return <div className="inline-flex rounded-xl border border-ctp-surface1 bg-ctp-mantle p-1" role="group" aria-label="Deck format">
    {(["STANDARD", "PANTHEON"] as const).map((format) => <button key={format} type="button" aria-pressed={deckFormat === format}
      onClick={() => {
        setDeckFormat(format);
        if (format === "PANTHEON") setPopulationSource("community");
        const next = new URLSearchParams(searchParams);
        if (format === "PANTHEON") next.set("format", "pantheon");
        else next.delete("format");
        setSearchParams(next, { replace: true });
      }} className={`min-h-12 rounded-lg px-4 text-sm ${deckFormat === format ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1"}`}>
      {format === "PANTHEON" ? "Pantheon" : "Standard"}
    </button>)}
  </div>;
}

export function BuilderStartActions() {
  const { resetBuilder, lockedCards, spiritFilter } = useDeckBuilder();
  return <div className="mt-2 flex flex-wrap items-center gap-2">
    <Link to="/decks/edit" className="inline-flex min-h-12 items-center rounded-lg px-3 text-sm text-ctp-blue">Open saved deck</Link>
    {(lockedCards.size > 0 || spiritFilter) && <button type="button" onClick={resetBuilder} className="min-h-12 rounded-lg px-3 text-sm text-ctp-subtext1 hover:text-ctp-red">Reset deck</button>}
  </div>;
}

export function DecklistPaste() {
  const { loadPastedDecklist, pasteError, pasteOpen, pasteText, setPasteError, setPasteOpen, setPasteText } = useDeckBuilder();
  return <div className="mt-2">
    <button type="button" onClick={() => setPasteOpen((open) => !open)} aria-expanded={pasteOpen} aria-controls="builder-paste" className="min-h-12 rounded-lg px-3 text-sm text-ctp-blue">{pasteOpen ? "Hide decklist import" : "Paste a decklist"}</button>
    {pasteOpen && <div id="builder-paste" className="mt-2 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4">
      <label htmlFor="builder-paste-text" className="text-sm text-ctp-subtext1">One card per line, such as “4x Dungeon Guide”. Main, Material, and Sideboard headers are supported. Loading replaces the current list; partial lists are welcome.</label>
      <textarea id="builder-paste-text" value={pasteText} onChange={(event) => setPasteText(event.target.value)} placeholder={"Main\n4x Dungeon Guide\n\nMaterial\n1x Spirit of Water"} rows={6} className="mt-2 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 py-2 text-base text-ctp-text" />
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={loadPastedDecklist} disabled={!pasteText.trim()} className="min-h-12 rounded-lg bg-ctp-blue px-4 text-sm font-medium text-ctp-base disabled:opacity-40">Load decklist</button>
        <button type="button" onClick={() => { setPasteOpen(false); setPasteText(""); setPasteError(null); }} className="min-h-12 rounded-lg px-4 text-sm text-ctp-subtext1">Cancel</button>
      </div>
      {pasteError && <p role="alert" className="mt-2 text-sm text-ctp-red">{pasteError}</p>}
    </div>}
  </div>;
}
