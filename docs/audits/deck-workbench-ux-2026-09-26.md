# Deck Workbench UX audit — 2026-09-26

## Verdict

The workbench has successfully removed compulsory recommendation setup, but the replacement manual workflow is underdeveloped. The current design exposes cards immediately, then separates browsing from deck editing after the first addition. Its most important shortcoming is task support: a user who knows a card name can build, but a user who knows what their deck needs has few manual discovery tools.

Keep the shared deck mutations, quantity controls, section-aware moves, undo/redo, and save/versioning services. Redesign the workbench's interaction structure around finding cards and editing one persistent deck.

## Evidence and scope

Read-only inspection at 390×844 and 1280×900: empty workbench, Save & export, More menu, card presentation and page geometry. No horizontal overflow observed in these views. Source inspection covered populated-deck branching, card search, card editing, recommendations, validation and session persistence.

Automatic approval review blocked adding a test card because the audit did not authorize changing draft data. Populated-deck interactions below are source-confirmed, not hands-on usability results. No inventory or deck contents were changed. Signed-in saves, actual keyboard-open viewport behavior, and populated-deck focus transitions were not verified. This is an expert audit, not a user study.

## Findings, in priority order

### High: manual discovery is a name lookup, not a useful catalog

`CardSearchResults.tsx:18` matches terms against names only, orders alphabetically, and initially displays eight cards. `CardBrowser.tsx` offers only search and destination. There are no manual element, type, subtype, cost, rules-text or ownership filters. The immediate choices are cards beginning with A, independent of the user's task.

Impact: “Find water allies”, “show Melody cards”, and “find cheap interaction” cannot be expressed through the normal building flow. Users must know exact names, leave the workbench, or request recommendations.

Change: reuse the site's catalog filtering model. Keep search visible, add a clearly labeled Filters control, and expose active filters as removable chips. Search names and rules text. Element compatibility should be an explicit filter, with access to all cards retained. Use one catalog component for manual and assisted discovery.

### High: the first addition changes the interaction model

`BuilderBuildPanel.tsx:68–78` replaces the inline catalog with a deck summary and Add cards button as soon as any deck or maybeboard card exists. Subsequent browsing opens `EditorDialog`, a full-height modal on mobile and a modal side panel on desktop. Search is cleared when reopening it. The Add cards trigger itself is not sticky.

Impact: finding cards and assessing their effect on the deck become separate modes. The deck is obscured while browsing; returning to the catalog requires reopening it. As a deck grows, the top Add cards control becomes farther away. The transition is particularly surprising when the first addition is only to the maybeboard: the displayed deck count excludes maybeboard cards.

Change: persistent Cards and Deck surfaces. On desktop show a catalog beside a compact deck list. On mobile use reachable Cards / Deck controls with section counts and preserved search/scroll state. Adding must keep the user on their chosen surface and provide a short confirmation with Undo.

### High: frequent editing is hidden behind detail interactions

`DeckEditorCard.tsx:19–40` hides quantity controls behind the quantity badge. Moving copies requires opening a card dialog and then expanding Move copies. Removing the last copy requires the detail dialog because `QuantityControl` stops at one. Grid cards with art have no separate readable name caption; the card image must carry identification.

Impact: adjusting quantities, trimming and sideboarding require repeated disclosure. The grid optimizes for large art more than efficient deck editing. This also falls short of the repository's visible-name/card-first acceptance criteria.

Change: a compact editable deck row with thumbnail, linked readable name, quantity and a clear row action menu. Keep quantity adjustment immediately reachable. Put Move and Remove in a single menu or focused sheet; retain split-move support and Undo. Keep an optional art grid using the shared card tile.

### Medium: recommendations still have their own legacy interface

`BuilderBuildPanel.tsx:110` gates recommendations on champion and spirit. `BuilderCardExplorer.tsx:23–61` renders at most twelve recommendations as text/evidence cards, relies on hover for art, and disables Add to deck once a card is already chosen. Settings are in a separate More → Recommendation settings view.

Impact: requesting help changes presentation and control semantics. A mobile user loses visible card art, and an existing one-copy selection cannot be topped up through that suggestion's Add button. Context for suggestions and configuration are separated.

Change: opt-in suggestions inside the same Cards surface, with the same art, details and quantity controls. Ask for missing context only when necessary. Keep settings and brief explanations next to the suggestions. Leave detailed statistical evidence behind a disclosure.

### Medium: saving and readiness still speak the old model

