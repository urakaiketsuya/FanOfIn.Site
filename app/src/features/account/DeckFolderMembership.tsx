import { useState } from "react";
import type { DeckFolder, SavedDeck } from "@gatcg/shared";
import DialogSheet from "../../components/ui/DialogSheet";
import Button from "../../components/ui/Button";
import DeckVisualStrip from "./DeckVisualStrip";
import type { useDeckFolders } from "./useDeckFolders";
export default function DeckFolderMembership({ deck, controller, onCreate, onDismiss }: { deck: SavedDeck; controller: ReturnType<typeof useDeckFolders>; onCreate: () => void; onDismiss: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function toggle(folder: DeckFolder) {
    setBusy(true); setError("");
    const deckIds = folder.deckIds.includes(deck.id) ? folder.deckIds.filter(id => id !== deck.id) : [...folder.deckIds, deck.id];
    try { await controller.save(folder.id, { name: folder.name, deckIds }, folder.revision); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not change folders. Please try again."); }
    finally { setBusy(false); }
  }
  return <DialogSheet title={`Folders for ${deck.title}`} onDismiss={onDismiss} dismissible={!busy} footer={<Button disabled={busy} onClick={onDismiss}>Done</Button>}>
    <DeckVisualStrip newTab decklist={deck.decklist} championName={deck.championName} />
    <p className="my-3 text-sm text-ctp-subtext1">Choose any folders for this deck. Each change saves to your account.</p>
    {error && <div className="my-3"><p role="alert" className="text-sm text-ctp-red">{error}</p><Button disabled={busy} onClick={() => { setBusy(true); void controller.refresh().then(() => setError(""), () => setError("Folders could not be reloaded.")).finally(() => setBusy(false)); }}>Reload folders</Button></div>}
    {!controller.folders.length && <p className="py-3 text-sm text-ctp-subtext1">No folders yet. Create one for this deck.</p>}
    <div className="space-y-2">{controller.folders.map(folder => <label key={folder.id} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-ctp-surface1 p-3"><input type="checkbox" checked={folder.deckIds.includes(deck.id)} disabled={busy || (!folder.deckIds.includes(deck.id) && folder.deckIds.length >= 500)} onChange={() => void toggle(folder)} className="h-5 w-5 shrink-0" /><span className="min-w-0 flex-1 break-words text-sm">{folder.name}</span><span className="text-xs text-ctp-subtext1">{folder.deckIds.length} decks</span></label>)}</div>
    <Button className="mt-3" disabled={busy} onClick={onCreate}>New folder for this deck</Button>
  </DialogSheet>;
}
