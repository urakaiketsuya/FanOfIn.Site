# AGENTS.md — Fan of Insight

Grand Archive TCG stats site. npm workspaces: `app` (Vite/React/TS SPA), `pipeline` (Node/TS crawler + analysis), `shared` (TS types + scoring logic), `worker` (Cloudflare Worker + D1, match-telemetry ingestion), `data` (committed JSON artifacts).

## Commands

```bash
# Dev server (app)
npm run dev

# Pipeline (full run, analysis-only, SYD sub-modes, simulator)
npm run pipeline
npm run pipeline:analysis
npm run pipeline:syd:harvest   # also: metadata, decklists, build, analytics
npm run pipeline:simulator

# Worker (dev / test / deploy)
npm run worker:dev
npm run worker:test
npm run worker:deploy   # from worker/ dir

# Typecheck (each workspace needs its own cd — cwd doesn't persist between tool calls)
cd app && npx tsc -b --noEmit
cd pipeline && npx tsc --noEmit -p .
cd shared && npx tsc --noEmit -p .
cd worker && npm run typecheck

# Pipeline tests
cd pipeline && npm test

# App lint (oxlint)
cd app && npm run lint
```

## Key conventions

- **deckId** = `${eventId}:${player}` — join key across all data files.
- **Deck identity** = main + material sections only. Sideboard excluded from grouping/stats (only modeled in the Guided Deck Builder).
- `deck-card-index.json` uses dictionary-encoded card names (`[nameIndex, quantity]` tuples). Decode with `decodeCardLines()` from `@gatcg/shared`.
- Derived stat formulas/thresholds live in `docs/CALCULATIONS.md` — check there before re-deriving.
- Cross-workspace reusable logic goes in `shared/`, not duplicated in app or pipeline.
- Pages that recompute over large datasets use `useTransition` for "recalculating…" UX.

## UX/UI defaults — apply without prompting

All new or revised user interfaces must be mobile-first, follow Material Design interaction principles, and use progressive disclosure. Treat these as standing acceptance criteria, including when a task only asks for a feature or bug fix that changes UI.

- Use card-first design for card, deck, and package experiences: show the actual game cards with the shared `CardArtTile` (or `VisualCardTile` when stats are needed) before configuration and detailed evidence. Keep readable card names visible, link known cards to their details, and provide a name fallback when art or catalog data is unavailable. Use responsive, wrapping grids; do not require hover or opening a review panel to identify the cards. Package summaries must distinguish the full card pool from an exact tested variant or required core.
- Start with a single-column layout at 360–390px. Add desktop enhancements after the mobile flow works. Preserve the site's existing theme and shared components; this rule does not require adopting a new component library.
- Make the user's immediate task and primary action obvious. Let users begin with minimal setup; ask for information only when the next action requires it. Preserve unfinished work and support drafts.
- Show essential content and common actions first. Reveal optional recommendations, advanced filters, tuning, evidence, and methodology on demand through clearly labeled controls. Keep errors, required fields, and important status visible.
- Use the shared `DisclosureChevron` for dropdown/disclosure indicators (20px with consistent stroke and alignment), rather than small text glyphs.
- Reuse `components/ui/DialogSheet` for modal sheets (focus isolation/restoration, neutral dismissal, persistent footer, and `dirty` protection for locally held edits). Use `CardResult` for browse/select/manage card surfaces; keep mutations and persistence in feature controllers. Parent-owned quantity drafts do not need a discard prompt on every card sheet.
- Use consistent Material-style hierarchy, spacing, surfaces, and action emphasis. Prefer an inline expansion for local details and a dialog or bottom sheet for a focused secondary task. Avoid nested disclosure and competing primary buttons.
- Provide touch targets of at least 48×48 CSS pixels for mobile controls, readable labels, visible keyboard focus, accessible names, and appropriate expanded/selected states. Do not rely on hover, color, or icons alone to communicate actions or state.
- Keep frequent actions reachable while scrolling, but ensure sticky controls and overlays do not cover content, focused fields, or actions when the on-screen keyboard is open. Avoid horizontal page scrolling.
- Recommendations are opt-in assistance. Keep suggestions distinct from the user's actual selections; add or replace content only through an explicit user action. Ask for missing recommendation context when recommendations are requested, rather than blocking manual work.
- Before calling a UI change complete, verify the main flow at a narrow mobile viewport and a desktop viewport. Check empty, loading, error, and expanded states relevant to the change, plus touch target sizes, keyboard access, and overflow. Report any verification that could not be performed.

