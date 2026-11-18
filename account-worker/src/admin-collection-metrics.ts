import type { CollectionEngagement } from '@gatcg/shared';
import type { Env } from './auth';

/** Activity is a committed inventory change or undo, not a page view. */
export async function collectionEngagement(
  env: Env, totalUsers: number, collectionUsers: number, now = new Date(),
): Promise<CollectionEngagement> {
  const asOf = now.toISOString();
  const cutoff = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString();
  const monday = new Date(now);
  monday.setUTCHours(0, 0, 0, 0);
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7 - 49);
  const weeks = Array.from({ length: 8 }, (_, index) => ({
    start: new Date(monday.getTime() + index * 7 * 86_400_000).toISOString().slice(0, 10),
    firstCollectors: 0,
  }));
  const [active, firstSaves] = await Promise.all([
    env.ACCOUNT_DB.prepare(`SELECT
      COUNT(DISTINCT CASE WHEN happened_at >= ? THEN user_id END) AS active7Days,
      COUNT(DISTINCT user_id) AS active30Days
      FROM (
        SELECT user_id, created_at AS happened_at FROM collection_transactions WHERE created_at >= ? AND created_at <= ?
        UNION ALL
        SELECT user_id, undone_at AS happened_at FROM collection_transactions WHERE undone_at >= ? AND undone_at <= ?
      )`).bind(cutoff(7), cutoff(30), asOf, cutoff(30), asOf)
      .first<{ active7Days: number; active30Days: number }>(),
    env.ACCOUNT_DB.prepare(`SELECT substr(first_save, 1, 10) AS day, COUNT(*) AS total
      FROM (
        SELECT user_id, MIN(created_at) AS first_save FROM collection_transactions
        WHERE created_at <= ? GROUP BY user_id
      ) WHERE first_save >= ? GROUP BY day ORDER BY day`)
      .bind(asOf, monday.toISOString()).all<{ day: string; total: number }>(),
  ]);
  for (const row of firstSaves.results) {
    const index = Math.floor((Date.parse(row.day) - monday.getTime()) / (7 * 86_400_000));
    if (index >= 0 && index < weeks.length) weeks[index].firstCollectors += Number(row.total);
  }
  return {
    asOf, active7Days: Number(active!.active7Days), active30Days: Number(active!.active30Days),
    adoptionPercent: totalUsers ? collectionUsers / totalUsers * 100 : null,
    weeks,
  };
}
