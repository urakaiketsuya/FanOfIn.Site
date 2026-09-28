# Data loading and collection efficiency

Tournament deck pages read a hash partition from `data/analysis/deck-details/`.
Champion tools share `data/analysis/champion-decks/` through `useChampionDeckData`.
`writeManifest()` rebuilds both from the published card and popularity indexes;
keep those generated files with the source indexes when publishing. Full indexes
remain available for cross-champion tools and as a fallback for older deployments.
Sideboards remain specific to their tournament sighting; partitioning does not
change main/material deck identity. The additional published files trade disk space
for smaller client downloads.

The full card API shape is published as `data/card-catalog.json` when the pipeline
refreshes its catalog. First-time clients write it atomically, then perform the
existing incremental API sync. An unavailable bootstrap falls back to pagination.
Interrupted bootstrap writes leave the prior cursor intact. The legacy paginated
fallback still restarts an interrupted first sync.

Published datasets, card catalogs, and prices share one reactive IndexedDB snapshot
per mounted resource. Derived presence/decode indexes use weak caches so their
source generations can be garbage-collected. Prices check the generation manifest
before downloading. Collection reads share a short, in-memory request cache cleared
by writes, authentication operations, window focus, and cross-tab storage changes.

Whole-deck location updates use bounded transactional PATCH batches. A stale revision,
invalid deck, or capacity conflict rolls back the batch. Exact revision/content
replays allow recovery after a lost response. Already confirmed batches stay confirmed
when a later batch fails. Existing loan, inventory, and trade reservation checks remain
in force. The account Worker must be deployed before the frontend uses this endpoint;
this change does not require a new migration.

## Verification and regression checks

- Open a tournament deck with fresh data. The initial view should not request the full
  deck-card/popularity indexes, similarity, or matchup-card-impact data when partitions
  are available. Test opening historical analysis and History & Similar separately.
- Check a missing partition still resolves through the full-index fallback.
- Check card names, quantities, and the selected sideboard against the original indexes.
- Verify a multi-card assignment uses one request per batch; exercise a conflict and
  interrupted response, then retry without applying extra revisions or losing edits.
- Verify price refresh skips a generation already cached, and local changes still update
  every mounted consumer of a shared resource.
- Check mobile and desktop layouts after changing loading boundaries. Data-loading
  changes must not hide errors, leave permanent loading states, or reset draft edits.

September 28, 2026 local measurements: 256 hash partitions, median 149 KiB, maximum
197 KiB uncompressed, replacing the approximately 34 MiB pair of full deck indexes
for direct deck resolution. The full catalog bootstrap contains 2,495 cards,
17.94 MiB raw / 1.46 MiB locally gzipped. These are data sizes, not measured production
transfer sizes or mobile latency guarantees.
