import type { Card } from './api-types.js';
import { calculateDefenseScenario } from './defenseScenario.js';
import { aggregateLines, copies, fixtureAccess, fixtureFloating, fixturePairAccess, FIXTURE_FLOATING, floatingPayment, hasType, whole, type AnalyticsDeck, type AnalyticsLine } from './fixtureResources.js';

export const SCENARIO_FIELDS = {
  domains: ['Unrested domains', 0], objects: ['Objects controlled', 0],
  tokens: ['Tokens controlled', 0], shields: ['Atmos Shields controlled', 0], guides: ['Academy Guides in play', 0],
  level: ['Champion level', 0], seen: ['Cards seen', 10], waterGrave: ['Water cards in your graveyard', 0],
  floating: ['Eligible Floating Memory cards in your graveyard', 0], memoryCost: ['Memory cost to pay', 1],
  memory: ['Memory cards after paying reserve', 3], lineage: ['Can pay delevel cost', 0],
  levelThree: ['Leveling into base level 3', 0], bishop: ['Chessman Bishop ally in play', 0],
  fractals: ['Fractals to sacrifice', 0], omens: ['Your omens', 0], damageTaken: ['Damage on your champion', 9],
  mastery: ['Fractured Memories in play', 0], sheen: ['Sheen counters', 0], release: ['Serene Wind in inner lineage', 0],
  windAllies: ['Wind allies in play', 0], prepared: ['Preparation paid', 0], hit: ['Attack hits', 0],
  extraPaid: ['Soldier’s extra 3 reserve paid', 0], wind: ['Wind cards revealed from memory', 2],
  damage: ['Incoming damage per event', 3], events: ['Incoming damage events', 1], allies: ['Opposing allies in play', 0],
  graveSize: ['Opposing graveyard size', 0], graveFloating: ['Opposing Floating Memory cards in graveyard', 0],
  banish: ['Reserve paid for Thurible (X)', 0], beast: ['Animal or Beast ally in play', 0],
  hitDamage: ['Damage dealt by Purified Shot hit', 0], phantasias: ['Your phantasias (including Jianyu)', 1],
  linked: ['Plate linked to an available interceptor', 0],
} as const;
export type ScenarioKey = keyof typeof SCENARIO_FIELDS;
export type CardScenario = Record<ScenarioKey, number> & { classes: string[]; championName?: string };
export const BOOLEAN_SCENARIOS: ReadonlySet<ScenarioKey> = new Set(['lineage', 'levelThree', 'bishop', 'mastery', 'release', 'prepared', 'hit', 'extraPaid', 'beast', 'linked']);
export function defaultCardScenario(): CardScenario {
  const values = Object.fromEntries(Object.entries(SCENARIO_FIELDS).map(([key, [, value]]) => [key, value])) as Record<ScenarioKey, number>;
  return { ...values, classes: [] };
}
export type ScenarioGroup = 'resources' | 'draw' | 'combat' | 'packages';
export type CardScenarioResult = {
  id: string; name: string; group: ScenarioGroup; value: number; unit: string; detail: string;
  fields: ScenarioKey[]; lines: AnalyticsLine[]; support?: AnalyticsLine[]; access: number | null;
};
export const COST_RULES: Readonly<Record<string, { base: number; discount: number; classes?: string[]; field?: ScenarioKey; threshold?: number }>> = {
  'Crosswind Cuts': { base: 5, discount: 2, classes: ['WARRIOR'] },
  'Thunderclap': { base: 4, discount: 2, field: 'level', threshold: 3 },
  'Frozen Dismissal': { base: 3, discount: 1, classes: ['CLERIC'] },
  'Tidal Lock': { base: 3, discount: 2, field: 'waterGrave', threshold: 3 },
  'Surging Obstruction': { base: 3, discount: 1, field: 'bishop', threshold: 1 },
  'Burst Asunder': { base: 4, discount: 2, classes: ['CLERIC', 'MAGE'] },
  'Total Whiteout': { base: 5, discount: 3, classes: ['MAGE'] },
  "Jianyu, Fate's Premonition": { base: 4, discount: 2, classes: ['CLERIC'] },
};
export function fixtureReserveCost(name: string, state: CardScenario) {
  const rule = COST_RULES[name];
  if (!rule) return null;
  const active = rule.classes ? rule.classes.some(c => state.classes.includes(c)) : whole(state[rule.field!]) >= rule.threshold!;
  return { cost: rule.base - (active ? rule.discount : 0), saved: active ? rule.discount : 0, base: rule.base };
}

