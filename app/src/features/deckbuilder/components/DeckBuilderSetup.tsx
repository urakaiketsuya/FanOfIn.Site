import { useState } from "react";
import MenuDetails from "../../../components/ui/MenuDetails";
import DisclosureChevron from "../../../components/DisclosureChevron";
import Button from "../../../components/ui/Button";
import UserDeckHeader from "../../account/UserDeckHeader";
import DialogSheet from "../../../components/ui/DialogSheet";
import { newDeckTitleError } from "../../account/newDeckDraft";

import { Link } from "react-router-dom";
import { useDeckBuilder } from "../useDeckBuilder";

export function DeckBuilderHeader() {
  const b = useDeckBuilder();
  const c = b.copyPanel;
  const [renaming, setRenaming] = useState(false);
  const title = c.saveTitle.trim() || (b.championName ? `${b.championName} deck` : "Untitled deck");
  return <>
    <Link to="/decks/edit" className="inline-flex min-h-12 items-center text-sm text-ctp-blue">← My Decks</Link>
    <UserDeckHeader title={title} decklist={b.editor.deck} championName={b.championName} format={b.deckFormat} actions={<>
      <Button variant="primary" disabled={!c.saveCopyCount || c.saveState === "saving" || c.saveState === "saved"} onClick={() => void c.handleSaveToMyDecks()}>{c.saveState === "saving" ? "Saving…" : c.saveState === "saved" ? "Saved" : "Save deck"}</Button>
      <Button onClick={() => setRenaming(true)}>Rename</Button>
      <MenuDetails className="relative"><summary className="flex min-h-12 cursor-pointer list-none items-center gap-1 rounded-lg border border-ctp-surface1 px-3 text-sm">More<DisclosureChevron /></summary><div className="absolute right-0 top-full z-30 mt-1 w-56 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-2 shadow-xl">
        <Button className="w-full" onClick={() => b.setTab("copy")}>Export & share</Button>
        <Button className="w-full" onClick={() => b.setTab("log")}>Change history</Button>
        <Button className="w-full" onClick={() => b.setTab("tools")}>Suggestion settings</Button>
      </div></MenuDetails>
    </>} />
    {renaming && <RenameDraft title={title} onDismiss={() => setRenaming(false)} onApply={value => { c.setSaveTitle(value); setRenaming(false); }} />}
    <div className="my-3 flex flex-wrap items-center gap-3"><DeckFormatPicker /><p role="status" className="text-sm text-ctp-subtext1">{c.saveState === "saved" ? "Saved to My Decks" : b.sessionRecoveryAvailable === false ? "Browser recovery unavailable. Save or export to keep your work." : "Draft kept in this browser tab"}</p>{c.savedDeckId && <Link to={`/decks/${c.savedDeckId}`} className="inline-flex min-h-12 items-center text-sm text-ctp-blue">Open saved deck</Link>}</div>
    {c.saveState === "failed" && <p role="alert" className="text-sm text-ctp-red">Could not save. Your draft is kept; try again.</p>}
    {c.saveState === "sign-in" && <p role="alert" className="text-sm text-ctp-yellow"><Link to="/account" className="inline-flex min-h-12 items-center underline">Sign in to save</Link>. Your draft is kept in this tab.</p>}
  </>;
}

function RenameDraft({ title, onApply, onDismiss }: { title: string; onApply: (title: string) => void; onDismiss: () => void }) {
  const [value, setValue] = useState(title);
  const [error, setError] = useState<string | null>(null);
  function apply() { const problem = newDeckTitleError(value); setError(problem); if (!problem) onApply(value.trim()); }
  return <DialogSheet title="Rename deck" dirty={value !== title} onDismiss={onDismiss} footer={<Button variant="primary" onClick={apply}>Apply name</Button>}>
    <form onSubmit={event => { event.preventDefault(); apply(); }}><label className="block text-sm">Deck name<input autoFocus required maxLength={160} value={value} onChange={event => setValue(event.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3" /></label>{error && <p role="alert" className="mt-2 text-sm text-ctp-red">{error}</p>}</form>
  </DialogSheet>;
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
