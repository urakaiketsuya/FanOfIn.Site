# Private TradeBinder catalog feed

The existing public API Worker additionally serves a read-only, authenticated
Grand Archive catalog. Public stats endpoints retain their existing behavior.
No R2 bucket or new service is required. Catalog bytes use the existing D1
binding, in bounded base64-encoded gzip chunks. Three recent snapshots and the
active snapshot are retained.

## Endpoints

Both require `Authorization: Bearer <TRADEBINDER_CATALOG_TOKEN>`:

- `GET /v1/catalog/meta`: schema version, content version, source timestamp,
  counts, compressed/uncompressed sizes and SHA-256 checksums.
- `GET /v1/catalog/snapshots/<version>`: immutable gzip bytes containing
  `{ "cards": [...] }`, including the official source editions and image paths.

GET/HEAD only; authentication precedes conditional requests and database access.
ETags permit an authenticated 304 response. Private responses are not publicly
cached and do not carry public CORS headers. Missing or short secrets fail closed.
A bearer token authenticates the maintenance process; it does not prove a browser
origin. Never deliver it to TradeBinder's browser application.

## Initial production activation

These code changes do not deploy or create credentials. In the existing FanOfIn
Cloudflare account, complete these steps in order:

1. From `api-worker`, apply the migration:
   `npx wrangler d1 migrations apply PUBLIC_DB --remote --env production`.
2. Generate a dedicated cryptographically random token (at least 32 characters).
   Set it using `npx wrangler secret put TRADEBINDER_CATALOG_TOKEN --env production`.
   Store the same credential in TradeBinder's maintenance secret manager as
   `FANOFIN_CATALOG_TOKEN`. Do not print it, commit it or use command-line arguments.
3. Deploy the Worker from `api-worker`: `npx wrangler deploy --env production`.
4. From the root, run `npm run pipeline:catalog:publish -- --remote --production`.
5. Verify unauthenticated requests return 401; authenticated metadata and snapshot
   checksums succeed. Set TradeBinder's `FANOFIN_CATALOG_URL` to the actual deployed
   Worker HTTPS origin and run its `catalog:fetch:grandarchive` command.
6. Enable repository Actions variable `TRADEBINDER_CATALOG_ENABLED=true` after
   the above checks. The existing public API publishing workflow will then
   publish catalog updates after refreshes, using its existing D1 credentials.

Do not overlap manual publication with scheduled publication. The workflow's
existing concurrency group serializes scheduled/manual workflow runs. To rotate
credentials, update the Worker and maintenance process together; failures retain
the consumer's previous successful checkpoint. Unset the variable to stop future
publication; removing the Worker secret disables access immediately.

## Publication guarantees and limits

`npm run pipeline:catalog:publish -- --dry-run` validates the current full
`data/card-catalog.json` without database writes. Local testing uses `--local`
after applying local migrations. Missing/duplicate identities, empty catalogs,
oversized payloads, older source timestamps and a >10% count drop block new
publication. Smaller omissions cannot be detected from counts alone: downstream
review remains required. Crawl timestamps do not affect content identity.

Chunks are staged before the active pointer changes. A partial upload leaves the
previous active version available; retrying the same content is idempotent.
Snapshot downloads verify completeness and checksum before responding. Retention
runs only after confirming activation. Old incomplete staging rows are cleaned
by a subsequent successful publication. Publishing does not crawl upstream.

Run `npm run api:typecheck`, `npm run api:test`, and
`node --import tsx --test pipeline/src/public-api/catalogSnapshot.test.ts`.
TradeBinder still requires its ID crosswalk review before any catalog changes go
live. This feed supplies metadata; it does not publish TradeBinder images.
