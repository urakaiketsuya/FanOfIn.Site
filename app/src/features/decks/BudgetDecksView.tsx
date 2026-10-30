import { useEffect, useMemo, useState, useTransition } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BUDGET_PRICE_MAX_AGE_DAYS, budgetPricesFresh, budgetShortlist, recommendBudgetDecks, type BudgetDeckData, type BudgetDeckEntry, type BudgetOrder } from '@gatcg/shared';
import { usePublishedData, usePublishedDataStatus } from '../../lib/sync/usePublishedData';
import PublishedSourceStatus from '../../components/PublishedSourceStatus';
import Button from '../../components/ui/Button';
import { Select, TextInput } from '../../components/ui/FormControl';
import { EmptyState } from '../../components/ui/ContentState';
import { useCardCatalog } from '../cards/useCardCatalog';
import { accountApi } from '../../lib/accountApi';
import { formatUsd } from '../../lib/format';
import BudgetDeckCard from './BudgetDeckCard';
import DeckResultsSkeleton from './DeckResultsSkeleton';

const KEY = 'analysis-budget-decks', URL = '/data/analysis/budget-decks.json';
export default function BudgetDecksView() {
  const data = usePublishedData<BudgetDeckData>(KEY, URL);
  const status = usePublishedDataStatus(KEY, URL);
  const catalog = useCardCatalog();
  const cards = useMemo(() => new Map(catalog.map(card => [card.name, card])), [catalog]);
  const [params, setParams] = useSearchParams();
  const rawBudget = params.get('budget-max') ?? '250';
  const maxPrice = rawBudget.trim() ? Number(rawBudget) : NaN;
  const validBudget = Number.isFinite(maxPrice) && maxPrice >= 0;
  const days = [30, 90, 180].includes(Number(params.get('budget-days'))) ? Number(params.get('budget-days')) : 90;
  const champion = params.get('budget-champion') ?? '';
  const order: BudgetOrder = params.get('budget-sort') === 'price' ? 'price' : 'evidence';
  const showAll = params.get('budget-all') === '1';
  const [pending, startTransition] = useTransition();
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 60_000); return () => window.clearInterval(timer); }, []);
  const setFilter = (key: string, value: string) => startTransition(() => setParams(previous => { const next = new URLSearchParams(previous); next.set(key, value); if (key !== 'budget-all') next.delete('budget-all'); return next; }));
  const results = useMemo(() => data ? recommendBudgetDecks(data, { maxPrice, days, champion, order, now }) : [], [data, maxPrice, days, champion, order, now]);
  const lowest = useMemo(() => data ? recommendBudgetDecks(data, { maxPrice: Number.MAX_SAFE_INTEGER, days, champion, order: 'price', now })[0] : undefined, [data, days, champion, now]);
  const shortlist = budgetShortlist(results);
  const visible = showAll ? results : shortlist;
  const champions = useMemo(() => [...new Set(data?.entries.map(e => e.championName))].sort(), [data]);
  const fresh = !!data && budgetPricesFresh(data.pricesAsOf, now);
  const [saveState, setSaveState] = useState<Record<string, { busy?: boolean; id?: string; error?: string }>>({});
  async function save(entry: BudgetDeckEntry) {
    setSaveState(previous => ({ ...previous, [entry.deckId]: { busy: true } }));
    try {
      const session = await accountApi.session();
      if (!session.user) throw new Error('Sign in through Account, then retry here. Your shortlist is kept.');
      const saved = await accountApi.saveDeck({ title: `${entry.championName} · Budget tournament list`, format: entry.format, championName: entry.championName, decklist: entry.decklist, source: { provider: 'manual', externalDeckId: `budget:${entry.deckId}`, label: entry.eventName } });
      setSaveState(previous => ({ ...previous, [entry.deckId]: { id: saved.id } }));
    } catch (reason) { setSaveState(previous => ({ ...previous, [entry.deckId]: { error: reason instanceof Error ? reason.message : 'Could not save this deck. Try again.' } })); }
  }
  return <section className="mt-5" aria-label="Budget deck recommendations">
    <h2 className="text-xl font-semibold">Winning lists within your budget</h2>
    <p className="mt-1 text-sm text-ctp-subtext1">Standard · Actual tournament lists · Full list including sideboard</p>
    <div className="my-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <label className="flex min-w-0 flex-col gap-1 text-sm">Budget (USD)<TextInput type="number" min="0" step="0.01" value={rawBudget} aria-invalid={!validBudget} aria-describedby={!validBudget ? 'budget-error' : undefined} onChange={e => setFilter('budget-max', e.target.value)} /></label>
      <label className="flex min-w-0 flex-col gap-1 text-sm">Recent results<Select value={days} onChange={e => setFilter('budget-days', e.target.value)}><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="180">Last 180 days</option></Select></label>
      <label className="flex min-w-0 flex-col gap-1 text-sm">Champion<Select value={champion} onChange={e => setFilter('budget-champion', e.target.value)}><option value="">All champions</option>{champion && !champions.includes(champion) && <option value={champion}>{champion}</option>}{champions.map(name => <option key={name}>{name}</option>)}</Select></label>
      <label className="flex min-w-0 flex-col gap-1 text-sm">Prioritize<Select value={order} onChange={e => setFilter('budget-sort', e.target.value)}><option value="evidence">Strongest evidence</option><option value="price">Lowest cost</option></Select></label>
    </div>
    {!validBudget && <p id="budget-error" role="alert" className="text-sm text-ctp-red">Enter a budget of zero or more.</p>}
    <PublishedSourceStatus label="Budget decks" status={status} hasData={!!data} />
    {!data && status.phase !== 'error' && <DeckResultsSkeleton />}
    {data && <p className="my-3 text-xs text-ctp-subtext1">Market estimates {data.pricesAsOf?.slice(0, 10) ?? 'unavailable'} · Before shipping and tax · Results updated {data.generatedAt.slice(0, 10)}</p>}
    {data && !fresh && <EmptyState title="Fresh prices needed" description={`Recommendations pause when prices are missing or more than ${BUDGET_PRICE_MAX_AGE_DAYS} days old.`} action={<Button onClick={status.retry}>Check for updated data</Button>} />}
    {data && fresh && validBudget && !results.length && <EmptyState title="No qualifying lists within this budget" description="Lists need complete prices and a winning record over at least five recorded matches." action={lowest && lowest.total > maxPrice ? <Button onClick={() => setFilter('budget-max', String(lowest.total))}>Set budget to {formatUsd(lowest.total)}</Button> : undefined} />}
    <p role="status" className="my-3 text-sm text-ctp-subtext1">{pending ? 'Recalculating…' : data && fresh && validBudget ? `${results.length} qualifying ${results.length === 1 ? 'build' : 'builds'}${results.length > visible.length ? ` · Showing ${visible.length} varied choices` : ''}` : ''}</p>
    <div aria-busy={pending} className={`grid items-start gap-4 lg:grid-cols-2 xl:grid-cols-3 ${pending ? 'opacity-50' : ''}`}>
      {visible.map(result => <BudgetDeckCard key={result.entry.deckId} result={result} cards={cards} badge={result.entry.deckId === lowest?.entry.deckId ? 'Lowest cost' : result.established && result === results[0] ? 'Strongest evidence' : undefined} onSave={entry => void save(entry)} saving={!!saveState[result.entry.deckId]?.busy} savedId={saveState[result.entry.deckId]?.id} error={saveState[result.entry.deckId]?.error} />)}
    </div>
    {results.length > shortlist.length && <Button className="mt-4" aria-expanded={showAll} onClick={() => setFilter('budget-all', showAll ? '0' : '1')}>{showAll ? 'Show shortlist' : `Show all ${results.length} builds`}</Button>}
    {data && fresh && <p className="mt-4 text-xs text-ctp-subtext1">Price coverage: {data.audit.eligibleLists - data.audit.incompletePrices} of {data.audit.eligibleLists.toLocaleString()} eligible lists fully priced in the {data.historyDays}-day archive. Incomplete prices never qualify.</p>}
  </section>;
}
