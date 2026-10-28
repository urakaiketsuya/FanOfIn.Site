import { useEffect, useId, useState } from 'react';
import type { Card } from '@gatcg/shared';
import { Link } from 'react-router-dom';
import CardArtTile from '../CardArtTile';
import Button from '../ui/Button';
import DisclosureChevron from '../DisclosureChevron';

export interface ActiveDeckFilter {
  key: string;
  label: string;
  remove: () => void;
  cardName?: string;
  card?: Card;
}

/** A bounded preview keeps deck results close even with many selected cards. */
export default function ActiveDeckFilters({ items, onClear, limit = 3 }: {
  items: ActiveDeckFilter[]; onClear?: () => void; limit?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  useEffect(() => { if (items.length <= limit) setExpanded(false); }, [items.length, limit]);
  if (!items.length) return null;
  return <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2" aria-label="Active deck filters">
    <div id={id} className="flex min-w-0 flex-wrap gap-2">
      {(expanded ? items : items.slice(0, limit)).map(item => {
        const content = <>{item.cardName && <span className="w-8 shrink-0"><CardArtTile name={item.cardName} card={item.card} /></span>}<span className="min-w-0 break-words">{item.label}</span></>;
        return <div key={item.key} className="flex max-w-full items-center rounded-lg border border-ctp-surface1 bg-ctp-mantle text-xs">
          {item.card ? <Link to={`/cards/${item.card.slug}`} target="_blank" rel="noreferrer" className="flex min-h-12 min-w-0 items-center gap-2 rounded px-2 focus-visible:outline-2 focus-visible:outline-ctp-blue">{content}<span className="sr-only"> (opens card details in a new tab)</span></Link> : <span className="flex min-h-12 min-w-0 items-center gap-2 px-2">{content}</span>}
          <Button variant="ghost" size="sm" className="shrink-0" aria-label={`Remove ${item.label}`} onClick={item.remove}>×</Button>
        </div>;
      })}
    </div>
    {items.length > limit && <Button variant="ghost" size="sm" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(value => !value)} className="flex items-center gap-1">{expanded ? 'Show less' : `+${items.length - limit} more`}<DisclosureChevron className={expanded ? 'rotate-180' : ''} /></Button>}
    {onClear && <Button variant="ghost" size="sm" onClick={onClear}>Clear all</Button>}
  </div>;
}
