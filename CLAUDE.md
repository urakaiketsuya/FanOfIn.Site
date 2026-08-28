# Fan of Insight

Grand Archive TCG tournament stats site: a static-JSON pipeline + client-only SPA for the core site, plus one small Cloudflare Worker + D1 backend (`worker/`) that ingests anonymous match telemetry from Clarent's TCGEngine simulator — no player identity is ever collected, and its public endpoint returns only aggregates. Everything else is still backend-free/no-user-data. See `/Users/avery/.claude/plans/tingly-sleeping-crab.md` for active/planned feature work and a shipped-features summary.

## Repo layout

npm workspaces: `app` (Vite/React/TS SPA), `pipeline` (Node/TS crawler + analysis), `shared` (TS types), `worker` (Cloudflare Worker + D1, match-telemetry ingestion from Clarent — see `worker/README.md`), `data` (published JSON artifacts, committed).

## Conventions

- **Deck identity** = main + material sections only. Sideboard is situational tech, excluded from every "what is this deck" grouping (Popular Decks, Archetypes, Card Impact, etc.) — the Guided Deck Builder is the one place sideboard is modeled explicitly.
- **deckId** format is always `${eventId}:${player}` — the join key across `deck-sightings.json`, `deck-card-index.json`, `archetype-taxonomy.json`, `card-impact.json`, etc.
- Card names in `deck-card-index.json` are dictionary-encoded (`[nameIndex, quantity]` tuples against a shared `cardNames[]`) — decode with `decodeCardLines()` from `@gatcg/shared`, never assume raw strings there.
- Every derived stat's formula/threshold (Elo, weightedScore, Card Impact shrinkage, deck-composition buckets, quantity-optimization margins, etc.) is documented in `docs/CALCULATIONS.md` — check there before re-deriving a threshold from scratch.
- Reusable scoring/formatting logic that both `app` and `pipeline` need goes in `shared/` (e.g. `shared/src/cardImpact.ts`), not duplicated in both.
- Client-side pages that recompute over a large dataset (Popular/All/Browse Decks, Guided Deck Builder) wrap state changes in `useTransition` so the UI shows "recalculating…" instead of appearing to hang.
- **Tournament data and Clarent simulator telemetry are separate populations — never blend them.** Simulator/Clarent evidence (`SimulatorSummary`, `worker/`) is real anonymous playtest data, not a substitute for tournament results: it must never be merged into tournament win rates or Card Impact numbers, and any UI surfacing it (e.g. `/simulator`, the Guided Deck Builder's "Simulator" population source) must label it explicitly as experimental/simulator-sourced. The Deck Builder's implementation is the reference pattern: simulator evidence never defines what's in a deck, only re-sorts cards a community-assembled shell already legally supports.

## Bash/git safety

- Bash's cwd does not reliably persist between tool calls in this environment — `cd` explicitly (don't rely on a prior `cd`) before any pipeline/git/typecheck command, and verify with `pwd` after anything that looks off.
- Before staging/committing, always run `git status --short` first and stage only the files actually changed for the current task. Do not touch these paths — they belong to other concurrent Claude Code sessions working in this same repo:
  - `app/index.html`
  - `app/src/features/compare/DeckSearchByCards.tsx`
  - `.claude/`
  - `app/public/apple-touch-icon.png`, `favicon-16.png`, `favicon-32.png`
  This list can drift — `git status --short` showing unexpected modifications/untracked files in a path you didn't touch is the real signal, not this list by itself.

## Verification workflow

- Typecheck every touched workspace after a change: `cd app && npx tsc -b --noEmit`, `cd pipeline && npx tsc --noEmit -p .`, `cd shared && npx tsc --noEmit -p .`, `cd worker && npm run typecheck` (each needs its own explicit `cd`).
- Verify a game-mechanic or data-shape claim against real data (the live API, `pipeline/.cache/cards.json`, or a published `data/*.json`) before building a stat around it — don't assume a mechanic exists or behaves some way from memory alone.
- For UI changes, verify live in a **fresh** browser tab — reusing a tab after a big HMR update can throw misleading stale-module errors (e.g. `ReferenceError: useRef is not defined`) that aren't a real bug.
