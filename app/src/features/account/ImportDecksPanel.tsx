import { useMemo, useState } from "react";
import type { DeckFormat, DeckImportCandidate, DeckImportPreview, DeckImportResult, SavedDeck } from "@gatcg/shared";
import { accountApi } from "../../lib/accountApi";
import { useCardCatalog } from "../cards/useCardCatalog";
import { decklistsCollectionBackfillLines } from "../collection/collectionBatch";
import Panel from "../../components/ui/Panel";
import Button from "../../components/ui/Button";
import { InlineState } from "../../components/ui/ContentState";

type Provider = "omnidex" | "shoutatyourdecks";
const MAX_BATCH = 50;

function defaultSelection(candidates: DeckImportCandidate[], imported: Set<string>): Set<string> {
  const champions = new Set<string>();
  const selected = new Set<string>();
  for (const candidate of candidates) {
    if (imported.has(candidate.externalDeckId)) continue;
    const champion = candidate.championName?.trim().toLocaleLowerCase("en-US") || "unknown";
    if (!champions.has(champion) && selected.size < MAX_BATCH) { champions.add(champion); selected.add(candidate.externalDeckId); }
  }
  return selected;
}

function dateLabel(value?: string): string {
  if (!value) return "Date unknown";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function ImportDecksPanel({ decks, busy, run, onImported, onClose }: {
  decks: SavedDeck[];
  busy: boolean;
  run: (action: () => Promise<void>) => Promise<void>;
  onImported: (result: DeckImportResult) => Promise<void>;
  onClose: () => void;
}) {
  const [provider, setProvider] = useState<Provider>("omnidex");
  const [identifier, setIdentifier] = useState("");
  const [preview, setPreview] = useState<DeckImportPreview | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [champion, setChampion] = useState("all");
  const [format, setFormat] = useState<DeckFormat | "all">("all");
  const [year, setYear] = useState("all");
  const [backfillCollection, setBackfillCollection] = useState(false);
  const cards = useCardCatalog();
  const imported = useMemo(() => new Set(decks.flatMap((deck) => deck.sources.filter((source) => source.provider === provider).map((source) => source.externalDeckId))), [decks, provider]);
  const importedCandidateCount = useMemo(() => (preview?.candidates ?? []).filter((candidate) => imported.has(candidate.externalDeckId)).length, [preview, imported]);
  const champions = useMemo(() => [...new Set((preview?.candidates ?? []).map((candidate) => candidate.championName ?? "Unknown champion"))].sort(), [preview]);
  const years = useMemo(() => [...new Set((preview?.candidates ?? []).map((candidate) => candidate.eventDate?.slice(0, 4)).filter((value): value is string => Boolean(value)))].sort().reverse(), [preview]);
  const visible = useMemo(() => (preview?.candidates ?? []).filter((candidate) => {
    const text = `${candidate.title} ${candidate.label} ${candidate.eventName ?? ""}`.toLocaleLowerCase("en-US");
    return (!query.trim() || text.includes(query.trim().toLocaleLowerCase("en-US")))
      && (champion === "all" || (candidate.championName ?? "Unknown champion") === champion)
      && (format === "all" || candidate.format === format)
      && (year === "all" || candidate.eventDate?.startsWith(year));
  }), [preview, query, champion, format, year]);
  const selectableVisible = visible.filter((candidate) => !imported.has(candidate.externalDeckId));

  function resetPreview() { setPreview(null); setSelected(new Set()); setQuery(""); setChampion("all"); setFormat("all"); setYear("all"); setBackfillCollection(false); }
  function toggle(id: string) { setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else if (next.size < MAX_BATCH) next.add(id); return next; }); }
  function selectVisible() { setSelected((current) => { const next = new Set(current); for (const candidate of selectableVisible) { if (next.size >= MAX_BATCH) break; next.add(candidate.externalDeckId); } return next; }); }

  return <section data-component="ImportDecksPanel" className="mt-6 rounded-xl border border-ctp-blue/40 bg-ctp-mantle p-4 sm:p-5">
    <div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-ctp-text">Import public decks</h2><p className="mt-1 text-xs text-ctp-subtext1">Preview a public profile, then choose only the decks you want. This does not verify ownership.</p></div><button type="button" onClick={onClose} className="text-sm text-ctp-subtext1 hover:text-ctp-text" aria-label="Close import form">Close</button></div>
    <div className="mt-4 grid gap-2 sm:grid-cols-[auto_minmax(12rem,1fr)_auto]"><select value={provider} onChange={(event) => { setProvider(event.target.value as Provider); resetPreview(); }} className="rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-2 text-sm"><option value="omnidex">Omnidex ID</option><option value="shoutatyourdecks">Shout At Your Decks</option></select><input value={identifier} inputMode={provider === "omnidex" ? "numeric" : "text"} onChange={(event) => { setIdentifier(event.target.value); resetPreview(); }} placeholder={provider === "omnidex" ? "Player ID" : "Username"} className="min-w-0 rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm" /><button disabled={busy || !identifier.trim()} type="button" onClick={() => void run(async () => { const next = await accountApi.previewImport(provider, identifier); setPreview(next); setSelected(defaultSelection(next.candidates, imported)); })} className="rounded-md border border-ctp-blue px-3 py-2 text-sm text-ctp-blue disabled:opacity-50">Preview</button></div>
    {preview && <div className="mt-5">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="font-medium text-ctp-text">{preview.displayName}</p><p className="text-sm text-ctp-subtext1">{preview.candidates.length} archived appearance{preview.candidates.length === 1 ? "" : "s"} · {importedCandidateCount} already imported</p></div><p className="text-xs text-ctp-subtext0">Up to {MAX_BATCH} per batch</p></div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search event or deck" aria-label="Search decks to import" className="rounded border border-ctp-surface1 bg-ctp-base px-2 py-2 text-sm" /><select value={champion} onChange={(event) => setChampion(event.target.value)} aria-label="Filter by champion" className="rounded border border-ctp-surface1 bg-ctp-base px-2 py-2 text-sm"><option value="all">All champions</option>{champions.map((value) => <option key={value}>{value}</option>)}</select><select value={format} onChange={(event) => setFormat(event.target.value as DeckFormat | "all")} aria-label="Filter by format" className="rounded border border-ctp-surface1 bg-ctp-base px-2 py-2 text-sm"><option value="all">All formats</option><option value="STANDARD">Standard</option><option value="PANTHEON">Pantheon</option><option value="UNKNOWN">Unknown</option></select><select value={year} onChange={(event) => setYear(event.target.value)} aria-label="Filter by year" className="rounded border border-ctp-surface1 bg-ctp-base px-2 py-2 text-sm"><option value="all">All years</option>{years.map((value) => <option key={value}>{value}</option>)}</select></div>
      <div className="mt-3 flex flex-wrap items-center gap-2"><button type="button" onClick={selectVisible} disabled={!selectableVisible.length || selected.size >= MAX_BATCH} className="rounded border border-ctp-surface1 px-2 py-1 text-xs disabled:opacity-50">Select visible</button><button type="button" onClick={() => setSelected(defaultSelection(preview.candidates, imported))} className="rounded border border-ctp-surface1 px-2 py-1 text-xs">Latest per champion</button><button type="button" onClick={() => setSelected(new Set())} disabled={!selected.size} className="rounded border border-ctp-surface1 px-2 py-1 text-xs disabled:opacity-50">Clear</button><span className="ml-auto text-xs text-ctp-subtext1">{selected.size} selected · {visible.length} shown</span></div>
      <div className="mt-3 max-h-[28rem] space-y-2 overflow-y-auto overscroll-contain rounded-lg border border-ctp-surface0 p-2" role="group" aria-label="Decks available to import">{visible.map((candidate) => { const isImported = imported.has(candidate.externalDeckId); return <label key={candidate.externalDeckId} className={`flex gap-3 rounded-md p-3 ${isImported ? "bg-ctp-base/40 opacity-70" : "cursor-pointer bg-ctp-base hover:bg-ctp-surface0"}`}><input type="checkbox" className="mt-1" checked={selected.has(candidate.externalDeckId)} disabled={isImported || (!selected.has(candidate.externalDeckId) && selected.size >= MAX_BATCH)} onChange={() => toggle(candidate.externalDeckId)} /><span className="min-w-0 flex-1"><span className="block font-medium text-ctp-text">{candidate.championName ?? "Unknown champion"}</span><span className="mt-0.5 block text-xs text-ctp-subtext1">{candidate.eventName ?? candidate.label}</span><span className="mt-1 block text-xs text-ctp-subtext0">{dateLabel(candidate.eventDate)} · {candidate.format === "UNKNOWN" ? "Unknown format" : candidate.format === "PANTHEON" ? "Pantheon" : "Standard"}{candidate.placement ? ` · #${candidate.placement}` : ""}{isImported ? " · Already imported" : ""}</span></span></label>; })}{visible.length === 0 && <InlineState className="p-5 text-center text-sm">No decks match these filters.</InlineState>}</div>
      {provider === "omnidex" && <Panel as="label" tone="success" padding="sm" className="mt-4 flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5" checked={backfillCollection} disabled={!cards.length} onChange={(event) => setBackfillCollection(event.target.checked)} /><span><span className="block font-medium text-ctp-text">Backfill my collection from these decklists</span><span className="mt-0.5 block text-xs text-ctp-subtext1">{cards.length ? "Sets ownership to at least the highest quantity seen in any selected list, capped at 4 per unique card. Repeated appearances are not added together, and the change can be undone from Collection." : "Loading the card catalog before collection backfill is available…"}</span></span></Panel>}
      <div className="mt-4 flex flex-wrap items-center gap-3"><Button variant="primary" disabled={busy || selected.size === 0} type="button" onClick={() => void run(async () => { const selectedIds = [...selected]; const result = await accountApi.importDecks(provider, preview.identifier, selectedIds); let collectionChanged = 0; if (provider === "omnidex" && backfillCollection && result.created + result.linked > 0) { const saved = await accountApi.decks(); const selectedIdSet = new Set(selectedIds); const importedDecklists = saved.decks.filter((deck) => deck.sources.some((source) => source.provider === "omnidex" && selectedIdSet.has(source.externalDeckId))).map((deck) => deck.decklist); const lines = decklistsCollectionBackfillLines(importedDecklists, cards, 4); if (lines.length > 500) throw new Error("The collection backfill contains more than 500 unique cards. Import fewer decks at a time."); if (lines.length) { const update = await accountApi.updateCollection({ mode: "at-least", source: `Omnidex backfill: ${preview.displayName}`, lines }); collectionChanged = update.changed; window.dispatchEvent(new Event("fanofin:collection-updated")); } } await onImported({ ...result, collectionChanged }); if (result.skipped === 0) { resetPreview(); onClose(); } else { const next = await accountApi.previewImport(provider, preview.identifier); setPreview(next); setSelected(new Set()); } })}>{busy ? "Importing…" : `Import ${selected.size} selected deck${selected.size === 1 ? "" : "s"}`}</Button><p className="text-xs text-ctp-subtext1">Identical builds are linked as additional appearances instead of duplicated.</p></div>
    </div>}
  </section>;
}
