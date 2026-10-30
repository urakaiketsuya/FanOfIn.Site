import type { Card } from './api-types.js';
import { calculateCardScenarios, type CardScenario } from './cardScenarios.js';
import { aggregateLines, copies, fixtureAccess, fixtureFloating, hasType, whole, type AnalyticsDeck, type AnalyticsLine } from './fixtureResources.js';

/** Catalog-verified printed target conditions; timing, costs and successful resolution remain separate. */
const FIXED_TARGET_RULES: Record<string, { label: string; detail: string; accepts: (card: Card) => boolean }> = {
  Engulf: { label: 'Negate targets', detail: 'Non-attack activations · target eligibility', accepts: card => !hasType(card, 'ATTACK') },
  'Frozen Dismissal': { label: 'Negate targets', detail: 'Pay 4 or negate and banish', accepts: card => hasType(card, 'ALLY') },
  'Tidal Lock': { label: 'Negate targets', detail: 'Pay 2 or negate and banish', accepts: () => true },
  Thunderclap: { label: 'Printed life ≤4', detail: '4 ally damage · before buffs, prevention or targeting restrictions', accepts: card => hasType(card, 'ALLY') && card.life != null && card.life >= 0 && card.life <= 4 },
};
export function fixedTargetCoverage(source: string, target: Card | undefined) {
  const rule = FIXED_TARGET_RULES[source];
  return rule && target && rule.accepts(target) ? { label: rule.label, detail: rule.detail } : null;
}

export interface FixtureMatchupRow {
  id: string; source: AnalyticsLine; label: string; value: string; detail: string;
  targets: (AnalyticsLine & { detail?: string })[];
}
/** One resolved prevention/recovery card against an explicit sequence, independently. */
export function defenseAgainstSequence(events: number[], wind: number, recovery: number) {
  const damage = events.map(whole).filter(n => n > 0);
  const total = damage.reduce((sum, n) => sum + n, 0);
  const breeze = damage.reduce((sum, n) => sum + Math.min(n, whole(wind)), 0);
  const destiny = damage[0] ?? 0;
  return { total, breezePrevented: breeze, afterBreeze: total - breeze, destinyPrevented: destiny,
    afterDestiny: total - destiny, destinyTax: destiny >= 7 ? 2 : 0,
    recoveryOffset: Math.min(total, whole(recovery)), afterRecovery: Math.max(0, total - whole(recovery)) };
}
export function graveyardDisruption(size: number, floating: number, amount: number, opponentChooses: boolean) {
  size = whole(size); floating = Math.min(size, whole(floating));
  const removed = Math.min(size, whole(amount));
  return { removed, floatingMin: opponentChooses ? Math.max(0, removed - (size - floating)) : 0,
    floatingMax: Math.min(floating, removed) };
}

