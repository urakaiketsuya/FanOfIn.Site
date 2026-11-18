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

// Current retained records describe meaningful saved activity, not browsing sessions.
const ACTIVITY = `
  SELECT d.owner_user_id AS user_id, 'decks' AS feature, v.created_at AS at
    FROM deck_versions v JOIN user_decks d ON d.id=v.deck_id WHERE d.is_seed=0
  UNION ALL SELECT owner_user_id, 'decks', updated_at FROM user_decks WHERE is_seed=0
  UNION ALL SELECT user_id, 'collection', created_at FROM collection_transactions
  UNION ALL SELECT user_id, 'collection', undone_at FROM collection_transactions WHERE undone_at IS NOT NULL
  UNION ALL SELECT owner_user_id, 'combos', updated_at FROM user_combos
  UNION ALL SELECT user_id, 'matches', updated_at FROM match_log_records
  UNION ALL SELECT user_id, 'analysis', updated_at FROM analysis_profiles
  UNION ALL SELECT user_id, 'bookmarks', created_at FROM deck_bookmarks
  UNION ALL SELECT user_id, 'bookmarks', created_at FROM tournament_deck_favorites
`;

export async function adminSiteHealth(env: Env, now = new Date()): Promise<AdminSiteHealth> {
  const asOf = now.toISOString();
  const cutoff = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString();
  const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29)).toISOString().slice(0, 10);
  const [activity, signups, creators, operations, manifest] = await Promise.all([
    env.ACCOUNT_DB.prepare(`WITH activity AS (${ACTIVITY})
      SELECT feature, COUNT(DISTINCT user_id) AS users,
        COUNT(DISTINCT CASE WHEN at >= ? THEN user_id END) AS active7Days
      FROM activity WHERE at >= ? AND at <= ? GROUP BY feature
      UNION ALL SELECT '__all', COUNT(DISTINCT user_id),
        COUNT(DISTINCT CASE WHEN at >= ? THEN user_id END)
      FROM activity WHERE at >= ? AND at <= ?`)
      .bind(cutoff(7), cutoff(30), asOf, cutoff(7), cutoff(30), asOf)
      .all<{ feature: string; users: number; active7Days: number }>(),
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
  const all = activity.results.find(row => row.feature === '__all')!;
  return {
    asOf, active7Days: Number(all.active7Days), active30Days: Number(all.users),
    newUsers7Days: Number(signups!.days7), newUsers30Days: Number(signups!.days30),
    deckCreators30Days: Number(creators!.total),
    features: FEATURES.map(([key, label]) => ({ key, label, users: Number(activity.results.find(row => row.feature === key)?.users ?? 0) }))
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
