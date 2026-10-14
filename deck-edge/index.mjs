/** Only community deck documents use live rendering. All other paths retain their origin. */
export async function routeDeckRequest(request, fetcher = fetch) {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/decks\/([a-f0-9]{32})\/?$/);
  if (!match) return fetcher(request);
  const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', 'X-Content-Type-Options': 'nosniff' };
  if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405, headers: { ...headers, Allow: 'GET, HEAD' } });
  if (url.pathname.endsWith('/')) {
    return new Response(null, { status: 308, headers: { ...headers, Location: `/decks/${match[1]}${url.search}` } });
  }
  try {
    // Fixed destination and no forwarded headers: cookies and caller-supplied targets never reach the service.
    const upstream = await fetcher(`https://accounts.fanofin.site/render/decks/${match[1]}`, {
      method: request.method, redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(15000),
      headers: { Accept: 'text/html' },
    });
    if (![200, 404].includes(upstream.status)) console.warn('Deck page upstream status', upstream.status);
    if (![200, 404].includes(upstream.status)) return new Response(request.method === 'HEAD' ? null : 'Deck temporarily unavailable. Please try again.', { status: 503, headers });
    const outgoing = new Headers(headers);
    outgoing.set('Content-Type', upstream.headers.get('Content-Type') ?? 'text/plain; charset=utf-8');
    if (url.hostname === 'fanofin.site' && upstream.status === 200 && upstream.headers.get('X-Deck-Indexable') === '1') outgoing.delete('X-Robots-Tag');
    return new Response(request.method === 'HEAD' ? null : upstream.body, { status: upstream.status, headers: outgoing });
  } catch (error) {
    console.warn('Deck page request failed', error instanceof Error ? error.message : 'Unknown error');
    return new Response(request.method === 'HEAD' ? null : 'Deck temporarily unavailable. Please try again.', { status: 503, headers });
  }
}
export default { fetch: request => routeDeckRequest(request) };
