import { computeRaiDrawReport, computeTonorisDrawReport, computeRaiDamageReport, computeDefenseReport, computeRecursionReport, hasDefenseSources, hasRecursionSources, RAI_DAMAGE_CARDS, raiDamageScenarioRelevant, type AnalyticsDeck, type Card, type DrawRange } from '@gatcg/shared';

export type ForecastMetric = {
  id: string; title: string; context: string; unit: string; cards: { name: string; quantity: number; detail?: string }[];
  early: DrawRange; late: DrawRange; probability?: boolean; cumulative?: boolean;
};
export type DeckForecast = { metrics: ForecastMetric[]; status?: string; issues?: Record<string, string> };
const chance = (n: number): DrawRange => ({ low: n * 100, median: n * 100, high: n * 100 });

/** Presentation adapter only. Each deck retains its own shared simulation and payment policy. */
export function automaticForecast(deck: AnalyticsDeck, cards: Map<string, Card>, coverage: { damage: boolean; defense: boolean; recursion: boolean }): DeckForecast {
  if (!deck.main.some(l => l.quantity > 0)) return { metrics: [], status: 'Empty Main deck' };
  if ([...deck.main, ...deck.material].some(l => l.quantity > 0 && !cards.has(l.name))) return { metrics: [], status: 'Card data incomplete' };
  const metrics: ForecastMetric[] = [];
  const issues: Record<string, string> = {};
  const lines = (names: string[]) => [...deck.main, ...deck.material].filter(l => l.quantity > 0 && names.includes(l.name));
  const add = (id: string, title: string, context: string, unit: string, early: DrawRange, late: DrawRange, sources: ForecastMetric['cards'], probability = false, cumulative = true) => metrics.push({ id, title, context, unit, early, late, cards: sources, probability, cumulative });
  const rai = computeRaiDrawReport(deck, cards);
  if (rai?.status === 'ready') add('draw', 'Cards seen', 'Unopposed · going first', 'cards', rai.points[2].seenRange, rai.points[4].seenRange, rai.sources);
  const tonoris = computeTonorisDrawReport(deck, cards);
  if (tonoris?.missing.length || rai?.status === 'missing') return { metrics: [], status: 'Card data incomplete' };
  if (tonoris && !tonoris.missing.length) {
    const a = tonoris.points[2], b = tonoris.points[4];
    add('draw', 'Cards seen', 'Unopposed · going first', 'cards', a.seen, b.seen, lines(['Epicurean Institute', 'Dormant Sacrificial Altar', 'Hub of Innovation', 'Neos Sight']));
    const resources = lines(['Academy Guide', 'Dungeon Guide', 'The Eternal Kingdom']);
    add('level', 'Level 3 reached', 'Paid progression · going first', '%', chance(a.level3), chance(b.level3), resources, true);
    add('saved', 'Memory cost saved', 'Paid progression · going first', 'memory', a.saved, b.saved, resources);
    add('tokens', 'Ready token power', 'After payments · going first', 'power', a.readyTokenPower, b.readyTokenPower, lines(['Cordelia, Aurous Kaiser', 'Automata Genesis', 'Tonoris, Genesis Aegis']), false, false);
    add('obelisk', '2 prevention ready', 'Obelisk readiness · going first', '%', chance(a.preventionReady), chance(b.preventionReady), [...lines(['Tonoris, Genesis Aegis']), { name: 'Obelisk of Protection', quantity: 1, detail: 'Generated' }], true, false);
  }
  if (coverage.damage) {
    const report = computeRaiDamageReport(deck, cards);
    if (report.status === 'missing') issues.damage = 'Card data incomplete';
    if (report.status === 'ready') for (const s of report.scenarios) {
      for (const [key, label] of [['damage', 'Champion damage'], ['allies', 'Ally damage'], ['self', 'Self-inflicted damage'], ['recovery', 'Recovery from spells']] as const) {
        add(`damage-${s.id}-${key}`, label, `${s.label} · paid casts · before prevention`, 'damage', s.points[2][key], s.points[4][key], s.damageSources);
      }
    }
  }
  if (coverage.defense) {
    const report = computeDefenseReport(deck, cards);
    if (report.status === 'missing') issues.defense = 'Card data incomplete';
    if (report.status === 'ready') for (const s of report.scenarios) {
      const names = [...new Set([...s.cards.map(l => l.name), ...s.points.flatMap(p => p.sources)])];
      const sources = names.map(name => ({ name, quantity: deck.main.filter(l => l.name === name).reduce((n, l) => n + l.quantity, 0) || 1, detail: name === 'Obelisk of Protection' ? 'Generated' : undefined }));
      const label = s.metric === 'prevention' ? 'Prevention' : 'Recovery';
      add(`defense-${s.id}-chance`, `${label} ready`, `${s.label} · one response window`, '%', chance(s.points[2].ready), chance(s.points[4].ready), sources, true, false);
      add(`defense-${s.id}-range`, `${label} capacity`, `${s.label} · one response window`, 'damage', s.points[2].range, s.points[4].range, sources, false, false);
    }
  }
  if (coverage.recursion) {
    const report = computeRecursionReport(deck, cards);
    if (report.status === 'missing') issues.reuse = 'Card data incomplete';
    if (report.status === 'ready') for (const key of ['returned', 'replayed'] as const) {
      add(`reuse-${key}-chance`, `1+ cards ${key}`, 'Graveyard reuse · going first', '%', chance(report.points[2][key].ready), chance(report.points[4][key].ready), report.sources, true);
      add(`reuse-${key}-range`, `Cards ${key}`, 'Graveyard reuse · going first', 'cards', report.points[2][key], report.points[4][key], report.sources);
    }
  }
  return { metrics, issues, status: metrics.length ? undefined : 'Forecast not supported' };
}

export function forecastCoverage(decks: AnalyticsDeck[]) {
  return { damage: decks.some(d => d.main.some(l => l.quantity > 0 && RAI_DAMAGE_CARDS.some(n => n === l.name))), defense: decks.some(hasDefenseSources), recursion: decks.some(hasRecursionSources) };
}

/** Keep equal and zero results; only suppress irrelevant damage scenarios/secondary metrics. */
export function visibleForecastMetrics(reports: DeckForecast[], decks: AnalyticsDeck[]) {
  const names = new Set(decks.flatMap(d => d.main.filter(l => l.quantity > 0).map(l => l.name)));
  const definitions = new Map(reports.flatMap(r => r.metrics).map(m => [m.id, m]));
  const order = (id: string) => id === 'draw' ? 0 : ['level', 'saved'].includes(id) ? 1 : id === 'tokens' ? 2 : id.startsWith('damage-') ? 3 : id.startsWith('reuse-') ? 5 : 4;
  return [...definitions.values()].sort((a, b) => order(a.id) - order(b.id)).filter(m => {
    if (!m.id.startsWith('damage-')) return true;
    const [, scenario, metric] = m.id.split('-');
    return raiDamageScenarioRelevant(scenario, names) && (metric === 'damage' || reports.some(r => r.metrics.some(v => v.id === m.id && (v.early.high > 0 || v.late.high > 0))));
  });
}
