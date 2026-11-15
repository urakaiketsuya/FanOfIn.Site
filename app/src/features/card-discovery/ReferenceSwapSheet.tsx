import { useMemo, useState, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Card } from '@gatcg/shared';
import Button from '../../components/ui/Button';
import DialogSheet from '../../components/ui/DialogSheet';
import CardResult from '../../components/CardResult';
import SwapImpactReport from '../analytics/SwapImpactReport';
import { type DeckWorkspace } from '../deckbuilder/persistence/deckWorkspace';
import { persistReportSwap } from '../deck-analysis/reportDraft';
import { referenceSwap } from './referenceSwap';

export default function ReferenceSwapSheet({ deck, addition, cards, onDismiss }: { deck: DeckWorkspace; addition: Card; cards: Map<string, Card>; onDismiss: () => void }) {
  const [cut, setCut] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const navigate = useNavigate();
  const choices = useMemo(() => [...new Set(deck.main.map(line => line.name))].sort().filter(name => referenceSwap(deck, name, addition.name, cards)), [deck, addition.name, cards]);
  const next = useMemo(() => cut ? referenceSwap(deck, cut, addition.name, cards) : null, [deck, cut, addition.name, cards]);
  function openDraft() {
    if (!next) return;
    try {
      persistReportSwap(sessionStorage, { ...deck, source: 'analysis' }, { cut, add: addition.name, referenceId: '', reason: '', gain: 0 }, cards);
      navigate('/deck-analysis');
    } catch { setError('Could not save the local draft. Try again.'); }
  }
  return <DialogSheet title="Compare one-copy swap" onDismiss={onDismiss} footer={<div>{error && <p role="alert" className="mb-2 text-ctp-red">{error}</p>}<Button variant="primary" disabled={!next || pending} onClick={openDraft}>Open local draft in Analysis</Button></div>}>
    <p className="mb-4 text-sm">{deck.title ?? deck.championName} · {deck.main.reduce((sum, line) => sum + line.quantity, 0)} Main · {deck.format}</p>
    {!next && <div className="max-w-40"><CardResult card={addition} name={addition.name} newTab><p className="mt-2 font-semibold">Add 1</p></CardResult></div>}
    <label className="mt-4 block text-sm">Remove 1 from Main
      <select className="mt-1 min-h-control w-full min-w-0 rounded border border-ctp-surface1 bg-ctp-base p-2" value={cut} onChange={event => { const value = event.target.value; startTransition(() => setCut(value)); setError(null); }}>
        <option value="">Choose a card</option>{choices.map(name => <option key={name} value={name}>{name}</option>)}
      </select>
    </label>
    {!choices.length && <p role="status" className="mt-3">No eligible one-copy swaps for this list.</p>}
    {pending && <p role="status">Recalculating…</p>}
    {next && <SwapImpactReport baseline={deck} target={next} cardsByName={cards} />}
  </DialogSheet>;
}