The observed Save & export view leads with an incomplete warning and the text “Choose and add a Spirit before treating this as a completed recommendation.” This originates in `validateDeck.ts:83`. Saving drafts is supported, but its explanation appears below validation. The editor header has no deck title or visible draft-save status. `useBuilderSessionPersistence.ts:8` writes to sessionStorage; that is session-scoped recovery, not a durable saved deck.

Impact: “save my work” feels like a completion stage. Users must infer the distinction between current draft recovery and a saved account deck. The recommendation language contradicts manual building.

Change: a deck title and accurate save status in the workspace header, with Save as a routine action. Show compact construction status and expand issues on demand. Draft saves should remain available regardless of completeness. Label browser-only recovery accurately and distinguish it from account saving. Offer exports through a focused secondary menu.

### Medium: the hierarchy still follows feature buckets

More combines format, recommendation settings, history, display, analysis and review. Recommendations are beneath the entire deck. In the inspected 390px empty state, Paste a decklist begins around y=1856, Open saved deck at y=1912, and Recommend cards at y=1976—below four rows of alphabetically ordered cards.

Impact: useful alternate starting paths are easy to miss; related settings are distant from their work. Progressive disclosure reduces clutter but does not by itself produce coherent task organization.

Change: place compact Import / Open actions near the empty-state header, hiding them after work begins as intended. Put format with deck identity, display with the relevant surface, history with Undo, and recommendation settings with suggestions. Analysis and review remain separate tools, with an explicit current-deck handoff.

## Proposed interaction structure

- Header: deck title, format, accurate save state, Save and deck actions.
- Cards: visible name/rules search, optional filters, consistent card tiles, explicit Add and quantity feedback. Recommendations are an opt-in mode within this surface.
- Deck: Material, Main, Sideboard and Maybeboard counts; compact editing; optional visual layout; local move/remove actions.
- Mobile: persistent Cards / Deck switching, preserving queries and scroll. Respect safe areas and the on-screen keyboard.
- Desktop: simultaneous catalog and deck, with independent scrolling where needed and a clear focused pane.
- Supporting actions: export, history, analysis and review via focused menus or handoffs; do not turn them into mandatory stages.

## Implementation order and acceptance checks

1. Manual discovery and persistent Cards/Deck structure. From an empty deck, find cards by subtype and rules text, add three different cards without reopening search, and inspect deck counts without losing the result set.
2. Compact deck editing. Set four copies directly, split two into Sideboard, remove the last copy and Undo. Names remain readable in every layout. Moves conserve copies.
3. Save/readiness clarity. Save an incomplete draft; clearly distinguish account success, failure and browser recovery. No recommendation-specific language in manual validation.
4. Recommendations within the catalog. Enable help only on request, keep actual selections distinct, show card art on mobile, and allow quantity adjustment for already-present cards.
5. Verify at 390px and desktop with a realistic 60-card deck, long names, missing images, catalog loading/error, zero matches, keyboard navigation, and an open mobile keyboard. Confirm no overlay hides editing actions.

These priorities address utility first. Visual polish should support the new structure once those task flows work.

## Implementation and verification

Implemented the persistent Cards/Deck workspace, name/rules search and optional catalog filters, compact shared editing with split moves and zero-copy removal, header title/format/save state, and opt-in suggestions in the same card catalog. Export and history open focused dialogs. Analysis and review use the existing current-deck handoff. Account saves retain the saved deck ID so subsequent edits create versions; pending saves cannot mark newer edits as saved. Session recovery reports storage failures.

Verified at 360px and 390px mobile widths and 1280px desktop: repeated additions without closing search; direct quantities; moving two of four copies to Sideboard; removing the last copy and Undo; empty results; rules/subtype/element filters; suggestions loading and deduplication; and session reload recovery. A 60-card Main deck plus two Material cards retained catalog scroll across Cards/Deck switching and an export-dialog round trip. Mobile primary controls measured at least 48px, with no horizontal page overflow. Desktop presents both panes.

The isolated save fixture verified initial save, subsequent version creation, failure, and edits during an in-flight save without writing to an account. Sixteen targeted tests cover catalog filtering, section-aware edits, manual builds and persistence, including storage failure. Typecheck and lint were also run.

Limitations: real account writes, a physical mobile on-screen keyboard, and a forced catalog network failure were not exercised. Catalog failure messaging is implemented; unavailable collection feedback was observed. The temporary save fixture was removed after verification.
