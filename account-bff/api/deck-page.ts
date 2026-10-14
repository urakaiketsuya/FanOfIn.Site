import type { IncomingMessage, ServerResponse } from 'node:http';
import { readPublishedDeck } from '../lib/published-deck.js';
import { readBytes } from '../lib/http-response.js';
import { renderCommunityDeckPage } from '../lib/deck-page.js';

export default async function handler(request: IncomingMessage, response: ServerResponse): Promise<void> {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  // Only the canonical domain is indexable; the edge removes this for public decks.
  response.setHeader('X-Robots-Tag', 'noindex');
  const finish = (status: number, body: string, type = 'text/plain; charset=utf-8') => {
    response.statusCode = status;
    response.setHeader('Content-Type', type);
    response.end(request.method === 'HEAD' ? undefined : body);
  };
  if (!['GET', 'HEAD'].includes(request.method ?? '')) {
    response.setHeader('Allow', 'GET, HEAD'); finish(405, 'Method not allowed'); return;
  }
  const url = new URL(request.url ?? '/', 'https://accounts.fanofin.site');
  const slug = url.searchParams.get('slug') ?? '';
  const result = await readPublishedDeck(slug);
  if (result.status !== 200) {
    finish(result.status, result.status === 404 ? 'Deck unavailable' : 'Deck temporarily unavailable. Please try again.'); return;
  }
  try {
    // Outside /decks/*: this cannot recurse through the edge route.
    const shell = await fetch('https://fanofin.site/index.html', { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(6000) });
    const html = renderCommunityDeckPage((await readBytes(shell, 1_000_000)).toString(), result.deck);
    response.setHeader('X-Deck-Indexable', result.deck.visibility === 'public' ? '1' : '0');
    finish(200, html, 'text/html; charset=utf-8');
  } catch {
    finish(503, 'Deck temporarily unavailable. Please try again.');
  }
}