/** Independent one-copy outcomes. Never sum these as a playable sequence. */
export function calculateCardScenarios(deck: AnalyticsDeck, catalog: ReadonlyMap<string, Card>, input: CardScenario): CardScenarioResult[] {
  const s = { ...input };
  for (const key of Object.keys(SCENARIO_FIELDS) as ScenarioKey[]) s[key] = whole(s[key]);
  const main = aggregateLines(deck.main), material = aggregateLines(deck.material);
  const all = aggregateLines([...main, ...material]);
  const size = copies(main);
  const result: CardScenarioResult[] = [];
  const has = (name: string) => all.some(line => line.name === name);
  const matches = (...classes: string[]) => classes.some(c => s.classes.includes(c));
  const add = (name: string, id: string, group: ScenarioGroup, value: number, unit: string, detail: string, fields: ScenarioKey[], support?: AnalyticsLine[]) => {
    const line = all.find(line => line.name === name);
    if (!line) return;
    const mainLine = main.find(line => line.name === name);
    result.push({ id: `${name}:${id}`, name, group, value, unit, detail, fields, lines: [line], support,
      access: mainLine ? fixtureAccess(size, mainLine.quantity, s.seen) : null });
  };
  for (const [name, rule] of Object.entries(COST_RULES)) {
    const cost = fixtureReserveCost(name, s)!;
    add(name, 'cost', 'resources', cost.cost, 'reserve', `${cost.saved} saved · printed ${cost.base}`, rule.field ? [rule.field] : []);
  }
  const tokenSources = main.filter(line => /\bsummon\b[^.\n]*\btoken/i.test(catalog.get(line.name)?.effect ?? ''));
  const classActive = (name: string) => catalog.get(name)?.classes.some(c => s.classes.includes(c)) ?? false;
  add('Blade of Creation', 'token-cost', 'resources', Math.max(0, 7 - (classActive('Blade of Creation') ? s.tokens : 0)), 'reserve', 'Printed 7 · Guardian token discount', ['tokens'], tokenSources);
  add('Archon Broadsword', 'token-power', 'combat', 2 + (classActive('Archon Broadsword') ? s.tokens : 0), 'weapon power', 'Attack requires 2 reserve', ['tokens'], tokenSources);
  add('Atmos Armor Type-Ares', 'shield-power', 'combat', 1 + (classActive('Atmos Armor Type-Ares') ? s.shields : 0), 'ally power', 'Summons 2 shields on entry', ['shields']);
  add('Academy Guide', 'champion-discount', 'resources', s.guides, 'champion memory discount', 'Per champion materialization · cannot reduce payment below zero', ['guides']);
  add('Cordelia, Aurous Kaiser', 'reserve-payment', 'resources', classActive('Cordelia, Aurous Kaiser') ? s.tokens : 0, 'reserve capacity', 'Unrested tokens · each object pays once', ['tokens'], tokenSources);
  const domains = main.filter(line => catalog.get(line.name)?.types.includes('DOMAIN'));
  add('The Eternal Kingdom', 'reserve-payment', 'resources', classActive('The Eternal Kingdom') ? s.domains : 0, 'reserve capacity', 'Unrested domains · each object pays once', ['domains'], domains);
  const activeChampion = material.map(line => catalog.get(line.name)).filter(card => card?.types.includes('CHAMPION')).sort((a, b) => (b?.level ?? 0) - (a?.level ?? 0))[0];
  const tonoris = (input.championName ?? activeChampion?.name ?? '').startsWith('Tonoris,');
  add('Automata Genesis', 'token-buffs', 'combat', tonoris ? Math.max(3, s.tokens) : 0, 'buffs per token ally', 'After summoning 3 Titans · Tonoris bonus', ['tokens']);
  add('Automata Genesis', 'titan-power', 'combat', 3 * (3 + (tonoris ? Math.max(3, s.tokens) : 0)), 'new Titan power', 'Three 3-power Titans · after entry · no other buffs', ['tokens']);
  add('Neos Sight', 'draw', 'draw', 1, 'drawn to hand', 'One resolved copy', []);
  add('Neos Sight', 'memory-draw', 'draw', s.objects >= 8 ? 1 : 0, 'drawn to memory', '8+ objects controlled', ['objects']);
  for (const name of ['Hub of Innovation', 'Dormant Sacrificial Altar']) add(name, 'memory-draw', 'draw', 1, 'drawn to memory', 'On entry', []);
  add('Epicurean Institute', 'draw', 'draw', 1, 'drawn to hand', 'Next recollection · sacrifice', []);
  add('Mad Tea Party', 'recover', 'draw', Math.min(1, s.damageTaken), 'recovered per ally entry', 'Each ally entering · damage required', ['damageTaken']);
  add('Storm of Thorns', 'prevent', 'combat', Math.min(1, s.damage) * s.events, 'prevented', '1 per damage event to your units', ['damage', 'events']);
  const floating = fixtureFloating(main, s.classes);
  const supportedFloating = main.filter(line => Object.hasOwn(FIXTURE_FLOATING, line.name));
  if (supportedFloating.length) {
    const paid = floatingPayment(s.floating, s.memoryCost);
    result.push({ id: 'floating', name: 'Floating Memory', group: 'resources', value: copies(floating), unit: 'eligible Main copies',
      detail: `${paid.paid} memory paid · ${paid.remainingCost} still to pay · ${paid.remainingCards} graveyard cards left`, fields: ['floating', 'memoryCost'],
      lines: supportedFloating, support: floating, access: fixtureAccess(size, copies(floating), s.seen) });
  }
  add('Innervate Knowledge', 'draw', 'draw', s.lineage ? 2 : 0, 'drawn to hand', s.lineage ? 'Pay 4 reserve + delevel · hand change −3 after cast/payment' : 'Delevel cost unavailable', ['lineage']);
  add('Innervate Knowledge', 'recover', 'draw', s.lineage ? Math.min(5, s.damageTaken) : 0, 'recovered', 'As an activation cost · delevel required', ['lineage', 'damageTaken']);
  add('Conjure Downpour', 'draw', 'draw', matches('CLERIC') && s.memory >= 4 ? 1 : 0, 'drawn to memory', 'Pay 3 reserve · Cleric · 4+ memory after payment', ['memory']);
  add('Fractal of Waves', 'draw', 'draw', s.levelThree ? 2 : 0, 'drawn to memory', 'Sacrifice one Fractal on base-level-3 level-up', ['levelThree']);
  add('Hunt, Weiss King', 'draw', 'draw', s.bishop ? 1 : 0, 'drawn to hand', 'Rest · unused draw mode · Bishop required', ['bishop']);
  add('Mire Reparation', 'recover', 'draw', Math.min(s.omens, s.damageTaken), 'recovered', `${s.omens} recovery available`, ['omens', 'damageTaken']);
  add('Spalling Cleanse', 'recover', 'draw', !s.mastery || s.sheen > 6 ? Math.min(3, s.damageTaken) : 0, 'recovered', s.mastery && s.sheen <= 6 ? 'Add 2 sheen instead' : '3 recovery available', ['mastery', 'sheen', 'damageTaken']);
  add('Spirit of Serene Wind', 'recover', 'draw', s.release ? Math.min(6, s.damageTaken) : 0, 'recovered', 'Banish from inner lineage · 6 recovery available', ['release', 'damageTaken']);
  add('Burst Asunder', 'damage', 'combat', 2 + 2 * s.fractals, 'damage to one unit', `${s.fractals} Fractals consumed · one resolved copy`, ['fractals']);
  add('Strategem of Myriad Ice', 'damage', 'combat', 3 * s.floating, 'damage available', `${s.floating} cards banished · ${s.floating} separate 3-damage events`, ['floating']);
  add('Ceremonial Stormblade', 'durability', 'combat', 1 + (matches('WARRIOR') ? s.windAllies : 0), 'durability on entry', `${matches('WARRIOR') ? s.windAllies : 0} gained · printed 1`, ['windAllies']);
  add('Calculated Foresight', 'ranged', 'combat', s.floating > 0 ? 3 : 0, 'ranged gained', 'Mill 2 · banish one eligible card after milling', ['floating']);
  add('Windstrike Soldier', 'targets', 'combat', matches('WARRIOR') && s.extraPaid ? 3 : 1, 'maximum attack targets', '2 printed power per target · one attack this turn', ['extraPaid']);
  add('Poised Strike', 'wake', 'combat', matches('ASSASSIN') && s.prepared && s.hit ? 1 : 0, 'champion wake-ups', 'Prepared + Assassin + on hit · one attack', ['prepared', 'hit']);
  const packageRow = (name: string, support: AnalyticsLine[], label: string, id = "package") => {
    const payoff = main.filter(line => line.name === name);
    if (!payoff.length) return;
    add(name, id, 'packages', 100 * fixturePairAccess(main, payoff, support, s.seen), '% to find both', label, ['seen'], support);
  };
  for (const name of ['Blade of Creation', 'Automata Genesis', 'Cordelia, Aurous Kaiser', 'Neos Sight']) {
    packageRow(name, tokenSources.filter(line => line.name !== name), 'Draw source + another token producer · deployment not assumed', 'token-package');
  }
  packageRow('Burst Asunder', main.filter(line => catalog.get(line.name)?.subtypes.includes('FRACTAL')), 'One Burst + one Fractal · draw access');
  packageRow('Hunt, Weiss King', main.filter(line => { const c = catalog.get(line.name); return hasType(c, 'ALLY') && Boolean(c?.subtypes.includes('CHESSMAN') && c?.subtypes.includes('BISHOP')); }), 'One Hunt + one Chessman Bishop · draw access');
  packageRow('Hunt, Weiss King', main.filter(line => { const c = catalog.get(line.name); return hasType(c, 'ALLY') && Boolean(c?.subtypes.includes('PAWN')); }), 'One Hunt + one Pawn · draw access', 'pawn-package');
  packageRow('Strategem of Myriad Ice', floating.filter(line => line.name !== 'Strategem of Myriad Ice'), 'One Strategem + one reviewed Floating Memory card · draw access');
  packageRow('Calculated Foresight', floating.filter(line => line.name !== 'Calculated Foresight'), 'One Foresight + one reviewed Floating Memory card · draw access');
  // Defense remains in its existing standalone panel; reused here for equal-scenario comparisons.
  const defense = calculateDefenseScenario(s.wind, s.damage, s.events, s.allies, s.damageTaken);
  if (has('Veiling Breeze')) add('Veiling Breeze', 'prevent', 'combat', defense.breezeTotal, 'prevented', `${defense.breezePerEvent} per event`, ['wind', 'damage', 'events']);
  if (has('Crystallized Destiny')) add('Crystallized Destiny', 'prevent', 'combat', defense.destinyPrevented, 'prevented', `Next event · activation tax +${defense.destinyTax}`, ['damage', 'events']);
  if (has('Flourishing Restoration')) add('Flourishing Restoration', 'recover', 'draw', defense.recovered, 'recovered', `${defense.recoveryCapacity} recovery available`, ['allies', 'damageTaken']);
  return result;
}
