import type { AdminSiteHealth } from '@gatcg/shared';
import type { Env } from './auth';
import { assetJson } from './assets';

const FEATURES = [
  ['decks', 'Deck editing'], ['collection', 'Collection'], ['combos', 'Combos'],
  ['matches', 'Match logs'], ['analysis', 'Saved analysis'], ['bookmarks', 'Deck bookmarks'],
] as const;
const DATASETS = [
  ['omnidex-index', 'Tournament index'], ['prices', 'Card prices'],
  ['analysis-cards', 'Card analysis'], ['simulator-summary', 'Simulator results'],
  ['shoutatyourdecks-index', 'Community deck index'],
] as const;

// Correlated existence checks avoid D1's compound-SELECT limit and deduplicate
// each account across records and features without exposing account identities.
function activityConditions(cutoff: '?1' | '?2') {
  const recent = (field: string) => `${field} >= ${cutoff} AND ${field} <= ?3`;
  return {
    decks: `EXISTS (SELECT 1 FROM user_decks d WHERE d.owner_user_id=u.id AND d.is_seed=0
      AND ((${recent('d.updated_at')}) OR EXISTS (SELECT 1 FROM deck_versions v WHERE v.deck_id=d.id AND ${recent('v.created_at')})))`,
    collection: `EXISTS (SELECT 1 FROM collection_transactions t WHERE t.user_id=u.id AND ((${recent('t.created_at')}) OR (${recent('t.undone_at')})))`,
    combos: `EXISTS (SELECT 1 FROM user_combos c WHERE c.owner_user_id=u.id AND ${recent('c.updated_at')})`,
    matches: `EXISTS (SELECT 1 FROM match_log_records m WHERE m.user_id=u.id AND ${recent('m.updated_at')})`,
    analysis: `EXISTS (SELECT 1 FROM analysis_profiles a WHERE a.user_id=u.id AND ${recent('a.updated_at')})`,
    bookmarks: `(EXISTS (SELECT 1 FROM deck_bookmarks d WHERE d.user_id=u.id AND ${recent('d.created_at')})
      OR EXISTS (SELECT 1 FROM tournament_deck_favorites t WHERE t.user_id=u.id AND ${recent('t.created_at')}))`,
  };
}

export async function adminSiteHealth(env: Env, now = new Date()): Promise<AdminSiteHealth> {
  const asOf = now.toISOString();
  const cutoff = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString();
  const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29)).toISOString().slice(0, 10);
  const seven = activityConditions('?1');
  const thirty = activityConditions('?2');
  const [activity, signups, creators, operations, manifest] = await Promise.all([
    env.ACCOUNT_DB.prepare(`SELECT
      COUNT(CASE WHEN ${Object.values(seven).join(' OR ')} THEN 1 END) AS active7Days,
      COUNT(CASE WHEN ${Object.values(thirty).join(' OR ')} THEN 1 END) AS active30Days,
      ${FEATURES.map(([key]) => `COUNT(CASE WHEN ${thirty[key]} THEN 1 END) AS ${key}`).join(', ')}
      FROM users u`).bind(cutoff(7), cutoff(30), asOf)
      .first<Record<string, number>>(),
    env.ACCOUNT_DB.prepare(`SELECT COUNT(*) AS days30,
      COUNT(CASE WHEN created_at >= ? THEN 1 END) AS days7
      FROM users WHERE created_at >= ? AND created_at <= ?`)
      .bind(cutoff(7), cutoff(30), asOf).first<{ days7: number; days30: number }>(),
    env.ACCOUNT_DB.prepare(`SELECT COUNT(DISTINCT owner_user_id) AS total FROM user_decks
      WHERE is_seed=0 AND created_at >= ? AND created_at <= ?`)
      .bind(cutoff(30), asOf).first<{ total: number }>(),
    readOperations(env, since, asOf),
    assetJson<Record<string, unknown>>(env, '/data/manifest.json').catch(() => null),
  ]);
  return {
    asOf, active7Days: Number(activity!.active7Days), active30Days: Number(activity!.active30Days),
    newUsers7Days: Number(signups!.days7), newUsers30Days: Number(signups!.days30),
    deckCreators30Days: Number(creators!.total),
    features: FEATURES.map(([key, label]) => ({ key, label, users: Number(activity![key]) }))
      .sort((a, b) => b.users - a.users || a.label.localeCompare(b.label)),
    operations,
    freshness: DATASETS.map(([key, label]) => {
      const value = manifest?.[key];
      return { key, label, updatedAt: typeof value === 'string' && Number.isFinite(Date.parse(value)) && Date.parse(value) <= now.getTime() ? new Date(value).toISOString() : null };
    }),
  };
}

async function readOperations(env: Env, since: string, asOf: string): Promise<AdminSiteHealth['operations']> {
  try {
    const [coverage, rows] = await Promise.all([
      env.ACCOUNT_DB.prepare('SELECT started_at FROM admin_metric_coverage WHERE id=1').first<{ started_at: string }>(),
      env.ACCOUNT_DB.prepare(`SELECT operation, SUM(requests) AS requests, SUM(rejected) AS rejected, SUM(errors) AS errors
        FROM admin_operation_metrics WHERE day >= ? AND day <= ? GROUP BY operation ORDER BY errors DESC, rejected DESC, operation`)
        .bind(since, asOf.slice(0, 10)).all<{ operation: string; requests: number; rejected: number; errors: number }>(),
    ]);
    return coverage ? { since, coverageStartedAt: coverage.started_at, rows: rows.results } : null;
  } catch { return null; }
}
