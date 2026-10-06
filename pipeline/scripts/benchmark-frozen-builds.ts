import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { fieldWindowStart, type FieldHistoryData, type BattleChartEntry } from '@gatcg/shared';
import { buildCardIndex, type CardSignature } from '../src/cards/catalog.js';
import { createAnalysisContext } from '../src/analysis/context.js';
import { computeBuildField, UNASSIGNED_BUILD } from '../src/analysis/buildField.js';
import { freezeExactBuilds } from '../src/analysis/frozenBuilds.js';
import { writeJsonAtomic } from '../src/lib/atomicWrite.js';
import type { OmnidexEventBundle } from '../src/omnidex/cache.js';

const root = new URL('../../', import.meta.url);
const read = async (path: string) => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const history = await read('data/analysis/field-history.json') as FieldHistoryData;
const catalog = await read('pipeline/.cache/cards.json') as { cards: CardSignature[] };
const standard = history.events.filter(event => event.format === 'standard');
const to = standard.map(event => event.date).sort().at(-1)!;
const cutoff = fieldWindowStart(to, 28);
const from = fieldWindowStart(cutoff);
const training = standard.filter(event => event.date >= from && event.date < cutoff && event.completedDate !== null && event.completedDate < cutoff);
const testing = standard.filter(event => event.date >= cutoff && event.date <= to);
const load = (events: typeof training) => Promise.all(events.map(event => read(`data/omnidex/events/${event.id}.json`) as Promise<OmnidexEventBundle>));
const [train, test] = await Promise.all([load(training), load(testing)]);
const ctx = createAnalysisContext(buildCardIndex(catalog.cards));
const frozen = freezeExactBuilds(train, ctx);
const fit = computeBuildField(train, ctx, frozen.assign(train), 1);
const holdout = computeBuildField(test, ctx, frozen.assign(test), 1);
const key = (a: string, b: string) => JSON.stringify([a, b]);
const trained = new Map(fit.conditioned.battleChart.filter(row => row.games >= history.minMatchups).map(row => [key(row.a, row.b), row]));
const choices = new Map(fit.conditioned.choices.map(choice => [choice.id, choice]));
const pooled = new Map<string, BattleChartEntry>();
for (const row of fit.conditioned.battleChart) {
  const champion = choices.get(row.a)!.champion;
  const id = key(champion, row.b);
  const aggregate = pooled.get(id) ?? { a: champion, b: row.b, aWins: 0, bWins: 0, ties: 0, games: 0 };
  aggregate.aWins += row.aWins; aggregate.bWins += row.bWins; aggregate.ties += row.ties; aggregate.games += row.games;
  pooled.set(id, aggregate);
}
const prediction = (row: BattleChartEntry) => (row.aWins + row.ties * 0.5 + 5) / (row.games + 10);
const squaredError = (row: BattleChartEntry, p: number) => row.aWins * (1 - p) ** 2 + row.bWins * p ** 2 + row.ties * (0.5 - p) ** 2;
const results = holdout.conditioned.battleChart.flatMap(row => {
  const prior = trained.get(key(row.a, row.b));
  if (!prior) return [];
  const choice = choices.get(row.a)!;
  const baseline = pooled.get(key(choice.champion, row.b))!;
  return [{ choice: row.a, opponent: row.b, trainingGames: prior.games, laterGames: row.games,
    predicted: prediction(prior), championBaseline: prediction(baseline), observed: (row.aWins + row.ties * 0.5) / row.games,
    buildSquaredError: squaredError(row, prediction(prior)), championSquaredError: squaredError(row, prediction(baseline)) }];
});
const evaluated = results.reduce((sum, row) => sum + row.laterGames, 0);
const publicDecks = holdout.field.reduce((sum, row) => sum + row.weight, 0);
const assignedDecks = holdout.field.filter(row => row.champion !== UNASSIGNED_BUILD).reduce((sum, row) => sum + row.weight, 0);
const recurringIds = new Set(holdout.field.filter(row => row.champion !== UNASSIGNED_BUILD).map(row => row.champion));
const report = {
  sourceGeneratedAt: history.generatedAt,
  scope: { format: 'standard', from, cutoff, to, trainingEvents: fit.events, laterEvents: holdout.events, minMatchups: history.minMatchups },
  interpretation: 'Single chronological holdout with exact main+material definitions frozen from earlier completed events. Sideboards excluded. This is an exact-list baseline, not validation of the published similarity taxonomy. Later unknown lists remain unassigned. Predictions use observed opponent Champion cells, with a ten-game 50% prior, compared on the same later outcomes with pooled own-Champion versus opponent-Champion predictions. A match can contribute both participant perspectives; these are correlated, not independent samples. Squared error treats draws as 0.5. Selection, pilot skill, retrospective data availability, and sampling uncertainty remain uncontrolled. No recommendation or causal card effect is established.',
  population: { frozenBuilds: frozen.definitions.length, publicLaterDecks: publicDecks, assignedLaterDecks: assignedDecks,
    exactListRetention: publicDecks ? assignedDecks / publicDecks : 0,
    validLaterPairings: holdout.validPairings, eligibleLaterPerspectives: holdout.validPairings * 2,
    evaluatedPerspectives: evaluated, evaluatedCells: results.length,
    outcomeCoverage: holdout.validPairings ? evaluated / (holdout.validPairings * 2) : 0 },
  accuracy: { buildMeanSquaredError: evaluated ? results.reduce((sum, row) => sum + row.buildSquaredError, 0) / evaluated : null,
    championMeanSquaredError: evaluated ? results.reduce((sum, row) => sum + row.championSquaredError, 0) / evaluated : null },
  trainingEventIds: training.map(event => event.id), laterEventIds: testing.map(event => event.id),
  recurringDefinitions: frozen.definitions.filter(build => recurringIds.has(build.id)).map(build => ({ id: build.id, sections: JSON.parse(build.key) })), results,
};
await writeJsonAtomic(fileURLToPath(new URL('docs/reports/frozen-build-holdout.json', root)), report, 2);
console.log(JSON.stringify({ scope: report.scope, population: report.population, accuracy: report.accuracy }, null, 2));
