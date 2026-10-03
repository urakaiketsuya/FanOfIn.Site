import { saveCuration, exportCuration } from "../../lib/curationStorage";
import { useDeferredValue, useMemo, useState, useTransition } from 'react';
import { Link } from 'react-router-dom';
import { parseStrategyStore, type CuratedStrategy, type ReferenceAnalysis, type StrategyStore, type ArchetypeRule } from '@gatcg/shared';
import PageLayout from '../../components/layout/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import CardResult from '../../components/CardResult';
import DialogSheet from '../../components/ui/DialogSheet';
import DisclosureChevron from '../../components/DisclosureChevron';
import { usePublishedData, usePublishedDataStatus } from '../../lib/sync/usePublishedData';
import { useCardCatalog } from '../cards/useCardCatalog';
import { useSavedPackages } from '../deckbuilder/savedPackages';
import { useArchetypeTaxonomyData } from './data';
import ArchetypePreview from './ArchetypePreview';
import { useStrategyEvaluation } from './useStrategyEvaluation';
const control = 'min-h-12 rounded-lg border border-ctp-surface1 px-3 py-2 focus-visible:outline-2 focus-visible:outline-ctp-blue';
const storageKey = 'fan-of-insight-strategy-rules-v1';
const blank: StrategyStore = { version: 1, entries: [], drafts: [] };
const lines = (s: string) => [...new Set(s.split('\n').map(s => s.trim()).filter(Boolean))];
export default function ReferenceStrategies({ published = false }: {
    published?: boolean;
}) {
    const dataset = published ? 'curated-strategies' : 'reference-archetypes', key = `analysis-${dataset}`, url = `/data/analysis/${dataset}.json`;
    const data = usePublishedData<ReferenceAnalysis & {
        curation?: CuratedStrategy[];
        originalDefinitions?: ReferenceAnalysis["definitions"];
    }>(key, url), status = usePublishedDataStatus(key, url);
    const taxonomy = useArchetypeTaxonomyData(), cards = useCardCatalog(), images = useMemo(() => new Map(cards.map(c => [c.name, c])), [cards]);
    const packages = useSavedPackages();
    const [initial] = useState(() => {
        try {
            return { store: parseStrategyStore(localStorage.getItem(storageKey) ?? JSON.stringify(blank)), error: '' };
        }
        catch {
            return { store: blank, error: 'Saved strategy rules could not be read. Export a backup before restoring valid data.' };
        }
    });
    const [store, setStore] = useState(initial.store), [error, setError] = useState(initial.error), [edit, setEdit] = useState<CuratedStrategy | null>(null), [baseline, setBaseline] = useState('');
    const [query, setQuery] = useState(''), [filter, setFilter] = useState('all'), [limit, setLimit] = useState(24), [pending, startTransition] = useTransition();
    const [cardQuery, setCardQuery] = useState('');
    const [cardTarget, setCardTarget] = useState<'anyCards' | 'allCards' | 'excludeCards' | 'preview'>('anyCards');
    const [fieldVersion, setFieldVersion] = useState(0);
    const [live, setLive] = useState(false), [typeError, setTypeError] = useState('');
    function persist(next: StrategyStore, recover = false) {
        try {
            saveCuration(localStorage, storageKey, next, parseStrategyStore, recover);
            setStore(next);
            setError('');
            return true;
        }
        catch (e) {
            setError(String(e));
            return false;
        }
    }
    function fromReference(id: string): CuratedStrategy { const d = data!.definitions.find(d => d.id === id)!; return { definition: structuredClone(d), coreCards: [...new Set([...d.rule.allCards, ...d.rule.comboGroups.flat(), ...d.rule.anyCards])].slice(0, 3), description: '', packageIds: [], sourceHash: data!.source.sha256, mechanics: 'unverified', mechanicsEvidence: '' }; }
    function open(entry: CuratedStrategy) { setEdit(structuredClone(entry)); setBaseline(JSON.stringify(entry)); setLive(false); setTypeError(''); }
    function changeRule(rule: ArchetypeRule) {
        if (edit)
            setEdit({ ...edit, definition: { ...edit.definition, rule } });
    }
    const definitions = useMemo(() => data ? [...data.definitions.map(d => store.entries.find(e => e.definition.id === d.id)?.definition ?? d), ...store.entries.filter(e => !data.definitions.some(d => d.id === e.definition.id)).map(e => e.definition)] : [], [data, store.entries]);
    const evaluatedDefinition = useDeferredValue(edit?.definition);
    const evaluation = useStrategyEvaluation(live && !!edit && !!data, cards, evaluatedDefinition && data ? { edited: evaluatedDefinition, definitions, originals: data.definitions } : null);
    const comparison = evaluatedDefinition === edit?.definition ? evaluation.comparison : null;
    function save(reviewStatus: CuratedStrategy['definition']['reviewStatus'], draft = false) {
        if (!edit || !data || typeError)
            return;
        if (!draft && reviewStatus === 'accepted' && (!edit.coreCards.length || !edit.definition.rule.anyCards.length)) {
            setError('Choose preview cards and at least one any-of card before accepting.');
            return;
        }
        const entry = { ...edit, sourceHash: data.source.sha256, definition: { ...edit.definition, reviewStatus } };
        const next = draft ? { ...store, drafts: [...store.drafts.filter(e => e.definition.id !== entry.definition.id), entry] } : { ...store, undo: store.entries, entries: [...store.entries.filter(e => e.definition.id !== entry.definition.id), entry], drafts: store.drafts.filter(e => e.definition.id !== entry.definition.id) };
        if (persist(next)) {
            setEdit(null);
            setLive(false);
        }
    }
    function download() { try { const blob = new Blob([exportCuration(localStorage, storageKey, store)], { type: 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'my-strategy-rules.json'; a.click(); URL.revokeObjectURL(url); } catch { setError("Could not export: browser storage is unavailable. Your open edits have been kept."); } }
    const visible = (published ? data?.definitions ?? [] : definitions).filter(d => (filter === 'all' || d.reviewStatus === filter) && [d.name, ...d.rule.anyCards, ...d.rule.allCards].join(' ').toLowerCase().includes(query.toLowerCase()));
    return <PageLayout width="wide"><PageHeader title={published ? 'Reviewed strategies' : 'Strategy rule curator'} description={published ? 'Reviewed strategy definitions above concrete builds.' : 'Fractal definitions tested against our decklists. Local edits remain on this browser until explicitly published.'}/>
 <Link className={`${control} inline-flex items-center`} to={published ? '/archetypes' : '/archetypes/mine'}>{published ? 'Concrete archetypes' : 'My archetypes'}</Link>
 {error && <p role="alert" className="my-3 text-ctp-red">{error}</p>}
 {!data && (status.phase === 'error' ? <p role="alert">{status.error}<button className={control} onClick={status.retry}>Retry</button></p> : <p role="status">Loading strategy evidence…</p>)}
 {data && <><p className="my-3 text-sm">Source: <a className="text-ctp-blue underline" href={data.source.url}>{data.source.name}</a> · {data.definitions.length} definitions · {data.population.toLocaleString()} unique decks. Overlapping categories are not additive.</p>
 {!published && <><details><summary className="flex min-h-12 cursor-pointer items-center gap-2"><DisclosureChevron />Backups and publishing</summary><div className="flex flex-wrap gap-2"><button className={control} onClick={download}>Export backup / publication file</button><label className={`${control} min-w-0`}>Import backup<input type="file" accept="application/json" className="block max-w-full" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file)
                        return;
                    try {
                        const imported = parseStrategyStore(await file.text());
                        const merge = (a: CuratedStrategy[], b: CuratedStrategy[]) => [...a, ...b.filter(e => !a.some(x => x.definition.id === e.definition.id))];
                        persist({ ...store, entries: merge(store.entries, imported.entries), drafts: merge(store.drafts, imported.drafts), undo: store.entries }, true);
                    }
                    catch (e) {
                        setError(String(e));
                    }
                    e.target.value = '';
                }}/></label>{store.undo && <button className={control} onClick={() => persist({ ...store, entries: store.undo!, undo: undefined })}>Undo last change</button>}<button className={control} onClick={() => open({ definition: { id: `local-${crypto.randomUUID()}`, name: 'New strategy', parentId: null, sourceLine: 0, reviewStatus: 'unreviewed', rule: { anyCards: [], allCards: [], excludeCards: [], comboGroups: [], element: null, typeCounts: {} } }, coreCards: [], description: '', packageIds: [], sourceHash: data.source.sha256, mechanics: 'unverified', mechanicsEvidence: '' })}>New strategy</button></div></details><p className="mt-2 text-xs">Import adds missing entries; existing local choices take priority. Accepting a rule is a review decision, not proof of a combo.</p>{store.drafts.map(e => <button key={e.definition.id} className={`${control} my-2 mr-2`} onClick={() => open(e)}>Resume {e.definition.name}</button>)}</>}
 {!published && !!data.discoveries?.length && <details><summary className="flex min-h-12 cursor-pointer items-center gap-2"><DisclosureChevron />Unclassified builds to investigate ({data.discoveries.length})</summary><p className="text-xs">At least half of these builds' decks match no reference definition. These are candidates for new strategies.</p><div className="grid gap-3 sm:grid-cols-2">{data.discoveries.slice(0, 12).map(b => <article key={b.buildId} className="min-w-0 rounded-lg border border-ctp-surface1 p-3"><ArchetypePreview names={b.cards} cardImages={images}/><h2>{b.name}</h2><p>{b.unmatchedDecks}/{b.total} decks unclassified</p><button className={control} onClick={() => open({ definition: { id: `local-${crypto.randomUUID()}`, name: b.name, parentId: null, sourceLine: 0, reviewStatus: 'unreviewed', rule: { anyCards: b.cards, allCards: b.cards, excludeCards: [], comboGroups: [], element: null, typeCounts: {} } }, coreCards: b.cards, description: '', packageIds: [], sourceHash: data.source.sha256, mechanics: 'unverified', mechanicsEvidence: '' })}>Draft strategy</button></article>)}</div></details>}
 <label className="my-3 block">Find a strategy or card<input type="search" className={`${control} w-full`} value={query} onChange={e => { const q = e.target.value; startTransition(() => setQuery(q)); }}/></label>
 {!published && <label>Review status <select className={control} value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All</option><option value="unreviewed">Unreviewed</option><option value="accepted">Accepted locally</option><option value="rejected">Rejected locally</option></select></label>}
 {(pending || evaluatedDefinition !== edit?.definition) && <p role="status">Recalculating…</p>}{!visible.length && <p className="my-4">{published && !data.definitions.length ? 'No reviewed strategies have been published yet.' : 'No strategies match this view.'}</p>}
 <div className="my-4 grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">{(published ? visible : visible.slice(0, limit)).map(d => {
                const saved = (published ? data.curation : store.entries)?.find(e => e.definition.id === d.id), evidence = data.evidence.find(e => e.id === d.id), original = (data.originalDefinitions ?? data.definitions).find(x => x.id === d.id), modified = !!saved && JSON.stringify(saved.definition.rule) !== JSON.stringify(original?.rule), names = saved?.coreCards ?? fromReference(d.id).coreCards;
                return <article id={d.id} key={d.id} className="min-w-0 scroll-mt-24 rounded-xl border border-ctp-surface1 p-3 has-[details[open]]:sm:col-span-2 has-[details[open]]:lg:col-span-3"><div className="max-w-md"><ArchetypePreview names={names} cardImages={images}/></div><p className="mt-2 text-xs">Preview cards · full matching rule below</p><h2 className="my-2 font-semibold">{d.name}</h2><p className="text-sm">{!original ? 'New discovery' : modified ? 'Modified' : 'Imported'} · {d.reviewStatus}{saved && saved.sourceHash !== data.source.sha256 ? ' · Source changed; review needed' : ''}</p><p className="text-sm">{modified && !published ? 'Original rule evidence: ' : ''}{evidence ? `${evidence.deckIds.length} decks · ${evidence.players} players · ${evidence.events} events · ${evidence.confidence}` : 'Not evaluated'}</p><p className="text-xs">{saved?.mechanics === 'verified' ? 'Mechanics verified by curator' : 'Combo mechanics unverified'}</p>{saved?.description && <p className="my-2 text-sm">{saved.description}</p>}{!published && <button className={`${control} mt-2`} onClick={() => open(store.drafts.find(e => e.definition.id === d.id) ?? saved ?? fromReference(d.id))}>Review rules</button>}
 <details><summary className="flex min-h-12 cursor-pointer items-center gap-2"><DisclosureChevron />Rules and evidence</summary><RuleDescription rule={d.rule}/>{saved?.mechanicsEvidence && <p className="my-2 break-words text-sm">Curator mechanics evidence: {saved.mechanicsEvidence}</p>}{d.parentId && <p className="text-sm">Also requires parent: {(published ? data.definitions : definitions).find(x => x.id === d.parentId)?.name ?? d.parentId}</p>}{evidence && <><p className="my-2 text-xs">Evidence is for the published rule snapshot. Recurrence requires at least 3 players and 2 events; it does not verify card interactions.</p><p className="text-sm">Champions: {evidence.champions.map(c => `${c.name}: ${c.decks} decks / ${c.players} players / ${c.events} events`).join('; ')}</p><p className="my-2 text-sm">Seasons: {evidence.seasons.map(s => `${s.name}: ${s.decks}`).join('; ')}</p><h3 className="font-medium">Rule card prevalence / cohort baseline</h3><p className="text-xs">{evidence.cohortDecks} compatible nonmatching decks. {evidence.missingMetadata} matches lack player/event metadata.</p>{evidence.jointCorePrevalence != null && <p className="my-2 text-sm">Enriched recurring core: {evidence.jointCoreCards.join(" + ")} · {(evidence.jointCorePrevalence * 100).toFixed(0)}% joint presence</p>}{evidence.core.map(c => <p key={c.name} className="text-xs">{c.name}: {(c.prevalence * 100).toFixed(0)}% / {(c.cohortPrevalence * 100).toFixed(0)}% ({c.enrichment >= 0 ? '+' : ''}{(c.enrichment * 100).toFixed(0)} pp)</p>)}<h3 className="mt-3 font-medium">Concrete builds – matching decks only</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{evidence.builds.slice(0, 12).map(b => { const build = taxonomy?.clusters.find(c => c.id === b.id); return <div key={b.id} className="min-w-0 rounded-lg border border-ctp-surface1 p-2"><ArchetypePreview names={build?.namingCards ?? []} cardImages={images}/><Link className="flex min-h-12 items-center text-sm text-ctp-blue" to={`/archetypes/${b.id}`}>{build?.name ?? b.id}: {b.matched}/{b.total}</Link><p className="text-xs">Build differentiators · {b.matched === b.total ? 'Full membership' : 'Partial membership'}</p></div>; })}</div><h3 className="mt-3 font-medium">Overlapping definitions</h3>{evidence.overlaps.slice(0, 5).map(o => <p key={o.id} className="text-sm">{data.definitions.find(d => d.id === o.id)?.name}: {o.decks} shared decks, {(o.jaccard * 100).toFixed(0)}% Jaccard</p>)}{!published && evidence.suggestions.length > 0 && <><h3 className="mt-3 font-medium">Recurring build packages to investigate</h3><p className="text-xs">Suggestions require review; co-occurrence is not a verified combo.</p>{evidence.suggestions.map(s => <div key={s.cards.join()} className="my-2 text-sm"><p>{s.cards.join(' + ')} · {s.decks} decks / {s.players} players / {s.events} events · {(s.prevalence * 100).toFixed(0)}% joint presence</p><button className={control} onClick={() => { const entry = saved ?? fromReference(d.id); open({ ...entry, coreCards: s.cards, definition: { ...entry.definition, id: `local-${crypto.randomUUID()}`, name: `${d.name} – ${s.cards.join(' / ')}`, parentId: d.id, reviewStatus: 'unreviewed', rule: { ...entry.definition.rule, allCards: s.cards } } }); }}>Draft subtype</button></div>)}</>}<h3 className="mt-3 font-medium">Near misses</h3>{evidence.boundary.map(b => <p key={b.deckId} className="my-2 break-words text-xs"><DeckReference id={b.deckId}/>: {b.failures.join('; ')}</p>)}</>}</details></article>;
            })}</div>
 {visible.length > limit && <button className={control} onClick={() => setLimit(limit + 24)}>Show more</button>}</>}
 {edit && <DialogSheet title={`Review ${edit.definition.name}`} dirty={JSON.stringify(edit) !== baseline || !!typeError} onDismiss={() => { setEdit(null); setLive(false); }} footer={<div className="flex flex-wrap gap-2"><button className={control} onClick={() => save('accepted')}>Accept locally</button><button className={control} onClick={() => save(edit.definition.reviewStatus, true)}>Save draft</button></div>}>
 {error && <p role="alert" className="text-ctp-red">{error}</p>}<ArchetypePreview names={edit.coreCards} cardImages={images}/>
 <label className="my-3 block">Name<input className={`${control} w-full`} value={edit.definition.name} onChange={e => setEdit({ ...edit, definition: { ...edit.definition, name: e.target.value } })}/></label>
 <label className="my-3 block">Preview cards (one per line, in order)<textarea className={`${control} w-full`} key={`preview-${fieldVersion}`} defaultValue={edit.coreCards.join('\n')} onBlur={e => setEdit({ ...edit, coreCards: lines(e.target.value) })}/></label>
 <label className="my-3 block">Strategy description<textarea className={`${control} w-full`} value={edit.description} onChange={e => setEdit({ ...edit, description: e.target.value })}/></label>
 <details><summary className="flex min-h-12 cursor-pointer items-center gap-2"><DisclosureChevron />Find and add cards</summary>
 <label className="my-3 block">Add card to<select className={`${control} w-full`} value={cardTarget} onChange={e => setCardTarget(e.target.value as typeof cardTarget)}><option value="anyCards">Any-of rule</option><option value="allCards">All-of rule</option><option value="excludeCards">Exclusions</option><option value="preview">Preview cards</option></select></label>
 <label className="my-3 block">Search card catalog<input className={`${control} w-full`} value={cardQuery} onChange={e => setCardQuery(e.target.value)}/></label>
 <div className="grid grid-cols-2 gap-2">{cardQuery && cards.filter(c => c.name.toLowerCase().includes(cardQuery.toLowerCase())).slice(0, 8).map(c => <CardResult key={c.name} card={c} name={c.name} onSelect={() => { if (cardTarget === 'preview')
            setEdit({ ...edit, coreCards: [...new Set([...edit.coreCards, c.name])] });
        else
            changeRule({ ...edit.definition.rule, [cardTarget]: [...new Set([...edit.definition.rule[cardTarget], c.name])] }); setFieldVersion(v => v + 1); setCardQuery(''); }}/>)}</div></details>
 <p className="text-sm">Card rules use exact names, main + material only. Type counts use main deck quantities. Sideboards are excluded.</p>
 {(['anyCards', 'allCards', 'excludeCards'] as const).map((field, i) => <label key={field} className="my-3 block">{['Any of these cards (required)', 'All of these cards', 'Exclude these cards'][i]}<textarea className={`${control} w-full`} key={`${field}-${fieldVersion}`} defaultValue={edit.definition.rule[field].join('\n')} onBlur={e => changeRule({ ...edit.definition.rule, [field]: lines(e.target.value) })}/><span className="text-xs">One exact card name per line; applied when leaving the field.</span></label>)}
 <label className="my-3 block">Alternative all-of groups<textarea className={`${control} w-full`} defaultValue={edit.definition.rule.comboGroups.map(g => g.join(' | ')).join('\n')} onBlur={e => changeRule({ ...edit.definition.rule, comboGroups: lines(e.target.value).map(l => l.split('|').map(c => c.trim()).filter(Boolean)) })}/><span className="text-xs">One group per line; separate required cards with |. At least one whole group must match.</span></label>
 <label className="my-3 block">Spirit element<select className={`${control} w-full`} value={edit.definition.rule.element ?? ''} onChange={e => changeRule({ ...edit.definition.rule, element: e.target.value || null })}><option value="">Any</option>{['Fire', 'Water', 'Wind', 'Norm'].map(e => <option key={e}>{e}</option>)}</select></label>
 <label className="my-3 block">Main-deck type limits<textarea className={`${control} w-full`} defaultValue={Object.entries(edit.definition.rule.typeCounts).map(([t, n]) => `${t}: ${n}`).join('\n')} onBlur={e => {
                const entries = lines(e.target.value).map(l => l.split(':').map(v => v.trim()));
                if (entries.some(([t, n]) => !t || !n || !Number.isSafeInteger(Number(n)))) {
                    setTypeError('Type limits must be TYPE: integer, one per line.');
                    return;
                }
                setTypeError('');
                changeRule({ ...edit.definition.rule, typeCounts: Object.fromEntries(entries.map(([t, n]) => [t.toUpperCase(), Number(n)])) });
            }}/><span role={typeError ? "alert" : undefined} className="text-ctp-red">{typeError}</span><span className="text-xs">Positive minimum, negative maximum. Example: ALLY: 20.</span></label>
 <label className="my-3 block">Parent strategy<select className={`${control} w-full`} value={edit.definition.parentId ?? ''} onChange={e => setEdit({ ...edit, definition: { ...edit.definition, parentId: e.target.value || null } })}><option value="">None</option>{definitions.filter(d => d.id !== edit.definition.id).map(d => <option key={d.id} value={d.id}>{d.parentId ? `${d.name} (${definitions.find(p => p.id === d.parentId)?.name ?? d.parentId})` : d.name}</option>)}</select></label>
 <details><summary className="flex min-h-12 cursor-pointer items-center gap-2"><DisclosureChevron />Original definition</summary>{data?.definitions.find(d => d.id === edit.definition.id) ? <RuleDescription rule={data.definitions.find(d => d.id === edit.definition.id)!.rule}/> : <p>New local discovery.</p>}</details>
 <button className={`${control} my-3`} onClick={() => startTransition(() => setLive(true))}>Evaluate membership changes</button>{live && evaluation.phase === 'error' && <p role="alert">{evaluation.error}<button className={control} onClick={evaluation.retry}>Retry evaluation</button></p>}{live && evaluation.phase === 'loading' && <p role="status">Loading decklists and card catalog…</p>}{(pending || live && evaluation.phase === 'calculating' || evaluatedDefinition !== edit?.definition) && <p role="status">Recalculating…</p>}
 {evaluation.warning && <p role="status">{evaluation.warning}<button className={control} onClick={evaluation.retry}>Retry evaluation</button></p>}
 {comparison && <div aria-live="polite"><p>{comparison.beforeCount} original → {comparison.afterCount} edited · +{comparison.addedCount} / −{comparison.removedCount} decks</p><p className="my-2 break-words text-xs">Sample matches: {comparison.sampleMatches.length ? comparison.sampleMatches.map(id => <DeckReference key={id} id={id}/>) : 'None'}</p><p className="my-2 break-words text-xs">Added: {comparison.sampleAdded.join(', ') || 'None'} · Removed: {comparison.sampleRemoved.join(', ') || 'None'}</p>{comparison.boundary.map(b => <p key={b.id} className="my-2 break-words text-xs"><DeckReference id={b.id}/>: {b.failures.join('; ')}</p>)}</div>}

 <details><summary className="flex min-h-12 cursor-pointer items-center gap-2"><DisclosureChevron />Linked packages and mechanics review</summary>{packages.store.packages.map(p => <label key={p.id} className="flex min-h-12 items-center gap-2"><input type="checkbox" checked={edit.packageIds.includes(p.id)} onChange={e => setEdit({ ...edit, packageIds: e.target.checked ? [...edit.packageIds, p.id] : edit.packageIds.filter(id => id !== p.id) })}/>{p.name}</label>)}<label className="my-3 block">Mechanics evidence / card text references<textarea className={`${control} w-full`} value={edit.mechanicsEvidence} onChange={e => setEdit({ ...edit, mechanicsEvidence: e.target.value })}/></label><label className="flex min-h-12 items-center gap-2"><input type="checkbox" checked={edit.mechanics === 'verified'} onChange={e => setEdit({ ...edit, mechanics: e.target.checked ? 'verified' : 'unverified' })}/>I verified the claimed interactions against card text</label></details>
 <div className="my-3 flex flex-wrap gap-2"><button className={control} onClick={() => save('rejected')}>Reject locally</button><button className={control} onClick={() => {
                if (persist({ ...store, undo: store.entries, entries: store.entries.filter(e => e.definition.id !== edit.definition.id), drafts: store.drafts.filter(e => e.definition.id !== edit.definition.id) }))
                    setEdit(null);
            }}>Reset local edits</button></div>
 </DialogSheet>}
 </PageLayout>;
}
function RuleDescription({ rule }: {
    rule: ArchetypeRule;
}) { return <div className="space-y-2 break-words text-sm"><p>Any of: {rule.anyCards.join(', ') || 'None – cannot match'}</p>{rule.allCards.length > 0 && <p>All of: {rule.allCards.join(', ')}</p>}{rule.comboGroups.length > 0 && <p>At least one complete group: {rule.comboGroups.map(g => g.join(' + ')).join(' OR ')}</p>}{rule.excludeCards.length > 0 && <p>Excludes: {rule.excludeCards.join(', ')}</p>}{rule.element && <p>Spirit access: {rule.element}</p>}{Object.entries(rule.typeCounts).map(([t, n]) => <p key={t}>{t}: {n < 0 ? 'maximum' : 'minimum'} {Math.abs(n)}</p>)}</div>; }
function DeckReference({ id }: {
    id: string;
}) { const [event, player] = id.split(":"); return <Link className="mr-2 inline-flex min-h-12 items-center text-ctp-blue" to={`/events/${event}?tab=decklists&player=${player}`}>{id}</Link>; }
