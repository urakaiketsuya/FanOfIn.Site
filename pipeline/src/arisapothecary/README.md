# Ari’s Apothecary

Public community deck source: https://www.arisapothecary.com/decks.
The site's robots.txt allows public pages and /api/browse. Plain HTTP requests
encounter a security checkpoint, so Playwright loads normal public pages. The
listing response supplies IDs and pagination; detail pages supply JSON flight
records with exact card counts. No authentication or private endpoints are used.

```sh
npm run pipeline:ari:harvest
npm run pipeline:ari:build
# Then run the normal analysis pipeline to refresh blended/collected artifacts.
```

`GATCG_FAST_MODE=1` harvests one deck for a smoke check. Full harvests start at page
one, skip unchanged lists using the listing’s update timestamp, and write each successful record atomically to
`pipeline/.cache/arisapothecary/`. Errors fail the run without replacing the failed
record. Build publishes complete lists (60+ main cards and a material deck) to
`data/arisapothecary/decks/`. Published lists feed collected decks, community
search/analytics and card staples. Collection identities deduplicate main plus
material; sideboards remain variants.

Constructed is mapped to Standard; Pantheon keeps boons in a separate zone.
Token references are excluded. Unrecognized formats, zones, malformed counts,
private records and stalled pagination fail explicitly rather than silently
misclassifying cards. Sideboard totals are counted from cards, not the displayed
point total. Event decks are not harvested into community statistics: event
results remain owned by the existing Omnidex pipeline.

A dedicated monthly workflow runs on the third day of each month (06:00 UTC),
with manual dispatch available. This is a separate source job, like the other browser-based community harvests;
it is not added to the default daily crawler. A run is paced at one second between
decks. Deleted/private source records already cached are not automatically pruned.
