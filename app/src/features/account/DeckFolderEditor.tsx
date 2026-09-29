import { useMemo, useState } from "react";
import type { DeckFolder, SavedDeck } from "@gatcg/shared";
import DialogSheet from "../../components/ui/DialogSheet";
import Button from "../../components/ui/Button";
import DeckVisualStrip from "./DeckVisualStrip";
import type { useDeckFolders } from "./useDeckFolders";
import { useCardCatalog } from "../cards/useCardCatalog";

type FolderController = ReturnType<typeof useDeckFolders>;
export default function DeckFolderEditor({ folder, initialDeckIds = [], decks, controller, onDismiss, onSaved }: {
  folder?: DeckFolder; initialDeckIds?: string[]; decks: SavedDeck[]; controller: FolderController; onDismiss: () => void; onSaved: (folder: DeckFolder) => void;
}) {
  const [id] = useState(() => folder?.id ?? crypto.randomUUID());
  const [baseline, setBaseline] = useState({ name: folder?.name ?? "", deckIds: folder?.deckIds ?? initialDeckIds, revision: folder?.revision });
  const [name, setName] = useState(baseline.name);
  const [selected, setSelected] = useState(() => new Set(baseline.deckIds));
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(24);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const catalog = useCardCatalog();
  const elementsByName = useMemo(() => new Map(catalog.map(card => [card.name, card.elements])), [catalog]);
  const matches = useMemo(() => decks.filter(deck => [deck.title, deck.championName ?? "", ...[...deck.decklist.material, ...deck.decklist.main].flatMap(line => elementsByName.get(line.card) ?? [])].join(" ").toLowerCase().includes(query.trim().toLowerCase())), [decks, elementsByName, query]);
  const dirty = name !== baseline.name || JSON.stringify([...selected].sort()) !== JSON.stringify([...baseline.deckIds].sort());
  async function save() {
    setBusy(true); setError("");
    try { onSaved(await controller.save(id, { name, deckIds: [...selected] }, baseline.revision)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Folder could not be saved. Your edits are still here."); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!folder || baseline.revision === undefined) return;
    setBusy(true); setError("");
    try { await controller.remove({ ...folder, revision: baseline.revision }); onDismiss(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Folder could not be deleted."); }
    finally { setBusy(false); }
  }
  async function reload() {
    setBusy(true); setError("");
    try {
      const latest = (await controller.refresh()).find(item => item.id === id);
      if (!latest) { setError("This folder no longer exists. Close this sheet and create a new folder if needed."); return; }
      setBaseline({ name: latest.name, deckIds: latest.deckIds, revision: latest.revision }); setName(latest.name); setSelected(new Set(latest.deckIds)); setDeleting(false);
    } catch { setError("Could not reload folders. Your edits are still here."); }
    finally { setBusy(false); }
  }
  return <DialogSheet title={folder ? "Edit folder" : "New folder"} onDismiss={onDismiss} dirty={dirty} dismissible={!busy} footer={<div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-ctp-subtext1">{selected.size} {selected.size === 1 ? "deck" : "decks"} selected</p><Button variant="primary" disabled={busy || !name.trim() || (!dirty && !!folder) || deleting} onClick={() => void save()}>{busy ? "Saving…" : folder ? "Save folder" : "Create folder"}</Button></div>}>
    <p className="mb-3 text-sm text-ctp-subtext1">Group saved builds by Champion, element, or any name you choose. A deck can be in several folders. Folders are private to your account.</p>
    <label className="block text-sm font-medium">Folder name<input autoFocus value={name} maxLength={60} disabled={busy} onChange={event => setName(event.target.value)} placeholder="Lorraine, Fire, Tournament testing…" className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3" /></label>
    {error && <div className="my-3"><p role="alert" className="text-sm text-ctp-red">{error}</p>{folder && <Button className="mt-2" disabled={busy} onClick={() => void reload()}>Reload saved folder (discard edits)</Button>}</div>}
    {folder && <div className="my-3">{deleting ? <div className="rounded-lg border border-ctp-red/50 p-3"><p className="text-sm">Delete “{baseline.name}”? Its decks and their other folders will be kept.</p><div className="mt-2 flex flex-wrap gap-2"><Button variant="danger" disabled={busy} onClick={() => void remove()}>Delete folder</Button><Button disabled={busy} onClick={() => setDeleting(false)}>Keep folder</Button></div></div> : <Button variant="ghost" disabled={busy} onClick={() => setDeleting(true)}>Delete this folder</Button>}</div>}
    <label className="mt-4 block text-sm">Find decks<input value={query} onChange={event => { setQuery(event.target.value); setLimit(24); }} placeholder="Search decks, Champions, or elements" className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3" /></label>
    <div className="my-2 flex flex-wrap items-center gap-2"><span className="mr-auto text-xs text-ctp-subtext1">{matches.length} matching decks</span><Button disabled={busy || !matches.length || new Set([...selected, ...matches.map(deck => deck.id)]).size > 500} onClick={() => setSelected(current => new Set([...current, ...matches.map(deck => deck.id)]))}>Select matches</Button><Button disabled={busy || !selected.size} onClick={() => setSelected(new Set())}>Clear selection</Button></div>
    {!matches.length && <p className="py-6 text-sm text-ctp-subtext1">{decks.length ? "No decks match this search. Selected decks are kept when you change the search." : "No saved builds yet. Create an empty folder now and add decks later."}</p>}
    <div className="grid gap-3">{matches.slice(0, limit).map(deck => <article key={deck.id} className={`min-w-0 rounded-xl border p-3 ${selected.has(deck.id) ? "border-ctp-blue bg-ctp-blue/5" : "border-ctp-surface1 bg-ctp-mantle"}`}><DeckVisualStrip newTab decklist={deck.decklist} championName={deck.championName} /><label className="mt-2 flex min-h-12 cursor-pointer items-center gap-3"><input type="checkbox" checked={selected.has(deck.id)} disabled={busy || (!selected.has(deck.id) && selected.size >= 500)} onChange={() => setSelected(current => { const next = new Set(current); if (next.has(deck.id)) next.delete(deck.id); else next.add(deck.id); return next; })} className="h-5 w-5 shrink-0" /><span className="min-w-0 break-words"><span className="block text-sm font-semibold">{deck.title}</span><span className="text-xs text-ctp-subtext1">{deck.championName ?? "Unknown Champion"} · {deck.format}</span></span></label></article>)}</div>
    {matches.length > limit && <Button className="mt-3" onClick={() => setLimit(count => count + 24)}>Show more decks</Button>}
  </DialogSheet>;
}
