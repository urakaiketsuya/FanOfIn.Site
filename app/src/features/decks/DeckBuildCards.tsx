import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { BuildComparisonCard, Card } from '@gatcg/shared';
import CardArtTile from '../../components/CardArtTile';
import Button from '../../components/ui/Button';

const number = (value: number) => Number(value.toFixed(1)).toString();

export default function DeckBuildCards({ rows, cardsByName }: { rows: BuildComparisonCard[]; cardsByName: Map<string, Card> }) {
  const [scope, setScope] = useState('yours');
  const [all, setAll] = useState(false);
  const filtered = rows.filter(row => scope === 'yours' ? row.current > 0 : row.current === 0)
    .sort((a, b) => b.included - a.included || a.name.localeCompare(b.name));
  return <section aria-label="Card copy comparison" className="mb-4 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h4 className="text-sm font-semibold">Card copies · {filtered.length} cards</h4>
      <label className="flex items-center gap-2 text-sm">Show
        <select value={scope} onChange={event => { setScope(event.target.value); setAll(false); }} className="min-h-control max-w-full rounded border border-ctp-surface1 bg-ctp-base px-2 focus-visible:outline-2 focus-visible:outline-ctp-blue">
          <option value="yours">In your deck</option><option value="others">Only in other lists</option>
        </select>
      </label>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filtered.slice(0, all ? undefined : 6).map(row => {
      const card = cardsByName.get(row.name);
      const visual = <><CardArtTile card={card} name={row.name} artworkOnly /><span className="mt-2 block break-words text-sm font-medium">{row.name}</span></>;
      return <article key={row.name} className="min-w-0 rounded-lg border border-ctp-surface1 p-3">
        {card ? <Link className="block rounded focus-visible:outline-2 focus-visible:outline-ctp-blue" to={`/cards/${card.slug}`}>{visual}</Link> : visual}
        <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div><dt className="text-ctp-subtext1">Yours</dt><dd className="text-lg font-semibold tabular-nums">{row.current}</dd></div>
          <div><dt className="text-ctp-subtext1">Build median</dt><dd className="text-lg font-semibold tabular-nums">{row.reference ? number(row.reference.median) : '—'}</dd></div>
        </dl>
        <p className="mt-1 text-xs text-ctp-subtext1">{row.reference ? `Middle 50%: ${number(row.reference.low)}–${number(row.reference.high)}` : 'Comparison unavailable'}</p>
        <p className="mt-1 text-xs tabular-nums text-ctp-subtext1">Included in {row.included}/{row.lists} lists</p>
      </article>;
    })}</div>
    {!filtered.length && <p role="status" className="text-sm text-ctp-subtext1">{scope === 'yours' ? 'No cards in this section.' : 'No additional cards in other lists.'}</p>}
    {filtered.length > 6 && <Button aria-expanded={all} onClick={() => setAll(value => !value)}>{all ? 'Show fewer cards' : `Show all ${filtered.length} cards`}</Button>}
  </section>;
}
