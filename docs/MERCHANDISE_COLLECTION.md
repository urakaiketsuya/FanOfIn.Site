# Official merchandise collection

The Collection page includes a Merchandise tab with quantities, saved progress, and filters for merchandise release, champion, product type, search and ownership. Merchandise stays separate from trading cards, card-set completion, valuation, deck readiness and trade reservations.

The initial catalog contains 56 article-confirmed components from eight bundles: Seaside Splash (Merlin, Nico, Tonoris), Lunar Blessings (Lorraine, Rai, Tristan, Arisanna), and Kongming Yuletide Cheer. Official bundle overview images are explicitly labeled as overviews, with readable names if an image fails. The source article is linked on each bundle. Tube accessories stay with their playmats. Promo cards and bundle packaging do not create extra progress entries; the explicitly listed storage boxes do.

## Identity and evidence

`shared/src/merchandiseCatalog.ts` is the stable ownership registry. Its IDs identify a component within a specific announced bundle, not an independently sold SKU or manufacturing variant. Never rename or recycle an ownership ID after publication. Labels and evidence may change without changing IDs. Any future duplicate resolution needs an explicit migration, with review of how quantities combine.

The supporting article evidence is in `docs/research/official-merchandise-bundles.json`. No artist, card-set affiliation, merchandise rarity, size, or production-run identity is inferred. Merchandise release filters are distinct from trading-card expansion sets.

The six visually reviewed Ascent catalogs, 148 candidate label groups, artwork comparisons, and event coverage checklist remain in `docs/research/official-merchandise-*.json`. They are research evidence, not ownership IDs. Unresolved Ascent identities and unavailable catalogs are excluded from totals. This initial catalog is not a complete historical merchandise checklist.

## Persistence

Migration `0036_merchandise_collection.sql` adds one account-owned snapshot, deleted with its account. GET/PUT `/v1/me/collection/merchandise` return the account ID, revision and sparse quantities. The shared parser rejects unknown IDs, non-integer counts, and values outside 0–999. Zero removes an owned entry.

A single conditional upsert atomically creates or replaces the snapshot. Expected revisions prevent lost updates. A request ID and canonical payload recognize a retry of the most recent successful save; the same ID with different contents is rejected. Older retries after another save conflict rather than overwriting newer quantities. Account export includes merchandise.

The UI retains account-scoped quantity edits and an unconfirmed command locally. Switching collection tabs preserves drafts. A failed save locks quantity controls until retry confirms the original command. A revision conflict keeps edits and asks the user to load the saved quantities, review the resulting draft, and explicitly save again. Browser exit warns while changes remain unsaved. Storage failures are visible.

## Release and verification

Apply migration 0036 before deploying the account worker, then deploy the app. Worker health requires the new table. Production migration and deployment are not performed as part of this implementation.

Verification commands:

- `node --import tsx --test account-worker/test/merchandise.test.ts account-worker/test/collection-progress-goals.test.ts`
- From `account-worker`: `node --import tsx test/integration/merchandise.d1.ts`
- Shared, app, and account-worker typechecks; app lint.

SQLite and local D1 tests cover failed creation/update rollback, retry behavior, conflicting creation, concurrent identical requests, stale updates, account isolation, validation, deletion cascade, and progress without double counting. Browser acceptance uses mocked account responses to exercise loading, unavailable data, empty filters, expanded quantities, drafts across tabs/reload, failed save retry, revision-conflict recovery, and mobile/desktop keyboard, touch targets and overflow. Live signed-in production writes require deployment.
