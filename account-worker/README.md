# Fan of Insight account service

Authenticated saved-deck storage for the SPA. This Worker intentionally uses a separate D1 database from match telemetry.

## Local setup

### Fast UI testing (no Google OAuth required)

1. Apply the local database migrations from `account-worker/`:
   `npx wrangler d1 migrations apply fanofin-accounts-dev --local`
2. Run `npm run accounts:dev` from the repository root.
3. In a second terminal, run `npm run dev`.
4. Open `http://localhost:5173/decks/edit` and choose **Use local test account**.
5. Use **Add deck → Paste a decklist** to create disposable local data.

The development sign-in endpoint only responds when both the Worker URL and browser origin are the
configured localhost addresses. It is unavailable through production or preview deployments.

### Google sign-in setup

1. Create development and production D1 databases and replace the placeholder IDs in `wrangler.jsonc`.
2. Create a Google Web OAuth client. Add `http://localhost:5173` and `https://fanofin.site` as authorized JavaScript origins.
3. Put the same client ID in the Worker's `GOOGLE_CLIENT_ID` variable and the app's `VITE_GOOGLE_CLIENT_ID` build variable.
4. Set `VITE_ACCOUNT_API_URL=http://localhost:8788` for local app development.
5. Apply migrations with `npx wrangler d1 migrations apply fanofin-accounts-dev --local` from this directory.
6. Run `npm run accounts:dev` and `npm run dev` in separate terminals.

Production traffic goes through the Vercel BFF in `account-bff/`, served from `accounts.fanofin.site`. The session uses a `Secure`, `HttpOnly`, `SameSite=Lax` cookie. Set the same random `BFF_SHARED_SECRET` as a Wrangler secret and as a Vercel environment variable; once configured, the Worker rejects direct account requests that bypass the BFF.

### Discord sign-in setup

1. Create a Discord application and OAuth2 redirect for `http://localhost:8788/v1/auth/discord/callback` locally and `https://accounts.fanofin.site/api/v1/auth/discord/callback` in production.
2. Replace `DISCORD_CLIENT_ID` in `wrangler.jsonc` and set the matching `DISCORD_REDIRECT_URI` for each environment.
3. Store the client secret with `npx wrangler secret put DISCORD_CLIENT_SECRET` (add `--env production` for production). Never put it in `wrangler.jsonc`.
4. Apply migration `0013_auth_identities.sql`. It moves existing Google subjects into the provider-neutral `auth_identities` table without changing user IDs, decks, collections, or sessions.

Discord sign-in requests only the `identify` and `email` scopes and requires Discord to report a verified email. The Account page lets signed-in users link or remove providers, but the final sign-in method cannot be removed.

### Email and password setup

Password credentials live in D1 and use PBKDF2-HMAC-SHA-256 with unique salts and 600,000 iterations. Apply migration `0014_password_auth.sql` before deploying the Worker. Passwords must be 15–128 characters and are checked against the Pwned Passwords range API without sending the password or full hash.

1. Add and verify a dedicated sending subdomain in Resend, then set `EMAIL_FROM` in `wrangler.jsonc` to an address on that domain.
2. Store `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, and `TURNSTILE_SECRET_KEY` with `npx wrangler secret put NAME --env production`.
3. Create a Turnstile widget for `fanofin.site` and set the public site key as the GitHub Actions variable `VITE_TURNSTILE_SITE_KEY`.
4. Register a Resend webhook at the account Worker's deployment URL plus `/v1/webhooks/resend` for `email.bounced`, `email.complained`, and `email.suppressed`, and use its signing secret as `RESEND_WEBHOOK_SECRET`. This endpoint deliberately bypasses the browser BFF and accepts only fresh, correctly signed Resend payloads so the raw body is preserved for verification.
5. For local development, add `RESEND_API_KEY` and `EMAIL_FROM` to `account-worker/.dev.vars`. Turnstile is bypassed only for the exact localhost configuration; set `VITE_ACCOUNT_API_URL=http://localhost:8788` in `app/.env.local`.

Verification and reset tokens are random, stored only as hashes, single-use, and delivered in URL fragments so they are not included in HTTP access logs or referrer headers. Password reset invalidates all sessions and does not automatically sign the user in. Matching OAuth and password emails never merge accounts automatically.

Imports read the pipeline-published archive at `ASSET_BASE_URL`. Shout At Your Decks summaries without a fetched full list are skipped. Public identifiers are import sources, not proof of profile ownership.

Production monitoring, backup/restore, privacy lifecycle, incident response, and the prerequisite for disabling `workers.dev` are documented in `docs/ACCOUNT_SERVICE_OPERATIONS.md`.
