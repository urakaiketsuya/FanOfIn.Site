import { useState, type ReactNode } from 'react';
import { filterValue } from '@gatcg/shared';
import DeckSearchFilters from '../../components/deck-search/DeckSearchFilters';
import type { ActiveDeckFilter } from '../../components/deck-search/ActiveDeckFilters';
import Button from '../../components/ui/Button';
import DialogSheet from '../../components/ui/DialogSheet';
import type { DeckContentFilterState } from './deckContentFilters';

const facets = { classes: 'class', types: 'type', subtypes: 'subtype', elements: 'element', sets: 'set' } as const;
export default function BrowseDeckFilters({ filters, setFilters, items, onClear, resultLabel, children }: {
  filters: DeckContentFilterState;
  setFilters: (update: (previous: DeckContentFilterState) => DeckContentFilterState) => void;
  items: ActiveDeckFilter[]; onClear: () => void; resultLabel: string; children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const contentItems: ActiveDeckFilter[] = (Object.keys(facets) as Array<keyof typeof facets>).flatMap(key => [...filters[key]].map(value => ({
    key: `${key}:${value}`, label: `${value.startsWith('-') ? 'Exclude' : 'Include'} ${facets[key]}: ${filterValue(value)}`,
    remove: () => setFilters(previous => ({ ...previous, [key]: new Set([...previous[key]].filter(item => item !== value)) })),
  })));
  if (filters.speed !== 'any') contentItems.push({ key: 'speed', label: `Speed: ${filters.speed}`, remove: () => setFilters(previous => ({ ...previous, speed: 'any' })) });
  const count = items.filter(item => item.key !== 'q' && item.key !== 'query').length + contentItems.length;
  return <>
    <DeckSearchFilters allowExclude cards={filters.cards} onCardsChange={cards => setFilters(previous => ({ ...previous, cards }))} activeFilters={[...items, ...contentItems]} onClearAll={onClear} controls={<Button aria-haspopup="dialog" onClick={event => { event.currentTarget.focus(); setOpen(true); }}>Filters{count > 0 ? ` (${count})` : ''}</Button>} />
    {open && <DialogSheet title="Filter decks" onDismiss={() => setOpen(false)} footer={<Button variant="primary" onClick={() => setOpen(false)}>{resultLabel}</Button>}><div className="space-y-4 [&_button]:min-h-control [&_button]:min-w-control">{children}</div></DialogSheet>}
  </>;
}
