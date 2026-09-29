import DisclosureChevron from "../../../components/DisclosureChevron";
import { Link } from "react-router-dom";
import { useDeckBuilder } from "../useDeckBuilder";

export function DeckBuilderHeader() {
  const b = useDeckBuilder();
  const c = b.copyPanel;
  const saveLabel = c.saveState === "saving" ? "Saving…" : c.saveState === "saved" ? "Saved" : "Save";
  return <header>
    <h1 className="sr-only mb-2 text-lg font-bold tracking-tight text-ctp-text sm:not-sr-only">Deck Workbench</h1>
    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
      <label className="min-w-0 flex-1"><span className="sr-only">Deck name</span><input aria-label="Deck name" value={c.saveTitle} onChange={event=>c.setSaveTitle(event.target.value)} placeholder={b.championName ? `${b.championName} deck` : "Untitled deck"} maxLength={160} className="min-h-12 w-full min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 text-base" /></label>

      <button type="button" disabled={!c.saveCopyCount || c.saveState === "saving" || c.saveState === "saved"} onClick={()=>void c.handleSaveToMyDecks()} className="min-h-12 rounded-lg bg-ctp-blue px-4 text-sm font-semibold text-ctp-base disabled:opacity-50">{saveLabel}</button>
      <details className="relative"><summary className="flex min-h-12 cursor-pointer list-none items-center gap-1 rounded-lg border border-ctp-surface1 px-3 text-sm" aria-label="Deck actions">More<DisclosureChevron /></summary><div className="absolute right-0 top-full z-30 mt-1 w-56 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-2 shadow-xl" onClick={event=>{if((event.target as HTMLElement).closest("button,a"))event.currentTarget.closest("details")?.removeAttribute("open");}}>
        <button type="button" onClick={()=>b.setTab("copy")} className="block w-full rounded-lg px-3 text-left text-sm">Export & share</button>
        <button type="button" onClick={()=>b.setTab("log")} className="block w-full rounded-lg px-3 text-left text-sm">Change history</button>
        <Link to="/deck-analysis" className="flex min-h-12 items-center rounded-lg px-3 text-sm">Analyze this deck</Link>
        <Link to="/deck-review" className="flex min-h-12 items-center rounded-lg px-3 text-sm">Review this deck</Link>
      </div></details>
    </div>
    <div className="mt-2 flex items-center gap-3">
      <label><span className="sr-only">Deck format</span><select aria-label="Deck format" value={b.deckFormat} onChange={event=>{const format=event.target.value as "STANDARD"|"PANTHEON";b.setDeckFormat(format);if(format==="PANTHEON")b.setPopulationSource("community");const next=new URLSearchParams(b.searchParams);if(format==="PANTHEON")next.set("format","pantheon");else next.delete("format");b.setSearchParams(next,{replace:true});}} className="min-h-12 rounded-lg border border-ctp-surface1 bg-ctp-base pl-3 pr-9 text-sm"><option value="STANDARD">Standard</option><option value="PANTHEON">Pantheon</option></select></label>
    <p role="status" className="text-xs text-ctp-subtext1">{c.saveState === "saved" ? "Saved to My Decks." : c.saveState === "saving" ? "Saving your deck…" : b.sessionRecoveryAvailable === false ? "Browser recovery unavailable. Save or export to keep your work." : "Draft · this tab only"}</p></div>
    {c.saveState === "failed" && <p role="alert" className="mt-2 text-sm text-ctp-red">Could not save. Your current deck is still here; try Save again.</p>}
    {c.saveState === "sign-in" && <p role="alert" className="mt-2 text-sm text-ctp-yellow"><Link to="/decks/edit" className="underline">Sign in from My Decks</Link>, then return here to save. Keep this tab open until your deck is saved.</p>}
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
