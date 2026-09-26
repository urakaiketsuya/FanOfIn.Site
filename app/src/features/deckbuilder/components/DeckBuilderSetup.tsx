import { Link } from "react-router-dom";
import PageHeader from "../../../components/ui/PageHeader";
import { useDeckBuilder } from "../useDeckBuilder";

export function DeckBuilderHeader() {
  return <PageHeader title="Deck Workbench" description="Add cards in any order, or paste a decklist. Get recommendations whenever you want ideas." />;
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
