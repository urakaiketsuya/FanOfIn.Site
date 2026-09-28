# Collection UX/UI audit — September 27, 2026

## Verdict

The collection has useful features, but its hierarchy still presents a catalog with inventory controls. The next iteration should make it feel like the user's cards: one primary grid, clear ownership and scoped progress, and one consistent card-management sheet. Avoid adding a dashboard above the cards.

## Evidence and scope

Reviewed CollectionIndex, CollectionBrowser, CollectionCardFilters, CollectionPurchase, CardLocationsView, CardLocationSheet, CardLocationSummary and the new value summary. Rendered the real CollectionIndex with a temporary, local account adapter, cached catalog/art and representative inventory at 390×844 and 1280×900. No live account writes. Inspected default, owned and expanded-filter states. This was a heuristic review, not a usability study. Global navigation, live auth, physical mobile keyboard and all import/error flows were not tested. Temporary preview removed.

## Prioritized findings

1. **High — The initial view does not communicate “my collection.”** CollectionBrowser defaults to all cards alphabetically. The test inventory had nine owned names, but the initial viewport showed zero-owned cards from a 2,495-card catalog. Default returning users to Owned; offer All and Missing at the same level. For empty inventory, show one brief add/import prompt and immediately offer catalog search. Preserve view/filter state.
2. **High — Totals and quantity actions disagree.** CollectionIndex uses totalsByName.size, including rows with zero physical ownership. The fixture displayed 12 unique cards while Owned correctly contained nine. Card tiles display pooled physical quantities, but +/- only change canonical quantities: an exact-printing-only card showed 1 owned with minus disabled. Count only positive physical ownership. A decrement must offer printing choice when necessary, never silently alter another pool. Label unspecified additions clearly in the edit sheet.
3. **High — Controls dominate before cards.** In the mobile fixture the first card began near y=465, without global navigation. Header/value, tools, search, filters, ownership and shopping stack vertically. Use one compact summary, search, and a wrapping row of ownership/Filters/Sort controls. Keep shopping behind an intentional Select action. Avoid putting multiple summary panels before the grid.
4. **High — Progress is hidden inside filters.** Completion, milestones and playset progress appear inside Card filters, alongside sorting and configuration. Pull one scoped progress line above the grid when viewing a set/subtype: e.g. Harmony · 18/24 owned · 6 missing. Keep explanation expandable. Progress denominators must refer to the selected catalog scope before ownership filtering, so choosing Owned cannot imply 100% completion.
5. **Medium — Each card is a small form.** Art/name navigate away; ownership, a location button, +/- and Manage card compete. Expanding Manage adds quantity fields, proxies, another location action and a separate printing route. Use art + readable name + owned/target count + one quantity row, with at most one meaningful location/exception label. Open a shared card sheet for management, with an explicit Card details link. Preserve a link to known card details without making departure the only art interaction. Hide routine Unassigned labels until location management.
6. **Medium — Filters obscure the result they affect.** Opening Card filters pushes the grid far down even on desktop. Subtype, element, class, type, set and printing edition all compete; selected filters collapse to a count rather than readable context. Use a focused mobile filter sheet and desktop popover/panel, retain selections on reopen, show active removable chips above the grid, and keep Sort directly accessible. Do not nest progress or another disclosure hierarchy inside it.
7. **Medium — Location management creates a second browsing model.** The secondary location grid has its own search and filters. It is not simultaneously duplicated, but users lose the current collection scope when switching. Reuse grid/card presentation and add In decks/Lent/Needs checking as location filters, while retaining a distinct location controller and a deck-transfer review. Keep loans and allocations private and separate from owned totals.
8. **Medium — Set filters can imply ownership of the wrong printing.** Choosing a printing edition changes displayed art while ownership remains pooled. A visible “Any printing counts” label is needed for unique-card completion. Exact-printing collection mode, if introduced, must have its own denominator and inventory controls; do not infer ownership of displayed art.
9. **Medium — Shopping review loses visual recognition.** The grid supports selection well, but review becomes name-only rows and quantities always begin at one. Reuse compact card thumbnails in review. Offer explicit “one each” or “complete playsets” quantity intent; never silently assume the user wants four. Show selection count and selections outside filters. Preserve Mass Entry as the final opt-in action.

