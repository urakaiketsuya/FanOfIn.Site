import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { validateMatchLogRecord, type SavedDeck } from "@gatcg/shared";
import Button from "../../components/ui/Button";
import DisclosureChevron from "../../components/DisclosureChevron";
import PageLayout from "../../components/layout/PageLayout";
import PageHeader from "../../components/ui/PageHeader";
import Panel from "../../components/ui/Panel";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { addImportedMatches, applyClarentCardMappings, applyClarentDeckMappings, loadMatchLog, mergeMatchLogs, previewClarentImport, resolveClarentMappings, summarizeMatchLog, type ClarentImportPreview, type MatchLogRecord, type MatchOrder, type MatchResult } from "../../lib/matchLog";
import { accountApi } from "../../lib/accountApi";
import { useCardCatalog } from "../cards/useCardCatalog";

const STORAGE_KEY = "fanofin:match-log:guest:v2";
const LEGACY_KEY = "fanofin:match-log:v1";
const readRecords = () => { try { return loadMatchLog(localStorage.getItem(STORAGE_KEY)); } catch { return []; } };
const splitList = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);

export default function MatchLogIndex() {
  const [searchParams] = useSearchParams();
  useDocumentTitle("Match Log", "Record manual games and preview Clarent simulator imports with their evidence source preserved.");
  const catalog = useCardCatalog();
  const knownCardIds = useMemo(() => new Set(catalog.map((card) => card.uuid)), [catalog]);
  const cardsByName = useMemo(() => new Map(catalog.map((card) => [card.name.toLowerCase(), card])), [catalog]);
  const [records, setRecordsState] = useState<MatchLogRecord[]>([]);
  const [savedDecks, setSavedDecks] = useState<SavedDeck[]>([]); const [savedDeckId, setSavedDeckId] = useState(() => searchParams.get("deck") ?? "");
  const [accountSync, setAccountSync] = useState<"checking" | "synced" | "local" | "error">("checking");
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const manualId = useRef(crypto.randomUUID());
  const [reload, setReload] = useState(0);
  const [deviceSelection, setDeviceSelection] = useState<string[]>([]);
  const [deviceRecords, setDeviceRecords] = useState<MatchLogRecord[]>([]);
  const [result, setResult] = useState<MatchResult>("win"); const [order, setOrder] = useState<MatchOrder>("first");
  const [opponent, setOpponent] = useState(""); const [deckLabel, setDeckLabel] = useState(""); const [turns, setTurns] = useState(""); const [mulligans, setMulligans] = useState("");
  const [sideboardPlan, setSideboardPlan] = useState(""); const [gamePlanTurn, setGamePlanTurn] = useState(""); const [notableCards, setNotableCards] = useState(""); const [bottlenecks, setBottlenecks] = useState(""); const [notes, setNotes] = useState("");
  const [importText, setImportText] = useState(""); const [playerSeat, setPlayerSeat] = useState<1 | 2>(1); const [preview, setPreview] = useState<{ previews: ClarentImportPreview[]; errors: string[] } | null>(null);
  const save = async (next: MatchLogRecord[], additions: MatchLogRecord[] = [], removedId?: string): Promise<boolean> => {
    if (busyRef.current || accountSync === "checking" || accountSync === "error") return false;
    busyRef.current = true; setBusy(true); setError(null);
    try {
      const validated = additions.map(validateMatchLogRecord);
      if (userId) {
        if (removedId) await accountApi.deleteMatchLogRecord(removedId, userId);
        else if (validated.length) await accountApi.saveMatchLog(validated, userId);
      } else localStorage.setItem(STORAGE_KEY, JSON.stringify(next.map(validateMatchLogRecord)));
      setRecordsState(next);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Save failed. Your draft is still here; try again.");
      return false;
    } finally { busyRef.current = false; setBusy(false); }
  };
  const summary = summarizeMatchLog(records);
  const transferable = deviceRecords.filter(record => !records.some(existing => existing.id === record.id));
  useEffect(() => {
    const refresh = () => { if (userId && !busyRef.current) setReload(value => value + 1); };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [userId]);
  useEffect(() => {
    let active = true;
    setAccountSync("checking"); setRecordsState([]); setSavedDecks([]); setError(null);
    void (async () => {
      const { user } = await accountApi.session();
      if (!active) return;
      setUserId(user?.id ?? null);
      if (!user) { setRecordsState(readRecords()); setAccountSync("local"); }
      else {
        const [{ decks }, { records: accountRecords, userId: recordsOwner }, verified] = await Promise.all([accountApi.decks(), accountApi.matchLog(), accountApi.session()]);
        if (!active) return;
        if (verified.user?.id !== user.id || recordsOwner !== user.id) throw new Error("Account changed. Refresh your match log.");
        setSavedDecks(decks);
        setRecordsState(loadMatchLog(JSON.stringify(accountRecords)));
        setAccountSync("synced");
      }
      // Legacy storage may contain another account's games. Never silently assign ownership.
      let legacy: MatchLogRecord[] = [];
      try { legacy = loadMatchLog(localStorage.getItem(LEGACY_KEY)); } catch { /* Account access does not require device storage. */ }
      setDeviceRecords(user ? mergeMatchLogs(legacy, readRecords()) : legacy); setDeviceSelection([]);
    })().catch((reason: unknown) => {
      if (active) { setAccountSync("error"); setError(reason instanceof Error ? reason.message : "Could not load your match log."); }
    });
    return () => { active = false; };
  }, [reload]);

  async function importDeviceGames() {
    const additions = deviceRecords.filter(record => deviceSelection.includes(record.id) && !records.some(existing => existing.id === record.id)).map(record => ({
      ...record, savedDeckId: null,
      provenance: record.provenance.kind === "clarent" ? { ...record.provenance, deckMapping: undefined } : record.provenance,
    }));
    if (await save(mergeMatchLogs(records, additions), additions)) { setDeviceRecords(current => current.filter(record => !deviceSelection.includes(record.id))); setDeviceSelection([]); }
  }

  async function addManual() {
    const now = new Date().toISOString();
    const selectedDeck = savedDecks.find((deck) => deck.id === savedDeckId);
    const record: MatchLogRecord = { version: 1, id: manualId.current, playedAt: now, result, order, turns: turns ? Number(turns) : null, mulligans: mulligans ? Number(mulligans) : null, opponent: opponent.trim(), deckLabel: selectedDeck?.title ?? deckLabel.trim(), savedDeckId: selectedDeck?.id ?? null, sideboardPlan: sideboardPlan.trim(), gamePlanTurn: gamePlanTurn ? Number(gamePlanTurn) : null, notableCards: splitList(notableCards), bottlenecks: splitList(bottlenecks), notes: notes.trim(), provenance: { kind: "manual", enteredAt: now } };
    if (!await save(mergeMatchLogs(records, [record]), [record])) return;
    manualId.current = crypto.randomUUID();
    setOpponent(""); setTurns(""); setMulligans(""); setSideboardPlan(""); setGamePlanTurn(""); setNotableCards(""); setBottlenecks(""); setNotes("");
  }

  return <PageLayout data-component="MatchLogIndex">
    <PageHeader title="Match Log" description="Keep self-recorded testing separate from tournament results, with the source of every game attached." />
    <p role="status" className="mt-2 text-xs text-ctp-subtext0">{busy ? "Saving…" : accountSync === "checking" ? "Checking account…" : accountSync === "synced" ? "Account games. Changes save to your account." : accountSync === "local" ? "Device-only games. Sign in to transfer them to your account." : "Match log unavailable."}</p>
    {error && <p role="alert" className="mt-2 break-words text-sm text-ctp-red">{error}</p>}
    <Button className="mt-2" disabled={busy || accountSync === "checking"} onClick={() => setReload(value => value + 1)}>{accountSync === "error" ? "Retry loading" : "Refresh games"}</Button>
    {accountSync === "error" && <Button className="ml-2 mt-2" onClick={() => { setUserId(null); setSavedDecks([]); setDeviceRecords([]); setRecordsState(readRecords()); setAccountSync("local"); setError(null); }}>Use device-only log</Button>}
    {transferable.length > 0 && <Panel className="mt-4"><p className="text-sm">{transferable.length} games are stored on this device. Older games may belong to another account. Transfer only games that are yours.</p><div className="mt-2 max-h-64 overflow-y-auto">{transferable.map(record => <label key={record.id} className="flex min-h-control items-center gap-3 break-words text-sm"><input type="checkbox" disabled={busy} checked={deviceSelection.includes(record.id)} onChange={event => setDeviceSelection(current => event.target.checked ? [...current, record.id] : current.filter(id => id !== record.id))} /><span>{record.deckLabel || "Unspecified deck"} vs. {record.opponent || "unspecified opponent"} · {new Date(record.playedAt).toLocaleDateString()} · {record.result}</span></label>)}</div><Button className="mt-2" disabled={!deviceSelection.length || busy || accountSync === "checking" || accountSync === "error"} onClick={() => void importDeviceGames()}>Transfer {deviceSelection.length} selected games {userId ? "to this account" : "to guest log"}</Button></Panel>}
    <fieldset disabled={busy || accountSync === "checking" || accountSync === "error"} className="min-w-0">
    <div className="mt-4 grid grid-cols-3 gap-2"><Metric label="Games" value={`${summary.games}`} /><Metric label="Wins" value={`${summary.wins}`} /><Metric label="Match points" value={summary.matchPointRate == null ? "–" : `${Math.round(summary.matchPointRate * 100)}%`} /></div>
    <p className={`mt-2 rounded-lg px-3 py-2 text-xs ${summary.confidence === "useful" ? "bg-ctp-green/10 text-ctp-green" : "bg-ctp-yellow/10 text-ctp-yellow"}`}>{summary.warning}</p>
    <Panel className="mt-4"><h2 className="text-base font-semibold text-ctp-text">Log a game</h2><p className="mt-1 text-xs text-ctp-subtext0">Only result and play order are required. Add testing context when it will help explain the outcome later.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2"><Select label="Result" value={result} onChange={(value) => setResult(value as MatchResult)} options={[["win","Win"],["loss","Loss"],["draw","Draw"]]} /><Select label="Play order" value={order} onChange={(value) => setOrder(value as MatchOrder)} options={[["first","Going first"],["second","Going second"],["unknown","Unknown"]]} />{savedDecks.length > 0 ? <Select label="Saved deck" value={savedDeckId} onChange={setSavedDeckId} options={[["","No saved deck"], ...savedDecks.map((deck) => [deck.id, deck.title] as [string,string])]} /> : <Field label="Your deck or Champion" value={deckLabel} setValue={setDeckLabel} placeholder="Optional" />}<Field label="Opponent, deck, or archetype" value={opponent} setValue={setOpponent} placeholder="Optional" /></div>
      <details className="mt-3 rounded-lg border border-ctp-surface1 p-3"><summary className="flex min-h-control cursor-pointer list-none items-center text-sm font-medium text-ctp-blue [&::-webkit-details-marker]:hidden">Add game details<DisclosureChevron /></summary><div className="mt-2 grid gap-3 sm:grid-cols-2"><Field label="Turns" value={turns} setValue={setTurns} type="number" /><Field label="Mulligans" value={mulligans} setValue={setMulligans} type="number" /><Field label="Game plan online turn" value={gamePlanTurn} setValue={setGamePlanTurn} type="number" /><Field label="Notable cards" value={notableCards} setValue={setNotableCards} placeholder="Comma-separated card names" /><Field label="Bottlenecks" value={bottlenecks} setValue={setBottlenecks} placeholder="Resources, setup, interaction…" /><Field label="Sideboard plan" value={sideboardPlan} setValue={setSideboardPlan} placeholder="What came in or out?" /><label className="text-xs text-ctp-subtext0 sm:col-span-2">Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="mt-1 block w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm text-ctp-text" /></label></div></details>
      <Button type="button" onClick={addManual} variant="primary" className="mt-3 min-h-control w-full rounded-lg bg-ctp-blue px-4 text-sm font-semibold text-ctp-base sm:w-auto">Add manual game</Button>{error && <p className="mt-2 text-sm text-ctp-red">{error} Your draft is still here.</p>}
    </Panel>
    <details className="mt-4 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3"><summary className="flex min-h-control cursor-pointer list-none items-center justify-between gap-3 font-semibold text-ctp-text [&::-webkit-details-marker]:hidden"><span>Import from Clarent</span><span className="text-xs font-normal text-ctp-mauve">JSON preview</span><DisclosureChevron /></summary><p className="mt-2 text-xs leading-5 text-ctp-subtext1">Paste one Clarent/TCGEngine v1 game submission or an array. This is a local file/text import, not a live Clarent connection. Choose which seat was yours before previewing.</p><Select label="My seat" value={`${playerSeat}`} onChange={(value) => setPlayerSeat(value === "2" ? 2 : 1)} options={[["1","Player 1"],["2","Player 2"]]} /><textarea aria-label="Clarent submission JSON" value={importText} onChange={(event) => setImportText(event.target.value)} rows={7} placeholder="Paste Clarent submission JSON" className="mt-3 block w-full rounded-lg border border-ctp-surface1 bg-ctp-base p-3 font-mono text-xs text-ctp-text"/><Button type="button" disabled={!importText.trim()} onClick={() => setPreview((() => { const parsed = previewClarentImport(importText, playerSeat, records, knownCardIds); return { ...parsed, previews: resolveClarentMappings(parsed.previews, savedDecks, catalog) }; })())} className="mt-3 min-h-control w-full rounded-lg border border-ctp-mauve/60 px-4 text-sm font-semibold text-ctp-mauve disabled:opacity-40 sm:w-auto">Preview import</Button>{preview && <ImportPreview value={preview} cardOptions={catalog.map((card) => ({ uuid: card.uuid, name: card.name }))} deckOptions={savedDecks.map((deck) => ({ id: deck.id, title: deck.title }))} onImport={async (previews) => { const next = addImportedMatches(records, previews); if (await save(next, next.filter(record => !records.some(existing => existing.id === record.id)))) { setPreview(null); setImportText(""); } }} />}</details>
    <section className="mt-6"><h2 className="text-base font-semibold text-ctp-text">Recent games</h2>{records.length === 0 ? <p className="mt-3 rounded-xl border border-dashed border-ctp-surface1 p-6 text-center text-sm text-ctp-subtext0">No games logged yet.</p> : <div className="mt-3 space-y-3">{records.map((record) => <article key={record.id} className="break-words rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold text-ctp-text">{record.deckLabel || "Unspecified deck"} <span className="font-normal text-ctp-subtext0">vs.</span> {record.opponent || "unspecified opponent"}</p><p className="mt-1 text-xs text-ctp-subtext0">{new Date(record.playedAt).toLocaleDateString()} · {record.order === "first" ? "First" : record.order === "second" ? "Second" : "Order unknown"}{record.turns != null ? ` · ${record.turns} turns` : ""}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${record.result === "win" ? "bg-ctp-green/10 text-ctp-green" : record.result === "loss" ? "bg-ctp-red/10 text-ctp-red" : "bg-ctp-yellow/10 text-ctp-yellow"}`}>{record.result}</span></div>{record.notableCards.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{record.notableCards.map((name) => { const card = cardsByName.get(name.toLowerCase()); return card ? <Link key={name} to={`/cards/${card.slug}`} className="inline-flex min-h-control items-center rounded-full bg-ctp-blue/10 px-2 py-1 text-xs text-ctp-blue">{card.name}</Link> : <span key={name} className="rounded-full bg-ctp-surface0 px-2 py-1 text-xs text-ctp-subtext1">{name}</span>; })}</div>}<details className="mt-2"><summary className="flex min-h-control cursor-pointer items-center text-xs text-ctp-blue">Details and source<DisclosureChevron /></summary><div className="mt-2 space-y-1 text-xs text-ctp-subtext1">{record.sideboardPlan && <p>Sideboard: {record.sideboardPlan}</p>}{record.bottlenecks.length > 0 && <p>Bottlenecks: {record.bottlenecks.join(", ")}</p>}{record.notes && <p>{record.notes}</p>}<p className="text-ctp-subtext0">Source: {record.provenance.kind === "manual" ? "Manual entry" : `Clarent ${record.provenance.submissionId} · imported ${new Date(record.provenance.importedAt).toLocaleString()}`}</p></div></details><Button type="button" onClick={() => void save(records.filter(item => item.id !== record.id), [], record.id)} variant="danger" className="mt-3 min-h-control text-xs text-ctp-red">Remove</Button></article>)}</div>}</section>
    </fieldset>
    <p className="mt-4 text-xs leading-5 text-ctp-subtext0">This is descriptive self-recorded evidence. Small samples, opponent selection, familiarity, and incomplete logging can strongly bias it; it is never blended into tournament win rates.</p>
  </PageLayout>;
}

function ImportPreview({ value, cardOptions, deckOptions, onImport }: { value: { previews: ClarentImportPreview[]; errors: string[] }; cardOptions: { uuid: string; name: string }[]; deckOptions: { id: string; title: string }[]; onImport: (previews: ClarentImportPreview[]) => void }) {
  const [mappingNames, setMappingNames] = useState<Record<string, string>>({});
  const [deckMappings, setDeckMappings] = useState<Record<string, string>>({});
  const byName = useMemo(() => new Map(cardOptions.flatMap((card) => [[card.name.toLocaleLowerCase(), card] as const, [card.uuid.toLocaleLowerCase(), card] as const])), [cardOptions]);
  const mappings = Object.fromEntries(Object.entries(mappingNames).flatMap(([id, name]) => { const card = byName.get(name.trim().toLocaleLowerCase()); return card ? [[id, card]] : []; }));
  const mappedPreviews = applyClarentDeckMappings(applyClarentCardMappings(value.previews, mappings), Object.fromEntries(Object.entries(deckMappings).flatMap(([recordId, deckId]) => { const deck = deckOptions.find((item) => item.id === deckId); return deck ? [[recordId, deck]] : []; })));
  const fresh = mappedPreviews.filter((entry) => !entry.duplicate);
  return <div className="mt-3 rounded-lg border border-ctp-surface1 bg-ctp-base p-3"><h3 className="text-sm font-semibold text-ctp-text">Import preview</h3><datalist id="clarent-card-names">{cardOptions.map((card) => <option key={card.uuid} value={card.name} />)}</datalist>{value.errors.map((error) => <p key={error} className="mt-2 text-xs text-ctp-red">{error}</p>)}<div className="mt-2 space-y-2">{mappedPreviews.map((entry) => <div key={entry.record.id} className="rounded-lg border border-ctp-surface1 p-3 text-xs"><p className="font-medium text-ctp-text">{entry.record.deckLabel} vs. {entry.record.opponent} · {entry.record.result}</p><p className="mt-1 text-ctp-subtext0">{entry.duplicate ? "Already imported – will be skipped" : "Ready to import"} · {entry.record.provenance.kind === "clarent" ? entry.record.provenance.submissionId : ""}</p><p className={`mt-2 ${entry.deckMapping === "exact" ? "text-ctp-green" : "text-ctp-yellow"}`}>{entry.deckMapping === "exact" ? `Deck linked: ${entry.record.deckLabel}` : entry.deckMapping === "ambiguous" ? "Multiple saved decks match this exact list." : "No exact saved-deck match was found."}</p>{entry.deckMapping !== "exact" && deckOptions.length > 0 && <label className="mt-1 block text-ctp-subtext0">Link saved deck<select value={deckMappings[entry.record.id] ?? ""} onChange={(event) => setDeckMappings((current) => ({ ...current, [entry.record.id]: event.target.value }))} className="mt-1 min-h-control w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 text-sm text-ctp-text"><option value="">Leave unlinked</option>{deckOptions.map((deck) => <option key={deck.id} value={deck.id}>{deck.title}</option>)}</select></label>}{Object.entries(entry.ambiguousCardIds).map(([id, choices]) => <label key={id} className="mt-2 block text-ctp-yellow"><span className="block break-all">Choose the printing for {id}</span><select value={mappingNames[id] ?? ""} onChange={(event) => setMappingNames((current) => ({ ...current, [id]: event.target.value }))} className="mt-1 min-h-control w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 text-sm text-ctp-text"><option value="">Unresolved</option>{choices.map((card) => <option key={card.uuid} value={card.name}>{card.name} · {card.uuid}</option>)}</select></label>)}{entry.unresolvedCardIds.length > 0 && <details className="mt-2"><summary className="flex min-h-control cursor-pointer items-center text-ctp-yellow">Resolve {entry.unresolvedCardIds.length} unknown card ID{entry.unresolvedCardIds.length === 1 ? "" : "s"}</summary><div className="mt-2 space-y-2">{entry.unresolvedCardIds.map((id) => <label key={id} className="block text-ctp-subtext0"><span className="block break-all">{id}</span><input list="clarent-card-names" value={mappingNames[id] ?? ""} onChange={(event) => setMappingNames((current) => ({ ...current, [id]: event.target.value }))} placeholder="Choose canonical card…" className="mt-1 min-h-control w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 text-sm text-ctp-text" /></label>)}</div></details>}</div>)}</div><Button type="button" disabled={fresh.length === 0} onClick={() => onImport(mappedPreviews)} className="mt-3 min-h-control w-full rounded-lg bg-ctp-mauve px-4 text-sm font-semibold text-ctp-base disabled:opacity-40 sm:w-auto">Import {fresh.length} new game{fresh.length === 1 ? "" : "s"}</Button></div>;
}
function Field({ label, value, setValue, placeholder, type = "text" }: { label: string; value: string; setValue: (value: string) => void; placeholder?: string; type?: string }) { return <label className="text-xs text-ctp-subtext0">{label}<input type={type} min={type === "number" ? 0 : undefined} value={value} onChange={(event) => setValue(event.target.value)} placeholder={placeholder} className="mt-1 block min-h-control w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-sm text-ctp-text" /></label>; }
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string,string][] }) { return <label className="mt-3 block text-xs text-ctp-subtext0">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 block min-h-control w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-sm text-ctp-text sm:max-w-xs">{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3"><p className="text-[10px] uppercase tracking-wide text-ctp-subtext0">{label}</p><p className="mt-1 text-xl font-bold tabular-nums text-ctp-text">{value}</p></div>; }
