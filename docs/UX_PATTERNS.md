# Interface patterns

Use Material interaction principles with the existing Catppuccin theme. Organize each flow around the player's task and keep cards and decks recognizable across tools.

## Shared defaults

Use `Button`, `Tabs` with `TabPanel`, `Panel`, `DialogSheet`, and `DisclosureChevron` before adding custom controls. Card previews use `CardArtTile` or `VisualCardTile`; card management uses `CardResult`. Keep persistence in feature controllers.

The theme in `app/src/index.css` owns colors and typography. `--spacing-control` defines the 48px minimum control target through `min-h-control` and `min-w-control`. Keep compact button text separate from target size. Use Panel's padding, tone, and elevation variants for surfaces. Essential status always has text, not just color. Respect reduced motion.

## Choose an interaction

| User need | Pattern | Required behavior |
| --- | --- | --- |
| Identify a card or deck | Visible artwork and readable title | Name fallback; known cards link to details; do not hide identity behind expansion |
| Understand a result | Visual comparison and concise labels | No explanatory disclosures or disclaimer panels; keep methodology in calculation docs |
| Edit quantities, loans, or assignments | DialogSheet | Parent retains drafts; local drafts use dirty protection; persistent save action; failed saves keep work and show inline error |
| Move between peer views | Tabs and TabPanel | Roving keyboard focus, selected state, panel association; preserve drafts and existing URL state |
| Confirm successful action | Toast | Specific outcome; add Undo only when a real reversal exists; do not put essential status only in a toast |
| Recover from failed action | Inline error near the task | Explain what remains saved or unsaved, provide retry, keep entered values |
| Perform a sustained task such as goldfishing | Dedicated page | Keep frequent actions near the work area; sticky controls must not obscure content or keyboard focus |

Show one primary action per task region. Navigation uses links; mutations use buttons. Require explicit acceptance before recommendations change a deck. Keep the selected deck, format, and relevant scope visible when crossing tools.

## Collection language

Use `CollectionCopyStatus` and `CollectionStatusHelp` for location summaries. Counts must come from `cardLocationState` or `collectionLocationIndex` in shared; never duplicate their arithmetic in presentation.

* **Owned:** recorded physical copies, including active loans and trade reservations. Proxies are separate.
* **Available to use:** owned copies excluding active loans and trade reservations. Includes copies assigned to other decks.
* **Assigned to decks:** copies recorded in deck locations. A deck recipe alone is not a location assignment.
* **Unassigned:** available copies without a deck assignment. This is not a verified binder location.
* **Lent to players:** copies on active loans, still owned until ownership changes.
* **Reserved for trades:** copies held for trades, unavailable to use. A trade listing alone is not a reservation.

These counts overlap; do not present them as slices of a total. Show reconciliation issues explicitly. Ownership coverage uses `OWNERSHIP_COVERAGE_NOTE` so a complete deck is not mistaken for one physically ready to play. Each deck's coverage is independent unless explicitly checking simultaneous assembly.

## Journey acceptance checks

Exercise the flow at 360–390px and desktop, with keyboard and touch targets checked. Verify loading, empty, unavailable data, failure/retry, and expanded states. Test text zoom and long titles where layout changes. Record checks that could not be run.

1. Find a deck → open its list → check ownership → edit quantities → save → confirm coverage updates. On failed save, retain the draft and retry without double adding.
2. Review missing cards → record an acquisition → return to the deck. Confirm missing counts and collection use the same saved quantities.
3. Locate a copy → assign it to a deck → review an explicit transfer to another deck. The total owned must remain unchanged.
4. Record a loan → verify owned stays constant and available decreases → record return → verify available recovers. Returned loans must not count as active.
5. Open analysis or playtesting with the selected deck → verify title, format, and card quantities survive the transition. Keep the original saved list unchanged until explicitly saved.

Use small representative fixtures for calculation and persistence boundaries. UI screenshots alone do not verify cross-feature data consistency.

## Expressive emphasis

Use larger deck titles and champion art to establish identity. Keep source badges subordinate to the title. `DeckVisualStrip` leads with the champion when known; immutable sources continue to use `DeckPreviewCard`. Editable builds retain their own controller and show their primary navigation action explicitly.

Use independent progress bars for owned and available copies, both against the selected deck scope. Never combine these overlapping counts into a chart. Collection readiness uses shared `deckLocationSummary`; catalog gaps, failed refreshes, and reconciliation issues must not imply a deck is ready. Expand blockers into named cards with direct location links. Sideboard inclusion must change both counts together.

