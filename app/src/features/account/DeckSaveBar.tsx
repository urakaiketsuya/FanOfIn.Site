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
  return <form className="sticky bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-20 mt-4 rounded-xl border border-ctp-blue/40 bg-ctp-mantle/95 p-2 shadow-xl backdrop-blur sm:bottom-3 sm:p-3" onSubmit={(event) => { event.preventDefault(); onSave(); }}>
    <div className="flex min-h-12 items-center gap-2">
      <button type="button" aria-expanded={detailsOpen} aria-controls="mobile-deck-save-details" onClick={() => onDetailsOpenChange(!detailsOpen)} className="min-w-0 flex-1 rounded-md px-2 py-1 text-left sm:pointer-events-none sm:px-0">
        <span className="block text-xs font-semibold uppercase tracking-wide text-ctp-blue">Unsaved deck changes</span>
        <span className="block truncate text-xs text-ctp-subtext1 sm:hidden">{changedEntries} card {changedEntries === 1 ? "entry" : "entries"} changed · {detailsOpen ? "Hide options" : "Show options"}</span>
      </button>
      <button type="button" onClick={onCancel} className="min-h-10 shrink-0 rounded-md px-3 py-2 text-sm text-ctp-subtext1">Cancel</button>
      <button disabled={busy} type="submit" className="min-h-10 shrink-0 rounded-md bg-ctp-blue px-4 py-2 text-sm font-medium text-ctp-base disabled:opacity-50">{saveAsNewVersion ? "Save version" : "Save"}</button>
    </div>
    <div id="mobile-deck-save-details" className={`${detailsOpen ? "block" : "hidden"} border-t border-ctp-surface1 px-2 pb-1 pt-3 sm:block sm:px-0 sm:pb-0`}>
      <p className={`text-sm ${detectedChampion && detectedChampion === currentChampion ? "text-ctp-subtext1" : "text-ctp-yellow"}`}>{detectedChampion ? `Champion detected: ${detectedChampion}${detectedChampion !== currentChampion ? ` (currently ${currentChampion ?? "none"})` : ""}` : `No Champion detected${currentChampion ? ` (currently ${currentChampion})` : ""}.`}</p>
      <div className="mt-3 inline-flex rounded-lg border border-ctp-surface1 bg-ctp-base p-1" role="group" aria-label="Save mode">
        <button type="button" aria-pressed={!saveAsNewVersion} onClick={() => onSaveModeChange(false)} className={`min-h-10 rounded-md px-3 text-xs font-medium ${!saveAsNewVersion ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1"}`}>Update current deck</button>
        <button type="button" aria-pressed={saveAsNewVersion} onClick={() => onSaveModeChange(true)} className={`min-h-10 rounded-md px-3 text-xs font-medium ${saveAsNewVersion ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1"}`}>Create new version</button>
      </div>
      <p className="mt-1 text-xs text-ctp-subtext0">{saveAsNewVersion ? "Keeps the current snapshot in version history." : "Replaces the current deck without adding a history snapshot."}</p>
      {saveAsNewVersion && <input value={changeNote} maxLength={240} onChange={(event) => onChangeNote(event.target.value)} placeholder="What changed? (optional)" className="mt-2 w-full rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm" />}
    </div>
  </form>;
}
