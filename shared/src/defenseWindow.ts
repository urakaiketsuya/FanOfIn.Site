import { hasReviewedElementAccess } from './championAccess.js';
import type { Card } from './api-types.js';

export const DEFENSE_CARDS = ['Veiling Breeze', 'Crystallized Destiny', 'Flourishing Restoration', 'Aenean Ward', 'Spellshield: Arcane', 'Restoring Embers', 'Innervate Knowledge'] as const;
export interface DefenseState {
  hand: readonly string[]; memory: readonly string[]; graveyard: readonly string[];
  level: number; element: string; advanced: string; mage: boolean; diao: boolean;
  /** Objects still available after engine payments. */
  objectReserve?: number; protectionCost?: number; protectionUsesObject?: boolean;
}
export interface DefenseScenario { id: string; label: string; hits: readonly number[]; damage: number; allies: number }
export const DEFENSE_SCENARIOS: readonly DefenseScenario[] = [
  { id: 'single', label: '1 × 7 hit · no allies', hits: [7], damage: 0, allies: 0 },
  { id: 'repeated', label: '3 × 3 hits · no allies', hits: [3, 3, 3], damage: 0, allies: 0 },
  { id: 'recovery', label: '9 damage · 2 opposing allies', hits: [], damage: 9, allies: 2 },
];
const known = (name: string) => DEFENSE_CARDS.some(card => card === name);

/** A separate, finite response window at each checkpoint. Does not mutate the trajectory.
 * Printed draws/counters granted during responses are not spent on further responses.
 */
export function evaluateDefenseWindow(state: DefenseState, scenario: DefenseScenario, catalog: ReadonlyMap<string, Card>) {
  const hand = [...state.hand], memory = [...state.memory], grave = [...state.graveyard];
  let objects = state.objectReserve ?? 0, level = state.level, glimmer = state.diao && level >= 1 ? 2 : 0;
  let championRested = false, breeze = 0, shield = 0, full = 0, recovered = 0, damage = scenario.damage;
  const sources = new Set<string>();
  const activated: string[] = [];
  // Reserve objects are interchangeable here; retain the Protection source last.
  // Known defense cards are retained over ordinary reserve cards. Stable order resolves ties.
  const pay = (cost: number) => {
    const fromObjects = Math.min(objects, cost); objects -= fromObjects;
    hand.sort((a, b) => Number(known(a)) - Number(known(b)));
    memory.push(...hand.splice(0, cost - fromObjects));
  };
  while (true) {
    let selected: { name: string; index: number; fromMemory: boolean; cost: number; kindle: number } | undefined;
    for (const fromMemory of [false, true]) {
      const zone = fromMemory ? memory : hand;
      for (let index = 0; index < zone.length; index++) {
        const name = zone[index];
        if (!known(name)) continue;
        const card = catalog.get(name)!;
        const recovery = name === 'Flourishing Restoration' || name === 'Restoring Embers' || name === 'Innervate Knowledge';
        if (recovery ? damage <= 0 : !scenario.hits.length) continue;
        if ((name === 'Crystallized Destiny' || name === 'Spellshield: Arcane') && full >= scenario.hits.length) continue;
        if (name === 'Innervate Knowledge' && (level < 1 || damage < 5)) continue;
        const element = card.element;
        const enabled = hasReviewedElementAccess(element, state.element, state.advanced, level);
        const waiver = !enabled && name === 'Flourishing Restoration' && state.diao && level >= 1;
        if (!enabled && !waiver) continue;
        if (card.cost_reserve == null || card.cost_reserve < 0) continue;
        const cost = Math.max(0, card.cost_reserve + (waiver ? 2 : 0) - (name === 'Spellshield: Arcane' && state.mage && level >= 1 ? 1 : 0));
        const kindle = name === 'Restoring Embers' ? Math.min(4, cost, grave.filter(n => catalog.get(n)?.element === 'FIRE').length) : 0;
        if (fromMemory) {
          if (!state.diao || level < 1 || championRested || !card.subtypes.includes('REACTION') || cost > glimmer) continue;
        } else if (cost - kindle > hand.length - 1 + objects) continue;
        selected = { name, index, fromMemory, cost, kindle }; break;
      }
      if (selected) break;
    }
    if (!selected) break;
    const { name, index, fromMemory, cost, kindle } = selected;
    (fromMemory ? memory : hand).splice(index, 1);
    if (fromMemory) { glimmer -= cost; championRested = true; }
    else {
      for (let n = 0; n < kindle; n++) grave.splice(grave.findIndex(card => catalog.get(card)?.element === 'FIRE'), 1);
      pay(cost - kindle);
    }
    sources.add(name); activated.push(name);
    if (name === 'Veiling Breeze') breeze += memory.filter(n => catalog.get(n)?.element === 'WIND').length;
    if (name === 'Aenean Ward') shield += 2;
    if (name === 'Crystallized Destiny' || name === 'Spellshield: Arcane') full++;
    const capacity = name === 'Flourishing Restoration' ? 3 + 3 * Math.min(2, scenario.allies)
      : name === 'Restoring Embers' ? 4 : name === 'Innervate Knowledge' ? 5 : 0;
    const amount = Math.min(damage, capacity); damage -= amount; recovered += amount;
    if (name === 'Innervate Knowledge') level--;
    grave.push(name);
  }
  // Obelisk uses the same remaining reserve objects and hand as the reactions.
  if (scenario.hits.length && state.protectionCost != null
    && (!state.protectionUsesObject || objects > 0)
    && state.protectionCost <= hand.length + objects - Number(state.protectionUsesObject)) {
    if (state.protectionUsesObject) objects--;
    pay(state.protectionCost); shield += 2; sources.add('Obelisk of Protection');
  }
  let prevented = 0;
  for (const hit of scenario.hits) {
    // Resolve one full-event shield in response to each hit; do not stack redundant shields.
    if (full > 0) { full--; prevented += hit; continue; }
    const wind = Math.min(hit, breeze); const fixed = Math.min(hit - wind, shield);
    prevented += wind + fixed; shield -= fixed;
  }
  return { prevented, recovered, activated, sources: [...sources] };
}
