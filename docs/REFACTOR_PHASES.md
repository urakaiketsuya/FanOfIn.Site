# App component and Deck Builder refactor

This checklist keeps the UI-system work and Deck Builder architecture work coordinated. Every phase
must preserve behavior and finish with app typecheck, lint, and focused tests passing.

## Phase 1 — Safeguards and boundaries

- [x] Add characterization tests for builder persistence and engine source/collection behavior.
- [x] Record the implementation phases and ownership boundaries.
- [x] Recheck and preserve unrelated working-tree changes before each phase.

## Phase 2 — Shared UI foundations

- [x] Add a width-aware `PageLayout`.
- [x] Add shared `Panel`, `Section`, and content-state components.
- [x] Extend the shared tabs API with a reusable tab-panel primitive.
- [x] Establish shared button and form-control styles.

## Phase 3 — Pilot migrations

- [x] Migrate all forty-five standard route shells to `PageLayout`.
- [x] Adjust the APIs based on real page needs before broad migration.

## Phase 4 — Builder model and persistence

- [x] Define the serializable builder selection and session contracts; evidence/result contracts remain with the engine.
- [x] Move session and share-link codecs into tested modules.

## Phase 5 — Pure builder engine

- [x] Separate tournament, community, and simulator recommendation functions from their React hook adapters.
- [x] Compose `buildSuggestedDeck(selection, evidence)`; collection, review, decklist, and price selectors are extracted.

## Phase 6 — Data, controller, and services

- [x] Add a builder data gateway.
- [x] Move durable workflow state to a reducer/controller.
- [x] Isolate account persistence, clipboard, export, and external destinations.

## Phase 7 — Builder panels

- [x] Extract the change log, improvement review, tools, stats, buddy, and card-row surfaces behind narrow panel/component contracts.
- [x] Leave ephemeral presentation state local to its panel.

## Phase 8 — App-wide migration and cleanup

- [x] Migrate remaining standard route shells.
- [x] Migrate reusable tabs and representative panel/content states; retain feature-specific composition where the shared contracts do not fit.
- [x] Keep domain components feature-local until cross-feature reuse is demonstrated.
- [x] Remove obsolete implementations and complete typecheck, lint, tests, build, and representative visual checks.
