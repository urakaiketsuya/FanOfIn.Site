# Account database interactions

## Deck save contract

Decklist PATCH and version POST accept `expectedRevision`, `requestId`, and an optional `maybeboard` alongside the existing content fields. The editor sends both content fields in one request. Restore POST accepts the same revision/request ID pair.

The server normalizes the command and hashes its meaning. A request ID is scoped to its owner: a matching receipt returns the original result, and reuse with different content returns 409. Keep the same ID and payload after a timeout; use a new ID when changing the intended operation. The editor retains its pending ID through failed responses and failed refreshes while mounted. Receipts remain until the deck/account is deleted.

The receipt's insertion trigger validates ownership and revision inside the D1 batch. A mismatch aborts the batch; it cannot leave canonical builds, versions, maybeboard changes, or receipts behind. An update that matches zero rows alone would not provide this guarantee. Every user_decks update advances the revision, including metadata and publication changes. Legacy callers can omit the revision and request ID; they get transaction-time conflict protection, but cannot identify stale editor state or replay a lost response safely. Updated clients must send both.

A conflict preserves the local editor draft. Reload the current saved deck and reconcile the draft before submitting a new command. New-version saves still reject an unchanged decklist; ordinary saves update the current version without adding history. Deck identity remains main plus material; sideboards are retained in the canonical build.

Deck, source, and version limits are enforced by migration triggers. Preflight checks only provide early feedback. Existing-identity/source upserts remain legal at the limit.

## Reads

The app opts into `GET /v1/me/decks/:id?history=summary`. One batch reads the header, sources, and first 20 history entries from a consistent database snapshot. Only current and immediately previous snapshots include full decklists. `versionCount` is the total; `nextVersionBefore` is a keyset cursor.

`GET /v1/me/decks/:id/versions?before=N` returns up to 20 summaries and `nextBefore`. `GET /v1/me/decks/:id/versions/:versionId` loads one complete snapshot. Each query checks ownership. Older clients without the summary parameter continue receiving complete history. The library reads the current canonical decklist rather than reconstructing a potentially stale sideboard from import sources. Folder writes fetch only their target folder, and readiness uses one schema-probe batch.

## Verification and performance

Run `npm test` and `npm run typecheck` in account-worker, and the app tests, typecheck and lint after API changes. `npm run test:d1` applies all migrations to a temporary local database and checks the actual D1 runtime's rollback, retry and conflict behavior. The ordinary SQLite fixture provides an interleaving hook for quota and stale-read races. Local tests do not establish production latency or distributed load behavior.

Structured `database_batch` and `database_query` logs record a fixed operation name, elapsed milliseconds, statement count (batches), and D1 rows read/written. They exclude IDs, SQL bindings, search strings and user content. Batch timing covers that batch, not preceding validation reads or the complete HTTP request. Aggregate p50/p95, row counts and failures by operation in Worker logs; discovery has a separate query metric. Compare representative populated query plans using `EXPLAIN QUERY PLAN` before adding indexes. No production performance claim or speculative index change is included here.

## Deployment

Back up D1 using the account-service operations runbook, apply migration **0029**, deploy the Worker, verify `/health` reports schema 0029 ready, then deploy the app. The migration is additive; do not remove it when reverting Worker code. The new Worker depends on its revision column, receipt table and triggers. Production deployment is a separate operation from local verification.
