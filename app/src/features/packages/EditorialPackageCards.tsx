import { useMemo } from 'react';
import type { SharedPackage } from '@gatcg/shared';
import CardResult from '../../components/CardResult';
import { useCardsByNames } from '../events/useCardsByNames';
export default function EditorialPackageCards({ definition }: { definition: SharedPackage }) {
  const names = useMemo(() => definition.cards.map(card => card.name), [definition]);
  const art = useCardsByNames(names);
  return <div className="my-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{definition.cards.map(card => <CardResult key={`${card.section}:${card.name}`} name={card.name} card={art.get(card.name)}><span className="text-sm capitalize">{card.section} · {card.quantity} copies</span></CardResult>)}</div>;
}
