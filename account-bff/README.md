# Fan of Insight account BFF

Vercel proxy for `https://accounts.fanofin.site/api/*`. It keeps the GitHub Pages frontend while making account cookies same-site and JavaScript-inaccessible.

Create a Vercel project with this directory as its root and configure:

- `ACCOUNT_WORKER_URL=https://fanofin-accounts-production.fanofin-match-ingestion-worker.workers.dev`
- `BFF_SHARED_SECRET=<a random secret also stored with Wrangler for the account Worker>`
- `ALLOWED_ORIGIN=https://fanofin.site`

Attach `accounts.fanofin.site` to the project. The frontend sends credentialed requests to `/api/v1/*`; this function validates the origin, attaches the private Worker credential, forwards the session cookie, and relays the response.

## Deck social previews

`/share/decks/:publicSlug` serves crawler-readable Open Graph and large-image card metadata, plus a small accessible landing page linking to the published deck. `/share/decks/:publicSlug/image.png` renders a 1200×630 champion spotlight PNG with the title, author, and site branding. The description stays in the link metadata and landing page. Champion name, format, and version are not separate labels on the image.

The app's **Copy link** actions use `https://accounts.fanofin.site/share/decks/:publicSlug`. Ordinary GitHub Pages `/decks/:id` URLs still have the generic site preview; this does not change hosting or existing deck URLs. No login is needed to copy a published deck link.

Both share endpoints fetch the existing public-deck API with a signed server request, never forward visitor cookies, and respect its published snapshot, unlisted visibility, moderation, and withdrawal rules. Every request, including old image URLs, rechecks publication. Responses use `no-store`; platforms can still retain their own copies of a previously fetched preview. Image URLs include a content revision so updated publications have a new image reference when a platform refreshes the page. No draft fields or user-authored image URLs are accepted.

Champion images come from the official card API, selecting the highest-level champion actually present in the published material deck and respecting its chosen printing. Missing/unavailable artwork produces a branded title-and-author image. Network reads have time/size limits; rendering bundles the OFL-licensed Inter font in `assets/`.

Deploy this Vercel project **before the frontend**, including the share rewrites, Sharp dependency, and font assets. No Worker deployment or database migration is needed. Existing `ACCOUNT_WORKER_URL`, `BFF_SHARED_SECRET`, and `ALLOWED_ORIGIN` settings are reused. `SHARE_ORIGIN` optionally overrides the share host (default `https://accounts.fanofin.site`); match it with frontend `VITE_DECK_SHARE_ORIGIN` for a nonproduction preview environment.

Verify both a published and an unlisted deck using an unauthenticated GET: the HTML must contain deck-specific `og:title`, `og:description`, `og:image`, and `twitter:card`; the image must return `image/png` at 1200×630. Make a test deck private and confirm both URLs return 404. Check a real social-platform unfurl after deployment. Run local regression coverage with `node --import tsx --test account-bff/test/*.test.ts` from the repository root.

Local verification for this implementation: six BFF tests and BFF/app typechecks pass; app lint has seven existing Fast Refresh warnings. Browser fixtures passed at 360px and 1280px for preview layout, long titles, empty descriptions, keyboard focus, 48px actions, public-deck copying, clipboard denial/retry, and unavailable decks. Real official champion lookup and PNG generation were exercised. UI fixtures mock account responses; production Vercel routing and real social-platform unfurls still require deployment verification.
