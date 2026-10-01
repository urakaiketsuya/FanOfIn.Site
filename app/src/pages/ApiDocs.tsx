import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import type { PublicApiMetadata, PublicArchetype, PublicCardStats } from "@gatcg/shared";
import PageLayout from "../components/layout/PageLayout";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import { useDocumentTitle } from "../lib/useDocumentTitle";

const BASE = "https://fanofin-public-api-production.fanofin-match-ingestion-worker.workers.dev";
const topics = [["quick-start", "Quick start"], ["endpoints", "Endpoints"], ["pagination", "Pagination"], ["freshness", "Freshness & caching"], ["errors", "Errors & recovery"]] as const;
const linkStyle = "text-ctp-blue underline-offset-4 hover:underline";
function Contents() {
  return <ul>{topics.map(([id, title]) => <li key={id}><a className="flex min-h-11 items-center rounded-lg px-3 text-sm text-ctp-subtext1 hover:bg-ctp-surface0 hover:text-ctp-blue" href={`#${id}`}>{title}</a></li>)}</ul>;
}
function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-48 space-y-4 border-b border-ctp-surface0 pb-8 last:border-0"><h2 id={`${id}-title`} className="text-2xl font-semibold text-ctp-text"><a href={`#${id}`} className="hover:text-ctp-blue">{title}</a></h2>{children}</section>;
}
function Detail({ title, children }: { title: string; children: ReactNode }) {
  return <details className="rounded-xl border border-ctp-surface1 bg-ctp-mantle/50"><summary className="min-h-11 cursor-pointer rounded-xl px-4 py-3 font-medium text-ctp-text hover:bg-ctp-surface0/50">{title}</summary><div className="space-y-4 border-t border-ctp-surface0 p-4">{children}</div></details>;
}
function Code({ label, code }: { label: string; code: string }) {
  const [status, setStatus] = useState("");
  return <div className="min-w-0 overflow-hidden rounded-xl border border-ctp-surface1 bg-ctp-crust"><div className="flex min-h-12 items-center justify-between gap-2 border-b border-ctp-surface0 px-4"><span className="text-xs text-ctp-subtext0">{label}</span><Button variant="ghost" className="min-h-11" aria-label={`Copy ${label}`} onClick={async () => {
    try { await navigator.clipboard.writeText(code); setStatus("Copied"); } catch { setStatus("Select the code to copy it."); }
  }}>Copy</Button></div>{status && <p role="status" className="px-4 pt-2 text-xs text-ctp-blue">{status}</p>}<pre tabIndex={0} aria-label={label} className="overflow-x-auto p-4 text-xs leading-6 text-ctp-text sm:text-sm"><code>{code}</code></pre></div>;
}
function Fields({ fields }: { fields: Record<string, string> }) {
  return <dl className="divide-y divide-ctp-surface0">{Object.entries(fields).map(([name, description]) => <div key={name} className="py-3 first:pt-0 last:pb-0"><dt className="break-words font-mono text-xs text-ctp-blue">{name}</dt><dd className="mt-1">{description}</dd></div>)}</dl>;
}
const cardFields: Record<keyof PublicCardStats, string> = {
  name: "string · Card name.", slug: "string · Card identifier; use this value for a stats lookup.",
  deckCount: "integer · Decks containing this card.", totalCopies: "integer · Copies across those decks, counting main and material sections.",
  eventCount: "integer · Distinct events represented by those decks.",
  avgWinRate: "number · Observed average deck win rate on a 0–1 scale. Multiply by 100 for a percentage.",
  adjustedWinRate: "number · Win rate on a 0–1 scale, shrunk toward 50% to reduce small-sample effects.",
  recentDeckCount: "integer · Deck count in the latest 30-day window, anchored to the most recent event date.",
  priorDeckCount: "integer · Deck count in the preceding 30-day window.",
  marketPrice: "number | null · Published market price when available; null means unavailable, not zero.",
};
const archetypeFields: Record<keyof PublicArchetype, string> = {
  signature: "string · Champion-character rollup identifier; also the list sort key.", classes: "string[] · Classes represented in the rollup.", elements: "string[] · Elements represented in the rollup.", deckCount: "integer · Decks in the rollup.", eventCount: "integer · Distinct events represented.", avgWinRate: "number · Average deck win rate on a 0–1 scale.",
};
const metaFields: Record<keyof PublicApiMetadata, string> = {
  apiVersion: 'string · Currently "v1".', datasetVersion: "string · Snapshot identifier. Compare for equality; do not interpret it as a date.",
  sources: "object · cards and archetypes are their source generation timestamps. They can differ.",
  scope: 'string · "published-omnidex-analysis". The published analysis population, not a requested format or date range.',
  decksConsidered: "integer · Decks considered by the published card analysis.", counts: "object · cards and archetypes give the number of published resources of each kind.", cardsWithoutSlug: "integer · Cards omitted because they lack a usable slug.",
};
export default function ApiDocs() {
  useDocumentTitle("API Documentation", "Build with Fan of Insight’s public card statistics and champion rollups. Quick start, endpoints, pagination, and response fields.");
  const location = useLocation();
  useEffect(() => { if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView(); }, [location.hash]);
  return <PageLayout width="wide" data-component="ApiDocs">
    <PageHeader eyebrow="Developers · API v1" title="Build with insight" description="Bring published Grand Archive card statistics and champion rollups into your own tools. Start with one request, then explore the details as you need them." />
    <details className="mb-6 rounded-xl border border-ctp-surface1 bg-ctp-mantle lg:hidden"><summary className="min-h-11 cursor-pointer px-4 py-3 font-semibold">On this page</summary><nav aria-label="API documentation sections" className="p-2"><Contents /></nav></details>
    <div className="grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
      <nav aria-label="API documentation sections" className="hidden self-start lg:sticky lg:top-48 lg:block"><p className="px-3 text-xs font-semibold uppercase tracking-widest text-ctp-subtext0">API v1</p><div className="mt-3 border-l border-ctp-surface1"><Contents /></div><a href={`${BASE}/openapi.json`} className={`mt-4 flex min-h-11 items-center px-3 text-sm ${linkStyle}`}>OpenAPI specification ↗</a></nav>
      <div className="min-w-0 space-y-8 text-sm leading-6 text-ctp-subtext1">
        <Section id="quick-start" title="Your first request">
          <p>No account or API key is required. The public API is read-only and supports browser requests with public CORS.</p>
          <Code label="Base URL" code={BASE} /><Code label="cURL · get five cards" code={`curl --fail-with-body '${BASE}/v1/cards?limit=5'`} />
          <p>You’ll receive <code>data</code> (card records), <code>meta</code> (the published snapshot), and <code>nextCursor</code> (the next page, or null).</p>
          <Detail title="Use JavaScript instead"><Code label="JavaScript · first page" code={`const base = '${BASE}';
const response = await fetch(base + '/v1/cards?limit=5');
if (!response.ok) throw new Error('API returned ' + response.status);
const { data, meta, nextCursor } = await response.json();
console.log(data, meta.sources.cards, nextCursor);`} /></Detail>
          <div className="rounded-xl border border-forest-surface bg-forest-surface/30 p-4"><p className="font-semibold text-ctp-text">Understand the sample</p><p className="mt-1">Statistics reflect published Omnidex analysis. Main and material cards contribute; sideboards are excluded. Archetypes are coarse champion-character rollups. Date, format, category, deck, and matchup queries are not available in v1.</p><Link to="/methodology" className={`inline-flex min-h-11 items-center ${linkStyle}`}>How the numbers work →</Link></div>
        </Section>
        <Section id="endpoints" title="Explore the endpoints">
          <p>All routes accept GET and HEAD; OPTIONS supports CORS preflight. Data routes return JSON. Expand an endpoint for its response and fields.</p>
          <Detail title="GET /v1/cards – List card statistics"><p>Ordered by slug. Optional <code>limit</code>: integer 1–100, default 50. Optional <code>cursor</code>: the preceding page’s nextCursor. Returns <code>{'{ data: CardStats[], meta: Metadata, nextCursor: string | null }'}</code>.</p><Fields fields={cardFields} /></Detail>
          <Detail title="GET /v1/cards/{slug}/stats – Look up a card"><p>Use a slug from the cards list and URL-encode it. No query parameters. Returns <code>{'{ data: CardStats, meta: Metadata }'}</code>, using the card fields above. A missing card returns 404.</p><Code label="JavaScript · card lookup" code={`// Use a card from the quick-start response.
const url = base + '/v1/cards/' + encodeURIComponent(data[0].slug) + '/stats';
const result = await fetch(url);
if (!result.ok) throw new Error('API returned ' + result.status);
const card = await result.json();`} /></Detail>
          <Detail title="GET /v1/archetypes – List champion rollups"><p>Ordered by signature. Accepts the same limit and cursor parameters as cards. Returns <code>{'{ data: Archetype[], meta: Metadata, nextCursor: string | null }'}</code>. These are not the site’s taxonomy clusters or named-Spirit rollups.</p><Fields fields={archetypeFields} /></Detail>
          <Detail title="GET /v1/meta – Inspect the published snapshot"><p>No query parameters. Returns <code>{'{ data: Metadata }'}</code>. The same Metadata object appears under <code>meta</code> in card and archetype responses.</p><Fields fields={metaFields} /></Detail>
          <Detail title="Service health & OpenAPI"><p><a className={linkStyle} href={`${BASE}/health`}>GET /health</a> returns <code>{'{ "service": "fanofin-public-api", "status": "ok" }'}</code>. It checks Worker liveness, not dataset availability; use /v1/meta to check published data.</p><p><a className={linkStyle} href={`${BASE}/openapi.json`}>GET /openapi.json</a> provides the machine-readable OpenAPI 3.0 specification.</p></Detail>
        </Section>
        <Section id="pagination" title="Read the next page">
          <p>Pass <code>nextCursor</code> back as <code>cursor</code> until it is null. Treat it as opaque: don’t decode, edit, or reuse it on a different endpoint. Encode it with URLSearchParams.</p>
          <Code label="JavaScript · next page" code={`// Continue from the quick-start response.
if (nextCursor !== null) {
  const query = new URLSearchParams({ limit: '5', cursor: nextCursor });
  const next = await fetch(base + '/v1/cards?' + query);
  if (next.status === 409) {
    throw new Error('Dataset changed. Discard all pages and start again.');
  }
  if (!next.ok) throw new Error('API returned ' + next.status);
  const page = await next.json();
  console.log(page.data, page.nextCursor);
}`} />
          <p>A cursor belongs to one snapshot. On <strong className="text-ctp-text">409 dataset_changed</strong>, discard accumulated results and restart without a cursor. Allow a delay before restarting: an older cached first page may remain available for up to 60 seconds.</p>
        </Section>
        <Section id="freshness" title="Freshness & caching"><p>Publication follows successful daily analysis. Check <code>meta.sources</code> for each source’s actual generation time; a scheduled run does not guarantee new data. Use <code>datasetVersion</code> to identify a consistent snapshot.</p>
          <Detail title="Cache responses and use ETags"><p>Successful data responses have <code>Cache-Control: public, max-age=60</code> and an <code>ETag</code>. Store the body with its ETag for that URL. Send the tag in <code>If-None-Match</code> when revalidating. A 304 has no body: reuse your stored response instead of calling response.json().</p><p>Browser clients can read ETag and Retry-After through CORS. Errors are not cached. Cached pages can reflect the previous snapshot for up to 60 seconds.</p></Detail>
          <Detail title="Availability and considerate usage"><p>This service runs on Workers Free with shared account quotas. Availability is not guaranteed; quota exhaustion can interrupt requests. Cache results, avoid rapid polling, and use bounded retries with backoff. Platform-level failures may not use the API’s JSON error shape.</p></Detail>
        </Section>
        <Section id="errors" title="Recover from errors"><p>API errors use <code>{'{ error: { code, message } }'}</code>. Check HTTP status before parsing a success response.</p><Fields fields={{
          '400 · invalid_query': 'Fix malformed cursors, limits outside 1–100, or unsupported/repeated query parameters. Only list endpoints accept limit and cursor.',
          '404 · not_found': 'Check the endpoint path or obtain a current card slug from /v1/cards.',
          '405 · method_not_allowed': 'Use GET, HEAD, or OPTIONS. There are no public write operations.',
          '409 · dataset_changed': 'Discard accumulated pages and restart pagination without a cursor.',
          '503 · not_ready / unavailable': 'The snapshot is unpublished or the service is temporarily unavailable. Honor Retry-After: 60 and use bounded retries.',
        }} /></Section>
      </div>
    </div>
  </PageLayout>;
}
