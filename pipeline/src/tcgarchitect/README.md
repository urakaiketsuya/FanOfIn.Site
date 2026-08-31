# TCGArchitect

A third community deck source (alongside Omnidex, ShoutAtYourDecks, and Sleeved) —
tcgarchitect.com/grand-archive/discover is another community-run Grand Archive deck builder
(~594 public decks at time of writing). Standalone dataset (`data/tcgarchitect/`) for now — not
wired into the ShoutAtYourDecks/Sleeved `community/blend.ts` yet, same "deliberate future step"
scoping ShoutAtYourDecks' own README describes, though `shared/src/tcgarchitect-types.ts` is kept
structurally identical to make that easy later.

## Site structure, and why this crawls through a real browser

tcgarchitect.com is a Next.js app. Two things worth knowing before touching this module:

- **The `/grand-archive/discover` listing has zero server-rendered data.** Confirmed by diffing a
  plain HTTP GET against a live-rendered page: the GET returns a static ~7KB shell with no decks at
  all. Every deck on the page is fetched client-side, after hydration, from a separate API host
  (`api.tcgarchitect.com`).
- **That API requires a static `X-API-Key` header** baked into the frontend's JS bundle, gating
  every request including this "public" listing (`curl`ing it without the header returns
  `401 Unauthorized`). tcgarchitect.com's own `robots.txt` explicitly `Disallow: /api/` while
  explicitly `Allow`ing `/discover`, `/decks/*`, and `/users/*/decks` — read together, that's "crawl
  our pages, don't automate our API directly." So `client.ts` drives a real headless Chromium
  through the *Allowed* `/grand-archive/discover` page and reads the same JSON response the site's
  own client-side code receives while rendering it — the browser makes that request as a normal
  consequence of loading an Allowed page, not because this pipeline calls the disallowed path
  itself or reuses the extracted key directly.

The upside: unlike ShoutAtYourDecks (which needed three phases — harvest, cheap-HTTP metadata,
then a browser-driven decklist fetch per kept deck), **one intercepted listing-page response
already contains every deck's complete decklist** — every card, its quantity, and its zone
(`pivot.deck_type`: `main`/`material`/`sideboard`/`boons`/`maybeboard`). There's no separate
metadata-then-decklist split, and no per-deck browser round-trip. `min_cards` in the response's
own pagination `meta` (default 60) suggests the site *tries* to only surface complete decks, but
it's not strictly enforced (real listing pages have contained sub-60-card decks) — `filter.ts`
still applies the usual `mainCount >= 60` floor explicitly.

## Running it

Not part of the default `npm run pipeline` (see `pipeline/src/index.ts`) — same reasoning as
ShoutAtYourDecks/Sleeved: this is the pipeline's second Playwright dependency, and a fresh backfill
is worth keeping an explicit, deliberate step rather than folded into the daily run.

```bash
npm run pipeline:tcga:harvest  # walks the /grand-archive/discover listing, populates pipeline/.cache/tcgarchitect/
npm run pipeline:tcga:build    # cache -> data/tcgarchitect/
```

Resumable: harvest always restarts at page 1 (the listing is sorted newest-first, so that's the
only place new/edited decks can appear), but skips writing any deck whose `updated_at` hasn't
changed since it was last cached, and stops early once 3 consecutive pages contain nothing
new/changed. `GATCG_FAST_MODE=1` caps a run to `config.tcgaFastModePageLimit` (default 2) pages
≈ 96 decks for local iteration.

## Known gaps

- **No price data.** The listing/detail responses carry no deck-level price — only ~340 per-card,
  per-edition `low_price` fields per deck (used to compute the site's own "Estimated Low Price"
  client-side). Replicating that cheapest-edition-selection logic wasn't worth it for v1;
  `priceLow` is always `null`, same precedent as Sleeved.
- **`maybeboard` is dropped.** A wishlist zone the site's deck builder offers — not committed deck
  content, and not part of deck identity per `CLAUDE.md`'s convention.
