# Interface patterns

Use Material interaction principles with the existing Catppuccin theme. Organize each flow around the player's task and keep cards and decks recognizable across tools.

## Shared defaults

Use `Button`, `Tabs` with `TabPanel`, `Panel`, `DialogSheet`, and `DisclosureChevron` before adding custom controls. Card previews use `CardArtTile` or `VisualCardTile`; card management uses `CardResult`. Keep persistence in feature controllers.

The theme in `app/src/index.css` owns colors and typography. `--spacing-control` defines the 48px minimum control target through `min-h-control` and `min-w-control`. Keep compact button text separate from target size. Use Panel's padding, tone, and elevation variants for surfaces. Essential status always has text, not just color. Respect reduced motion.

## Choose an interaction

| User need | Pattern | Required behavior |
| --- | --- | --- |
| Identify a card or deck | Visible artwork and readable title | Name fallback; known cards link to details; do not hide identity behind expansion |
| Inspect optional evidence or methodology | Inline details with DisclosureChevron | Clear label, keyboard access, 48px summary; no nested disclosure by default |
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

Import review uses the shared sheet, tabs, named card previews, draft protection, and a persistent confirmation action. Opening a card from an import review uses a new tab so the draft stays available. Library failures retain paste as an alternative; optional favorites failures do not hide owned builds.

Goldfish keeps Draw, Next turn, Memory, and Material within reach. Its footer measures its height and reserves content and focus scrolling space. Tool sheets isolate focus and sit above the footer. The latest action is inline live feedback, not a toast for every draw.

Use `identity-surface` and the controlled accent palette for decorative deck and folder identity. Champion accents are stable across saved deck cards and headers; they do not encode game elements or readiness. Keep status colors and labels separate. Folder cover selection uses `CardResult` inside the existing editor, with a live `DeckFolderPreview`; preserve appearance when changing membership. Keep error and recovery controls in the persistent footer when an expanded picker can scroll them out of view.
