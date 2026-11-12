import { compareRaiDrawReports, compareTonorisDrawReports, compareRaiDamageReports, compareDefenseReports, compareRecursionReports, hasDefenseSources, hasRecursionSources, RAI_DAMAGE_CARDS, raiDamageScenarioRelevant, type AnalyticsDeck, type Card, type DrawRange } from '@gatcg/shared';

export type ImpactRow = { id: string; turn: number; label: string; context?: string; before: DrawRange; after: DrawRange; unit: string; probability?: boolean };
/** Presentation only: uses the same paired models as the complete comparison report. */
export function computeSwapImpact(baseline: AnalyticsDeck, target: AnalyticsDeck, cards: Map<string, Card>) {
  const rows: ImpactRow[] = [], unavailable = new Set<string>();
  let supported = false;
  if ([...baseline.main, ...baseline.material, ...target.main, ...target.material].some(line => line.quantity > 0 && !cards.has(line.name))) unavailable.add('Card data incomplete');
  const add = (row: ImpactRow) => { rows.push(row); };
  const chance = (value: number): DrawRange => ({ low: value * 100, median: value * 100, high: value * 100 });
  const rai = compareRaiDrawReports(baseline, target, cards);
  if (rai?.status === 'ready') { supported = true; for (const p of rai.points) add({ turn: p.turn, id: 'draw', label: 'Cards seen', before: p.before.seenRange, after: p.after.seenRange, unit: 'cards' }); }
  else if (rai) unavailable.add(rai.status === 'missing' ? 'Card data incomplete' : 'Draw forecast unavailable for this pair');
  const tonoris = compareTonorisDrawReports(baseline, target, cards);
  if (tonoris?.status === 'ready') { supported = true;
    for (const p of tonoris.points) {
    add({ turn: p.turn, id: 'draw', label: 'Cards seen', before: p.before.seen, after: p.after.seen, unit: 'cards' });
    add({ turn: p.turn, id: 'level', label: 'Level 3 reached', before: chance(p.before.level3), after: chance(p.after.level3), unit: 'pp', probability: true });
    add({ turn: p.turn, id: 'saved', label: 'Memory cost saved', before: p.before.saved, after: p.after.saved, unit: 'memory' });
    add({ turn: p.turn, id: 'tokens', label: 'Ready token power', context: 'After payments', before: p.before.readyTokenPower, after: p.after.readyTokenPower, unit: 'power' });
    add({ turn: p.turn, id: 'obelisk', label: '2 prevention ready', context: 'Obelisk readiness', before: chance(p.before.preventionReady), after: chance(p.after.preventionReady), unit: 'pp', probability: true });
  } } else if (tonoris) unavailable.add(tonoris.status === 'missing' ? 'Card data incomplete' : 'Tonoris forecast unavailable for this pair');
  const names = new Set([...baseline.main, ...target.main].filter(l => l.quantity > 0).map(l => l.name));
  if (RAI_DAMAGE_CARDS.some(name => names.has(name)) && [baseline, target].some(d => d.material.some(l => l.quantity > 0 && l.name.startsWith('Rai,')))) {
    const damage = compareRaiDamageReports(baseline, target, cards);
    if (damage.status === 'ready') { supported = true; }
    if (damage.status === 'ready') for (const scenario of damage.scenarios.filter(s => ['champion', 'ally'].includes(s.id) && raiDamageScenarioRelevant(s.id, names))) {
      for (const p of scenario.points) {
      for (const [key, label] of [['damage', 'Champion damage'], ['allies', 'Ally damage'], ['self', 'Self-inflicted damage'], ['recovery', 'Recovery']] as const) add({ turn: p.turn, id: `${scenario.id}-${key}`, label, context: `${scenario.label} · paid casts · before prevention`, before: p.before[key], after: p.after[key], unit: 'damage' });
    } } else unavailable.add(damage.status === 'missing' ? 'Card data incomplete' : 'Paid damage forecast unavailable for this pair');
  }
  if (hasDefenseSources(baseline) || hasDefenseSources(target)) {
    const defense = compareDefenseReports(baseline, target, cards);
    if (defense.status === 'ready') { supported = true; }
    if (defense.status === 'ready') for (const scenario of defense.scenarios.filter(s => s.cards.length)) {
      for (const p of scenario.points) {
      add({ turn: p.turn, id: `defense-${scenario.id}`, label: scenario.metric === 'prevention' ? 'Prevention ready' : 'Recovery ready', context: scenario.label, before: chance(p.before.ready), after: chance(p.after.ready), probability: true, unit: 'pp' });
      add({ turn: p.turn, id: `capacity-${scenario.id}`, label: scenario.metric === 'prevention' ? 'Prevention capacity' : 'Recovery capacity', context: scenario.label, before: p.before.range, after: p.after.range, unit: 'damage' });
    } } else unavailable.add(defense.status === 'missing' ? 'Card data incomplete' : 'Defense forecast unavailable for this pair');
  }
  if (hasRecursionSources(baseline) || hasRecursionSources(target)) {
    const reuse = compareRecursionReports(baseline, target, cards);
    if (reuse.status === 'ready') { supported = true; for (const p of reuse.points) { for (const key of ['returned', 'replayed'] as const) {
      add({ turn: p.turn, id: key, label: `1+ cards ${key}`, before: chance(p.before[key].ready), after: chance(p.after[key].ready), probability: true, unit: 'pp' });
      add({ turn: p.turn, id: `${key}-range`, label: `Cards ${key}`, before: p.before[key], after: p.after[key], unit: 'cards' });
    } } } else unavailable.add(reuse.status === 'missing' ? 'Card data incomplete' : 'Graveyard reuse forecast unavailable for this pair');
  }
  const changed = new Set(rows.filter(row => row.before.low !== row.after.low || row.before.median !== row.after.median || row.before.high !== row.after.high).map(row => row.id));
  return { supported, rows: rows.filter(row => changed.has(row.id)), unavailable: [...unavailable] };
}
