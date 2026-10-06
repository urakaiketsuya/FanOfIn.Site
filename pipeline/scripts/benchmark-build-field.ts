import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { analyzeCoveredField, fieldWindowStart, scoreExpectedField, stressExpectedField,
  type ArchetypeCluster, type FieldHistoryData } from '@gatcg/shared';
import { buildCardIndex, type CardSignature } from '../src/cards/catalog.js';
import { createAnalysisContext } from '../src/analysis/context.js';
import { computeBuildField, UNASSIGNED_BUILD } from '../src/analysis/buildField.js';
import { writeJsonAtomic } from '../src/lib/atomicWrite.js';
import type { OmnidexEventBundle } from '../src/omnidex/cache.js';

const root = new URL('../../', import.meta.url);
const read = async (path: string) => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const history = await read('data/analysis/field-history.json') as FieldHistoryData;
const taxonomy = await read('data/analysis/archetype-taxonomy.json') as { generatedAt: string; clusters: ArchetypeCluster[] };
const catalog = await read('pipeline/.cache/cards.json') as { cards: CardSignature[] };
const to = history.events.filter(event => event.format === 'standard').map(event => event.date).sort().at(-1);
if (!to) throw new Error('No Standard history');
const from = fieldWindowStart(to);
const events = history.events.filter(event => event.format === 'standard' && event.date >= from && event.date <= to);
const bundles = await Promise.all(events.map(event => read(`data/omnidex/events/${event.id}.json`) as Promise<OmnidexEventBundle>));
const projection = computeBuildField(bundles, createAnalysisContext(buildCardIndex(catalog.cards)), taxonomy.clusters, history.minMatchups);
const total = projection.field.reduce((sum, row) => sum + row.weight, 0);
const assigned = projection.field.filter(row => row.champion !== UNASSIGNED_BUILD);
const candidates = assigned.map(row => row.champion);
const byId = new Map(taxonomy.clusters.map(build => [build.id, build]));
const scores = scoreExpectedField(candidates, projection.field, projection.battleChart);
const stress = new Map(stressExpectedField(candidates, projection.field, projection.battleChart).map(row => [row.champion, row]));
const covered = analyzeCoveredField(assigned, projection.battleChart);
const describe = (id: string) => {
  const build = byId.get(id)!;
  return { id, name: build.name, champion: build.championName,
    championBreakdown: build.championBreakdown,
    characteristicMainCards: build.mainDefiningCards.slice(0, 8),
    cardSummaryScope: 'Published taxonomy membership across all dates',
    exampleDeckId: build.deckIds.find(deckId => events.some(event => deckId.startsWith(`${event.id}:`))) };
};
const results = scores.map(({ champion, ...score }) => ({ ...describe(champion), ...score,
  sightings: assigned.find(row => row.champion === champion)!.weight,
  stressLower: stress.get(champion)!.stressLower, stressUpper: stress.get(champion)!.stressUpper }));
const report = {
  sourceGeneratedAt: { history: history.generatedAt, taxonomy: taxonomy.generatedAt },
  scope: { format: 'standard', from, to, events: projection.events, minMatchups: history.minMatchups },
  interpretation: 'Retrospective named card-build experiment. Builds group similar main+material lists and can span Champions; sideboards do not define membership. Characteristic cards are descriptive, not a tested package or causal substitution advice. Current taxonomy is not an out-of-time training partition. Unknown builds remain unknown in full-field bounds. Same-build mirrors use 50% under symmetric sampling, not proof that variants are equal. Ranges cover missing matchups, not sampling uncertainty. No predictive validation.',
  population: { publicDecks: total, assignedDecks: assigned.reduce((sum, row) => sum + row.weight, 0),
    activeBuilds: candidates.length, validPairings: projection.validPairings, assignedPairings: projection.assignedPairings,
    qualifyingNonmirrorPairs: projection.battleChart.filter(row => row.a !== row.b).length },
  field: projection.field,
  battleChart: projection.battleChart,
  restrictedBenchmark: { ...covered, retainedFullFieldShare: total ? covered.pool.retainedFieldShare * assigned.reduce((sum, row) => sum + row.weight, 0) / total : 0,
    buildLabels: covered.pool.included.map(describe) },
  results,
};
await writeJsonAtomic(fileURLToPath(new URL('docs/reports/build-field-experiment.json', root)), report, 2);
console.log(JSON.stringify({ scope: report.scope, population: report.population,
  retainedFullFieldShare: report.restrictedBenchmark.retainedFullFieldShare,
  pool: report.restrictedBenchmark.buildLabels,
  topFullFieldResults: results.slice(0, 5) }, null, 2));

const conditioned = projection.conditioned;
const choiceById = new Map(conditioned.choices.map(choice => [choice.id, choice]));
const conditionedScores = scoreExpectedField(conditioned.choices.map(choice => choice.id), conditioned.field, conditioned.battleChart);
const groups = [...new Set(conditioned.choices.map(choice => choice.champion))].sort().map(champion => {
  const results = conditionedScores.filter(score => choiceById.get(score.champion)!.champion === champion).map(score => {
    const choice = choiceById.get(score.champion)!;
    return { ...score, ...choice, build: describe(choice.buildId) };
  });
  return { champion, results, separatedPairs: results.flatMap(a => results.filter(b => a.id !== b.id && a.lower > b.upper)
    .map(b => ({ higher: a.id, lower: b.id }))) };
});
const conditionedReport = {
  sourceGeneratedAt: report.sourceGeneratedAt, scope: report.scope,
  interpretation: 'Retrospective Champion-conditioned builds versus opponent Champions. Opponent builds are pooled, including unassigned builds. Own-Champion opponents require observed matches; no automatic mirror payoff. Threshold applies to each directed build+Champion versus Champion cell. Card summaries describe all-date taxonomy, not causal card effects. Missing-matchup bounds exclude sampling uncertainty. Separated bounds are descriptive, not statistical evidence of superiority. No temporal validation.',
  population: { ...report.population, conditionedChoices: conditioned.choices.length,
    qualifyingDirectedCells: conditioned.battleChart.length,
    championsWithMultipleBuilds: groups.filter(group => group.results.length > 1).length,
    choicesCoveringHalfField: conditionedScores.filter(score => score.coverage >= 0.5).length,
    choicesCoveringFourFifths: conditionedScores.filter(score => score.coverage >= 0.8).length,
    separatedPairs: groups.reduce((sum, group) => sum + group.separatedPairs.length, 0) },
  field: conditioned.field, battleChart: conditioned.battleChart, groups,
};
await writeJsonAtomic(fileURLToPath(new URL('docs/reports/conditioned-build-field-experiment.json', root)), conditionedReport, 2);
console.log(JSON.stringify({ conditionedPopulation: conditionedReport.population,
  bestCoverage: [...conditionedScores].sort((a, b) => b.coverage - a.coverage).slice(0, 5) }, null, 2));
