# Deck search and sharing rollout

## Shipped sharing

Published community decks have a live share endpoint on accounts.fanofin.site with
champion spotlight artwork and X large-image metadata. Open Graph remains as a
fallback. The image shows deck title and author, without separate champion name,
format, or version labels. Actual rendering inside signed-in X remains unverified.

## Tournament entry pages

The app production build runs `scripts/build-deck-pages.mjs` after Vite. It reads
all 256 published deck-detail partitions and emits `decks/<hash>/index.html` for
builds recorded for at least two distinct players. Repeat sightings by one player
do not qualify. Pages retain the built app entry and assets, with deck-specific
title, description, canonical URL and X/Open Graph text. No author is inferred
for these grouped builds. Social metadata uses the highest-level champion present in Material, selected from the
published catalog. Missing or invalid art keeps the site's default image. Community
sharing retains its existing title-and-author spotlight composition.

This is an incremental rollout: 1,895 of 49,016 tournament builds qualified in the
October 14, 2026 snapshot. The existing deployment already contains approximately
862 MB of files. Generating the full HTML shell for every build would add roughly
270 MB, so full historical coverage needs a smaller data deployment or different
page delivery. The build regenerates the output directory; stale qualifying pages
are removed on the next deployment. Saved/community deck identifiers are never
materialized here, so publication or privacy state cannot be frozen in this output.

Directory index files let GitHub Pages serve these routes directly (possibly after
its directory-slash redirect), instead of the site's 404-to-JavaScript redirect.
Live HTTP behavior must be verified after deployment. Unselected and unknown routes
retain the existing fallback. The initial HTML now includes readable Main and
Material sections, quantities,
section totals and links to catalog cards. React replaces this compact text fallback
with the existing interactive card-art view on startup. Sideboards remain in the
app's separately attributed tournament view; they are not merged into the grouped
build. Unknown catalog names remain readable text. The production build adds exactly these
eligible routes to sitemap.xml, starting from the pipeline sitemap on each build so
removed decks cannot linger. Tournament canonical URLs end in `/` to match directory
serving; community identifiers retain slashless URLs. Client navigation uses the same
canonical helper and updates Open Graph/X text, removing stale initial structured data
and artwork when leaving a generated deck page.

Initial JSON-LD describes a WebPage and ItemList of the visible Main/Material cards,
including quantities and known catalog links. It makes no inferred authorship, ratings,
product, or rich-result claims. JSON is escaped against script termination.
The 1,895 generated pages total approximately 23.1 MB with card content and structured data.

Local verification: production build and 17 release-tooling tests pass. All 1,895 generated pages
have matching canonical, sitemap and JSON-LD URLs and catalog champion artwork; the
combined sitemap contains 6,775 URLs. Shared and app typechecks and targeted lint pass. Browser navigation confirms
that leaving a generated deck restores default artwork and removes stale JSON-LD. The text
fallback was checked at 390px and 1280px, with no horizontal overflow, 48px link
heights and visible keyboard focus. React startup replaces the fallback; production
deployment and the full data-loaded app flow remain to be verified for this step.

## Remaining milestones

1. Confirm the community share preview in a signed-in X composer.
2. Finish page delivery: establish live community deck HTML on the main domain,
   with current publication/privacy checks and real missing-page status responses;
   decide full tournament coverage within the hosting size budget.
3. Extend the completed tournament metadata/artwork approach to live community canonical pages.
4. Extend initial card content, structured data and sitemap coverage to eligible community pages.
   Preserve grouped Main/Material identity and separately attributed Sideboards.
5. Verify indexing, canonical variants, withdrawal and duplicate behavior in Search
   Console, and measure coverage after deployment.

References: [GitHub Pages file delivery](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site),
[Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).

## October 14 follow-up and rollout gates

Tournament sitemap, canonical normalization, catalog champion social artwork and
structured data are implemented locally. No hosting change or deployment is included.
The next infrastructure decision is an edge proxy for `/decks/*` while retaining Pages,
or moving the main site to a server-capable host. Do not snapshot community pages into
Pages: withdrawal and moderation must take effect on the next request. Preserve unlisted
access with noindex; private/withdrawn/moderated decks must return a real 404. Public
sitemap eligibility must reuse discovery restrictions, including discoverable profiles
and seed-discovery settings, rather than visibility alone. Unknown upstream failures
must return a retryable 5xx rather than a cached missing response.

Full historical tournament output still needs a delivery/size decision. The current
independent-player threshold intentionally limits the static rollout; sitemap coverage
must always match actual entry pages.

After deployment, verify a generated URL with and without its trailing slash and with
a query string; compare canonical, og:url and JSON-LD URL before/after React startup.
Check a missing hash, one public community deck, one unlisted deck, and a withdrawn deck.
Use a dedicated test deck for withdrawal, not a real user's published content. Confirm
that stale URLs disappear from the next sitemap and that no unavailable content remains
in CDN caches.

In Search Console, submit `/sitemap.xml`, inspect representative tournament/community
URLs, and record submitted/indexed totals, Google-selected canonical, soft-404 exclusions
and last crawl date. Review again after crawling; sitemap submission does not guarantee
indexing. Actual X composer rendering and Search Console verification require signed-in
access, which is not currently available in the browser session.

Canonical/sitemap alignment follows [Google's canonical guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls).
Structured data describes visible content and does not promise a special search result;
see [Google's structured data introduction](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data).

## Live community delivery preparation

The account BFF now uses a reusable `readPublishedDeck` boundary for current
publication reads. It signs requests without visitor cookies, disables fetch caching,
bounds response size and time, preserves unlisted visibility, and returns 404 for
withdrawn/private or mismatched decks. Upstream failures and malformed successful
responses return retryable 502 errors; missing configuration returns 503. The share
HTML and images use this boundary today. Canonical community HTML and sitemap
delivery are still pending the hosting choice; this helper does not make them live.
General bounded response reading is separated from spotlight rendering.

Verification: account BFF typecheck and all 10 BFF tests pass, including withdrawal
followed by republishing, unlisted access, malformed responses, signed cookie-free
reads, and old image URLs. No visible UI or hosting configuration changed.
