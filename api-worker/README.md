# Fan of Insight public API

Read-only D1-backed REST API for the pipeline's published Omnidex aggregates. It uses a dedicated
D1 database and requires no R2, account cookies, or ingestion credentials. This is the first release:
card statistics and coarse champion archetype summaries. Events, decklists, matchup queries, and
arbitrary date/format/category filters are not yet exposed.

## Production endpoint

Deployed at https://fanofin-public-api-production.fanofin-match-ingestion-worker.workers.dev
with the dedicated `fanofin-public-api-prod` D1 database. The Workers Free plan was confirmed by
the account owner at deployment. No custom domain is configured.

The daily data-refresh workflow publishes current main to D1 after its pipeline and data commit
succeed. Publication runs in a separate serialized job so a publishing failure does not discard
the refreshed files. Retry publication with the **Publish public API data** workflow (manual dispatch),
or run `npm run pipeline:api:publish -- --remote --production` from the repository root.

CI requires the repository Actions secrets `CLOUDFLARE_PUBLIC_API_TOKEN` (a dedicated Cloudflare
API token with D1 edit access on the production account) and `CLOUDFLARE_ACCOUNT_ID`.
Do not use the backup credential or a local Wrangler OAuth token for CI. Missing credentials fail
the publication job explicitly. Worker deployment and schema migrations remain separate operations.

## Local setup

From the repository root:

```sh
npm install
npm run migrate:local --workspace=@fanofin/public-api
npm run pipeline:api:publish -- --local
npm run api:dev
```

The API listens on `http://localhost:8789`. Publishing defaults to local; `--dry-run` validates and
prints the snapshot metadata without writing to D1. Run publication after a successful analysis run;
it is deliberately a separate pipeline command so existing crawls cannot implicitly perform remote writes.

## Routes and contract

| Route | Result |
| --- | --- |
| `GET /health` | Worker liveness (does not query D1) |
| `GET /openapi.json` | OpenAPI 3.0 specification |
| `GET /v1/meta` | `{ data: metadata }` |
| `GET /v1/cards?limit=50&cursor=…` | Paginated card statistics, ordered by slug |
| `GET /v1/cards/{slug}/stats` | Single card statistics |
| `GET /v1/archetypes?limit=50&cursor=…` | Paginated champion rollups, ordered by signature |

Lists return `{ data, meta, nextCursor }`; a card lookup returns `{ data, meta }`. `meta` includes
`datasetVersion`, each source's actual generation timestamp, resource counts, and `decksConsidered`.
The two sources may have different timestamps. An API snapshot is a consistent publication of those
sources, not a claim that they were generated simultaneously. Public types live in
`shared/src/public-api-types.ts` and are explicitly projected from pipeline records.

Use a page size from 1 through 100. Cursors are opaque and scoped to an endpoint and dataset version.
On `409 dataset_changed`, discard accumulated pages and restart. Unknown/repeated query parameters
return 400. No count queries, OFFSET pagination, or unbounded query expressions run on the request path.

`archetypes` means the older champion-character rollups, not taxonomy clusters or named-Spirit
rollups. The API preserves the pipeline's statistics without re-deriving them. Main and material
cards contribute to card stats; sideboards are excluded. Cards without a usable slug are omitted and
counted in `cardsWithoutSlug`. See `docs/CALCULATIONS.md` for statistical definitions. The API does
not claim a format-specific scope when the source doesn't supply it.

All data routes support GET, HEAD, OPTIONS, public CORS, and conditional requests with `If-None-Match`.
Successful responses are cached for 60 seconds in browsers and the Worker Cache API. Cached old pages
can remain available for that interval; their version always identifies their snapshot. Errors are
not cached. Missing resources return 404; an unpublished or unavailable database returns 503 with
`Retry-After: 60`. No SQL details or underlying error messages are exposed.

Example client:

```js
const base = 'http://localhost:8789';
const response = await fetch(`${base}/v1/cards/backup-charger/stats`);
if (!response.ok) throw new Error(`API returned ${response.status}`);
const { data, meta } = await response.json();
console.log(data.deckCount, meta.sources.cards);

// URLSearchParams correctly escapes opaque cursor characters.
const first = await (await fetch(`${base}/v1/cards?limit=20`)).json();
if (first.nextCursor) {
  const query = new URLSearchParams({ limit: '20', cursor: first.nextCursor });
  const next = await fetch(`${base}/v1/cards?${query}`);
  if (next.status === 409) throw new Error('Dataset changed; restart pagination');
}
```

## Publication and write usage

The publisher validates inputs, projects public fields, hashes individual payloads, and inserts only
missing payloads. Each snapshot has an indexed membership table. Publication stages all records
before changing a single active pointer; an interrupted upload leaves the previous snapshot active.
The activation query verifies completeness. Metadata and request rows are read together in a D1 batch.
A successful publisher verifies activation and removes inactive snapshots and unreferenced payloads.
Retries of the same snapshot are idempotent.

Snapshot membership rows are recreated for a new version, even when some payloads are unchanged.
With roughly 2,300 resources, budget for several thousand row writes plus index maintenance and
cleanup per publication. This is not a zero-write update mechanism. Do not publish on every API request.
The current corpus projects to small responses rather than storing the multi-megabyte source JSON as
single database rows. The publisher enforces a 32 KB resource ceiling.

**Serialize publishers per database** (for CI, use a concurrency group with `cancel-in-progress: false`).
Concurrent publication/cleanup is unsupported. If a publication is interrupted, rerun it; cleanup
runs only after activation is confirmed. Do not run migrations or publication against account/telemetry DBs.

## Budget and production setup

Workers Free imposes account-wide quotas: 100,000 Worker requests/day, 5 million D1 rows read/day,
100,000 rows written/day, and 5 GB total D1 storage (500 MB per database). Exhaustion means temporary
unavailability. A separate database does not isolate these quotas from account/telemetry services.
Workers Paid meters overages; this code cannot impose a Cloudflare billing cap. Rate limiting and
caching are not hard billing caps. Verify the account's Workers plan before enabling public traffic.
See https://developers.cloudflare.com/d1/platform/pricing/ and
https://developers.cloudflare.com/d1/platform/limits/ for current allowances.

No resources or domain routes are provisioned automatically. When ready:

1. Create dedicated development/production D1 databases and replace the corresponding placeholder
   IDs in `wrangler.jsonc`. The publisher rejects remote targets that still use a placeholder.
2. From `api-worker/`, apply migrations using
   `npx wrangler d1 migrations apply PUBLIC_DB --remote --env production`.
3. From the root, publish using `npm run pipeline:api:publish -- --remote --production`.
4. From `api-worker/`, deploy using `npx wrangler deploy --env production`, then attach the desired
   API hostname using Cloudflare. Development remote commands omit `--env production` / `--production`.

Publication uses Wrangler's Cloudflare credentials and never exposes a writable API route. Use a
scoped CI credential with access to this database only. Track D1 rows read/written and storage in the
Cloudflare dashboard; budget alerts are not spending cutoffs.

## Verification

```sh
npm run api:typecheck
npm run api:test
node --import tsx --test pipeline/src/public-api/snapshot.test.ts
npm run pipeline:api:publish -- --dry-run
```

Worker tests run against isolated local D1 with migrations, verify pagination/ETags/CORS/errors, and
check that pagination uses the composite primary key. Publisher tests cover interrupted publication,
retry idempotency, payload reuse, cleanup, and the public projection. No remote services are needed.
