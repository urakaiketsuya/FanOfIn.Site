import { useState, type ReactNode } from 'react';
import type { Card } from '@gatcg/shared';
import { CARD_GROUPS, groupCardResults, type CardGrouping } from '../lib/cardResultGroups';
import { Select } from './ui/FormControl';
import Button from './ui/Button';

/** Groups the full filtered pool before applying each section's display limit. */
export default function GroupedCardResults<T>({ items, cardFor, children, pageSize = 24, grouping: controlledGrouping, onGrouping }: {
  items: readonly T[]; cardFor: (item: T) => Card | undefined;
  children: (items: T[]) => ReactNode; pageSize?: number;
  grouping?: CardGrouping; onGrouping?: (value: CardGrouping) => void;
}) {
  const [localGrouping, setGrouping] = useState<CardGrouping>('none');
  const grouping = controlledGrouping ?? localGrouping;
  const [limits, setLimits] = useState<Record<string, number>>({});
  const groups = groupCardResults(items, cardFor, grouping);
  return <div className="min-w-0">
    <label className="my-3 flex flex-wrap items-center gap-2 text-sm">Group by
      <Select aria-label="Group by" value={grouping} onChange={event => { setGrouping(event.target.value as CardGrouping); onGrouping?.(event.target.value as CardGrouping); setLimits({}); }}>
        {Object.entries(CARD_GROUPS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </Select>
    </label>
    {groups.map(group => {
      const limit = limits[group.label] ?? pageSize;
      return <section key={group.label} aria-label={group.label || 'Card results'} className="mb-4 min-w-0">
        {group.label && <h3 className="mt-4 flex flex-wrap items-center gap-2 text-base font-semibold">{group.label}<span className="text-sm font-normal text-ctp-subtext1">{group.items.length} cards</span></h3>}
        {children(group.items.slice(0, limit))}
        {group.items.length > limit && <Button className="mt-3" onClick={() => setLimits(current => ({ ...current, [group.label]: limit + pageSize }))}>Show more{group.label ? ` · ${group.label}` : ' cards'} ({group.items.length - limit})</Button>}
      </section>;
    })}
  </div>;
}
