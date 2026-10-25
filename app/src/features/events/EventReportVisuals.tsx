import { Link } from 'react-router-dom';
import type { Card } from '@gatcg/shared';
import CardArtTile from '../../components/CardArtTile';

const percent = (value: number) => `${Number(value.toFixed(1))}%`;
export function Bar({ value, label, blue = false }: { value: number; label: string; blue?: boolean }) {
  return <div role="img" aria-label={`${label}: ${percent(value)}`} className="h-2.5 overflow-hidden rounded bg-ctp-surface0"><div className={`h-full rounded ${blue ? 'bg-ctp-blue' : 'bg-ctp-teal'}`} style={{ width: `${value}%` }} /></div>;
}
export function CardIdentity({ name, card }: { name: string; card?: Card }) {
  const content = <><div className="w-14 shrink-0"><CardArtTile name={name} card={card} /></div><span className="min-w-0 break-words text-sm font-medium">{name}</span></>;
  return card ? <Link className="flex min-h-control items-center gap-3 rounded focus-visible:outline-2 focus-visible:outline-ctp-blue" to={`/cards/${card.slug}`}>{content}</Link> : <div className="flex items-center gap-3">{content}</div>;
}
