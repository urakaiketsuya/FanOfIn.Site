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
