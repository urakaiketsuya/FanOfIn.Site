# Fan of Insight account BFF

Vercel proxy for `https://accounts.fanofin.site/api/*`. It keeps the GitHub Pages frontend while making account cookies same-site and JavaScript-inaccessible.

Create a Vercel project with this directory as its root and configure:

- `ACCOUNT_WORKER_URL=https://fanofin-accounts-production.fanofin-match-ingestion-worker.workers.dev`
- `BFF_SHARED_SECRET=<a random secret also stored with Wrangler for the account Worker>`
- `ALLOWED_ORIGIN=https://fanofin.site`

Attach `accounts.fanofin.site` to the project. The frontend sends credentialed requests to `/api/v1/*`; this function validates the origin, attaches the private Worker credential, forwards the session cookie, and relays the response.
