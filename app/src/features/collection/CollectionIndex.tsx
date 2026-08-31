import { useEffect, useMemo, useState } from "react";
import { computeDeckCollectionStatus, type AccountUser, type Card, type CollectionEntry, type CollectionTransaction, type CollectionUpdateLine, type CollectionUpdateMode, type SavedDeck } from "@gatcg/shared";
import { accountApi } from "../../lib/accountApi";
import { useCardCatalog } from "../cards/useCardCatalog";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import GoogleSignInButton from "../account/GoogleSignInButton";

function downloadCsv(entries: CollectionEntry[]) {
  const csv = ["card_uuid,card_name,owned_quantity,proxy_quantity", ...entries.map((entry) => [entry.cardUuid, JSON.stringify(entry.cardName), entry.ownedQuantity, entry.proxyQuantity].join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = "fanofin-collection.csv"; anchor.click(); URL.revokeObjectURL(url);
}

function parseCsv(text: string, cards: Card[]): { lines: CollectionUpdateLine[]; unresolved: string[] } {
  const byName = new Map(cards.map((card) => [card.name.toLocaleLowerCase("en-US"), card]));
  const byUuid = new Map(cards.map((card) => [card.uuid, card]));
  const lines: CollectionUpdateLine[] = []; const unresolved: string[] = [];
  for (const [index, raw] of text.split(/\r?\n/).entries()) {
    if (!raw.trim() || (index === 0 && /card|quantity/i.test(raw))) continue;
    const columns = raw.match(/(?:"([^"]*(?:""[^"]*)*)"|([^,]*))(?:,|$)/g)?.map((part) => part.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"').trim()) ?? [];
    let card: Card | undefined; let quantity = 0; let proxyQuantity = 0;
    if (columns.length >= 3 && byUuid.has(columns[0])) { card = byUuid.get(columns[0]); quantity = Number(columns[2]); proxyQuantity = Number(columns[3] ?? 0); }
    else { quantity = Number(columns[0]); card = byName.get((columns[1] ?? "").toLocaleLowerCase("en-US")); proxyQuantity = Number(columns[2] ?? 0); }
    if (!card || !Number.isInteger(quantity) || quantity < 0) { unresolved.push(raw); continue; }
    lines.push({ cardUuid: card.uuid, cardName: card.name, quantity, proxyQuantity: Number.isInteger(proxyQuantity) && proxyQuantity >= 0 ? proxyQuantity : 0 });
  }
  const merged = new Map<string, CollectionUpdateLine>();
  for (const line of lines) {
    const current = merged.get(line.cardUuid);
    if (current) { current.quantity += line.quantity; current.proxyQuantity = (current.proxyQuantity ?? 0) + (line.proxyQuantity ?? 0); }
    else merged.set(line.cardUuid, { ...line });
  }
  return { lines: Array.from(merged.values()), unresolved };
}

export default function CollectionIndex() {
  useDocumentTitle("My Collection", "Track cards you own and see which decks you can build.");
  const cards = useCardCatalog();
  const [user, setUser] = useState<AccountUser | null | undefined>();
  const [entries, setEntries] = useState<CollectionEntry[]>([]);
  const [transactions, setTransactions] = useState<CollectionTransaction[]>([]);
  const [decks, setDecks] = useState<SavedDeck[]>([]); const [selectedDeckIds, setSelectedDeckIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState(""); const [csv, setCsv] = useState("");
  const [mode, setMode] = useState<CollectionUpdateMode>("at-least");
  const [notice, setNotice] = useState<string | null>(null); const [busy, setBusy] = useState(false);

  async function refresh() { const [result, deckResult] = await Promise.all([accountApi.collection(), accountApi.decks()]); setEntries(result.entries); setTransactions(result.transactions); setDecks(deckResult.decks); }
  useEffect(() => { void accountApi.session().then((result) => { setUser(result.user); if (result.user) void refresh(); }).catch(() => setUser(null)); }, []);
  const entryByUuid = useMemo(() => new Map(entries.map((entry) => [entry.cardUuid, entry])), [entries]);
  const matchingCards = useMemo(() => query.trim().length < 2 ? [] : cards.filter((card) => card.name.toLocaleLowerCase("en-US").includes(query.trim().toLocaleLowerCase("en-US"))).slice(0, 12), [cards, query]);
  const filteredEntries = useMemo(() => entries.filter((entry) => entry.cardName.toLocaleLowerCase("en-US").includes(query.trim().toLocaleLowerCase("en-US"))), [entries, query]);
  const projectStatus = useMemo(() => {
    const selected = decks.filter((deck) => selectedDeckIds.has(deck.id));
    if (!selected.length) return null;
    return computeDeckCollectionStatus({ main: selected.flatMap((deck) => deck.decklist.main), material: selected.flatMap((deck) => deck.decklist.material), sideboard: selected.flatMap((deck) => deck.decklist.sideboard) }, entries);
  }, [decks, selectedDeckIds, entries]);

  async function update(lines: CollectionUpdateLine[], source: string, updateMode: CollectionUpdateMode = "set") { setBusy(true); setNotice(null); try { const result = await accountApi.updateCollection({ mode: updateMode, source, lines }); await refresh(); setNotice(result.changed ? `${result.changed} card entr${result.changed === 1 ? "y" : "ies"} updated.` : "No quantities changed."); } catch (reason) { setNotice(reason instanceof Error ? reason.message : "Collection update failed"); } finally { setBusy(false); } }

  if (user === undefined) return <div className="mx-auto max-w-4xl px-4 py-10 text-ctp-subtext1">Loading collection…</div>;
  if (!user) return <div className="mx-auto max-w-xl px-4 py-12"><h1 className="text-3xl font-bold text-ctp-blue">My Collection</h1><p className="mt-2 text-ctp-subtext1">Sign in to track your cards and build decks from what you own.</p><div className="mt-6"><GoogleSignInButton onCredential={(credential, nonce) => void accountApi.googleSignIn(credential, nonce).then(async (result) => { setUser(result.user); await refresh(); })} /></div></div>;

  return <div className="mx-auto max-w-5xl px-4 py-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold text-ctp-blue">My Collection</h1><p className="mt-2 text-sm text-ctp-subtext1">{entries.length} unique card{entries.length === 1 ? "" : "s"} · {entries.reduce((sum, entry) => sum + entry.ownedQuantity, 0)} physical copies</p></div><button type="button" disabled={!entries.length} onClick={() => downloadCsv(entries)} className="rounded border border-ctp-surface1 px-3 py-2 text-sm disabled:opacity-50">Export CSV</button></div>
    {notice && <p className="mt-4 rounded border border-ctp-blue/40 bg-ctp-blue/5 p-3 text-sm text-ctp-subtext1">{notice}</p>}
    <section className="mt-6 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4"><h2 className="font-semibold">Add or edit a card</h2><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the card catalog" className="mt-3 w-full rounded border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm" />{matchingCards.length > 0 && <div className="mt-2 max-h-72 divide-y divide-ctp-surface0 overflow-auto rounded border border-ctp-surface1">{matchingCards.map((card) => { const owned = entryByUuid.get(card.uuid); return <div key={card.uuid} className="flex items-center justify-between gap-3 px-3 py-2 text-sm"><span>{card.name}<span className="ml-2 text-xs text-ctp-subtext0">{owned?.ownedQuantity ?? 0} owned</span></span><div className="flex gap-1"><button disabled={busy} onClick={() => void update([{ cardUuid: card.uuid, cardName: card.name, quantity: Math.max(0, (owned?.ownedQuantity ?? 0) - 1), proxyQuantity: owned?.proxyQuantity ?? 0 }], "Manual adjustment")} className="rounded border border-ctp-surface1 px-2 py-1">−</button><button disabled={busy} onClick={() => void update([{ cardUuid: card.uuid, cardName: card.name, quantity: (owned?.ownedQuantity ?? 0) + 1, proxyQuantity: owned?.proxyQuantity ?? 0 }], "Manual adjustment")} className="rounded border border-ctp-surface1 px-2 py-1">+</button></div></div>; })}</div>}</section>
    <section className="mt-5 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4"><h2 className="font-semibold">Import CSV or a quantity list</h2><p className="mt-1 text-xs text-ctp-subtext1">Accepts exported CSV or lines like <code>4,Dungeon Guide</code>. You’ll see unresolved rows before anything is saved.</p><textarea rows={6} value={csv} onChange={(event) => setCsv(event.target.value)} className="mt-3 w-full rounded border border-ctp-surface1 bg-ctp-base p-3 font-mono text-sm" /><div className="mt-2 flex flex-wrap gap-2"><select value={mode} onChange={(event) => setMode(event.target.value as CollectionUpdateMode)} className="rounded border border-ctp-surface1 bg-ctp-base px-2 py-1.5 text-sm"><option value="at-least">Set to at least</option><option value="add">Add quantities</option><option value="set">Replace quantities</option></select><button disabled={busy || !csv.trim()} onClick={() => { const parsed = parseCsv(csv, cards); if (parsed.unresolved.length) { setNotice(`${parsed.unresolved.length} row${parsed.unresolved.length === 1 ? "" : "s"} could not be resolved. Fix them before importing: ${parsed.unresolved.slice(0, 3).join(" | ")}`); return; } const copies = parsed.lines.reduce((sum, line) => sum + line.quantity, 0); if (!parsed.lines.length || !window.confirm(`${mode === "add" ? "Add" : mode === "set" ? "Set" : "Set to at least"} ${copies} copies across ${parsed.lines.length} cards?`)) return; void update(parsed.lines, "CSV import", mode).then(() => setCsv("")); }} className="rounded bg-ctp-blue px-3 py-1.5 text-sm text-ctp-base disabled:opacity-50">Preview and import</button></div></section>
    {decks.length > 0 && <section className="mt-5 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4"><h2 className="font-semibold">Deck projects</h2><p className="mt-1 text-xs text-ctp-subtext1">Select decks to see whether you can assemble them simultaneously.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{decks.map((deck) => <label key={deck.id} className="flex items-center gap-2 rounded border border-ctp-surface0 px-3 py-2 text-sm"><input type="checkbox" checked={selectedDeckIds.has(deck.id)} onChange={() => setSelectedDeckIds((current) => { const next = new Set(current); if (next.has(deck.id)) next.delete(deck.id); else next.add(deck.id); return next; })} /><span className="truncate">{deck.title}</span></label>)}</div>{projectStatus && <div className={`mt-3 rounded p-3 text-sm ${projectStatus.complete ? "bg-ctp-green/10 text-ctp-green" : "bg-ctp-yellow/10 text-ctp-subtext1"}`}>{projectStatus.complete ? "You can assemble all selected decks at once." : `${projectStatus.missingCopies} additional copies needed across ${projectStatus.lines.filter((line) => line.missing > 0).length} cards.`}<details className="mt-2"><summary className="cursor-pointer text-xs">Show combined shortages</summary><ul className="mt-2 grid gap-1 text-xs sm:grid-cols-2">{projectStatus.lines.filter((line) => line.missing > 0).map((line) => <li key={line.card}>{line.missing}× {line.card}</li>)}</ul></details></div>}</section>}
    <section className="mt-8"><h2 className="text-lg font-semibold">Cards</h2>{filteredEntries.length === 0 ? <p className="mt-3 text-sm text-ctp-subtext1">No matching cards in your collection.</p> : <div className="mt-3 divide-y divide-ctp-surface0 rounded-xl border border-ctp-surface1 bg-ctp-mantle">{filteredEntries.map((entry) => <div key={entry.cardUuid} className="grid grid-cols-[minmax(0,1fr)_5rem_5rem] items-center gap-3 px-4 py-3 text-sm"><span className="truncate font-medium">{entry.cardName}</span><label className="text-xs text-ctp-subtext1">Owned<input type="number" min={0} max={9999} value={entry.ownedQuantity} onChange={(event) => setEntries((current) => current.map((item) => item.cardUuid === entry.cardUuid ? { ...item, ownedQuantity: Math.max(0, Number(event.target.value)) } : item))} onBlur={() => void update([{ cardUuid: entry.cardUuid, cardName: entry.cardName, quantity: entry.ownedQuantity, proxyQuantity: entry.proxyQuantity }], "Manual adjustment")} className="mt-1 w-full rounded border border-ctp-surface1 bg-ctp-base px-2 py-1" /></label><label className="text-xs text-ctp-subtext1">Proxies<input type="number" min={0} max={9999} value={entry.proxyQuantity} onChange={(event) => setEntries((current) => current.map((item) => item.cardUuid === entry.cardUuid ? { ...item, proxyQuantity: Math.max(0, Number(event.target.value)) } : item))} onBlur={() => void update([{ cardUuid: entry.cardUuid, cardName: entry.cardName, quantity: entry.ownedQuantity, proxyQuantity: entry.proxyQuantity }], "Manual adjustment")} className="mt-1 w-full rounded border border-ctp-surface1 bg-ctp-base px-2 py-1" /></label></div>)}</div>}</section>
    {transactions.length > 0 && <section className="mt-8"><h2 className="text-lg font-semibold">Recent changes</h2><div className="mt-3 space-y-2">{transactions.map((transaction) => <div key={transaction.id} className="flex items-center justify-between gap-3 rounded border border-ctp-surface1 px-3 py-2 text-sm"><span>{transaction.source} · {transaction.lineCount} card{transaction.lineCount === 1 ? "" : "s"}<span className="ml-2 text-xs text-ctp-subtext0">{new Date(transaction.createdAt).toLocaleString()}</span></span>{transaction.undoneAt ? <span className="text-xs text-ctp-subtext0">Undone</span> : <button disabled={busy} onClick={() => void accountApi.undoCollectionTransaction(transaction.id).then(refresh).catch((reason: Error) => setNotice(reason.message))} className="text-xs text-ctp-blue hover:underline">Undo</button>}</div>)}</div></section>}
  </div>;
}
