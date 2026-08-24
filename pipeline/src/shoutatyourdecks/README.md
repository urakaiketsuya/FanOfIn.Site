# ShoutAtYourDecks

A second deck source (alongside Omnidex) — shoutatyourdecks.com is a community-run Grand Archive
deck builder (~21,371 decks at time of writing), meant to surface "potential decks" beyond ones
that showed up in tournament results. Standalone dataset (`data/shoutatyourdecks/`) for now — not
wired into the Omnidex-derived `canonicalSignature`/deck-sightings analysis pipeline yet; that's a
deliberate future step once this source's data quality is proven at scale.

## Why this needs a browser at all

Unlike Omnidex/TCGCSV, shoutatyourdecks.com has no JSON API — it's a Blazor Server app, so the
`/decks` listing and every deck page only render after a live SignalR circuit connects. This is
the first source in this pipeline that needs real browser automation (Playwright:
`npx playwright install chromium` after `npm install`).

However, individual deck pages **are** server-prerendered enough to fetch via plain HTTP (no
browser) — confirmed by diffing a `curl` of a deck page against a live-rendered one:

- Title, author, champion, price: in `<meta>` tags — always complete.
- Material deck: **complete** (verified 12/12 real `<img>` tags matching the page's own header
  count exactly — Material is singleton, no duplicate copies, so there's nothing to truncate).
- Main deck: **incomplete** — verified only 18 distinct card images against a header claiming
  "Main (62)", cleanly closed (not truncated mid-render), so the server only prerenders an initial
  batch and defers the rest to client-side hydration. No quantities are encoded here at all.

That split is why the pipeline runs in three phases:

1. **`harvest.ts`** (browser) — walks the `/decks` listing (24 decks/page, ~891 pages, confirmed
   against the site's own MudBlazor pagination — there's no URL-encoded page number, it's pure
   SignalR client state) collecting every deck's GUID. Filters to Standard + Pantheon format in
   the UI (~99% of all decks) before harvesting.
2. **`metadataFetch.ts`** (plain HTTP) — for every harvested GUID, fetches the deck page directly
   and regexes out title/author/champion/price/material-count/main-count/side-count from the
   prerendered HTML. Cheap enough to run at full ~21k scale.
3. **`filter.ts`** — `shouldKeepDeck`: `mainCount >= config.sydMinMainDeckSize` (default 60) and
   title doesn't contain "Copy" (case-insensitive). See docs/CALCULATIONS.md for why. Runs
   immediately after Phase 2, before Phase 3 ever touches a browser — this is what keeps the
   expensive phase bounded to only the decks worth it.
4. **`decklistFetch.ts`** (browser, filtered subset only) — the one place a *complete,
   quantity-accurate* decklist was found: the deck page's Export tab → "Omnidex Export" button,
   which populates a `<textarea id="deckTextArea">` with clean `# Material Deck` / `# Main Deck` /
   `# Side Deck` plain text (`qty name` per line). More robust than parsing the visual card grid,
   since it's a stable interface the site maintains for exactly this purpose. Cross-checks parsed
   main-deck quantities against the `mainCount` from Phase 2 and logs a warning on mismatch.

## Running it

Not part of the default `npm run pipeline` — this is local/manual only (see `pipeline/src/index.ts`
and the note in `pipeline/src/config.ts`): a full crawl can run for hours across ~21k decks, well
past `data-refresh.yml`'s 180-minute CI budget, and this is the repo's first Playwright dependency
(no browser-binary caching set up in CI). Run each phase explicitly, in order:

```bash
npm run pipeline:syd:harvest    # walks the listing, populates pipeline/.cache/shoutatyourdecks/
npm run pipeline:syd:metadata   # cheap HTTP pass over every harvested deck
npm run pipeline:syd:decklists  # browser pass, filtered decks only
npm run pipeline:syd:build      # cache -> data/shoutatyourdecks/
```

All resumable — `harvest.ts` picks up from `harvest-meta.json`'s last completed page, and
`metadata`/`decklists` only ever process cache entries still missing that phase's data. `GATCG_FAST_MODE=1`
caps each phase to a small sample (`config.sydFastModePageLimit`, default 3 pages ≈ 72 decks) for
local iteration.

**Known flakiness**: local testing surfaced a real timing race in the site's own Blazor rendering —
occasionally a "next page" click settles on content that's stable (by `waitForStablePageContent`'s
two-reads-in-a-row check) but is actually a repeat of the page just left, not new content. `harvest.ts`
guards against this by comparing each page's deck-id set against the previous page's and retrying
the read (up to 5 times, 500ms apart) if the overlap is too high to be a real new page — this fixed
a reproducible case where a 3-page fast-mode harvest returned only 48 unique decks instead of 72.
If it's ever seen again despite the retry, it's logged as a warning rather than failing the run.
