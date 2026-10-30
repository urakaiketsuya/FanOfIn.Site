import { useState } from 'react';
import { defaultCardScenario, type AnalyticsDeck, type Card, type CardScenario, type ScenarioKey } from '@gatcg/shared';

export function useCardScenario(deck: AnalyticsDeck, catalog: ReadonlyMap<string, Card>) {
  const [values, setValues] = useState<Partial<Record<ScenarioKey, number>>>({});
  const [champion, setChampion] = useState<string | null>(null);
  const champions = deck.material.map(line => catalog.get(line.name)).filter((card): card is Card => Boolean(card?.types.includes('CHAMPION')))
    .sort((a, b) => (b.level ?? 0) - (a.level ?? 0));
  const selected = champion === '' ? undefined : champions.find(card => card.name === champion) ?? champions[0];
  const state: CardScenario = { ...defaultCardScenario(), level: selected?.level ?? 0, ...values, classes: selected?.classes ?? [], championName: selected?.name ?? '' };
  return { state, setValue: (key: ScenarioKey, value: number) => setValues(previous => ({ ...previous, [key]: value })),
    champions, champion: selected?.name ?? '', setChampion };
}
export type ScenarioController = ReturnType<typeof useCardScenario>;
