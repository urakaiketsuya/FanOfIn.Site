# Dead Code Audit — 2026-09-05

Method: ran `knip` (workspace-aware unused-code analyzer) across all 6 npm workspaces
(`app`, `shared`, `pipeline`, `worker`, `account-worker`, `account-bff`), then manually
verified every "unused file" finding and cross-checked a large sample of "unused export"
findings against the actual working tree. Verification deliberately excluded
`.claude/worktrees/**` (other concurrent Claude Code sessions' separate git worktrees) —
grepping those in gives false "it's used!" hits that have nothing to do with this tree.

No unused npm dependencies were found. One unlisted dependency turned up (`cloudflare`,
used in `worker/test/apply-migrations.ts` and `worker/test/ingestion.test.ts` but not in
`worker/package.json`) — the opposite problem from dead code, flagging it for awareness
only.

## Confirmed dead — safe to remove

| File | Symbol | Note |
|---|---|---|
| `app/src/pages/Placeholder.tsx` | whole file | "Coming in {phase}" stub; no longer referenced by `routes.tsx` |
| `app/src/features/tournaments/useLatestSeason.ts` | whole file | Fully implemented hook, zero callers anywhere |
| `app/src/lib/deckBuilderLink.ts` | `decodeLockedCards` | Superseded — `DeckBuilderIndex.tsx` decodes shared links via a different `parseBuilderShareParams` path instead |
| `app/src/lib/deckBuilderLink.ts` | `buildDeckBuilderUrl` | Absolute-URL variant, zero callers; only the relative `buildDeckBuilderPath` is actually used (6 call sites) |
| `app/src/components/ui/FormControl.tsx` | `Textarea` | No renders anywhere in the app |
| `app/src/features/community/data.ts` | `useCommunityDeckIndex` | Zero callers |
| `app/src/features/packs/packOdds.ts` | `PACK_SIZE` | Zero references outside its own declaration |
| `pipeline/src/tcgarchitect/cache.ts` | `readTcgArchitectHarvestMeta` | Zero callers |
| `worker/src/schema.ts` | `PlayerGameStatsV1`, `CombatEventV1` | Zero references |

## False positives in the raw scan (do NOT remove)

- **`account-bff/api/index.ts`** — knip lists it as an "unused file," but it's the Vercel
  serverless function entry point (`account-bff/vercel.json` routes `/api/*` here).
  Vercel's runtime invokes it directly; nothing in the JS graph imports it, so knip can't
  see the reference.
- **`pipeline/src/analysis/deckSightings.ts`: `canonicalSignature`** — flagged unused, but
  `pipeline/src/analysis/achievements.ts` genuinely imports it
  (`import { canonicalSignature } from "./deckSightings.js"`). Knip's resolver appears to
  trip on the `.js`-extension ESM import style the pipeline workspace uses throughout —
  treat pipeline's export findings with a bit more skepticism than app/shared/worker's.

## In progress — don't touch

- **`app/src/features/deckbuilder/usePoolPopulation.ts`** and
  **`useGlobalElementSuggestions.ts`** — fully built, carefully documented hooks
  implementing three cross-Champion suggestion pools, just not wired into
  `DeckBuilderIndex.tsx` yet. Both files are currently uncommitted/modified in the working
  tree, which is consistent with an in-flight feature rather than abandoned code.
- `app/src/lib/decodedDecks.ts`'s `decodedDeckToRow` is dead only as a side effect of the
  above — its one real caller is the not-yet-wired `usePoolPopulation.ts`.

## Lower-priority — exported but only used inside their own file

The remaining ~60 items knip flagged are genuinely called/used, just never imported by
*another* file — so the `export` keyword is unnecessary, but removing it is cosmetic, not
a dead-code fix. Spot-checked a representative sample (`GatcgDB`, `encodeLockedCards`,
`buildClusterCentroid`, `decodeAllDecks`, `DECKS_DIR`, several `*Row`/`*Summary`
interfaces in `regions`/`tournaments`/`compare`) and the pattern held throughout.
Grouped by file (constants/functions and types combined):

- `app/src/lib/deckTestResult.ts` — `DECK_TEST_MATCH_THRESHOLD`, `buildClusterCentroid`, `DeckTestPerformance`
- `app/src/lib/deckIdentity.ts` — `parseSubtypeScalingStat`, `SubtypeScalingStat`, `DeckRatingSignals`*
- `app/src/lib/deckBuilderLink.ts` — `encodeLockedCards`
- `app/src/lib/db/index.ts` — `GatcgDB`, `SyncMetaRow`, `PublishedDataRow`
- `app/src/features/deckbuilder/localPackageApprovals.ts` — `approveLocalPackage`, `approveLocalPackageFamily`, `revokeLocalPackage`
- `worker/src/storage.ts` — `RAW_PAYLOAD_RETENTION_DAYS`, `StoredSubmission`
- `pipeline/src/shoutatyourdecks/cache.ts` — `DECKS_DIR`, `readProgress`
- `pipeline/src/pricing/tcgcsv.ts` — `TcgcsvCategory`, `TcgcsvExtendedDataField`
- `pipeline/src/omnidex/cache.ts` — `EVENTS_DIR`, `readProgress`
- `app/src/lib/regions.ts` — `COUNTRY_TO_REGION`, `REGION_LABELS`
- `app/src/lib/decodedDecks.ts` — `decodeAllDecks` (+ `decodedDeckToRow`, see above)
- `app/src/lib/cardQuantityAdvice.ts` — `MIN_GLOBAL_QUANTITY_SAMPLE`, `QUANTITY_OPTIMIZATION_MARGIN`
- `app/src/features/tournaments/useSeasonMeta.ts` — `SeasonChampionRow`, `SeasonArchetypeRow`
- `app/src/features/packs/packOdds.ts` — `FOIL_RATE`
- `app/src/features/decks/useTopDecksForChampion.ts` — `TopDeckRef`, `TopArchetypeDeckRef`
- `app/src/features/deckbuilder/synergyReadiness.ts` — `ReadinessCheckpoint`, `ReadinessCurvePoint`
- `app/src/features/compare/useComparisonData.ts` — `ComparisonSection`, `ComparisonDeckStats`
- `app/src/features/community/data.ts` — `championToSlug`*
- `account-worker/src/content-policy.ts` — `containsBlockedLanguage`
- `app/src/components/DonutChart.tsx` — `CHART_PALETTE`
- `app/src/features/deckbuilder/useCommunitySuggestedBuild.ts` — `buildCommunitySuggestedDeck`
- `app/src/features/deckbuilder/useSimulatorSuggestedBuild.ts` — `applySimulatorEvidence`
- `app/src/features/official-products/data.ts` — `PRODUCT_RELEASE_DATES`
- `app/src/features/timelines/data.ts` — `normalizeCardMention`
- `app/src/lib/dataFreshness.ts` — `REQUIRES_REGEN_AFTER`
- `pipeline/src/analysis/decklists.ts` — `buildDeckSignature`
- `pipeline/src/analysis/diaoV1Legacy.ts` — `DIAO_V1_SCORE_BANDS`
- `pipeline/src/cards/catalog.ts` — `normalizeCardKey`
- `pipeline/src/shoutatyourdecks/decklistFetch.ts` — `fetchDecklist`
- `pipeline/src/shoutatyourdecks/metadataFetch.ts` — `parseDeckSummary`
- `app/src/features/cards/filters.ts` — `SpeedFilter`
- `app/src/features/cards/useCardCombination.ts` — `RawCardCount`
- `app/src/features/compare/types.ts` — `ComparedDeckSource`
- `app/src/features/compare/useComparisonSummary.ts` — `ComparisonChangeKind`
- `app/src/features/deckbuilder/deckTrimming.ts` — `TrimCandidate`
- `app/src/features/deckbuilder/newReleaseCards.ts` — `NewReleaseCombo`
- `app/src/features/deckbuilder/validateDeck.ts` — `DeckValidationStatus`
- `app/src/features/diao-review/data.ts` — `DeltaSummary`
- `app/src/features/products/data.ts` — `ProductType`
- `app/src/features/regions/useChampionRegionalBreakdown.ts` — `ChampionRegionRow`
- `app/src/features/regions/useRegionalArchetypes.ts` — `RegionalArchetypeRow`
- `app/src/features/regions/useRegionalChampions.ts` — `RegionalChampionRow`
- `app/src/features/regions/useRegionalVenues.ts` — `RegionalVenueEvent`
- `app/src/features/regions/useRegionDecodedDecks.ts` — `RegionDeckLines`
- `app/src/lib/aggressionForecast.ts` — `AggressionForecastPoint`
- `app/src/lib/cardDecay.ts` — `CardDecayReplacement`
- `app/src/features/deckbuilder/components/BuilderCardGrid.tsx` — `CardTile`*
- `pipeline/src/analysis/packageCandidates.ts` — `ArchetypePackageSource`*
- `pipeline/src/tcgarchitect/client.ts` — `TcgArchitectApiCardPivot`

\* These four (`DeckRatingSignals`, `championToSlug`, `CardTile`, `ArchetypePackageSource`)
showed up in a plain-text grep at other locations too, but on inspection those hits were
either doc-comment mentions (not real imports) or same-named-but-unrelated declarations
in other files — not genuine external usage.

## Recommendation

Delete the 9 items in "Confirmed dead" — that's the only bucket with zero ambiguity and
zero risk. Leave everything else alone: the "in progress" hooks are someone's uncommitted
work, the "false positives" are real dead ends in the tool rather than the code, and the
"lower-priority" list is a style nit (unnecessary `export`) rather than anything actually
unused.