## Recommended visual model

### Primary page

- Small header: My Collection, physical/unique ownership and estimated value (pricing details expandable).
- Search immediately below.
- One responsive toolbar: Owned / All / Missing; Filters; Sort; Select. Use wrapping and 48px targets rather than horizontal page scrolling. Location filters and collection administration can be secondary actions.
- When scoped to a set or subtype, one horizontal completion bar with explicit numerator/denominator and a “Show missing” action. Keep overall collection value distinguished from filtered results.
- A single two-column mobile card grid. Each tile: card art, readable name, `2 / 4 owned` or `1 / 1 owned`, labeled playset completion, and compact editing access. A completed state can use a subtle border/check plus text; never color alone. Missing cards keep readable, identifiable art.
- A contextual save/selection bar only while work is pending, with safe content padding and no focused-field obstruction.

### Secondary views

Set exploration can be an explicit view of set covers with a small progress bar and fraction. Selecting a set filters the existing grid; it must not append another card catalog. Default to unique-card completion across grouped editions, matching existing rules. Exact-printing completion is a separate future feature.

The card sheet owns quantities, printings, loans and deck locations with clear sections. Common quantity editing comes first; advanced printing/proxy/history actions are disclosed. The sheet should show current ownership and preserve drafts. Reuse the existing CardArtTile, EditorDialog and DisclosureChevron. Keep calculation, inventory mutations, location orchestration and shopping selection in separate modules.

Value breakdown belongs in an optional details surface: priced-copy coverage, date, and optionally the highest-value owned cards with art. Do not add trend graphs without historical inventory; price history alone cannot show historical collection value accurately.

### Restrained gamification

Use progress tied to the user's chosen set/subtype, completed playsets and “3 cards from finishing this set.” Offer browsing the missing cards, not automatic purchasing. Avoid global catalog completion as the main score, streaks, XP or purchase-based rewards. Completion may legitimately decrease when inventory changes; it must reflect current ownership.

## Implementation order

1. Fix truthful ownership counts and printing-aware quantity behavior; reduce the initial control stack; default to owned cards where inventory exists.
2. Consolidate card management and location presentation; preserve filter context.
3. Surface scoped progress, optional set exploration and visual purchase review. Add value breakdown only on demand.

## Acceptance criteria

- Returning collectors see owned card art in the first mobile viewport; empty users can begin adding without setup.
- Unique counts exclude zero/proxy-only records; exact-printing controls never contradict pooled ownership.
- All, Owned and Missing preserve the same set/subtype scope. Progress denominator stays stable when ownership filter changes.
- A user can filter Harmony, see scoped completion, inspect missing cards and intentionally create a Mass Entry selection without losing context.
- A user can locate a card, move or split it across decks, and record a loan without changing owned totals or needing separate playsets per deck.
- Card details, editing and shopping actions have distinct accessible names and predictable results.
- Verify 360–390px and desktop, keyboard focus, 48px targets, overflow, empty/loading/error/draft states and sticky-bar clearance.

## Implementation — September 27

Implemented the primary card grid, owned-first defaults, truthful positive-ownership counts, scoped progress outside filters, removable filter chips, focused filter panel, and shared card-management sheet. Exact printing quantities can be adjusted and added in the sheet; removing a pooled copy opens printing selection when tracked printings exist. Drafts continue to use the existing explicit-save flow.

Location filters now operate on the primary grid. The location controller and deck-transfer review remain separate. Routine unassigned labels are suppressed. Import, bulk add, deck transfers and history are behind Tools. Purchase review includes art and explicit one-each/playset-shortfall actions. The optional set-cover explorer and highest-value-card breakdown remain future enhancements; neither is needed above the primary grid.

Validation: local fixture with the real cached catalog at 360/390px and 1280px; owned, empty, loading, load error, expanded filters, printing editing, draft-save failure and visual purchase review. Harmony ownership/missing views kept the nine-card denominator; selecting one and filling a playset produced quantity four in the Mass Entry URL. No live account writes or purchase submissions. Header counts correctly changed from nine to eight after removing the final owned printing. All visible primary controls measured at least 48px high; no page overflow at 360px. Physical mobile keyboard and production account round trips were not tested.
