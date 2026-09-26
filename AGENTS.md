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

- Start with a single-column layout at 360–390px. Add desktop enhancements after the mobile flow works. Preserve the site's existing theme and shared components; this rule does not require adopting a new component library.
- Make the user's immediate task and primary action obvious. Let users begin with minimal setup; ask for information only when the next action requires it. Preserve unfinished work and support drafts.
- Show essential content and common actions first. Reveal optional recommendations, advanced filters, tuning, evidence, and methodology on demand through clearly labeled controls. Keep errors, required fields, and important status visible.
- Use the shared `DisclosureChevron` for dropdown/disclosure indicators (20px with consistent stroke and alignment), rather than small text glyphs.
- Use consistent Material-style hierarchy, spacing, surfaces, and action emphasis. Prefer an inline expansion for local details and a dialog or bottom sheet for a focused secondary task. Avoid nested disclosure and competing primary buttons.
- Provide touch targets of at least 48×48 CSS pixels for mobile controls, readable labels, visible keyboard focus, accessible names, and appropriate expanded/selected states. Do not rely on hover, color, or icons alone to communicate actions or state.
- Keep frequent actions reachable while scrolling, but ensure sticky controls and overlays do not cover content, focused fields, or actions when the on-screen keyboard is open. Avoid horizontal page scrolling.
- Recommendations are opt-in assistance. Keep suggestions distinct from the user's actual selections; add or replace content only through an explicit user action. Ask for missing recommendation context when recommendations are requested, rather than blocking manual work.
- Before calling a UI change complete, verify the main flow at a narrow mobile viewport and a desktop viewport. Check empty, loading, error, and expanded states relevant to the change, plus touch target sizes, keyboard access, and overflow. Report any verification that could not be performed.

## Gotchas

- **cwd doesn't persist** between tool calls — always `cd` explicitly before commands.
- **Stale browser tabs** after HMR can throw misleading errors (e.g. `ReferenceError: useRef is not defined`). Use a fresh tab.
- **Verify game-mechanic claims** against real data (`pipeline/.cache/cards.json` or `data/*.json`) — don't assume from memory.
- **Worker requires `INGESTION_API_KEY` secret** — won't work without it (see `worker/wrangler.jsonc`).
- **Worker TypeScript** is pinned to ~5.9.2 (different from app/pipeline/shared which use ~6.0.2).

## Git

- `git status --short` before staging. Stage only files changed for current task.
- Don't touch: `app/index.html`, `app/src/features/compare/DeckSearchByCards.tsx`, `.claude/`, `app/public/{apple-touch-icon,favicon-16,favicon-32}.png`.
- These are owned by concurrent sessions; unexpected modifications in unrelated paths are the real signal to stop.
