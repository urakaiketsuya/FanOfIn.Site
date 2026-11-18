import { useBrowseState } from "../../lib/useBrowseState";
import { useCallback, useEffect, useRef, useState } from "react";
import { merchandiseCollectionItems, merchandiseProgress, parseMerchandiseQuantities, type MerchandiseCollection as Snapshot, type MerchandiseSaveInput } from "@gatcg/shared";
import { accountApi } from "../../lib/accountApi";
import Button from "../../components/ui/Button";
import { Link, useSearchParams } from "react-router-dom";
import MerchandiseCollectionCard from "./MerchandiseCollectionCard";

type Draft = { edits: Record<string, number>; pending?: MerchandiseSaveInput };
const categories = [...new Set(merchandiseCollectionItems.flatMap(item => [item.category, ...(item.catalogEntry ? [item.catalogEntry.category] : [])]))].sort();
function readDraft(key: string): Draft {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "null") as Draft | null;
    if (!value) return { edits: {} };
    // Retain explicit zero edits, which represent removals.
    parseMerchandiseQuantities(value.edits);
    if (value.pending) parseMerchandiseQuantities(value.pending.quantities);
    return value;
  } catch { return { edits: {} }; }
}
export default function MerchandiseCollection({ userId }: { userId: string }) {
  const [params, setParams] = useSearchParams();
  const selectedCatalogId = params.get("merchandise");
  const [limit, setLimit] = useState(24);
  const storageKey = `fanofin:merchandise-draft:${userId}`;
  const [draft, setDraft] = useState<Draft>(() => readDraft(storageKey));
  const [saved, setSaved] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [storageError, setStorageError] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useBrowseState('collection/MerchandiseCollection.search', "");
  const [release, setRelease] = useBrowseState('collection/MerchandiseCollection.release', "");
  const [champion, setChampion] = useBrowseState('collection/MerchandiseCollection.champion', "");
  const [category, setCategory] = useBrowseState('collection/MerchandiseCollection.category', "");
  const [ownership, setOwnership] = useBrowseState('collection/MerchandiseCollection.ownership', "");
  const dirty = Object.keys(draft.edits).length > 0;

  useEffect(() => {
    try { if (dirty || draft.pending) localStorage.setItem(storageKey, JSON.stringify(draft)); else localStorage.removeItem(storageKey); setStorageError(false); }
    catch { setStorageError(true); }
  }, [draft, dirty, storageKey]);
  useEffect(() => {
    if (!dirty && !draft.pending) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, draft.pending]);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const result = await accountApi.merchandise();
      if (result.userId !== userId) throw new Error("Account changed. Reload this page.");
      setSaved(result); setConflict(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load merchandise."); }
    finally { setLoading(false); }
  }, [userId]);
  useEffect(() => { void load(); }, [load]);

  async function save() {
    if (!saved || busyRef.current || conflict) return;
    busyRef.current = true; setBusy(true); setError(null); setNotice("");
    const command = draft.pending ?? { expectedUserId: userId, expectedRevision: saved.revision, requestId: crypto.randomUUID(), quantities: parseMerchandiseQuantities({ ...saved.quantities, ...draft.edits }) };
    setDraft(current => ({ ...current, pending: command }));
    try {
      const result = await accountApi.saveMerchandise(command);
      if (result.userId !== userId) throw new Error("Account changed. Reload this page.");
      setSaved(result); setDraft({ edits: {} }); setNotice("Merchandise quantities saved.");
    } catch (reason) {
      const status = reason && typeof reason === "object" && "status" in reason ? Number(reason.status) : 0;
      if (status === 409 || status === 400) {
        setDraft(current => ({ edits: current.edits }));
        if (status === 409) setConflict(true);
      }
      setError(reason instanceof Error ? reason.message : "Save interrupted. Retry to confirm your quantities.");
    } finally { busyRef.current = false; setBusy(false); }
  }
  const quantities = { ...saved?.quantities, ...draft.edits };
  const filtered = merchandiseCollectionItems.filter(item => selectedCatalogId ? item.catalogEntry?.id === selectedCatalogId
    : (!release || item.releaseId === release) && (!champion || item.champion === champion) && (!category || item.category === category || item.catalogEntry?.category === category)
    && `${item.name} ${item.detail} ${item.releaseName} ${item.category} ${item.champion}`.toLowerCase().includes(search.trim().toLowerCase())
    && (!ownership || (ownership === "owned" ? (quantities[item.id] ?? 0) > 0 : !(quantities[item.id] ?? 0))));
  const progress = merchandiseProgress(filtered.map(item => item.id), saved?.quantities ?? {});
  const releases = [...new Map(merchandiseCollectionItems.map(item => [item.releaseId, item.releaseName])).entries()];
  const grouped = new Map<string, typeof filtered>();
  for (const item of filtered) {
    const key = item.bundle?.overviewImageUrl ? item.bundle.id : item.id;
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }
  const groups = [...grouped.values()];
  const clearFilters = () => {
    setSearch(""); setRelease(""); setChampion(""); setCategory(""); setOwnership(""); setLimit(24);
    setParams(current => { const next = new URLSearchParams(current); next.delete("merchandise"); return next; }, { replace: true });
  };
  const edit = (id: string, quantity: number) => {
    setNotice("");
    setDraft(current => {
      const edits = { ...current.edits, [id]: quantity };
      if (quantity === (saved?.quantities[id] ?? 0)) delete edits[id];
      return { edits };
    });
  };
  return <section className="mt-4 space-y-4 [&_input]:scroll-mt-28 [&_select]:scroll-mt-28 [&_button]:scroll-mt-28 [&_summary]:scroll-mt-28" aria-label="Merchandise collection" onFocusCapture={event => { if (event.target.getBoundingClientRect().top < 100) event.target.scrollIntoView({ block: "center" }); }}>
    <div><h2 className="text-xl font-semibold">Merchandise collection</h2><Link to="/merchandise" className="inline-flex min-h-12 items-center text-sm text-ctp-blue underline">Browse catalog and photo bounties</Link></div>
    {loading && <p role="status">Loading merchandise…</p>}
    {storageError && <p role="alert">Your draft could not be stored on this device. Keep this page open until you save.</p>}
    {error && <div role="alert" className="rounded-lg border border-ctp-yellow p-3"><p>{error}</p>{(!saved || conflict) && <Button onClick={() => void load()} disabled={loading}>{conflict ? "Load saved quantities; keep my draft" : "Retry loading"}</Button>}</div>}
    {notice && <p role="status">{notice}</p>}
    {saved && <>
      <div className="rounded-xl border border-ctp-surface1 p-4"><p className="font-semibold">{progress.owned} / {progress.total} matching entries owned</p><progress className="mt-2 w-full accent-ctp-blue" aria-label="Saved merchandise progress" value={progress.owned} max={progress.total || 1} /><p className="text-xs text-ctp-subtext1">Saved progress · merchandise quantities</p></div>
      {!selectedCatalogId && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-sm">Search<input value={search} onChange={e => { setSearch(e.target.value); setLimit(24); }} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3" /></label>
        <label className="text-sm">Release / catalog<select aria-label="Release" value={release} onChange={e => { setRelease(e.target.value); setLimit(24); }} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3"><option value="">All releases and catalogs</option>{releases.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <label className="text-sm">Champion<select aria-label="Champion" value={champion} onChange={e => { setChampion(e.target.value); setLimit(24); }} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3"><option value="">All champions</option>{[...new Set(merchandiseCollectionItems.map(item => item.champion).filter(Boolean))].sort().map(name => <option key={name}>{name}</option>)}</select></label>
        <label className="text-sm">Category<select aria-label="Category" value={category} onChange={e => { setCategory(e.target.value); setLimit(24); }} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3"><option value="">All categories</option>{categories.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
        <label className="text-sm">Ownership<select aria-label="Ownership" value={ownership} onChange={e => { setOwnership(e.target.value); setLimit(24); }} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3"><option value="">All items</option><option value="owned">Owned</option><option value="missing">Missing</option></select></label>
      </div>}
      {selectedCatalogId && <p className="text-sm">Selected catalog entry · <Button onClick={clearFilters}>Show all merchandise</Button></p>}
      {(dirty || draft.pending) && <div className="flex flex-wrap items-center gap-3 rounded-xl border border-ctp-blue p-3"><p>{Object.keys(draft.edits).length} unsaved changes</p><Button variant="primary" disabled={busy || conflict} onClick={() => void save()}>{busy ? "Saving…" : draft.pending ? "Retry merchandise save" : "Save merchandise"}</Button><Button disabled={busy || !!draft.pending} onClick={() => { setDraft({ edits: {} }); setError(null); }}>Discard changes</Button>{draft.pending && !busy && <p className="w-full text-sm">Save unconfirmed. Retry before editing or discarding.</p>}</div>}
      {!filtered.length && <div role="status"><p>No merchandise matches these filters.</p><Button className="mt-2" onClick={clearFilters}>Clear filters</Button></div>}
      <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {groups.slice(0, limit).map(items => <MerchandiseCollectionCard key={items[0].bundle?.overviewImageUrl ? items[0].bundle.id : items[0].id} items={items} quantities={quantities} disabled={busy || !!draft.pending || conflict} onEdit={edit} />)}
      </div>
      {groups.length > limit && <Button onClick={() => setLimit(current => current + 24)}>Show more merchandise ({Math.min(limit, groups.length)} / {groups.length})</Button>}
      {dirty && <Button variant="primary" disabled={busy || conflict} onClick={() => void save()}>{busy ? "Saving…" : draft.pending ? "Retry merchandise save" : "Save merchandise"}</Button>}
    </>}
  </section>;
}
