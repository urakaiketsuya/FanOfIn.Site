import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { collectionGoalRequiresPrinting, resolveCollectionProgressGroup, buildCollectionProgressGroups, collectionGroupProgress, collectionProgressKey, defaultProgressTarget, parseCollectionProgressGoals, type Card, type CollectionEntry, type CollectionProgressGoal, type CollectionProgressGroup, type CollectionProgressKind, type CollectionUpdateLine } from '@gatcg/shared';
import CardResult from '../../components/CardResult';
import Button from '../../components/ui/Button';
import Panel from '../../components/ui/Panel';
import Tabs, { TabPanel } from '../../components/ui/Tabs';
import DialogSheet from '../../components/ui/DialogSheet';
import CollectionCardSheet from './CollectionCardSheet';
import { rarityLabel } from '../cards/rarities';

const categories: { key: CollectionProgressKind; label: string }[] = [
  { key: 'set', label: 'Set' }, { key: 'rarity', label: 'Rarity' }, { key: 'artist', label: 'Artist' }, { key: 'champion', label: 'Champion' }, { key: 'keyword', label: 'Keyword' },
];
const titleFor = (group: CollectionProgressGroup) => group.kind === 'rarity' ? rarityLabel(group.id) : group.title;
const targetLabel = (goal: CollectionProgressGoal) => goal.target === 'printing' ? 'Each matching printing' : goal.target === 'playset' ? 'Playsets · Any printing' : 'One of each card · Any printing';

