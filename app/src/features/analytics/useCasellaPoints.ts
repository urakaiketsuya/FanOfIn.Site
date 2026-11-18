import { useEffect, useState, useTransition } from 'react';
import { casellaTurnForecast, type AnalyticsDeck, type Card } from '@gatcg/shared';

export function useCasellaPoints(deck: AnalyticsDeck, cardsByName: Map<string, Card>) {
  const [pending, startTransition] = useTransition();
  const [report, setReport] = useState<{ deck: AnalyticsDeck; cards: Map<string, Card>; points: ReturnType<typeof casellaTurnForecast> }>();
  useEffect(() => { const timer = setTimeout(() => startTransition(() => setReport({ deck, cards: cardsByName, points: casellaTurnForecast(deck,cardsByName) })), 0); return () => clearTimeout(timer); }, [deck,cardsByName]);
  const points=report?.deck===deck && report.cards===cardsByName ? report.points : undefined;
  return {points,pending};
}

