# Store locator

`/stores` searches the physical hosts of completed Omnidex events; `/stores/:hostId`
shows the latest recorded address and up to twelve recent events. Hosts are joined by
stable host ID, never by name. Former names remain searchable. Online-only hosts and
host ID zero are excluded. Event history is evidence of hosting, not of current opening
hours, retail inventory, or upcoming play. Unreviewed hosts are labeled Event venue.

The pipeline publishes `data/omnidex/stores.json` and its manifest generation after the
normal crawl/analysis run. The client fetches that compact projection rather than the
full event index. To rebuild just the directory:

```
node --import tsx --input-type=module -e "import {writeStoreDirectory} from './pipeline/src/omnidex/stores.ts'; await writeStoreDirectory()"
```

Curate `data/curated/store-overrides.json`, keyed by host ID. Each correction requires
an `evidence` string (prefer a source URL). Optional fields: `kind` (`store` or `venue`),
`name`, `address`, `country` (ISO alpha-2), `region`, and `coordinates` (`{lat,lng}` or
`null` to suppress an incorrect point). Do not classify retail status from an event
name alone. Region filters appear only when structured region data exists; free-text
city/region/postal searches work on every recorded address.

The initial audit found 674 physical hosts and 293 legacy coordinates. Twenty-three
mapped hosts had multiple historical addresses; their legacy points are withheld,
leaving 270 points. All 674 locations remain in the list. Coordinates are range-checked;
existing geocoder matches are not individually verified storefront positions.

Geocoding now selects the latest dated address and caches by host ID plus address.
Legacy host-only cache entries are not trusted for new geocoding runs. Network errors
are retried on a later run instead of being permanently cached as no-match. The next
normal crawl will refresh address provenance; no bulk geocoding request was made for
this UI change. Confirm questionable locations using curated corrections.

Search ignores case and Latin accents and matches all query words against names,
aliases, and addresses. Country, curated region, activity, distance, and mobile view
are URL parameters. Location coordinates remain in component memory: they are neither
sent to the account API nor put in the URL. Distance uses great-circle kilometers;
unmapped venues sort last and are excluded only when a radius is applied. Denied or
unavailable location leaves ordinary search usable. OSM tiles retain attribution;
tile failures leave address and directions controls available.

Verification covers address changes, aliases, stable identity, online exclusion,
invalid/suppressed coordinates, correction precedence, and distance calculation.

UI verification: 390px and 1280px layouts, keyboard map-tab and marker selection,
combined name/country filtering, empty results, missing map points, and detail-page
recent-event links were checked in the browser. A temporary local harness verified
cached-data load failure/retry, denied location, and nearby/radius filtering using a
simulated Toronto location. Real device GPS accuracy and a forced tile-server outage
were not tested. App and pipeline typechecks, focused lint, and directory/filter tests
passed. Temporary harness files were removed.

## Imported location coverage

A reviewed batch from TradeBinder.Bid's cached LGS Finder dataset (collected
2026-10-11) adds 31 previously unmapped hosts, bringing coverage to 301 of 674.
`data/curated/store-geocodes.json` retains the original source URL, source address,
and collection date for each point. The crawler reuses these only for the exact
recorded host/address pair; changed addresses require a fresh match. These are
directory coordinates, not independently surveyed storefront positions. Host
classification and event addresses remain unchanged. No external geocoding
requests were made for this batch.

Matches were reviewed for store identity and street address, allowing suite
notation and shopping-center prefixes. Conflicting addresses (Andyseous Odyssey,
Kobold's Keep, Webway Games), postal/locality discrepancies (Game Kastle Austin,
Realgoodeal, Yeti Gaming), and an identity mismatch (True Champion Gaming versus
AFK Games) were excluded pending further evidence. Remaining map gaps: 373.

### Follow-up match review (2026-10-16)

Two more directory points were accepted, bringing coverage to 303 of 674 (371
remaining). Game Kastle Austin's [official location page](https://gamekastle.com/pages/austin-tx)
confirms 3407 Wells Branch Pkwy Suite 800, Austin, TX 78728; the event record's
78727 postal code differs but the store, street, and suite match. Yeti Gaming's
[official social profile](https://linktr.ee/yetigamingstl) confirms 84 Grasso Plaza,
St. Louis; the event address uses Affton for the same street and postal code.
Both points retain the original event address as their exact cache key and the
LGS Finder coordinate provenance. No event address was overwritten.

Realgoodeal remains excluded: its [contact page](https://realgoodeal.com/pages/contact-us)
lists suite A45 rather than the event/directory's A47. The other four conflicting
matches above remain unresolved. A further comparison using historical host
aliases and normalized street suffixes found no additional exact matches in the
cached US directory. Wider coverage requires additional location evidence.

### Publisher directory evidence (2026-10-16)

Two exact store/address matches from the Riftbound Gaming Network bring coverage
to 305 of 674 (369 remaining):

- Agora Hobby (host 66): the [publisher's store listing](https://locator.riftbound.uvsgames.com/stores/a4bdb9b6-57bf-484a-b119-68799816e1c9)
  publishes 1.3078243, 103.8611394 for 809 French Road #05-164. The
  [store's own contact page](https://www.agorahobby.com/contact-us) confirms the
  same building and unit as the Omnidex address.
- Card Merchant Hamilton (host 84): the [published event location](https://locator.riftbound.uvsgames.com/events/194757)
  and its embedded store record agree on -37.7831689, 175.2797244 at 36 Bryce
  Street, Hamilton 3204. The source adds ground-floor detail to the event address.

Imported points retain source URLs, source addresses, and collection timestamps;
no event addresses or classifications were changed. These are published directory
points, not independently surveyed coordinates. No geocoding requests were made.
Apex Player's Guild was withheld: its [publisher event listing](https://locator.riftbound.uvsgames.com/events/804542)
contains different event and store coordinates despite referring to High Street
Centre. Resolve that discrepancy before importing a point. This publisher site
announces an October 15 platform migration, so future reviews must recheck source
availability and address currency.
