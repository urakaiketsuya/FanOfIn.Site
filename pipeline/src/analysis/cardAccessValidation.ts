import { computeTonorisDrawReport, createRaiDrawPolicy, estimateDrawInfluence, fixtureAccess, type Card, type AnalyticsDeck } from '@gatcg/shared';
import type { CompositionDeck, CompositionExtension } from './cardCompositionValidation.js';
export const ACCESS_TURNS = [1, 3, 5] as const;
export const ACCESS_SAMPLES = 128;
export interface AccessProfile {
  policy: 'rai' | 'tonoris' | 'unsupported';
  natural: Map<string, number>;
  bonus: Map<string, number>;
}

/** All inputs are deck/catalog data; never tournament outcomes. Seven-card, first-player scenario. */
export function accessProfile(deck: CompositionDeck, catalog: ReadonlyMap<string, Card>, samples = ACCESS_SAMPLES): AccessProfile {
  if (!deck.main || !deck.material) throw new Error('Access experiment requires explicit deck sections');
  const main = deck.main.map(([name, quantity]) => ({ name, quantity })).sort((a, b) => a.name.localeCompare(b.name));
  const material = deck.material.map(([name, quantity]) => ({ name, quantity }));
  const size = main.reduce((s, c) => s + c.quantity, 0);
  const natural = new Map<string, number>(), bonus = new Map<string, number>();
  for (const { name, quantity } of main) for (const turn of ACCESS_TURNS)
    natural.set(`main:T${turn}:${name}`, fixtureAccess(size, quantity, 6 + turn));
  for (const { name, quantity } of material) if (quantity > 0) natural.set(`material:${name}`, 1);
  const rai = createRaiDrawPolicy(main, material, catalog);
  if (rai) {
    const points = estimateDrawInfluence(rai.main, [], Math.min(7, size), 'first', 5, samples, rai.progression);
    for (const turn of ACCESS_TURNS) for (const [name, value] of points[turn - 1].extraAccess)
      bonus.set(`main:T${turn}:${name}`, value);
    return { policy: 'rai', natural, bonus };
  }
  const analytics: AnalyticsDeck = { main, material };
  const tonoris = computeTonorisDrawReport(analytics, catalog, samples, state => {
    if (!(ACCESS_TURNS as readonly number[]).includes(state.turn)) return;
    const naturallySeen = new Set(state.naturalSeenNames);
    for (const name of state.seenNames) if (!naturallySeen.has(name)) {
      const key = `main:T${state.turn}:${name}`;
      bonus.set(key, (bonus.get(key) ?? 0) + 1 / samples);
    }
  });
  return { policy: tonoris && !tonoris.missing.length && tonoris.points.length === 5 ? 'tonoris' : 'unsupported', natural, bonus };
}

export function accessExtension(name: string, profiles: ReadonlyMap<string, AccessProfile>, adjusted: boolean): CompositionExtension {
  return { name, features(deck) {
    const profile = profiles.get(deck.identity);
    if (!profile) throw new Error(`Missing access profile: ${deck.identity}`);
    const features = new Map(profile.natural);
    // Identical coverage controls in both models; unsupported is not modeled zero.
    features.set(`policy:${profile.policy}`, 1);
    if (adjusted && profile.policy !== 'unsupported') for (const [key, value] of profile.bonus) {
      // Monte Carlo increments are bounded by analytic probability mass still unseen.
      const increment = Math.min(value, 1 - (profile.natural.get(key) ?? 0));
      if (increment > 0) features.set(`extra:${key}`, increment);
    }
    return features;
  } };
}
