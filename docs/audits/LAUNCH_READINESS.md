# Launch readiness — 2026-09-29

Status: launch safeguards implemented and final automated gate passed; **not yet a launch sign-off**.

Initial baseline: `142e7524c5e203b0fc131c375c9977d1a08fb739`. During the audit, a concurrent card-search change was committed as `3dabdd94ddddba812fc244cf44bbf23540f3e347`; the user authorized continuing around it. The concurrent art-tag work subsequently landed in `99de01a4be54677a84500c1c01406caaaa9f88b6`; the final automated checks include both commits. No concurrent files were edited by this work.

## Scope and release decision

Public concrete archetypes remain the stable URLs and statistical records. Fractal definitions remain unreviewed hypotheses, available in the local curator. No reviewed pilot is published automatically. Recurrence is evidence of co-occurrence, not verified game mechanics. Account-backed user journeys are part of the service launch and require the account checklist below.

## Findings and fixes

| Priority | Finding | Resolution |
| --- | --- | --- |
| Launch blocker | Pages deployment previously built without running tests or validating published data | `npm run release:check` now gates deployment; PRs run the same checks |
| Launch blocker | Reference artifact generation appeared after the manifest reader's 200-byte prefix | Generation is serialized first; publication regression test and release artifact validator cover it; artifacts rebuilt |
| Launch blocker | App test invocation missed an obsolete `.tsx` test and used inconsistent JSX configuration | Release runner discovers `.ts` and `.tsx` tests with the app JSX configuration; removed the test for the deleted MissingCardShopping component, whose batching and encoding behavior is covered by `collectionShopping.test.ts` |
| Fix soon, completed | Registered-package test assumed only one catalog entry existed | Assert unique catalog IDs and the one active section-aware package, allowing unrelated inactive registry entries |
| Fix soon, completed | Curator backup export could throw when browser storage is blocked | Both curators show an error; shared persistence helper validates before writing, retains corrupt raw backups, and propagates quota/read failures; regression tests cover both store formats |
| Launch verification pending | No recorded D1 restore drill | Latest backup succeeded; rehearse the existing restore workflow and record the result before account launch sign-off |
| Launch verification pending | Authenticated production journey and rollback rehearsal | Requires a disposable account and an operator deployment/recovery record; use the service runbook |
| Acceptable limitation | Six existing Fast Refresh lint warnings | No lint errors; warnings do not affect production behavior |
| Acceptable limitation | No reviewed strategy definitions published | Public reviewed-strategies empty state is intentional; concrete builds remain available |

## Repeatable checks

- `npm run release:check`: all workspace typechecks, high-severity dependency audit, app lint, recursively discovered app/pipeline/account tests, both Cloudflare test suites, artifact validation, production build, release identity.
- `npm run release:data`: manifest timestamps, unique concrete IDs and membership, deck joins, reference population, and exact reference/build intersections. Read-only; never merges or rewrites concrete builds.
- `EXPECTED_REVISION=<commit> npm run release:smoke`: SPA entry and JS asset, deployed identity, manifest consistency, and account schema readiness. The deployment workflow retries this check for CDN propagation and fails visibly if it never passes.
- `app/dist/release.json` records commit, dirty state, and build time. A dirty local build is useful for preview but is rejected by the production smoke check.

## Release procedure and rollback

1. Complete remaining checks below and record a clean candidate commit. Review the candidate diff and generated data.
2. Push the candidate through the Pages workflow. All release gates must pass; do not bypass a failing gate.
3. Confirm the smoke job reports the candidate commit. Open Lorraine, a concrete archetype, a card detail, a deck, packages, and the two local curators on production.
4. Follow `docs/ACCOUNT_SERVICE_OPERATIONS.md` for account deployment, backups, authentication, ownership, export/delete, and migration checks. This release introduces no schema migrations.
5. If the SPA regresses, restore the previous known-good source/data commit through a reviewed revert and rerun deployment. Verify `release.json` and health after rollback. Do not roll back data independently of its manifest.
6. For Worker/BFF failures, use recorded deployment IDs and the account runbook. Database restoration is a separate recovery action; do not apply it as a routine code rollback.
7. Check logs, health, and user-reported failures after 24 hours, 72 hours, and one week. These post-launch checks are not scheduled yet because no candidate has been released by this task.

## Evidence and remaining checklist

- [x] Initial clean baseline recorded.
- [x] Smoke checker rejects the dirty local build as intended; hosted smoke remains pending deployment.
- [x] Rebuilt 75 reference definitions over 58,536 unique decks; 320 concrete builds unchanged.
- [x] Lorraine `1f7gr44` retains 667/667 Crux matches; no mechanics claim added.
- [x] Production account health: success, schema ready, required version `0025` (Origin header required).
- [x] Latest backup: [successful run, 2026-09-28](https://github.com/urakaiketsuya/FanOfIn.Site/actions/runs/36426817346).
- [x] Automated gate passed: 297 app, 119 pipeline, 59 account, 11 ingestion and 6 public API tests (492 total); workspace typechecks, lint, artifact validation and production build.
- [x] Production-preview checks at 360/390px and 1440px: named cards, Lorraine page, concrete detail and 667-deck membership, both curators, draft save/reload/reset, dirty dismissal, validation error, keyboard focus, expanded evidence, empty search and public reviewed-strategies empty state. Card detail and packages navigation also loaded successfully; browser error log was empty. No horizontal overflow on inspected pages.
- [ ] Authenticated account journey with disposable data — explicitly deferred by user; no disposable account available.
- [ ] Restore-drill and rollback rehearsal evidence.
- [ ] Deployed candidate identity and production browser smoke checks.
- [ ] Post-launch monitoring checks scheduled after release.

## Verification limits and follow-up priorities

- Concurrent card-tag changes arrived after the initial successful gate and were included in the final rerun. A clean committed candidate is still required before deployment; the launch changes remain uncommitted.
- The dependency audit has zero high/critical findings and four moderate findings in the Cloudflare development-tool chain, rooted in Undici 7.29.0 ([advisory](https://github.com/advisories/GHSA-3wwx-pv8p-q78v)). Miniflare pins that version. A normal refresh and scoped override did not resolve it with this workspace lock; the ineffective override was removed. Track a compatible tooling update; do not run the suggested breaking forced downgrade automatically.
- Storage quota, blocked reads and corrupt backups were simulated in unit tests for both curator formats. Validation-error and loading states were inspected in the browser. A fresh-origin local server returned HTTP 503 for the first reference request: the visible error and Retry control recovered to all 75 definitions. Complete offline behavior and real-device keyboard/slow-CPU behavior were not simulated.
- Local rule evaluation still loads the approximately 20MB deck index and evaluates on the main thread. Lower-memory mobile profiling remains pending; it is opt-in, and co-occurrence evidence does not verify combos.
- Desktop layout was checked through rendered DOM and full-page capture; the in-app browser's visible screenshot is clipped to its panel, and stitched full-page screenshots can repeat sections. Mobile capture is available at `/tmp/launch-mobile-curator.png` for this session.
- No production deployment, migration, rollback, restore drill or post-launch automation was performed by this task. The new workflows require a committed and pushed candidate before their hosted results can be verified.
