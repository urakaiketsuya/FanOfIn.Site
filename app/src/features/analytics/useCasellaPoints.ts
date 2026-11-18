import { useEffect, useState, useTransition } from 'react';
import { casellaCombatForecast, actualDrawCheckpoints, type AnalyticsDeck, type Card } from '@gatcg/shared';

export function useCasellaPoints(deck: AnalyticsDeck, cardsByName: Map<string, Card>) {
  const [pending, startTransition] = useTransition();
  const [report, setReport] = useState<{ deck: AnalyticsDeck; cards: Map<string, Card>; points: ReturnType<typeof casellaCombatForecast>[] }>();
  useEffect(() => { const timer = setTimeout(() => startTransition(() => setReport({ deck, cards: cardsByName, points: actualDrawCheckpoints(deck.main.reduce((n,l)=>n+l.quantity,0)).map(seen=>casellaCombatForecast(deck,cardsByName,seen)) })), 0); return () => clearTimeout(timer); }, [deck,cardsByName]);
  const points=report?.deck===deck && report.cards===cardsByName ? report.points : undefined;
  return {points,pending};
}

