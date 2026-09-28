import { useMemo, useState, useTransition } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PageLayout from "../../components/layout/PageLayout";
import PageHeader from "../../components/ui/PageHeader";
import DialogSheet from "../../components/ui/DialogSheet";
import CardResult from "../../components/CardResult";
import DisclosureChevron from "../../components/DisclosureChevron";
import { usePublishedDataStatus } from "../../lib/sync/usePublishedData";
import { useCardCatalog } from "../cards/useCardCatalog";
import { useSavedPackages } from "../deckbuilder/savedPackages";
import { useArchetypeTaxonomyData } from "./data";
import ArchetypePreview from "./ArchetypePreview";
import { emptyStore, fingerprint, fromBuild, key, needsReview, parseStore, type ArchetypeStore, type LocalArchetype } from "./localArchetypes";
const control = "min-h-12 rounded-lg border border-ctp-surface1 px-3 py-2 focus-visible:outline-2 focus-visible:outline-ctp-blue";
export default function MyArchetypes() {
  const data = useArchetypeTaxonomyData();
  const loading = usePublishedDataStatus("analysis-archetype-taxonomy", "/data/analysis/archetype-taxonomy.json");
  const cards = useCardCatalog();
  const cardImages = useMemo(() => new Map(cards.map(c => [c.name, c])), [cards]);
  const packages = useSavedPackages();
  const [initial] = useState(() => { try { return { store: parseStore(localStorage.getItem(key) ?? JSON.stringify(emptyStore())), error: "" }; } catch { return { store: emptyStore(), error: "Saved archetypes could not be read. Export the existing data before restoring a valid backup." }; } });
  const [store, setStore] = useState(initial.store);
  const [error, setError] = useState(initial.error);
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("review");
  const [params, setParams] = useSearchParams();
  const [edit, setEdit] = useState<LocalArchetype | null>(null);
  const [buildQuery, setBuildQuery] = useState("");
  const [limit, setLimit] = useState(24);
  const [cardQuery, setCardQuery] = useState("");
  const builds = data?.clusters ?? [];
  const requested = builds.find(b => b.id === params.get("build"));
  const draft = edit ?? (requested ? store.drafts.find(e => e.id === requested.id) ?? store.entries.find(e => e.id === requested.id) ?? fromBuild(requested) : null);
  const original = draft ? store.drafts.find(e => e.id === draft.id) ?? store.entries.find(e => e.id === draft.id) ?? (builds.find(b => b.id === draft.id) ? fromBuild(builds.find(b => b.id === draft.id)!) : null) : null;
  const dirty = JSON.stringify(draft) !== JSON.stringify(original);
  function persist(next: ArchetypeStore, recovery = false) {
    try {
      if (!recovery && localStorage.getItem(key)) parseStore(localStorage.getItem(key)!);
      parseStore(JSON.stringify(next)); localStorage.setItem(key, JSON.stringify(next)); setStore(next); setError(""); return true;
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save. Check browser storage."); return false; }
  }
  function close() { setEdit(null); setParams({}); }
  function save(status: LocalArchetype["status"], asDraft = false) {
    if (!draft || !draft.name.trim() || !draft.namingCards.length || !draft.buildIds.length) { setError("Choose a name, at least one naming card, and a source build."); return; }
    const entry = { ...draft, status, snapshots: Object.fromEntries(draft.buildIds.map(id => [id, builds.find(b => b.id === id) ? fingerprint(builds.find(b => b.id === id)!) : draft.snapshots[id] ?? "missing"])) };
    const next = asDraft ? { ...store, drafts: [...store.drafts.filter(e => e.id !== entry.id), entry] } : { ...store, undo: store.entries, entries: [...store.entries.filter(e => e.id !== entry.id), entry], drafts: store.drafts.filter(e => e.id !== entry.id) };
    if (persist(next)) close();
  }
  const covered = new Set(store.entries.flatMap(e => e.buildIds));
  const entries = [...store.entries, ...builds.filter(b => !covered.has(b.id)).map(fromBuild)];
  const visible = entries.filter(e => (filter === "all" || (filter === "review" ? e.status === "review" || needsReview(e, builds) : e.status === filter)) && [e.name, ...e.namingCards, ...e.buildIds.map(id => builds.find(b => b.id === id)?.championName ?? "")].join(" ").toLowerCase().includes(query.toLowerCase()));
  function exportData() { const url = URL.createObjectURL(new Blob([localStorage.getItem(key) ?? JSON.stringify(store)], { type: "application/json" })); const a = document.createElement("a"); a.href = url; a.download = "my-archetypes.json"; a.click(); URL.revokeObjectURL(url); }
  return <PageLayout width="wide"><PageHeader title="My archetypes" description="Saved on this browser. Curating a build does not verify a package or combo." />
    <Link className={`${control} inline-flex items-center`} to="/archetypes">All archetypes</Link>
    {error && <p role="alert" className="my-3 text-ctp-red">{error}</p>}
    <div className="my-3 flex flex-wrap gap-2"><button className={control} onClick={exportData}>Export backup</button><label className={control}>Import backup<input className="block max-w-full text-sm" type="file" accept="application/json" onChange={async event => { const file = event.target.files?.[0]; if (!file) return; try { const imported = parseStore(await file.text()); const merge = (a: LocalArchetype[], b: LocalArchetype[]) => [...a, ...b.filter(e => !a.some(x => x.id === e.id))]; persist({ version: 1, entries: merge(store.entries, imported.entries), drafts: merge(store.drafts, imported.drafts), undo: store.entries }, true); } catch (reason) { setError(String(reason)); } event.target.value = ""; }} /></label>{store.undo && <button className={control} onClick={() => persist({ ...store, entries: store.undo!, undo: undefined })}>Undo last change</button>}</div>
    <p className="text-xs">Import adds missing entries; existing local choices take priority.</p>
    {store.drafts.length > 0 && <div className="my-3"><h2>Saved drafts</h2>{store.drafts.map(e => <button key={e.id} className={`${control} m-1`} onClick={() => setEdit(e)}>Resume {e.name}</button>)}</div>}
    <label className="my-3 block">Find a champion, archetype, or card<input className={`${control} mt-1 w-full`} value={query} onChange={e => { const value = e.target.value; startTransition(() => setQuery(value)); }} type="search" /></label>
    {pending && <p role="status">Recalculating…</p>}
    <label>Review status <select className={control} value={filter} onChange={e => setFilter(e.target.value)}><option value="review">Needs review</option><option value="curated">Curated</option><option value="hidden">Hidden</option><option value="all">All</option></select></label>
    {!data && (loading.phase === "error" ? <p role="alert">{loading.error}<button className={control} onClick={loading.retry}>Retry</button></p> : <p role="status">Loading archetypes…</p>)}
    {data && !visible.length && <p className="my-4">No archetypes match this view.</p>}
    <div className="mt-4 grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">{visible.slice(0, limit).map(e => <article key={e.id} className="min-w-0 rounded-xl border border-ctp-surface1 p-3"><ArchetypePreview names={e.namingCards} cardImages={cardImages} /><h2 className="mt-3 font-semibold">{e.name}</h2><p className="text-sm">{e.status === "curated" ? "Curated by you" : e.status === "hidden" ? "Hidden locally" : "Needs review"}{needsReview(e, builds) && " · Source changed or missing"}</p>{e.description && <p className="my-2 text-sm">{e.description}</p>}<button className={`${control} mt-2`} onClick={() => setEdit(store.drafts.find(d => d.id === e.id) ?? e)}>Curate</button><details><summary className="flex min-h-12 cursor-pointer items-center gap-2"><DisclosureChevron />Build details</summary>{e.buildIds.map(id => { const b = builds.find(b => b.id === id); return <div key={id} className="my-2 text-sm"><Link className="inline-flex min-h-12 items-center text-ctp-blue" to={`/archetypes/${id}`}>{b?.name ?? `Missing build ${id}`}</Link>{b && <><p>{b.deckCount} decks · {b.playerCount} players · {b.eventCount} events · {b.confidence} sample</p><p>Common cards: {b.definingCards.map(c => c.name).join(", ")}</p></>}</div>; })}</details></article>)}</div>
    {visible.length > limit && <button className={`${control} my-3`} onClick={() => setLimit(limit + 24)}>Show more archetypes ({visible.length - limit} remaining)</button>}
    {draft && <DialogSheet title="Curate archetype" dirty={dirty} onDismiss={close} footer={<div className="flex flex-wrap gap-2"><button className={control} onClick={() => save("curated")}>Save curation</button><button className={control} onClick={() => save(draft.status, true)}>Save draft</button></div>}>
      {error && <p role="alert" className="text-ctp-red">{error}</p>}
      <ArchetypePreview names={draft.namingCards} cardImages={cardImages} />
      <label className="my-3 block">Display name<input className={`${control} w-full`} value={draft.name} onChange={e => setEdit({ ...draft, name: e.target.value })} /></label>
      <p className="text-sm">Named cards, in preview order. These identify the build; they are not an exact package rule.</p>
      {draft.namingCards.map((name, index) => <div key={name} className="flex flex-wrap items-center gap-2 py-1"><span className="min-w-0 flex-1 break-words">{name}</span><button className={control} disabled={!index} aria-label={`Move ${name} earlier`} onClick={() => { const names = [...draft.namingCards]; [names[index - 1], names[index]] = [names[index], names[index - 1]]; setEdit({ ...draft, namingCards: names }); }}>↑</button><button className={control} aria-label={`Remove ${name}`} onClick={() => setEdit({ ...draft, namingCards: draft.namingCards.filter(n => n !== name) })}>Remove</button></div>)}
      <label className="my-3 block">Find a naming card<input className={`${control} w-full`} value={cardQuery} onChange={e => setCardQuery(e.target.value)} /></label>
      <div className="grid grid-cols-2 gap-2">{cardQuery && cards.filter(c => c.name.toLowerCase().includes(cardQuery.toLowerCase()) && !draft.namingCards.includes(c.name)).slice(0, 8).map(c => <CardResult key={c.name} card={c} name={c.name} onSelect={() => { setEdit({ ...draft, namingCards: [...draft.namingCards, c.name] }); setCardQuery(""); }} />)}</div>
      <label className="my-3 block">Strategy description<textarea className={`${control} w-full`} value={draft.description} onChange={e => setEdit({ ...draft, description: e.target.value })} /></label>
      <details className="my-3"><summary className="flex min-h-12 cursor-pointer items-center gap-2"><DisclosureChevron />Concrete builds ({draft.buildIds.length})</summary>
      <p className="text-xs">Grouping builds preserves each build’s published statistics and URL.</p>
      <label className="block">Find a build<input className={`${control} w-full`} value={buildQuery} onChange={e => setBuildQuery(e.target.value)} /></label>
      <div className="max-h-72 overflow-y-auto">{builds.filter(b => draft.buildIds.includes(b.id) || b.name.toLowerCase().includes(buildQuery.toLowerCase())).map(b => <label key={b.id} className="flex min-h-12 items-center gap-3 py-2"><input type="checkbox" checked={draft.buildIds.includes(b.id)} onChange={e => setEdit({ ...draft, buildIds: e.target.checked ? [...draft.buildIds, b.id] : draft.buildIds.filter(id => id !== b.id) })} /><span className="text-sm">{b.name}</span></label>)}</div></details>
      <details className="my-3"><summary className="flex min-h-12 cursor-pointer items-center gap-2"><DisclosureChevron />Linked local packages ({draft.packageIds.length})</summary>{packages.store.packages.map(p => <label key={p.id} className="flex min-h-12 items-center gap-3"><input type="checkbox" checked={draft.packageIds.includes(p.id)} onChange={e => setEdit({ ...draft, packageIds: e.target.checked ? [...draft.packageIds, p.id] : draft.packageIds.filter(id => id !== p.id) })} />{p.name}</label>)}<p className="text-xs">Associations do not certify a package or combo.</p></details>
      {!packages.store.packages.length && <Link className="inline-flex min-h-12 items-center text-ctp-blue" to="/cards/packages">Curate packages to link them here</Link>}
      <div className="flex flex-wrap gap-2"><button className={control} onClick={() => save("hidden")}>Hide locally</button><button className={control} onClick={() => { if (persist({ ...store, undo: store.entries, entries: store.entries.filter(e => e.id !== draft.id), drafts: store.drafts.filter(e => e.id !== draft.id) })) close(); }}>Reset to generated</button></div>
    </DialogSheet>}
  </PageLayout>;
}
