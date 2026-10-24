import { useMemo, useState, useTransition } from 'react';
import { deckSearchChampion, filterLabel, filterValue } from '@gatcg/shared';
import { useCardCatalog } from '../../features/cards/useCardCatalog';
import CardResult from '../CardResult';
import Button from '../ui/Button';
import { TextInput } from '../ui/FormControl';
import DialogSheet from '../ui/DialogSheet';

/** Shared visual controls. Owners retain filters, result selection and pagination. */
export default function DeckSearchFilters({ cards, onCardsChange, champion, onChampionChange, inlinePicker = false, allowExclude = false }: {
  inlinePicker?: boolean;
  allowExclude?: boolean;
  cards: string[]; onCardsChange: (cards: string[]) => void;
  champion?: string; onChampionChange?: (champion: string) => void;
}) {
  const catalog = useCardCatalog();
  const [picker, setPicker] = useState<'cards' | 'champion' | null>(null);
  const [query, setQuery] = useState('');
  const [pending, startTransition] = useTransition();
  const byName = useMemo(() => new Map(catalog.map(card => [card.name, card])), [catalog]);
  const options = useMemo(() => {
    const names = new Set<string>();
    return catalog.filter(card => {
      if (picker === 'champion' && (!card.types.includes('CHAMPION') || card.subtypes.includes('SPIRIT'))) return false;
      const key = picker === 'champion' ? deckSearchChampion(card.name) : card.name;
      if (names.has(key)) return false;
      names.add(key);
      return card.name.toLowerCase().includes(query.trim().toLowerCase());
    }).sort((a, b) => a.name.localeCompare(b.name)).slice(0, 24);
  }, [catalog, picker, query]);
  function open(next: 'cards' | 'champion') { setQuery(''); setPicker(next); }
  const pickerBody = <>
      <TextInput className="w-full" autoFocus aria-label={picker === 'champion' ? 'Find champion' : 'Find included card'} placeholder="Search by name" value={query} onChange={event => setQuery(event.target.value)} />
      {!catalog.length && <p role="status">Card catalog unavailable. Existing filters are kept.</p>}
      {catalog.length > 0 && !options.length && <p role="status">No matching cards.</p>}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{options.map(card => <CardResult key={card.name} name={card.name} card={card} selected={picker === 'champion' ? deckSearchChampion(champion) === deckSearchChampion(card.name) : cards.includes(card.name)} onSelect={() => startTransition(() => {
        if (picker === 'champion') { onChampionChange?.(deckSearchChampion(champion) === deckSearchChampion(card.name) ? '' : card.name.split(',')[0].trim()); setPicker(null); }
        else onCardsChange(cards.includes(card.name) ? cards.filter(name => name !== card.name) : [...cards.filter(name => name !== `-${card.name}`), card.name]);
      })}>{allowExclude && picker === 'cards' && <Button className="mt-2 w-full" aria-pressed={cards.includes(`-${card.name}`)} aria-label={`Exclude ${card.name}`} onClick={() => startTransition(() => onCardsChange(cards.includes(`-${card.name}`) ? cards.filter(name => name !== `-${card.name}`) : [...cards.filter(name => name !== card.name), `-${card.name}`]))}>{cards.includes(`-${card.name}`) ? 'Excluded · Remove' : 'Exclude'}</Button>}</CardResult>)}</div>
  </>;
  return <div className="my-3 min-w-0 space-y-2" data-component="DeckSearchFilters">
    <div className="flex flex-wrap gap-2">
      {onChampionChange && <Button aria-haspopup={inlinePicker ? undefined : "dialog"} aria-expanded={inlinePicker ? picker !== null : undefined} onClick={() => open('champion')}>Champion: {champion || 'All'}</Button>}
      <Button aria-haspopup={inlinePicker ? undefined : "dialog"} aria-expanded={inlinePicker ? picker !== null : undefined} onClick={() => open('cards')}>Includes cards{cards.length ? ` (${cards.length})` : ''}</Button>
      {cards.length > 0 && <Button onClick={() => startTransition(() => onCardsChange([]))}>Clear cards</Button>}
      {champion && onChampionChange && <Button onClick={() => startTransition(() => onChampionChange(''))}>Clear champion</Button>}
    </div>
    {cards.length > 0 && <><p className="text-xs text-ctp-subtext0">Every selected card</p><div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">{cards.map(value => {
      const name = filterValue(value);
      return <CardResult key={value} name={name} card={byName.get(name)} newTab><Button className="w-full" aria-label={`Remove ${filterLabel(value)} filter`} onClick={() => startTransition(() => onCardsChange(cards.filter(card => card !== value)))}>{value.startsWith('-') ? 'Exclude · Remove' : 'Remove'}</Button></CardResult>;
    })}</div></>}
    {pending && <p role="status" className="text-sm">Recalculating…</p>}
    {picker && (inlinePicker ? <section className="rounded-xl border border-ctp-surface1 p-3" aria-label={picker === 'champion' ? 'Choose champion' : 'Include cards'}>{pickerBody}<Button className="mt-3" onClick={() => setPicker(null)}>Done</Button></section> : <DialogSheet title={picker === 'champion' ? 'Choose champion' : 'Include cards'} onDismiss={() => setPicker(null)} footer={<Button variant="primary" onClick={() => setPicker(null)}>Done</Button>}>{pickerBody}</DialogSheet>)}
  </div>;
}
