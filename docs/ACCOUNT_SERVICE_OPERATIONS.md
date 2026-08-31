# Account service operations

## Security boundary

Browser traffic goes to `https://accounts.fanofin.site/api`. The Vercel BFF signs every upstream request with `BFF_SHARED_SECRET`; the HMAC covers the method, path and query, body hash, timestamp, and random request ID. Every non-health Worker route fails closed when the secret, signature, or one-minute freshness window is invalid. Keep the Vercel and Wrangler copies synchronized and rotate both copies together.

The production Worker currently uses its `workers.dev` address as the BFF upstream. Do not set `workers_dev` to `false` until the Worker has a custom Cloudflare route and `ACCOUNT_WORKER_URL` in Vercel points to it. After that cutover, disable `workers.dev` and verify the BFF health endpoint before and after deployment.

GitHub Pages cannot set arbitrary HTTP response headers. The API/BFF sets its own CSP, HSTS, referrer, and content-type headers. To enforce CSP and related headers on the SPA itself, proxy `fanofin.site` through a header-capable CDN (for example Cloudflare) and test Google GIS plus application assets before enforcing the policy.

## Monitoring and incident response

The `Account service health` workflow checks the public BFF path hourly. Configure repository Actions failure notifications for the maintainers. Cloudflare Worker errors are structured JSON and include a request ID, route, status, error code, and CF-Ray where available; the same request ID is returned to clients and forwarded by the BFF.

For an incident:

1. Confirm `https://accounts.fanofin.site/api/health` with `Origin: https://fanofin.site`. A healthy response is HTTP 200 with `success: true` and `schema.ready: true`; HTTP 503 means the Worker can run but its D1 schema is not ready for that release.
2. Check the Vercel function logs, then Cloudflare Worker logs using the returned request ID.
3. If gateway authentication fails, compare the presence (never the value) of `BFF_SHARED_SECRET` in both services.
4. Roll back the most recent Vercel or Worker deployment if the error began with a release.
5. Rotate the shared secret if disclosure is suspected; existing user sessions do not contain it.

Alert on sustained 5xx responses, repeated `google_sign_in_failed`, rate-limit spikes, or unexpected account-deletion volume. Retain application logs only as long as needed for operations and incident response; do not log credentials, cookies, Google tokens, request bodies, or the shared secret.

## Backups and restore drill

Cloudflare D1 Time Travel is the first recovery layer. It is automatic; Workers Free retains seven days and Workers Paid retains 30 days. Before every production migration, capture a bookmark by manually running the `Account D1 backup` workflow with the migration identifier as its reason. The workflow records the bookmark alongside an encrypted export, so the release has both a short-term point-in-time recovery target and a durable recovery copy.

The same workflow runs at 06:23 UTC every Sunday. It exports production D1, packages the SQL export with its Time Travel response and a manifest, encrypts the package with GnuPG AES-256, and uploads the encrypted file plus its SHA-256 checksum as a release in a separate private GitHub repository. Releases older than 90 days are deleted. Backup files are release assets rather than Git commits so retention does not require rewriting repository history.

Create a private repository dedicated to backups, initialize it with a README so it has a default branch, and configure these Actions secrets on this application repository:

- `CLOUDFLARE_D1_BACKUP_API_TOKEN`: narrowly scoped token that can read/export D1 and create/delete disposable D1 databases for drills.
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare account containing production D1.
- `ACCOUNT_BACKUP_REPOSITORY`: private repository in `owner/repository` form.
- `ACCOUNT_BACKUP_REPOSITORY_TOKEN`: fine-grained GitHub token limited to read/write repository Contents access for that repository (GitHub releases use this permission).
- `ACCOUNT_BACKUP_PASSPHRASE`: high-entropy backup encryption secret stored separately in the recovery runbook or password manager as well as GitHub Actions.

Do not use the application repository as the backup repository. Do not commit SQL exports, encrypted exports, checksums, credentials, or passphrases. Repository privacy is an additional access control, not a substitute for encryption. Anyone with the backup passphrase and release access can recover user account data.

For an exceptional local recovery point, export production D1 from the `account-worker` directory to a temporary, access-controlled location and encrypt it immediately:

```bash
npx wrangler d1 export fanofin-accounts-production --env production --remote --output account-backup.sql
```

The `Account D1 restore drill` workflow runs quarterly and can also be dispatched for a selected release tag. It downloads and verifies an encrypted release, restores it into a uniquely named disposable D1 database, checks the expected application tables and required parent relationships, and deletes the disposable database even when verification fails. GitHub Actions failure notifications must be enabled for maintainers. D1 does not authorize `PRAGMA integrity_check`, so successful import, queryability, schema presence, relationship checks, and the encrypted asset checksum form the automated verification set.

