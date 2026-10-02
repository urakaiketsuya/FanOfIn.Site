import type { Card } from '@gatcg/shared';
import CardArtTile from '../../components/CardArtTile';
import { Link } from 'react-router-dom';

export default function CalculatorCardContext({ names, catalog }: { names: string[]; catalog: Map<string, Card> }) {
  if (!names.length) return null;
  return <div className="mb-4 flex flex-wrap gap-3" aria-label="Cards in this scenario">{[...new Set(names)].map((name) => {
    const card = catalog.get(name);
    const content = <><CardArtTile card={card} name={name} /><span className="mt-1 block break-words text-xs font-medium">{name}</span></>;
    return card ? <Link key={name} to={`/cards/${card.slug}`} target="_blank" rel="noreferrer" className="w-20 rounded focus-visible:outline-2 focus-visible:outline-ctp-blue">{content}<span className="sr-only">Opens card details in a new tab</span></Link> : <div key={name} className="w-20">{content}</div>;
  })}</div>;
}