Use the brief `state-arrive` opacity transition for transient feedback, not layout movement. Reduced motion overrides it. Persistent warnings stay visible and text labeled. Selected pill tabs include an outline as well as a tint.

Keep local motion brief (150–220ms). Shared sheets animate entry and user dismissal while preserving modal isolation, discard protection and focus restoration; parent-driven completion can unmount immediately. Tabs and evidence fade without changing draft ownership or remounting inputs. Use `useChangeMotion` for committed quantity and forecast changes; keep exact numbers immediately visible. Card artwork uses brightness feedback on its existing action target, with no grid movement or stagger. Reduced motion removes animation and transition delays as well as duration; programmatic tab scrolling must respect it too.

Import review uses the shared sheet, tabs, named card previews, draft protection, and a persistent confirmation action. Opening a card from an import review uses a new tab so the draft stays available. Library failures retain paste as an alternative; optional favorites failures do not hide owned builds.

Goldfish keeps Draw, Next turn, Memory, and Material within reach. Its footer measures its height and reserves content and focus scrolling space. Tool sheets isolate focus and sit above the footer. The latest action is inline live feedback, not a toast for every draw.

Use `identity-surface` and the controlled accent palette for decorative deck and folder identity. Champion accents are stable across saved deck cards and headers; they do not encode game elements or readiness. Keep status colors and labels separate. Folder cover selection uses `CardResult` inside the existing editor, with a live `DeckFolderPreview`; preserve appearance when changing membership. Keep error and recovery controls in the persistent footer when an expanded picker can scroll them out of view.

Advanced Analysis groups questions by task and gives each a single entry. Related detailed models
are peer tabs under the same question, with separate-input scope stated explicitly. Keep visited
models mounted while the deck workspace remains open so switching views cannot discard drafts.
Card handoffs update the requested scenario without remounting the whole workspace. Lead calculated
results with named card artwork and concise labels distinguishing calculated odds from estimates.
Keep supporting methodology in docs/CALCULATIONS.md. Large result panels should not become sticky overlays on narrow screens.

## Card printings

Use the shared `PrintingChoices` inside the existing sheet, with explicit edition artwork,
readable set/collector labels and a persistent Apply action. Phones use artwork-and-details
rows; desktop uses a wrapping grid. Selecting an edition never implies foil/nonfoil finish.
Keep unspecified copies valid, including legacy inventory and imported lists.

Collection **Add copies** changes ownership. **Identify existing copies** redistributes the
existing total across printing pools and preserves proxies. Keep all pools for a card in one
atomic save batch and revert that card's pending pools together. Draft saves carry expected
quantities; conflicts retain the draft for review instead of overwriting newer inventory.

Deck printings are optional, section-aware allocations saved with each owner's version, outside
canonical gameplay identity. Selected artwork and mixed-printing summaries appear in deck views.
Quantity reductions and partial moves must explicitly resolve affected printed copies. Ownership
counts shown by the picker are recorded inventory, not exact-printing availability or reservations.
Printing choices survive undo, drafts, version history, public copies, bookmarks and supported
share/text round-trips. Standard external exports disclose that they omit printing choices.

Deck calculator entry points start with four player questions; All calculators retains
full topic navigation. Switching questions preserves the shared deadline, play order,
card selections, and mounted detailed-model drafts. Results lead with the saved plan's
named cards and prompt only for missing role pools. Draw outcomes use labeled bars. Sensitivity
previews use concise comparisons. Previews never alter deck quantities or saved
roles. Catalog gaps and inherited roles needing review remain visible beside plan results.

Deck analysis results use draw-count and Reserve-cost bars with visible values. Natural draws and estimated extra draws retain distinct labels. Saved access comparisons name the selected cards and play order; use “Save for comparison,” not “baseline.” Do not add methodology accordions or opening-size summaries.

## Browse navigation and supporting evidence

Use shared pill Tabs for peer browse views (cards, decks, archetypes, and event results), with TabPanel associations for newly migrated views. Underline tabs remain appropriate inside a focused task such as choosing an import source. Wrap long browse tab sets on phones instead of compressing controls. Controls remain at least 48px tall.

Keep promotional messages outside sticky navigation and stable for the mounted visit. Use PageHeader for signed-out feature entry points. Import entry flows use one framing surface. Shared champion relationships show exact card variants and supported family summaries first, with one inline build-evidence disclosure per relationship; observed and zero-match details remain accessible inside it. Semantic danger, warning, and success colors are explicitly defined for the site's dark surfaces regardless of operating system theme.
