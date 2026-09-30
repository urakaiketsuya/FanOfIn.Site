import DisclosureChevron from "../../components/DisclosureChevron";
interface DeckSaveBarProps {
  busy: boolean;
  changedEntries: number;
  currentChampion: string | null;
  detectedChampion: string | null;
  detailsOpen: boolean;
  saveAsNewVersion: boolean;
  changeNote: string;
  onDetailsOpenChange: (open: boolean) => void;
  onSaveModeChange: (saveAsNewVersion: boolean) => void;
  onChangeNote: (note: string) => void;
  onCancel: () => void;
  onSave: () => void;
}

export default function DeckSaveBar({ busy, changedEntries, currentChampion, detectedChampion, detailsOpen, saveAsNewVersion, changeNote, onDetailsOpenChange, onSaveModeChange, onChangeNote, onCancel, onSave }: DeckSaveBarProps) {
  return <form className="contents" onSubmit={(event) => { event.preventDefault(); onSave(); }}>
    <div id="mobile-deck-save-details" className="mt-4 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3">
      {detectedChampion !== currentChampion && <p role="status" className={`text-sm ${detectedChampion && detectedChampion === currentChampion ? "text-ctp-subtext1" : "text-ctp-yellow"}`}>{detectedChampion ? `Champion detected: ${detectedChampion}${detectedChampion !== currentChampion ? ` (currently ${currentChampion ?? "none"})` : ""}` : `No Champion detected${currentChampion ? ` (currently ${currentChampion})` : ""}.`}</p>}
      <div className="mt-2 flex flex-wrap rounded-lg border border-ctp-surface1 bg-ctp-base p-1" role="group" aria-label="Save mode">
        <button type="button" aria-pressed={!saveAsNewVersion} onClick={() => onSaveModeChange(false)} className={`min-h-12 rounded-md px-3 text-xs font-medium ${!saveAsNewVersion ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1"}`}>Update current deck</button>
        <button type="button" aria-pressed={saveAsNewVersion} onClick={() => onSaveModeChange(true)} className={`min-h-12 rounded-md px-3 text-xs font-medium ${saveAsNewVersion ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1"}`}>Create new version</button>
      </div>
      <p className="mt-1 text-xs text-ctp-subtext0">{saveAsNewVersion ? "Keeps the current snapshot in version history." : "Replaces the current deck without adding a history snapshot."}</p>
      {saveAsNewVersion && <><button type="button" aria-expanded={detailsOpen} aria-controls="deck-change-note" onClick={() => onDetailsOpenChange(!detailsOpen)} className="flex min-h-12 items-center gap-2 text-sm text-ctp-blue">Change note (optional)<DisclosureChevron className={detailsOpen ? "rotate-180" : ""} /></button><div id="deck-change-note" hidden={!detailsOpen}><input aria-label="Change note" value={changeNote} maxLength={240} onChange={(event) => onChangeNote(event.target.value)} placeholder="What changed? (optional)" className="mt-2 w-full rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm" /></div></>}
    </div>
    <div className="sticky bottom-2 z-20 mt-2 flex min-h-12 items-center gap-2 rounded-xl border border-ctp-blue/40 bg-ctp-mantle p-2 shadow-xl">
      <div className="min-w-0 flex-1 text-xs text-ctp-subtext1">{changedEntries} changed {changedEntries === 1 ? "entry" : "entries"}</div>
      <button type="button" onClick={onCancel} className="min-h-12 shrink-0 rounded-md px-3 py-2 text-sm text-ctp-subtext1">Cancel</button>
      <button disabled={busy} type="submit" className="min-h-12 shrink-0 rounded-md bg-ctp-blue px-4 py-2 text-sm font-medium text-ctp-base disabled:opacity-50">{saveAsNewVersion ? "Save version" : "Save"}</button>
    </div>
  </form>;
}
