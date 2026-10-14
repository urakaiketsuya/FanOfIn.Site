import type { IncomingMessage, ServerResponse } from 'node:http';
import { readBytes } from '../lib/http-response.js';
import { signWorkerRequest } from '../lib/worker-signature.js';

export function renderDeckSitemap(slugs: unknown): string {
  if (!Array.isArray(slugs) || slugs.length > 50000
    || !slugs.every(slug => typeof slug === 'string' && /^[a-f0-9]{32}$/.test(slug))
    || new Set(slugs).size !== slugs.length) throw new Error('Invalid sitemap source');
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    + slugs.map(slug => `<url><loc>https://fanofin.site/decks/${slug}</loc></url>`).join('') + '</urlset>';
}

export default async function handler(request: IncomingMessage, response: ServerResponse): Promise<void> {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Robots-Tag', 'noindex');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  const finish = (status: number, body: string, type = 'text/plain; charset=utf-8') => {
    response.statusCode = status;
    response.setHeader('Content-Type', type);
    response.end(request.method === 'HEAD' ? undefined : body);
  };
  if (!['GET', 'HEAD'].includes(request.method ?? '')) {
    response.setHeader('Allow', 'GET, HEAD'); finish(405, 'Method not allowed'); return;
  }
  const workerUrl = process.env.ACCOUNT_WORKER_URL?.replace(/\/$/, '');
  const secret = process.env.BFF_SHARED_SECRET;
  if (!workerUrl || !secret) { finish(503, 'Sitemap temporarily unavailable'); return; }
  try {
    const path = '/v1/discover/deck-sitemap';
    const upstream = await fetch(`${workerUrl}${path}`, {
      method: 'GET', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(6000),
      headers: { Accept: 'application/json', 'X-Fanofin-BFF-Secret': secret, ...signWorkerRequest(secret, 'GET', path) },
    });
    const source = JSON.parse((await readBytes(upstream, 2_000_000)).toString());
    finish(200, renderDeckSitemap(source.slugs), 'application/xml; charset=utf-8');
  } catch { finish(503, 'Sitemap temporarily unavailable'); }
}
