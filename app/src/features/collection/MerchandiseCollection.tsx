import { useCallback, useEffect, useRef, useState } from "react";
import { merchandiseBundles, merchandiseItems, merchandiseProgress, parseMerchandiseQuantities, type MerchandiseCollection as Snapshot, type MerchandiseSaveInput } from "@gatcg/shared";
import { accountApi } from "../../lib/accountApi";
import Button from "../../components/ui/Button";
import DisclosureChevron from "../../components/DisclosureChevron";

type Draft = { edits: Record<string, number>; pending?: MerchandiseSaveInput };
const types = [...new Set(merchandiseItems.map(item => item.type))];
const label = (value: string) => value.replaceAll("-", " ").replace(/^./, char => char.toUpperCase());
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
function MerchandiseImage({ url, name, overview = false }: { url: string; name: string; overview?: boolean }) {
  const [failed, setFailed] = useState(false);
  return failed ? <p className="rounded-lg bg-ctp-surface0 p-6 text-sm">{name} · image unavailable</p>
    : <img src={url} alt={overview ? `${name} bundle overview` : name} loading="lazy" onError={() => setFailed(true)} className="max-h-80 w-full rounded-lg bg-ctp-base object-contain" />;
}

export default function MerchandiseCollection({ userId }: { userId: string }) {
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
  const [search, setSearch] = useState("");
  const [release, setRelease] = useState("");
  const [champion, setChampion] = useState("");
  const [type, setType] = useState("");
  const [ownership, setOwnership] = useState("");
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
  const filtered = merchandiseItems.filter(item => (!release || item.releaseId === release) && (!champion || item.champion === champion) && (!type || item.type === type)
    && `${item.champion} ${item.releaseName} ${item.type} ${label(item.type)} ${item.name}`.toLowerCase().includes(search.toLowerCase())
    && (!ownership || (ownership === "owned" ? (quantities[item.id] ?? 0) > 0 : !(quantities[item.id] ?? 0))));
  const progress = merchandiseProgress(filtered.map(item => item.id), saved?.quantities ?? {});
  const releases = [...new Map(merchandiseBundles.map(bundle => [bundle.releaseId, bundle.releaseName])).entries()];
  const edit = (id: string, quantity: number) => {
    setNotice("");
    setDraft(current => {
      const edits = { ...current.edits, [id]: quantity };
      if (quantity === (saved?.quantities[id] ?? 0)) delete edits[id];
      return { edits };
    });
  };
  return <section className="mt-4 space-y-4 [&_input]:scroll-mt-28 [&_select]:scroll-mt-28 [&_button]:scroll-mt-28 [&_summary]:scroll-mt-28" aria-label="Official merchandise" onFocusCapture={event => { if (event.target.getBoundingClientRect().top < 100) event.target.scrollIntoView({ block: "center" }); }}>
    <div><h2 className="text-xl font-semibold">Official merchandise</h2><p className="text-sm text-ctp-subtext1">Track items from verified releases. More catalogs are being checked.</p></div>
    {loading && <p role="status">Loading merchandise…</p>}
    {storageError && <p role="alert">Your draft could not be stored on this device. Keep this page open until you save.</p>}
    {error && <div role="alert" className="rounded-lg border border-ctp-yellow p-3"><p>{error}</p>{(!saved || conflict) && <Button onClick={() => void load()} disabled={loading}>{conflict ? "Load saved quantities; keep my draft" : "Retry loading"}</Button>}</div>}
    {notice && <p role="status">{notice}</p>}
    {saved && <>
      <div className="rounded-xl border border-ctp-surface1 p-4"><p className="font-semibold">{progress.owned} / {progress.total} matching items owned</p><progress className="mt-2 w-full accent-ctp-blue" aria-label="Saved merchandise progress" value={progress.owned} max={progress.total || 1} /><p className="text-xs text-ctp-subtext1">Saved progress · individual items, excluding cards</p></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-sm">Search<input value={search} onChange={e => setSearch(e.target.value)} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3" /></label>
        <label className="text-sm">Release / catalog<select aria-label="Release" value={release} onChange={e => setRelease(e.target.value)} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3"><option value="">All releases and catalogs</option>{releases.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <label className="text-sm">Champion<select aria-label="Champion" value={champion} onChange={e => setChampion(e.target.value)} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3"><option value="">All champions</option>{[...new Set(merchandiseBundles.map(bundle => bundle.champion).filter(Boolean))].sort().map(name => <option key={name}>{name}</option>)}</select></label>
        <label className="text-sm">Product type<select aria-label="Product type" value={type} onChange={e => setType(e.target.value)} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3"><option value="">All types</option>{types.map(value => <option key={value} value={value}>{label(value)}</option>)}</select></label>
        <label className="text-sm">Ownership<select aria-label="Ownership" value={ownership} onChange={e => setOwnership(e.target.value)} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3"><option value="">All items</option><option value="owned">Owned</option><option value="missing">Missing</option></select></label>
      </div>
      {(dirty || draft.pending) && <div className="flex flex-wrap items-center gap-3 rounded-xl border border-ctp-blue p-3"><p>{Object.keys(draft.edits).length} unsaved changes</p><Button variant="primary" disabled={busy || conflict} onClick={() => void save()}>{busy ? "Saving…" : draft.pending ? "Retry merchandise save" : "Save merchandise"}</Button><Button disabled={busy || !!draft.pending} onClick={() => { setDraft({ edits: {} }); setError(null); }}>Discard changes</Button>{draft.pending && !busy && <p className="w-full text-sm">Save unconfirmed. Retry before editing or discarding.</p>}</div>}
      {filtered.length === 0 && <p role="status">No merchandise matches these filters.</p>}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        {merchandiseBundles.map(bundle => {
          const items = filtered.filter(item => item.bundleId === bundle.id);
          if (!items.length) return null;
          const owned = merchandiseProgress(items.map(item => item.id), saved.quantities);
          const title = bundle.title ?? `${bundle.champion} · ${bundle.releaseName}`;
          return <article key={bundle.id} className="min-w-0 rounded-xl border border-ctp-surface1 p-3">
            {bundle.overviewImageUrl && <MerchandiseImage url={bundle.overviewImageUrl} name={title} overview />}
            {bundle.productImageUrl && <MerchandiseImage url={bundle.productImageUrl} name={title} />}
            <h3 className="mt-3 font-semibold">{title}</h3><p className="text-xs text-ctp-subtext1">{bundle.sourceKind === "product" ? "100-sleeve pack" : bundle.sourceKind === "catalog" ? "Catalog design" : "Bundle overview"} · {owned.owned}/{owned.total} matching items owned</p>
            <details className="group mt-2"><summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2">Edit item quantities<DisclosureChevron className="group-open:rotate-180" /></summary>
              <div className="space-y-2">{items.map(item => <label key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-ctp-surface0/40 p-2"><span className="text-sm">{item.name}</span><input aria-label={`${title}: ${item.name} quantity`} type="number" min={0} max={999} step={1} disabled={busy || !!draft.pending || conflict} value={quantities[item.id] ?? 0} onChange={event => { const value = Number(event.target.value); if (Number.isInteger(value) && value >= 0 && value <= 999) edit(item.id, value); }} className="min-h-12 w-20 shrink-0 rounded-lg border border-ctp-surface1 bg-ctp-base px-2 text-center" /></label>)}</div>
            </details>
            <a href={bundle.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-12 items-center text-sm text-ctp-blue underline">{bundle.sourceKind === "product" ? "Official product ↗" : bundle.sourceKind === "catalog" ? "Official catalog ↗" : "Official release ↗"}</a>
          </article>;
        })}
      </div>
      {dirty && <Button variant="primary" disabled={busy || conflict} onClick={() => void save()}>{busy ? "Saving…" : draft.pending ? "Retry merchandise save" : "Save merchandise"}</Button>}
    </>}
  </section>;
}
