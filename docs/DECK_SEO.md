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
for these grouped builds. The image remains the site's default social image.

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
build. Unknown catalog names remain readable text. Sitemap entries are not yet added.
The 1,895 generated pages total approximately 15.6 MB with card content.

Local verification: production build and 15 release-tooling tests pass. The text
fallback was checked at 390px and 1280px, with no horizontal overflow, 48px link
heights and visible keyboard focus. React startup replaces the fallback; production
deployment and the full data-loaded app flow remain to be verified for this step.

## Remaining milestones

1. Confirm the community share preview in a signed-in X composer.
2. Finish page delivery: establish live community deck HTML on the main domain,
   with current publication/privacy checks and real missing-page status responses;
   decide full tournament coverage within the hosting size budget.
3. Extend card-based metadata and champion artwork to canonical deck pages, without
   adding the removed labels to spotlight artwork.
4. Extend initial card content to community pages; add accurate structured data
   and sitemap entries for eligible public pages.
   Preserve grouped Main/Material identity and separately attributed Sideboards.
5. Verify indexing, canonical variants, withdrawal and duplicate behavior in Search
   Console, and measure coverage after deployment.

References: [GitHub Pages file delivery](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site),
[Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).
