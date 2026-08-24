# Match ingestion Worker

Receives versioned Grand Archive game telemetry from TCGEngine and stores it in D1. Queryable
game/champion fields are retained for analytics; canonical raw payload JSON is retained for 30 days
for recovery and debugging. The public analytics endpoint exposes only aggregates; deck links and
raw event data are not returned.

## Local verification

Copy `.dev.vars.example` to `.dev.vars`, choose a local-only secret, then run:

```sh
npm run typecheck
npm test
npx wrangler d1 migrations apply MATCH_DB --local
npx wrangler dev
```

The automated tests use an isolated local D1 binding and apply every migration before each test file.

## Cloudflare resources

The checked-in Wrangler configuration contains separate development and production D1 bindings.
Apply migrations before deploying:

```sh
npx wrangler d1 migrations apply MATCH_DB --remote
npx wrangler d1 migrations apply MATCH_DB --remote --env production
```

## Secrets and manual deployment

Set independent development and production ingestion credentials. Do not place either value in
`wrangler.jsonc`, source control, request JSON, or logs.

```sh
npx wrangler secret put INGESTION_API_KEY
npx wrangler secret put INGESTION_API_KEY --env production
npx wrangler deploy
npx wrangler deploy --env production
```

The production credential must be configured as `$grandArchiveStatsApiKey` in TCGEngine's
server-only `APIKeys/APIKeys.php`. Configure `$grandArchiveStatsApiUrl` with the production
`/v1/grand-archive/games` URL and `$grandArchiveStatsSourceVersion` with the deployed TCGEngine
revision.

Production deployment is intentionally manual until an explicit decision is made to let a push to
`main` apply production D1 migrations and deploy automatically.

## Routes

- `GET /health`
- `POST /v1/grand-archive/games` — bearer-authenticated ingestion
- `GET /v1/grand-archive/analytics/summary` — public aggregate data

`submissionId` (`matchId:gameNumber`) is the idempotency key. An identical retry returns `200`; a
new submission returns `201`; changed content under an existing ID returns `409`.

## Recovery and retention

D1 writes the checksum, canonical JSON, normalized game, and both player rows in one batch. The
sender receives `500` and retains the game as retryable if that batch fails. Identical retries are
idempotent; changed content under an existing submission ID is rejected. A daily scheduled trigger
clears raw payload JSON after 30 days while preserving checksums and normalized analytics rows.
