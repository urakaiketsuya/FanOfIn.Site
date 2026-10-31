import { useEffect, useRef, useState } from 'react';
import type { BroadcastEventPairing } from '@gatcg/shared';

/** Lines follow measured cards and verified winner IDs, never table-order seeding. */
export default function TournamentBracket({ matches, children }: { matches: BroadcastEventPairing[]; children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<{ id: string; path: string }[]>([]);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const measure = () => {
      const box = element.getBoundingClientRect();
      const cards = new Map([...element.querySelectorAll<HTMLElement>('[data-match-id]')].map(card => [card.dataset.matchId, card.getBoundingClientRect()]));
      setLines(matches.flatMap(match => {
        const from = cards.get(match.id), to = cards.get(match.next);
        if (!from || !to || to.left <= from.right) return [];
        const x1 = from.right - box.left, x2 = to.left - box.left, y1 = from.top + from.height / 2 - box.top, y2 = to.top + to.height / 2 - box.top;
        return [{ id: match.id, path: `M ${x1} ${y1} H ${(x1+x2)/2} V ${y2} H ${x2}` }];
      }));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    element.querySelectorAll('[data-match-id]').forEach(card => observer.observe(card));
    measure();
    return () => observer.disconnect();
  }, [matches]);
  return <div ref={root} className="relative hidden gap-8 lg:grid" style={{ gridTemplateColumns: `repeat(${Math.min(3, new Set(matches.map(m => m.round)).size) || 1}, minmax(0, 1fr))` }}>
    <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible text-ctp-surface2" aria-hidden="true">{lines.map(line => <path key={line.id} d={line.path} fill="none" stroke="currentColor" strokeWidth="2" />)}</svg>
    {children}
  </div>;
}
