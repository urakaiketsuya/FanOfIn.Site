import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Card } from '@gatcg/shared';
import CardResult from '../../components/CardResult';
import Button from '../../components/ui/Button';
import { countSelectedCopies, type CalculatorLine } from '../../lib/calculatorDashboard';

export default function CalculatorCardPool({ label, lines, catalog, selected, onChange }: { label: string; lines: CalculatorLine[]; catalog: Map<string, Card>; selected: string[]; onChange: (names: string[]) => void }) {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(6);
  const matches = lines.filter((line) => line.name.toLowerCase().includes(query.trim().toLowerCase()));
  return <fieldset className="min-w-0"><legend className="text-sm font-semibold">{label}</legend>
    <p className="mt-1 text-xs text-ctp-subtext1">{countSelectedCopies(lines, selected)} matching copies selected</p>
    <input type="search" aria-label={`Search ${label}`} placeholder="Find a card" value={query} onChange={(event) => { setQuery(event.target.value); setLimit(6); }} className="mt-2 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-sm" />
    <div className="mt-3 grid grid-cols-2 gap-2">{matches.slice(0, limit).map((line) => {
      const card = catalog.get(line.name);
      return <CardResult key={line.name} name={line.name} card={card} selected={selected.includes(line.name)} onSelect={() => onChange(selected.includes(line.name) ? selected.filter((name) => name !== line.name) : [...selected, line.name])}>
        <p className="mt-2 text-xs text-ctp-subtext1">{line.quantity} copies</p>
        {card && <Link className="flex min-h-12 items-center text-xs text-ctp-blue underline" to={`/cards/${card.slug}`} target="_blank" rel="noreferrer">Card details<span className="sr-only"> for {line.name}, opens a new tab</span></Link>}
      </CardResult>;
    })}</div>
    {!matches.length && <p className="mt-3 rounded-lg bg-ctp-surface0 p-3 text-sm">{lines.length ? 'No cards match this search. Your selections are kept.' : 'No cards are available in this deck.'}</p>}
    {matches.length > limit && <Button className="mt-3" onClick={() => setLimit(limit + 6)}>Show more cards</Button>}
  </fieldset>;
}
