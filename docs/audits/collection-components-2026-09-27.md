# Collection components review — 2026-09-27

## Existing responsibilities

| Component/module | Responsibility | Assessment |
| --- | --- | --- |
| CollectionIndex | Account loading, inventory editing, imports, set/deck quick-add, coverage, history | Too many independent tasks and inline controls in one controller; keep it as orchestration and extract tab-level components next. |
| CollectionSets | Card-first set browsing, family grouping, milestones, playset targets, filters | Strong main collection surface. Preserve card art, physical ownership pooling, and opt-in shopping. |
| CollectionCardFilters | Name/rules, subtype, element, class/type, set/printing filters | Reuses shared filter primitives; preferable to the separate name-only searches in Inventory/Add cards. |
| MissingCardShopping | Explicitly requested shopping for filtered cards | Correct progressive disclosure. Ownership reminders do not count as inventory; checking flagged cards before shopping remains a manual decision. |
| DeckCollectionTools | Deck-level collection operations | Reuses collection semantics rather than owning inventory. |
| collectionProgress / collectionPlaysets / collectionBatch | Pure progress, copy targets, import/export and coverage calculations | Retained. New reminders must not inflate progress or double-count printings. |
| CardArtTile / DisclosureChevron / EditorDialog | Shared visual and interaction primitives | Reused for tracking. EditorDialog now supports disabling dismissal during a pending save. |

## Added in this change

- CollectionTrackingButton: reusable status/action for set cards, inventory and catalog search.
- CollectionTrackingEditor: one focused mobile/full-height or desktop drawer for “might own”, borrower names, quantities and returned-loan history. Explicit Save; Cancel discards the current form. A failed save retains entered data.
- CollectionTrackingSummary: account-private views for active reminders, uncertain ownership, outstanding loans and returned history.
- useCollectionTracking: load/retry/save coordination, independent of inventory readiness. Tracking failure does not block ordinary collection use.
- collectionTracking service and shared types: account-scoped card-level metadata, revision-checked writes, bounded input, account export and account-deletion cascade. Canonical and exact-printing inventory are untouched.

These are reminders, not a stock reservation system. A “might own” flag never increases confirmed quantities. Loans remain owned and do not currently reduce buildable/tradable availability. Tracking spans all printings of a card; loaned editions, partial return events, due dates and borrower accounts are not modeled. Returned records are retained and can be reopened. A card supports up to 100 loan records.

## Findings and next priorities

1. **Fixed:** Inventory onChange previously matched every row with the same card UUID, including exact printings. It now changes only the unspecified-printing row that the input edits.
2. **Inventory omits printing-only holdings:** filteredEntries currently excludes every edition row, while the header/set progress pool them. A user can own cards visible in Sets but see no Inventory row. Replace this with grouped card totals and an explicit printing breakdown, keeping mutations section/printing-aware.
3. **Search/filter behavior differs by tab:** Add cards is a name-only search limited to 12 results; Inventory is name-only; Sets supports rules text and rich filters. Reuse CollectionCardFilters and one results component across these views.
4. **Fixed:** Individual card search now precedes deck/set bulk operations, which are collapsed under “Add a deck or set”.
5. **Two meanings of sharing:** “Track sharing” concerns saved-deck demand, not borrowers. Keep “Ownership & loans” distinct; consider renaming the former to “Track across decks”.
6. **Improved:** Inventory and Add cards now use CardArtTile grids with readable names. Existing 44px controls in CollectionIndex were raised to 48px; remaining compact bulk/import controls should be standardized during tab extraction.
7. **Printing/set terminology varies:** set browsing groups First/Alter editions, while bulk set choices remain raw printing sets. Clarify that choice instead of silently changing quantity-import behavior.

## Verification and release

- Account-worker: 47 tests passed, including real SQLite migration/round-trip, user isolation, invalid values, returned/reopened loans and revision conflicts.
- Collection regression tests: 17 passed for totals, coverage, set families and playset progress.
- Browser: actual CollectionIndex and tracking components with a temporary local account adapter; no account writes. Verified zero inventory with saved reminders, set/search entry points, borrower and quantity editing, returned history, failure retention, and desktop/mobile layouts at 1280px and 360–390px. Editor controls measured at least 48px; no editor horizontal overflow. The adapter was removed after verification.
- Live authentication/API integration, production migration and a physical on-screen mobile keyboard were not exercised.
- Apply account-worker migration 0022 before deploying the updated API. App, shared and account-worker typechecks and app lint are part of the final checks.

## Quantity draft follow-up

Quantity edits now stage locally, merge by card and printing, and save explicitly in batches of up to 500 API lines. Inventory inputs no longer write on blur; repeated taps send no requests until Save quantities. Bulk operations compose with pending edits. Returning a quantity to its saved value removes the pending write. Save failures keep remaining changes; successful chunks are not resubmitted. Discard restores saved values. Drafts use account-scoped session storage and a before-unload warning; this is not cross-device draft synchronization. History undo is disabled while quantity changes are pending.

Verified repeated taps (zero requests), one final-quantity save, simulated failure/retry, owned/proxy drafts, discard, and card grids at 390px/1280px with a temporary local adapter. Three draft tests cover printing isolation, bulk-mode composition and reverted edits. Shopping tests also pass. Physical mobile keyboard behavior was not tested.
