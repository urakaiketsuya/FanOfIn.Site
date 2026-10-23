import { filterValue } from "@gatcg/shared";
import Button from "../../components/ui/Button";
import type { DeckContentFilterState } from "./deckContentFilters";

const labels = { cards: 'card', classes: 'class', types: 'type', subtypes: 'subtype', elements: 'element', sets: 'set' } as const;
export default function DeckContentFilterChips({ filters, setFilters }: {
  filters: DeckContentFilterState;
  setFilters: (update: (previous: DeckContentFilterState) => DeckContentFilterState) => void;
}) {
  return <div className="mt-2 flex flex-wrap gap-2" aria-label="Active deck content filters">
    {(Object.keys(labels) as Array<keyof typeof labels>).flatMap(key => [...filters[key]].map(value => <Button size="sm" key={`${key}:${value}`} aria-label={`Remove ${labels[key]} ${value}`} onClick={() => setFilters(previous => ({...previous, [key]: key === 'cards' ? previous.cards.filter(item => item !== value) : new Set([...previous[key]].filter(item => item !== value))}))}>
      {value.startsWith('-') ? 'Exclude' : 'Include'} {labels[key]}: {filterValue(value)} ×
    </Button>))}
  </div>;
}
