# Fan of Insight account service

Authenticated saved-deck storage for the SPA. This Worker intentionally uses a separate D1 database from match telemetry.

## Local setup

1. Create development and production D1 databases and replace the placeholder IDs in `wrangler.jsonc`.
2. Create a Google Web OAuth client. Add `http://localhost:5173` and `https://fanofin.site` as authorized JavaScript origins.
3. Put the same client ID in the Worker's `GOOGLE_CLIENT_ID` variable and the app's `VITE_GOOGLE_CLIENT_ID` build variable.
4. Set `VITE_ACCOUNT_API_URL=http://localhost:8788` for local app development.
5. Apply migrations with `npx wrangler d1 migrations apply fanofin-accounts-dev --local` from this directory.
6. Run `npm run accounts:dev` and `npm run dev` in separate terminals.

Production traffic goes through the Vercel BFF in `account-bff/`, served from `accounts.fanofin.site`. The session uses a `Secure`, `HttpOnly`, `SameSite=Lax` cookie. Set the same random `BFF_SHARED_SECRET` as a Wrangler secret and as a Vercel environment variable; once configured, the Worker rejects direct account requests that bypass the BFF.

Imports read the pipeline-published archive at `ASSET_BASE_URL`. Shout At Your Decks summaries without a fetched full list are skipped. Public identifiers are import sources, not proof of profile ownership.

Production monitoring, backup/restore, privacy lifecycle, incident response, and the prerequisite for disabling `workers.dev` are documented in `docs/ACCOUNT_SERVICE_OPERATIONS.md`.
