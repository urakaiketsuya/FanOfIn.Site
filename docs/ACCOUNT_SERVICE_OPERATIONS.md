# Account service operations

## Security boundary

Browser traffic goes to `https://accounts.fanofin.site/api`. The Vercel BFF forwards it to the account Worker with `BFF_SHARED_SECRET`; every non-health Worker route fails closed without that secret. Keep the Vercel and Wrangler copies synchronized and rotate both copies together.

The production Worker currently uses its `workers.dev` address as the BFF upstream. Do not set `workers_dev` to `false` until the Worker has a custom Cloudflare route and `ACCOUNT_WORKER_URL` in Vercel points to it. After that cutover, disable `workers.dev` and verify the BFF health endpoint before and after deployment.

GitHub Pages cannot set arbitrary HTTP response headers. The API/BFF sets its own CSP, HSTS, referrer, and content-type headers. To enforce CSP and related headers on the SPA itself, proxy `fanofin.site` through a header-capable CDN (for example Cloudflare) and test Google GIS plus application assets before enforcing the policy.

## Monitoring and incident response

The `Account service health` workflow checks the public BFF path hourly. Configure repository Actions failure notifications for the maintainers. Cloudflare Worker errors are structured JSON and include a request ID, route, status, error code, and CF-Ray where available; the same request ID is returned to clients and forwarded by the BFF.

For an incident:

1. Confirm `https://accounts.fanofin.site/api/health` with `Origin: https://fanofin.site`.
2. Check the Vercel function logs, then Cloudflare Worker logs using the returned request ID.
3. If gateway authentication fails, compare the presence (never the value) of `BFF_SHARED_SECRET` in both services.
4. Roll back the most recent Vercel or Worker deployment if the error began with a release.
5. Rotate the shared secret if disclosure is suspected; existing user sessions do not contain it.

Alert on sustained 5xx responses, repeated `google_sign_in_failed`, rate-limit spikes, or unexpected account-deletion volume. Retain application logs only as long as needed for operations and incident response; do not log credentials, cookies, Google tokens, request bodies, or the shared secret.

## Backups and restore drill

Before schema migrations or risky releases, export production D1 from the `account-worker` directory to an access-controlled location:

```bash
npx wrangler d1 export fanofin-accounts-production --env production --remote --output account-backup.sql
```

Encrypt backups at rest, restrict access, and choose a written retention period consistent with the privacy policy. Do not commit exports to Git. Test restore at least quarterly against a disposable D1 database:

```bash
npx wrangler d1 create fanofin-accounts-restore-test
npx wrangler d1 execute fanofin-accounts-restore-test --remote --file account-backup.sql
```

Verify user, session, deck, source, profile, and nonce row counts; sign-in and deck access should be tested with non-production credentials. Delete the disposable database and backup copy according to the retention policy after the drill.

## Privacy lifecycle

Authenticated users can download their account data from **My Decks → Export my data**. **Delete account** removes the user row; D1 foreign-key cascades remove sessions, external profiles, saved decks, and sources, and the session cookie is cleared.

Account records remain until the user deletes the account. OAuth nonces expire after ten minutes and are pruned during nonce creation. Sessions have a 30-day absolute lifetime and a seven-day idle lifetime. Define and publish the operational log and encrypted-backup retention periods before describing deletion as immediate removal from backups.

## Release checklist

- Run account Worker tests and Worker, BFF, and app typechecks.
- Apply pending D1 migrations before deploying code that requires them.
- Deploy the Worker, verify its health, then deploy the BFF and verify its public health path.
- Exercise nonce creation, a login in the Google test-user set, deck list/export, and logout.
- Review logs for new 4xx/5xx patterns without inspecting sensitive payloads.
