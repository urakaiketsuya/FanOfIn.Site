import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Card, TopCardsBySection } from '@gatcg/shared';
import CardArtTile from '../../components/CardArtTile';
import Button from '../../components/ui/Button';
import { Bar } from '../events/EventReportVisuals';

export default function PlayerCardUsage({ topCards, cards, totalDecks }: { topCards: TopCardsBySection; cards: Map<string, Card>; totalDecks: number }) {
  const [expanded, setExpanded] = useState<string[]>([]);
  return <div className="space-y-6">{(['main', 'material', 'sideboard'] as const).map(section => {
    const rows = topCards[section];
    if (!rows.length) return null;
    const open = expanded.includes(section);
    return <section key={section} aria-label={`${section} card usage`}>
      <h3 className="mb-3 text-lg font-semibold capitalize">{section}</h3>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">{(open ? rows : rows.slice(0, 6)).map(row => {
        const card = cards.get(row.name);
        const value = totalDecks > 0 ? row.deckCount / totalDecks * 100 : 0;
        const content = <><CardArtTile name={row.name} card={card} /><span className="mt-2 block break-words text-sm font-medium">{row.name}</span></>;
        return <article key={row.name} className="min-w-0 space-y-2">{card || row.slug ? <Link className="block rounded focus-visible:outline-2 focus-visible:outline-ctp-blue" to={`/cards/${card?.slug ?? row.slug}`}>{content}</Link> : content}<div className="flex flex-wrap justify-between gap-1 text-sm"><strong>{value.toFixed(0)}%</strong><span className="text-xs text-ctp-subtext1">{row.deckCount}/{totalDecks} decks</span></div><Bar value={value} label={`${row.name} deck inclusion`} blue /></article>;
      })}</div>
      {rows.length > 6 && <Button className="mt-3" aria-expanded={open} onClick={() => setExpanded(prev => open ? prev.filter(s => s !== section) : [...prev, section])}>{open ? 'Show fewer' : `Show all ${rows.length}`} {section} cards</Button>}
    </section>;
  })}</div>;
}