export function calculateFixtureMatchup(own: AnalyticsDeck, opposing: AnalyticsDeck, catalog: ReadonlyMap<string, Card>, s: CardScenario, opposingClasses: string[], namedCard: string, sequence: number[]): FixtureMatchupRow[] {
  const sources = aggregateLines([...own.main, ...own.material]);
  const targets = aggregateLines(opposing.main);
  const allTargets = aggregateLines([...opposing.main, ...opposing.material]);
  const rows: FixtureMatchupRow[] = [];
  const matches = (...classes: string[]) => classes.some(c => s.classes.includes(c));
  const add = (name: string, label: string, value: string, detail: string, members: FixtureMatchupRow['targets'] = []) => {
    const source = sources.find(line => line.name === name);
    if (source) rows.push({ id: `${name}:${label}`, source, label, value, detail, targets: members });
  };
  const coverage = (name: string, label: string, filter: (c: Card) => boolean, detail: string) => {
    const members = targets.filter(line => { const card = catalog.get(line.name); return card ? filter(card) : false; });
    const unknown = copies(targets.filter(line => !catalog.has(line.name)));
    add(name, label, unknown ? `${copies(members)} known eligible · ${unknown} unknown` : `${copies(members)} / ${copies(targets)} Main copies`, detail, members);
  };
  const fixedCoverage = (name: string) => { const rule = FIXED_TARGET_RULES[name]; coverage(name, rule.label, rule.accepts, rule.detail); };
  for (const name of ['Engulf', 'Frozen Dismissal', 'Tidal Lock']) fixedCoverage(name);
  const taxTargets = targets.filter(line => { const c = catalog.get(line.name); return c?.cost_reserve != null && c.cost_reserve >= 0; });
  const odd = copies(taxTargets.filter(line => catalog.get(line.name)!.cost_reserve! % 2 === 1));
  add('Surging Obstruction', 'Tax pressure', `${odd} copies pay 3 · ${copies(taxTargets) - odd} pay 1`, `${copies(targets) - copies(taxTargets)} copies with unknown/variable reserve excluded`, taxTargets.map(line => ({ ...line, detail: `Pay ${catalog.get(line.name)!.cost_reserve! % 2 ? 3 : 1} or negate` })));
  fixedCoverage('Thunderclap');
  const unassessedAllies = copies(targets.filter(line => { const c = catalog.get(line.name); return c && hasType(c, 'ALLY') && (c.life == null || c.life < 0); }));
  if (unassessedAllies) {
    const row = rows.find(row => row.source.name === 'Thunderclap');
    if (row) row.detail += ` · ${unassessedAllies} ally copies lack fixed life`;
  }
  coverage('Arrow Trap', s.prepared && matches('ASSASSIN', 'RANGER') ? 'Destroy attacking ally' : 'Return attacking ally', c => hasType(c, 'ALLY'), 'Only while attacking · target restrictions still apply');
  const graveTargets = fixtureFloating(targets, opposingClasses);
  for (const [name, amount, opponentChooses] of [
    ['Purifying Thurible', s.banish, true], ['Ma Chao, Lupine Huntress', s.beast ? 4 : 2, true],
    ['Purified Shot', matches('RANGER') ? s.hitDamage : 0, false],
  ] as const) {
    const g = graveyardDisruption(s.graveSize, s.graveFloating, amount, opponentChooses);
    add(name, 'Graveyard disruption', `${g.floatingMin}–${g.floatingMax} Floating Memory removed`, `${g.removed} cards ${opponentChooses ? 'banished · opponent chooses' : 'maximum · on champion hit'}${name === 'Purifying Thurible' ? ` · ${s.banish >= 3 ? 1 : 0} drawn to memory` : ''}`, graveTargets);
  }
  const interceptors = allTargets.filter(line => ["Protector's Plate", 'Fatebound Caracal'].includes(line.name));
  add('Port Smuggler', 'Interception', matches('ASSASSIN') ? 'Bypasses intercept' : 'Can be intercepted', 'One attack · class bonus only', interceptors);
  const attacks = targets.filter(line => ['Crosswind Cuts', 'Poised Strike', 'Windstrike Soldier', 'Port Smuggler'].includes(line.name)
    && !(line.name === 'Port Smuggler' && opposingClasses.includes('ASSASSIN')));
  add("Protector's Plate", 'Intercept coverage', `${s.linked ? copies(attacks) : 0} supported attack copies`, 'Linked ally must be able to intercept · bypass attacks excluded', s.linked ? attacks : []);
  const objects = allTargets.filter(line => { const c = catalog.get(line.name); return Boolean(c?.types.some(t => ['ALLY', 'CHAMPION', 'ITEM', 'WEAPON', 'PHANTASIA', 'DOMAIN', 'REGALIA'].includes(t))); });
  const unknownObjects = copies(allTargets.filter(line => !catalog.has(line.name)));
  add('Total Whiteout', 'Enter-rested exposure', unknownObjects ? `${copies(objects)} known objects · ${unknownObjects} unknown` : `${copies(objects)} Main + Material copies`, 'While Whiteout is in play · objects entering the field', objects);
  const named = targets.filter(line => line.name === namedCard);
  add('Nia, Mistveiled Scout', 'Named-card tax', named.length ? `+1 cost · ${copies(named)} Main copies` : 'Choose a card name', 'Nia in play', named);
  add("Jianyu, Fate's Premonition", 'Named-card tax', named.length ? `+${2 + Math.max(1, whole(s.phantasias))} cost · ${copies(named)} Main copies` : 'Choose a card name', 'Jianyu in play · includes Jianyu in phantasia count', named);
  const defense = defenseAgainstSequence(sequence, s.wind, 0);
  add('Veiling Breeze', 'Damage after prevention', `${defense.afterBreeze} damage`, `${defense.breezePrevented} prevented across ${sequence.filter(n => n > 0).length} events`);
  add('Crystallized Destiny', 'Damage after prevention', `${defense.afterDestiny} damage`, `${defense.destinyPrevented} prevented from next event · activation tax +${defense.destinyTax}`);
  for (const row of calculateCardScenarios(own, catalog, s).filter(row => row.id.endsWith(':recover'))) {
    const outcome = defenseAgainstSequence(sequence, s.wind, row.value);
    add(row.name, 'Recovery against pressure', `${outcome.recoveryOffset} damage offset`, `${row.value} recovered · ${outcome.afterRecovery} incoming damage not offset · one activation`);
  }
  return rows;
}

/** Stable per-card rows expose which card changes caused an access delta; no sum of exclusive scenarios. */
export function compareFixtureScenarios(before: AnalyticsDeck, after: AnalyticsDeck, catalog: ReadonlyMap<string, Card>, stateBefore: CardScenario, stateAfter: CardScenario) {
  const versionRows = (deck: AnalyticsDeck, state: CardScenario) => {
    const rows = calculateCardScenarios(deck, catalog, state);
    const main = aggregateLines(deck.main);
    const answers = main.filter(line => ['Engulf', 'Frozen Dismissal', 'Tidal Lock', 'Surging Obstruction', 'Thunderclap', 'Arrow Trap'].includes(line.name));
    if (answers.length) rows.unshift({ id: 'answerAccess', name: 'Answer access', group: 'resources', value: copies(answers), unit: 'negate/removal copies',
      detail: 'Supported answer pool · target conditions apply', fields: ['seen'], lines: answers,
      access: fixtureAccess(copies(main), copies(answers), state.seen) });
    return rows;
  };
  const a = new Map(versionRows(before, stateBefore).map(row => [row.id, row]));
  const b = new Map(versionRows(after, stateAfter).map(row => [row.id, row]));
  return [...new Set([...a.keys(), ...b.keys()])].map(id => ({ id, before: a.get(id), after: b.get(id) }));
}
