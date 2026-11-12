import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { computeDeckRating, effectAccessReport, packageReport, computeTonorisDrawReport, type Card } from '@gatcg/shared';
import { buildCardIndex, type CardSignature } from '../cards/catalog.js';
import { buildEventDeckSignatures } from './decklists.js';
import { listCachedBundles } from '../omnidex/cache.js';
import { evaluatePerformance, type PerformanceRow } from './performanceValidation.js';

import { performanceTrajectories, trajectoryFeatures } from './performanceTrajectories.js';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const catalogText = await readFile(path.join(root, 'data/card-catalog.json'), 'utf8');
const { cards, generatedAt } = JSON.parse(catalogText) as { cards: Card[]; generatedAt: string };
const catalog = new Map(cards.map(c => [c.name, c]));
const signatures = buildCardIndex(cards.map(c => ({ ...c, editions: [] })) as CardSignature[]);
const bundles = await listCachedBundles();
const rows: PerformanceRow[] = [];
const names = ['drawAccess15', 'resourceAccess15', 'preventionAccess15', 'recoveryAccess15', 'tokenAccess15', 'bestCompletePackageAccess15', 'tonorisExtraDrawT3', 'tonorisExtraDrawT5', 'tonorisSavedT3', 'tonorisSavedT5', 'tonorisLevel3T3', 'tonorisLevel3T5'];
names.push(...trajectoryFeatures);
const cache = new Map<string, { diao: number[]; analytics: (number | null)[] }>();
const excluded: Record<string, number> = {};
const skip = (reason: string) => { excluded[reason] = (excluded[reason] ?? 0) + 1; };
for (const bundle of bundles) {
  if (bundle.event.status !== 'complete' || 'error' in bundle.decklists || 'error' in bundle.standings) { skip('incompleteEventOrUnavailableRecords'); continue; }
  if (!Number.isFinite(Date.parse(bundle.event.date))) { skip('invalidEventDate'); continue; }
  const standing = new Map(bundle.standings.standings.map(s => [s.id, s]));
  for (const [player, deck] of buildEventDeckSignatures(bundle.decklists, signatures)) {
    const s = standing.get(player);
    if (!s || ![s.statsWins, s.statsLosses, s.statsTies].every(n => Number.isInteger(n) && n >= 0) || s.statsWins + s.statsLosses + s.statsTies < 2) { skip('invalidOrShortRecord'); continue; }
    if (!deck.championName || deck.unmatchedCardNames.length || [...deck.mainCards, ...deck.materialCards].some(l => !catalog.has(l.name))) { skip('unknownChampionOrCards'); continue; }
    if (!deck.mainCards.length || [...deck.mainCards, ...deck.materialCards].some(l => !Number.isSafeInteger(l.quantity) || l.quantity <= 0)) { skip('invalidDeck'); continue; }
    const normalized = (lines: typeof deck.mainCards) => [...lines].sort((a, b) => a.name.localeCompare(b.name));
    const input = { main: normalized(deck.mainCards), material: normalized(deck.materialCards) };
    const identity = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    let features = cache.get(identity);
    if (!features) {
      const rating = computeDeckRating([...input.main, ...input.material], catalog, deck.championName, deck.classes);
      const access = effectAccessReport(input, catalog);
      const families = ['draw', 'resources', 'prevention', 'recovery', 'tokens'];
      const analytics: (number | null)[] = families.map(id => access.rows.find(r => r.id === id)?.points.find(p => p.seen === Math.min(15, access.size))?.access ?? 0);
      const packages = packageReport(input).filter(p => p.requirementsMet);
      analytics.push(packages.length ? Math.max(...packages.map(p => p.checkpoints.find(c => c.seen === Math.min(15, access.size))?.both ?? 0)) : null);
      const tonoris = computeTonorisDrawReport(input, catalog, 128);
      const supported = tonoris && !tonoris.missing.length ? tonoris : null;
      for (const key of ['extra', 'saved', 'level3'] as const) for (const turn of [3, 5]) {
        const value = supported?.points[turn - 1][key]; analytics.push(typeof value === 'number' ? value : value?.median ?? null);
      }
      analytics.push(...performanceTrajectories(input, catalog));
      features = { diao: [rating.composite, ...Object.values(rating.scores)], analytics };
      cache.set(identity, features);
      if (cache.size % 1000 === 0) console.log(`Extracted ${cache.size} unique decks`);
    }
    rows.push({ id: `${bundle.id}:${player}`, event: String(bundle.id), date: new Date(bundle.event.date).toISOString(), player: String(player), champion: deck.championName, family: `${deck.championName}:${deck.spiritName ?? 'unknown'}`, identity, wins: s.statsWins, losses: s.statsLosses, ties: s.statsTies, ...features });
  }
}
rows.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
const result = evaluatePerformance(rows);
const report = {
  schemaVersion: 2, generatedAt: new Date().toISOString(), publication: { enabled: false, status: 'research-only', blockers: ['No opponent/matchup adjustment', 'Champion/spirit proxy is not a validated archetype classifier', 'No near-duplicate deck-family holdout', 'Current catalog applied retrospectively', 'No independent second temporal validation period', 'DIAO bands and published package selection predate this audit but overlap holdout history'] },
  inputs: { catalogGeneratedAt: generatedAt, catalogSha256: createHash('sha256').update(catalogText).digest('hex'), cohortSha256: createHash('sha256').update(JSON.stringify(rows)).digest('hex'), decks: rows.length, uniqueDecks: cache.size, events: new Set(rows.map(r => r.event)).size, firstDate: rows[0]?.date, lastDate: rows.at(-1)?.date, excluded },
  method: { target: 'Per-deck event match-point rate: (wins + 0.5 ties) / matches, equal weight per deck entry; not a match-win probability.', split: 'First 70% of distinct UTC event dates train; later dates hold out. No date crosses the boundary.', baseline: 'Smoothed champion, champion/spirit, and player history (20 prior deck entries); weights 0.25/0.5/0.25. Training residuals use leave-one-entry-out means.', candidate: 'Fixed ridge penalty 0.1*n; train-only standardization and mean imputation plus missingness indicators. Predictions clipped to 0.01–0.99. No tuning on holdout.', uncertainty: '400 deterministic paired event-cluster bootstrap resamples; improvement is baseline squared error minus candidate squared error. Interval omitted below 20 events.', simulations: 'Existing Tonoris and defense policies at 128 deterministic samples; paid Rai damage at its existing 512 samples. Turns 3 and 5; these checkpoints are not validated expected game lengths.' },
  features: names.map((name, i) => ({ name, available: rows.filter(r => r.analytics[i] !== null).length, meaning: i < 5 ? 'Access to reviewed physical sources among 15 cards seen; absence of reviewed sources is zero, not proof the effect is absent.' : i === 5 ? 'Best joint access among fully present published packages; null when no complete package is recognized.' : i < 12 ? 'Supported Tonoris trajectory; null for unsupported decks.' : 'Reviewed scenario trajectory; unsupported or missing is null. Supported zero is zero; scenarios are alternatives, not additive.' })),
  validation: result,
  priorFeatureValidation: evaluatePerformance(rows.map(r => ({ ...r, analytics: r.analytics.slice(0, 12) }))),
  supportedPaidDamage: rows.filter(r => r.analytics[12] !== null).length >= 30 ? evaluatePerformance(rows.filter(r => r.analytics[12] !== null)) : null,
  supportedDefense: rows.filter(r => r.analytics[18] !== null).length >= 30 ? evaluatePerformance(rows.filter(r => r.analytics[18] !== null)) : null,
  supportedTonoris: rows.filter(r => r.analytics[6] !== null).length >= 30 ? evaluatePerformance(rows.filter(r => r.analytics[6] !== null)) : null,
  next: ['Add opponent-aware match records and training-only archetype assignments', 'Extend trajectory coverage beyond reviewed lineages and test simulation-budget sensitivity', 'Hold out similar build families and validate on a second future period before any UI score'],
};
const output = path.join(root, 'data/analysis/deck-performance-audit.json');
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ output, decks: rows.length, uniqueDecks: cache.size, holdout: result.holdout }, null, 2));
