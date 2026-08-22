/**
 * ISO timestamp of the latest pipeline-code fix that a published `data/analysis/*.json` file needs
 * to have been regenerated at or after to actually reflect — see `docs/CALCULATIONS.md`'s "Pending
 * regen" note. Currently the later of the card-first archetype clustering rework (`0560b477`) and
 * the card-name/price-join matching fix (`3d207c9c`), both merged 2026-08-22. The code fix ships
 * immediately; the published data doesn't catch up until the pipeline actually runs again, so a
 * dataset's own `generatedAt` (every `data/analysis/*.json` file carries one) is the only way to
 * tell whether it does yet. Bump this forward whenever a future fix adds a new "needs a regen" note
 * there, so the same staleness check covers it too.
 */
export const REQUIRES_REGEN_AFTER = "2026-08-22T15:14:22Z";

/** Whether a published dataset's own `generatedAt` predates the pipeline fix it needs to reflect. `undefined` (not loaded yet) is never "stale" — there's nothing to warn about until there's data to judge. */
export function isDataStale(generatedAt: string | undefined): boolean {
  return generatedAt !== undefined && generatedAt < REQUIRES_REGEN_AFTER;
}
