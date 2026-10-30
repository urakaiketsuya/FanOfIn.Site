import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { BudgetRecommendation, Card } from '@gatcg/shared';
import Panel from '../../components/ui/Panel';
import Button from '../../components/ui/Button';
import DeckCardPreview from '../../components/DeckCardPreview';
import DialogSheet from '../../components/ui/DialogSheet';
import DeckSection from '../events/DeckSection';
import { formatUsd } from '../../lib/format';
import type { BudgetDeckEntry } from '@gatcg/shared';

export default function BudgetDeckCard({ result, cards, badge, onSave, saving, savedId, error }: {
  result: BudgetRecommendation; cards: Map<string, Card>; badge?: string;
  onSave: (entry: BudgetDeckEntry) => void; saving: boolean; savedId?: string; error?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const { entry } = result;
  const main = [...entry.decklist.main].sort((a, b) => b.quantity - a.quantity || a.card.localeCompare(b.card));
  const champion = [...entry.decklist.material].filter(l => l.card.split(',')[0].trim() === entry.championName).sort((a, b) => (cards.get(b.card)?.level ?? 0) - (cards.get(a.card)?.level ?? 0))[0] ?? entry.decklist.material[0];
  const preview = [champion, ...main.slice(0, 2)].filter(l => !!l).map(l => ({ name: l.card, quantity: l.quantity }));
  const linkClass = 'inline-flex min-h-control min-w-control items-center rounded-md px-3 text-sm focus-visible:outline-2 focus-visible:outline-ctp-blue';
  return <Panel as="article" className="flex min-w-0 flex-col gap-4" data-component="BudgetDeckCard">
    <div><p className="mb-1 text-xs font-medium text-ctp-blue">{badge ? `${badge} · ` : ''}{result.established ? 'Repeated results' : 'Promising · Limited results'}</p><h3 className="text-xl font-semibold">{entry.championName}</h3></div>
    <DeckCardPreview compact lines={preview} cardsByName={cards} />
    <div><p className="text-2xl font-semibold tabular-nums">{formatUsd(result.total)} <span className="text-xs font-normal text-ctp-subtext1">estimated total</span></p>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm"><dt>Main + Material</dt><dd className="text-right tabular-nums">{formatUsd(entry.prices.main.total + entry.prices.material.total)}</dd><dt>Sideboard</dt><dd className="text-right tabular-nums">{formatUsd(entry.prices.sideboard.total)}</dd></dl>
    </div>
    <div className="border-t border-ctp-surface1 pt-3 text-sm">
      <p className="font-medium">This tournament list: {entry.wins}–{entry.losses}–{entry.ties}</p>
      <p className="mt-1 text-xs text-ctp-subtext1">{entry.eventDate.slice(0, 10)} · {entry.eventName}</p>
      <p className="mt-3 font-medium">Exact Main + Material: {(result.adjustedWinRate * 100).toFixed(0)}% adjusted</p>
      <p className="mt-1 text-xs text-ctp-subtext1">{result.wins}–{result.losses}–{result.ties} · {result.matches} matches · {result.players} {result.players === 1 ? 'player' : 'players'} · {result.events} {result.events === 1 ? 'event' : 'events'}</p>
      <p className="mt-1 text-xs text-ctp-subtext1">Sideboards may differ · Draws count half · Byes excluded</p>
    </div>
    <div className="mt-auto flex flex-wrap gap-2">
      <Link className={`${linkClass} bg-ctp-blue text-ctp-base`} to={`/events/${entry.eventId}?tab=decklists&player=${entry.player}`}>View deck</Link>
      {savedId ? <Link className={`${linkClass} text-ctp-blue`} to={`/decks/${savedId}`}>Open saved copy</Link> : <Button disabled={saving} onClick={() => onSave(entry)}>{saving ? 'Saving…' : error ? 'Retry save' : 'Save a copy'}</Button>}
      <Button variant="ghost" onClick={() => setExpanded(true)} aria-haspopup="dialog">Show cards</Button>
    </div>
    {error && <p role="alert" className="text-sm text-ctp-red">{error} <Link className={linkClass} to="/account">Account</Link></p>}
    {expanded && <DialogSheet title={`${entry.championName} · Tournament list`} onDismiss={() => setExpanded(false)} footer={<Button onClick={() => setExpanded(false)}>Done</Button>}>
      <div className="grid gap-5">{(['main', 'material', 'sideboard'] as const).filter(section => entry.decklist[section].length).map(section => <DeckSection key={section} title={section === 'main' ? 'Main' : section === 'material' ? 'Material' : 'Sideboard'} count={entry.decklist[section].reduce((n, l) => n + l.quantity, 0)} price={formatUsd(entry.prices[section].total)}><DeckCardPreview lines={entry.decklist[section].map(l => ({ name: l.card, quantity: l.quantity }))} cardsByName={cards} /></DeckSection>)}</div>
    </DialogSheet>}
  </Panel>;
}
