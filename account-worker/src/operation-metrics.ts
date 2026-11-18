import type { Env } from './auth';

export function metricOperation(method: string, path: string): string | null {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return null;
  if (/^\/v1\/me\/imports(?:\/(?:preview|link))?$/.test(path)) return 'deck-import';
  if (/^\/v1\/me\/decks(?:\/[^/]+(?:\/(?:versions|publish)|\/versions\/[^/]+\/restore)?)?$/.test(path)) return 'deck-save';
  if (/^\/v1\/me\/collection(?:\/transactions\/[^/]+\/undo)?$/.test(path)) return 'collection';
  if (/^\/v1\/me\/combos(?:\/[^/]+)?$/.test(path)) return 'combo';
  if (/^\/v1\/me\/match-log(?:\/[^/]+)?$/.test(path)) return 'match-log';
  if (/^\/v1\/me\/analysis-profiles(?:\/[^/]+)?$/.test(path)) return 'analysis';
  if (/^\/v1\/me\/trades(?:\/[^/]+)?$/.test(path)) return 'trade';
  return null;
}

export async function recordOperation(env: Env, operation: string, status: number, now = new Date()) {
  // One atomic increment preserves concurrent attempts; each HTTP retry is a new attempt.
  await env.ACCOUNT_DB.prepare(`INSERT INTO admin_operation_metrics(day,operation,requests,rejected,errors)
    VALUES (?,?,1,?,?) ON CONFLICT(day,operation) DO UPDATE SET
    requests=requests+1, rejected=rejected+excluded.rejected, errors=errors+excluded.errors`)
    .bind(now.toISOString().slice(0, 10), operation, status >= 400 && status < 500 ? 1 : 0, status >= 500 ? 1 : 0).run();
}