export default function CollectionProgressView({ userId, cards, entries, savedEntries, available, error, onRetry, busy, onUpdate }: {
  userId: string; cards: Card[]; entries: CollectionEntry[]; savedEntries: CollectionEntry[]; available: boolean; error?: string; onRetry: () => void; busy: boolean;
  onUpdate: (lines: CollectionUpdateLine[], source: string) => Promise<void>;
}) {
  const [kind, setKind] = useState<CollectionProgressKind>('set');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<CollectionProgressGoal | null>(null);
  const [pins, setPins] = useState<CollectionProgressGoal[]>([]);
  const [pinsReady, setPinsReady] = useState(false);
  const [pinError, setPinError] = useState('');
  const [limit, setLimit] = useState(12);
  const [filter, setFilter] = useState('missing');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [card, setCard] = useState<Card | null>(null);
  const [edited, setEdited] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const key = `collection-progress-goals:${userId}`;
  const readPins = useCallback(() => {
    try { setPins(parseCollectionProgressGoals(localStorage.getItem(key))); setPinsReady(true); setPinError(''); }
    catch { setPinsReady(false); setPinError('Saved goals could not load. Retry to keep your existing goals.'); }
  }, [key]);
  useEffect(() => {
    readPins();
    const sync = (event: StorageEvent) => { if (event.key === key || event.key === null) readPins(); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [key, readPins]);
  function togglePin(goal: CollectionProgressGoal) {
    try {
      // Read latest device state before an atomic replacement; failed storage keeps current pins.
      const current = parseCollectionProgressGoals(localStorage.getItem(key));
      const exists = current.some(item => collectionProgressKey(item) === collectionProgressKey(goal));
      const next = exists ? current.filter(item => collectionProgressKey(item) !== collectionProgressKey(goal)) : [...current, goal];
      localStorage.setItem(key, JSON.stringify(next)); setPins(next); setPinError('');
    } catch { setPinError('Could not save goals on this device. Your previous goals are kept. Try again.'); }
  }
  const groups = useMemo(() => buildCollectionProgressGroups(cards), [cards]);
  const summaries = useMemo(() => groups.map(group => {
    const goal = { kind: group.kind, id: group.id, target: defaultProgressTarget(group.kind) } satisfies CollectionProgressGoal;
    return { group, goal };
  }), [groups]);
  const group = useMemo(() => selected ? resolveCollectionProgressGroup(groups, selected) : undefined, [groups, selected]);
  const filterLabels = (goal: CollectionProgressGoal) => (goal.filters ?? []).map(filter => { const match = groups.find(item => item.kind === filter.kind && item.id === filter.id); return match ? titleFor(match) : filter.id; }).join(' · ');
  const progress = useMemo(() => group && selected ? collectionGroupProgress(group, selected.target, savedEntries) : null, [group, selected, savedEntries]);
  const draft = useMemo(() => group && selected ? collectionGroupProgress(group, selected.target, entries) : null, [group, selected, entries]);
  const draftByKey = useMemo(() => new Map(draft?.rows.map(row => [row.key, row]) ?? []), [draft]);
  const visibleGroups = summaries.filter(item => item.group.kind === kind && titleFor(item.group).toLocaleLowerCase().includes(query.toLocaleLowerCase().trim()));
  function open(goal: CollectionProgressGoal) { startTransition(() => { setSelected(goal); setFilter('missing'); setLimit(12); setEdited(new Set()); }); }
  function summary(item: CollectionProgressGroup, goal: CollectionProgressGoal) {
    const result = collectionGroupProgress(item, goal.target, savedEntries);
    return <Panel key={collectionProgressKey(goal)} className="min-w-0">
      <div className="grid grid-cols-2 gap-2">{item.members.slice(0, 2).map(member => <CardResult key={member.card.uuid} card={member.card} name={member.card.name} editionUuid={member.editions[0]?.uuid} />)}</div>
      <h3 className="mt-3 break-words text-lg font-semibold">{titleFor(item)}</h3>
      {goal.filters?.length ? <p className="text-sm">{filterLabels(goal)}</p> : null}
      <p className="text-sm text-ctp-subtext1">{targetLabel(goal)}</p>
      <p className="mt-2">{result.complete} / {result.total} {result.printing ? 'printings' : goal.target === 'playset' ? 'playsets' : 'cards'} · {result.percent}%</p>
      <progress aria-label={`${titleFor(item)} completion`} className="collection-progress mt-2 block h-2 w-full" max={result.total || 1} value={result.complete} />
      <Button className="mt-3" onClick={() => open(goal)}>View progress · {result.total - result.complete} missing</Button>
    </Panel>;
  }
  const isPinned = selected && pins.some(pin => collectionProgressKey(pin) === collectionProgressKey(selected));
  const rows = progress?.rows.filter(row => (filter === 'all' || (filter === 'owned' ? row.missing === 0 : row.missing > 0 || edited.has(row.card.uuid)))) ?? [];
  return <section className="mt-5 min-w-0 [overflow-wrap:anywhere]" aria-label="Collection progress">
    <h2 className="text-2xl font-semibold">Collection progress</h2>
    <p className="mt-1 text-sm text-ctp-subtext1">Saved ownership · Goals stay on this device</p>
    {pinError && <div role="alert" className="mt-3"><p>{pinError}</p><Button onClick={readPins}>Retry goals</Button></div>}
    {!available ? <div role={error ? 'alert' : 'status'} className="mt-4"><p>{error || 'Loading collection and card data…'}</p>{error && <Button onClick={onRetry}>Retry progress</Button>}</div> : <>
      <p role="status" className="mt-2 text-sm">{pending ? 'Recalculating…' : ''}</p>
      {selected && group && progress ? <>
        <Button onClick={() => { setSelected(null); setLimit(12); }}>All progress groups</Button>
        <h3 className="mt-4 text-xl font-semibold">{titleFor(group)}</h3>
        {selected.filters?.length ? <p className="mt-1 text-sm">{filterLabels(selected)}</p> : null}
        <p className="mt-1 text-sm">{targetLabel(selected)}{selected.kind === 'champion' ? ' · Champion cards' : ''}</p>
        <p className="mt-3 text-lg">{progress.complete} / {progress.total} complete · {progress.percent}%</p>
        <progress aria-label="Selected goal completion" value={progress.complete} max={progress.total || 1} className="collection-progress my-2 block h-2 w-full" />
        <p className="text-sm">{progress.missingCopies} {progress.missingCopies === 1 ? 'copy' : 'copies'} missing</p>
        <div className="my-3 flex flex-wrap gap-2"><Button disabled={!pinsReady} aria-pressed={!!isPinned} onClick={() => togglePin(selected)}>{isPinned ? 'Unpin goal' : 'Pin goal'}</Button><Button onClick={() => setFiltersOpen(true)}>Filter goal</Button>{!collectionGoalRequiresPrinting(selected) && <Button onClick={() => setScopeOpen(true)}>Change target</Button>}</div>
        {draft && draft.complete !== progress.complete && <p className="my-2 text-sm text-ctp-yellow">After saving your draft: {draft.complete} / {draft.total} complete</p>}
        <Tabs baseId="progress-cards" label="Goal cards" wrap variant="pill" active={filter} onChange={value => { setFilter(value); setLimit(12); }} tabs={[{ key: 'missing', label: 'Missing' }, { key: 'owned', label: 'Owned' }, { key: 'all', label: 'All' }]} />
        {['missing', 'owned', 'all'].map(tab => <TabPanel key={tab} baseId="progress-cards" tab={tab} active={filter} className="mt-3">
          {!rows.length && <p>{!progress.total ? 'No cards match these filters.' : filter === 'missing' ? 'Goal complete — no missing cards.' : 'No cards in this view yet.'}</p>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{rows.slice(0, limit).map(row => {
            const changed = draftByKey.get(row.key)?.owned !== row.owned;
            return <CardResult key={row.key} card={row.card} name={row.card.name} editionUuid={row.edition?.uuid}>
              {row.edition && <p className="text-sm">{row.edition.set.prefix} #{row.edition.collector_number}</p>}
              <p className="text-sm">{row.owned} owned{row.required > 1 ? ` / ${row.required} needed` : ''}</p>
              {row.needsIdentification && <p className="text-sm text-ctp-yellow">Needs identification</p>}
              {changed && <p className="text-sm text-ctp-yellow">Draft: {draftByKey.get(row.key)?.owned} owned</p>}
              <Button className="mt-2 w-full" disabled={busy} onClick={() => { setCard(row.card); setEdited(current => new Set(current).add(row.card.uuid)); }}>Manage copies</Button>
            </CardResult>;
          })}</div>
          {rows.length > limit && <Button className="mt-3" onClick={() => startTransition(() => setLimit(value => value + 24))}>Show more cards</Button>}
        </TabPanel>)}
      </> : <>
        {pins.length > 0 && <><h3 className="mb-3 text-lg font-semibold">Pinned goals</h3><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{pins.map(pin => {
          const item = resolveCollectionProgressGroup(groups, pin);
          return item ? summary(item, pin) : <Panel key={collectionProgressKey(pin)}><p>This goal is unavailable in the current catalog.</p><Button onClick={() => togglePin(pin)}>Unpin unavailable goal</Button></Panel>;
        })}</div></>}
        <div className="mt-5"><Tabs baseId="progress-category" label="Track collection by" wrap variant="pill" tabs={categories} active={kind} onChange={value => startTransition(() => { setKind(value); setQuery(''); setLimit(12); })} /></div>
        <label className="my-3 block text-sm">Find a group<input className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3" value={query} onChange={event => { setQuery(event.target.value); setLimit(12); }} /></label>
        {categories.map(category => <TabPanel key={category.key} baseId="progress-category" tab={category.key} active={kind}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{visibleGroups.slice(0, limit).map(item => summary(item.group, item.goal))}</div>
          {!visibleGroups.length && <p>No matching groups.</p>}
          {visibleGroups.length > limit && <Button className="mt-3" onClick={() => startTransition(() => setLimit(value => value + 12))}>Show more groups</Button>}
        </TabPanel>)}
      </>}
    </>}
    {filtersOpen && selected && <DialogSheet title="Filter goal" dismissLabel="Done" onDismiss={() => setFiltersOpen(false)}>
      <div className="grid gap-4">{categories.filter(category => category.key !== selected.kind).map(category => <label key={category.key} className="block text-sm">{category.label}
        <select className="mt-1 min-h-12 w-full min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-base px-3" value={selected.filters?.find(filter => filter.kind === category.key)?.id ?? ''} onChange={event => {
          const filters = (selected.filters ?? []).filter(filter => filter.kind !== category.key);
          if (event.target.value) filters.push({ kind: category.key, id: event.target.value });
          const next = { ...selected, filters };
          if (collectionGoalRequiresPrinting(next)) next.target = 'printing';
          startTransition(() => { setSelected(next); setLimit(12); setEdited(new Set()); });
        }}>
          <option value="">Any {category.label.toLowerCase()}</option>
          {groups.filter(item => item.kind === category.key).map(item => <option key={item.id} value={item.id}>{titleFor(item)}</option>)}
        </select>
      </label>)}</div>
    </DialogSheet>}
    {scopeOpen && selected && <DialogSheet title="Collection target" dismissLabel="Done" onDismiss={() => setScopeOpen(false)}>
      <div className="grid gap-2">{(['single', 'playset', ...(selected.kind === 'set' ? ['printing'] : [])] as CollectionProgressGoal['target'][]).map(target => <Button key={target} aria-pressed={selected.target === target} onClick={() => { startTransition(() => setSelected({ ...selected, target })); setScopeOpen(false); setLimit(12); }}>{targetLabel({ ...selected, target })}</Button>)}</div>
    </DialogSheet>}
    {card && <CollectionCardSheet card={card} entries={entries} busy={busy} onUpdate={onUpdate} onDismiss={() => setCard(null)} />}
  </section>;
}
