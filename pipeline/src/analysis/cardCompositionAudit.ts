import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import type { Card } from '@gatcg/shared';
import { buildCardIndex, type CardSignature } from '../cards/catalog.js';
import { buildEventDeckSignatures } from './decklists.js';
import { listCachedBundles } from '../omnidex/cache.js';
import { collectHistoricalMatches, historicalPredictions } from './opponentValidation.js';
import { fitComposition, scoreComposition, type CompositionDeck, type CompositionMatch } from './cardCompositionValidation.js';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const catalogText = await readFile(`${root}data/card-catalog.json`, 'utf8');
const { cards } = JSON.parse(catalogText) as {
    cards: Card[];
};
const signatures = buildCardIndex(cards.map(c => ({ ...c, editions: [] })) as CardSignature[]);
const bundles = await listCachedBundles();
const decks = new Map<string, CompositionDeck>(), formats = new Map<string, string>();
for (const bundle of bundles) {
    formats.set(String(bundle.id), bundle.event.format);
    if (bundle.event.status !== 'complete' || 'error' in bundle.decklists || 'error' in bundle.standings)
        continue;
    const standings = new Map(bundle.standings.standings.map(s => [s.id, s]));
    for (const [player, d] of buildEventDeckSignatures(bundle.decklists, signatures)) {
        const s = standings.get(player);
        if (!s || ![s.statsWins, s.statsLosses, s.statsTies].every(n => Number.isInteger(n) && n >= 0) || s.statsWins + s.statsLosses + s.statsTies < 2 || !d.championName || d.unmatchedCardNames.length || !d.mainCards.length)
            continue;
        if ([...d.mainCards, ...d.materialCards].some(l => !Number.isSafeInteger(l.quantity) || l.quantity <= 0))
            continue;
        const normalized = (lines: typeof d.mainCards) => [...lines].sort((a, b) => a.name.localeCompare(b.name));
        const identity = createHash('sha256').update(JSON.stringify({ main: normalized(d.mainCards), material: normalized(d.materialCards) })).digest('hex');
        const merged = new Map<string, number>();
        for (const l of [...d.mainCards, ...d.materialCards])
            merged.set(l.name, (merged.get(l.name) ?? 0) + l.quantity);
        decks.set(`${bundle.id}:${player}`, { identity, champion: d.championName, cards: [...merged].sort(([a], [b]) => a.localeCompare(b)) });
    }
}
const history = collectHistoricalMatches(bundles);
const linked = history.matches.filter(m => decks.has(`${m.event}:${m.a}`) && decks.has(`${m.event}:${m.b}`));
const dates = [...new Set(linked.map(m => m.date))].sort();
if (dates.length < 3)
    throw new Error('Insufficient history');
const cutoff = dates[Math.floor(dates.length * .7)];
const priors = historicalPredictions(history.matches, cutoff);
const rows: CompositionMatch[] = linked.map(m => ({ ...m, a: decks.get(`${m.event}:${m.a}`)!, b: decks.get(`${m.event}:${m.b}`)!, format: formats.get(m.event) ?? 'unknown', prior: priors.get(m.id)!.withOpponent }));
const train = rows.filter(r => r.date < cutoff), test = rows.filter(r => r.date >= cutoff);
console.log(`Fitting ${train.length} matches; holding out ${test.length}; cutoff ${cutoff}`);
const fitted = fitComposition(train);
console.log(JSON.stringify(fitted.diagnostics));
if (![fitted.diagnostics.adjustedContext, fitted.diagnostics.cards, fitted.diagnostics.cardPairs].every(d => d.converged)) {
    throw new Error("Numerical fit did not converge; refusing to publish an experiment artifact.");
}
const identities = new Set(train.flatMap(r => [r.a.identity, r.b.identity]));
const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), publication: { enabled: false, status: 'research-only' }, inputs: { catalogSha256: createHash('sha256').update(catalogText).digest('hex'), cohortSha256: createHash('sha256').update(JSON.stringify(rows)).digest('hex'), historySha256: createHash('sha256').update(JSON.stringify(history.matches)).digest('hex'), coverage: history.coverage, linkedMatches: rows.length, trainingMatches: train.length, cutoff }, method: { target: 'Match point share: win 1, draw 0.5, loss 0. One observation per match.', split: 'First 70% distinct UTC dates train, later dates test. Retrospective holdout already used by earlier analytics research; not an untouched prospective validation.', baseline: 'Prior-day Elo frozen at cutoff; context adds signed champion within format and champion matchup within format. Format is recorded event format, not set/ban era.', cardAverage: 'Training-only per-card match-point rate with 20 neutral prior appearances, averaged by copies; prediction 0.5 + own average - opponent average. Both sides contribute to training counts.', adjusted: 'Sparse ridge regression on residual from player baseline. Jointly fitted context, signed card quantities / 4, and optional signed within-deck pair presence. No intercept ensures side-swap symmetry.', selection: 'Pairs selected by training match and distinct event support, capped by frequency; no outcome-based selection or holdout tuning.', uncertainty: '400 paired event-cluster bootstrap samples; positive error reduction favors candidate. Does not account for cross-event player dependence.', limitations: ['Published-deck selection bias', 'No sideboard features', 'No historical catalog or ban-era reconstruction', 'Exact unseen-deck subset does not isolate near-duplicate families', 'No causal interpretation of card coefficients', 'No prospective validation or larger groups'] }, options: fitted.options, diagnostics: fitted.diagnostics, holdout: scoreComposition(test, fitted.models), bothDecksUnseen: scoreComposition(test.filter(r => !identities.has(r.a.identity) && !identities.has(r.b.identity)), fitted.models), temporalHalves: [test.slice(0, Math.floor(test.length / 2)), test.slice(Math.floor(test.length / 2))].map(sample => ({ firstDate: sample[0]?.date, lastDate: sample.at(-1)?.date, ...scoreComposition(sample, fitted.models) })) };
await writeFile(`${root}data/analysis/card-composition-audit.json`, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.holdout, null, 2));