For a manual restore drill:

```bash
npx wrangler d1 create fanofin-accounts-restore-test
npx wrangler d1 execute fanofin-accounts-restore-test --remote --file account-backup.sql
```

Verify user, session, deck, source, profile, and nonce row counts; sign-in and deck access should be tested with non-production credentials. Delete the disposable database and decrypted backup copy according to the retention policy after the drill. Never restore Time Travel or a SQL export over production until the selected recovery point has been verified and the resulting loss window has been approved.

## Privacy lifecycle

Authenticated users can download their account data from **My Decks → Export my data**. **Delete account** removes the user row; D1 foreign-key cascades remove sessions, external profiles, saved decks, and sources, and the session cookie is cleared.

Account records remain until the user deletes the account. OAuth nonces expire after ten minutes and are pruned during nonce creation. Sessions have a 30-day absolute lifetime and a seven-day idle lifetime. Define and publish the operational log and encrypted-backup retention periods before describing deletion as immediate removal from backups.

## Release checklist

### Preflight

1. Start from a clean checkout and run the account Worker tests and Worker, BFF, and app typechecks.
2. Apply every migration to a fresh local D1 database and confirm `npx wrangler d1 migrations list fanofin-accounts-dev --local` has no pending migration.
3. Run the `Account D1 backup` workflow with the release or migration identifier and confirm its private backup release succeeded. Record its Time Travel bookmark from the encrypted manifest only when recovery is needed.
4. Record the current Cloudflare Worker and Vercel deployment IDs so each code deployment can be restored independently.

### Production rollout

Run all Wrangler commands from `account-worker/` and always include `--env production`; the default binding is development-only.

1. Preview migration state with `npx wrangler d1 migrations list fanofin-accounts-production --env production --remote`.
2. Apply migrations with `npx wrangler d1 migrations apply fanofin-accounts-production --env production --remote`.
3. Verify the existing deployment still serves HTTP 200 from the public BFF health URL.
4. Deploy the Worker with `npx wrangler deploy --env production` and verify health again. Confirm `schema.requiredVersion` matches the latest migration and `schema.ready` is true.
5. Deploy the Vercel BFF and SPA only when those layers changed, verifying the public health URL after each deployment.
6. Exercise nonce creation, login with a Google test user, username editing, private deck creation, publishing, discovery, like, bookmark, copy, report, export, logout, and owner deletion of a disposable deck.
7. Review request-ID-correlated logs and 4xx/5xx rates after 15 minutes and again after 24 hours. Do not inspect credentials, cookies, tokens, request bodies, or shared secrets.

### Rollback and forward repair

- Roll back the Worker or Vercel deployment using the recorded deployment ID when application code is unhealthy.
- D1 migrations are forward-only in this release. Do not manually remove columns or tables from production. Older code tolerates the additive schema, so roll back code first, then ship a reviewed corrective migration if the schema itself is faulty.
- If a migration partially applies, stop writes by rolling back to compatible code, export the database, inspect `d1_migrations`, and test a corrective migration against a restored copy before applying it remotely.
- Restore the full backup only for destructive corruption or data loss; rehearse the restore against a disposable database first and document the recovery point.

### Moderation operations

Reports intentionally have no public administrator API. Authorized operators should use the Cloudflare D1 console or `wrangler d1 execute ... --env production --remote --command` with parameterized values prepared in a reviewed SQL file when practical.

Review open reports without selecting reporter email or deck contents:

```sql
SELECT dr.id, dr.deck_id, dr.reason, dr.details, dr.created_at,
       ud.public_slug, ud.title, ud.moderation_status
FROM deck_reports AS dr
JOIN user_decks AS ud ON ud.id = dr.deck_id
WHERE dr.status = 'open'
ORDER BY dr.created_at ASC
LIMIT 100;
```

Hide a reported deck and resolve all of its open reports in one D1 transaction:

```sql
BEGIN;
UPDATE user_decks
SET moderation_status = 'hidden', updated_at = CURRENT_TIMESTAMP
WHERE id = 'REVIEWED_DECK_ID';
UPDATE deck_reports
SET status = 'reviewed', updated_at = CURRENT_TIMESTAMP
WHERE deck_id = 'REVIEWED_DECK_ID' AND status = 'open';
COMMIT;
```

To dismiss reports without hiding the deck, update those reports to `dismissed` and set `updated_at`. To restore a deck after appeal, set `moderation_status = 'active'`. Record the reason and operator in the private incident log because the current schema stores status and time, not a complete moderator audit trail.
