# Card-first interaction components

Use these foundations when adding or revising UI. The standing acceptance criteria are in AGENTS.md.

- `CardResult`: artwork, readable name, selection/manage/detail action and feature-owned children. Used by collection browsing and deck card search. It does not mutate quantities or save data.
- `CardResultsToolbar`: shared search and wrapping controls. Each feature retains its filter/sort model and selection semantics.
- `DialogSheet`: native modal isolation, keyboard cycling, focus restoration, neutral dismissal and an optional persistent action footer. Pass `dirty` for edits held locally that closing would destroy. Pass `dismissible={false}` while saving. The caller owns validation, errors and persistence.
- `EditorDialog`: deck-specific labels on the same sheet foundation.
- `FilterPanel`: the shared sheet on mobile and inline expansion on desktop. Collection and deck browse options use the same sheet foundation with their own filter fields.
- `Button`, `TextInput`, `Select`, and `Tabs`: 48px minimum control height and visible keyboard focus. `DisclosureChevron` is the common disclosure indicator.
- `QuantityControl` and `deckEditing.ts`: deck quantity/section editing. Collection printing pools retain their separate quantity semantics; do not decrement an arbitrary printing when a card owns multiple editions.

Keep recommendations opt-in, preserve explicit saved display preferences, and keep card statistics available alongside the cards. A shared deck's preview is a bounded sample of its published Main deck, not a recommended core or its complete list.

## Verification for the September 2026 consistency pass

Checked the workbench at 390×844 and 1280×900: initial cards, selection/addition, populated deck, sorting/options, empty search, names and statistics, and overflow. Checked mobile card filters for reverse-tab containment, Escape, responsive desktop expansion and focus restoration. Verified collection card presentation and location-sheet empty, dirty/discard, interrupted-save and successful-save states using real components with isolated local fixtures (no account writes). Checked desktop sheet width and mobile persistent save actions. The temporary fixtures were removed.

Physical on-screen keyboard behavior and authenticated production writes were not exercised. Published deck previews require deploying both the app and updated account Worker; no database migration is needed. Older Worker responses remain supported without previews.