- Follow [docs/UX_PATTERNS.md](docs/UX_PATTERNS.md) for interaction selection, shared defaults, collection status language, and cross-feature journey acceptance checks.

## Architecture and refactoring

### Persistence and validation

- Treat writes that establish one logical resource as a single atomic operation. Failure must not leave partially initialized records. Account for retries and concurrent requests; a preflight existence check alone does not guarantee consistency.
- For persistence changes, test rollback, retry behavior, and relevant uniqueness conflicts.
- Validate user-authored display text through the shared content policy. Keep field-specific length, normalization, and required-value rules explicit. Cover create, update, and publication paths.
- Keep trusted catalog text and abuse-report evidence distinct from user-authored display text when applying content policy.
- Share input validation and canonicalization across equivalent mutation paths. Preserve intentional differences between creating a version and updating an existing version.
- Keep general infrastructure, such as asset fetching, outside domain modules. Unrelated features should not import deck persistence merely to fetch an asset.

### Component boundaries

- Inspect existing shared components before introducing a new UI primitive. Use `Tabs`/`TabPanel` and `Button`, along with the dialog and card components specified above. Extend them narrowly when needed instead of duplicating their behavior.
- Deck editing controls belong in `app/src/components/deck-editor/`; immutable section-aware mutations belong in `app/src/lib/deckEditing.ts`. Reuse them in Builder and My Decks. Keep account saves/versioning and recommendation orchestration in their feature controllers. Moves must conserve copies, support splitting across sections, and never silently truncate or reroute cards.
- Extract components around a coherent user task or independently managed interaction, not an arbitrary line count. Prefer focused values and callbacks over passing an entire page controller.
- Keep feature-specific components local until another feature needs them. Avoid shared components with many unrelated flags or optional action modes.
- Shared presentation must preserve the distinction between accepting suggestions and editing selected cards.
- When extracting stateful UI, preserve draft ownership, mounting behavior, URL state, focus restoration, and failed-save recovery.

### Refactoring verification

- Separate behavior fixes from structural refactors where practical. Keep changes small enough to review independently.
- Before restructuring analysis algorithms, establish representative end-to-end fixtures. Preserve stable identifiers, membership, ordering, and calculated outputs unless a behavior change is explicitly requested.
- Run checks appropriate to the changed boundary. Structural UI changes still require the mobile, desktop, and accessibility verification above.

## Gotchas

- **cwd doesn't persist** between tool calls — always `cd` explicitly before commands.
- **Stale browser tabs** after HMR can throw misleading errors (e.g. `ReferenceError: useRef is not defined`). Use a fresh tab.
- **Verify game-mechanic claims** against real data (`pipeline/.cache/cards.json` or `data/*.json`) — don't assume from memory.
- **Worker requires `INGESTION_API_KEY` secret** — won't work without it (see `worker/wrangler.jsonc`).
- **Worker TypeScript** is pinned to ~5.9.2 (different from app/pipeline/shared which use ~6.0.2).

## Git

- After completing implementation and relevant verification, commit the task's changes without waiting for a separate commit request. Report any verification limitations. Push only when requested.
- In the final response, report the commit and tell the user the next recommended work item, including any blockers.
- Whenever reporting what is next, also name the current initiative and give its estimated completion percentage. Base the estimate on completed versus remaining scope, briefly explain the basis, and identify uncertainty when the scope is not fully defined.
- During an audit, report findings and proposed changes without editing files unless implementation is requested.
- `git status --short` before staging. Stage only files changed for current task.
- Don't touch: `app/index.html`, `app/src/features/compare/DeckSearchByCards.tsx`, `.claude/`, `app/public/{apple-touch-icon,favicon-16,favicon-32}.png`.
- These are owned by concurrent sessions; unexpected modifications in unrelated paths are the real signal to stop.
