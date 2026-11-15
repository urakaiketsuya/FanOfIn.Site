# Swap Impact pilot

Implemented a focused, card-first comparison in the shared SwapImpactReport consumer
used by suggested swaps, budget replacements, and staged account changes.

- Munzner: select the outcome and checkpoint; retain scenario identity and units;
  use a common scale for both decks and both checkpoints. Probabilities use 0–100%.
- Knaflic: emphasize one result, retain named card artwork, and summarize other
  outcomes with short neutral changes. Detailed ranges appear only for the focus.
- Preserve shared calculations and the distinction between unavailable and zero.
  Range-only changes remain visible even when medians match. Small nonzero changes
  never display signed zero. No increase is automatically labeled an improvement.
- Keep a player's chosen outcome/checkpoint across input updates while mounted;
  fall back to an available outcome when necessary. No deck mutations added.
- Layout responds to container width, including narrow desktop sheets.

References: [Munzner](https://www.cs.ubc.ca/~tmm/vadbook/) and
[Knaflic](https://www.wiley.com/en-us/storytelling-with-data-a-data-visualization-guide-for-business-professionals-p-9781119002062).

## Verification

- Seven focused tests: exact shared model agreement, missing/unsupported pairs,
  percentage points, range-only changes, neutral self-damage, and tiny deltas.
- App TypeScript check and targeted lint.
- Local browser checks using the real component, catalog, Rai Fire and Tonoris
  fixtures in a temporary harness (removed after verification).
- 390×844 and 360×800 mobile; 1280×900 desktop. No horizontal page/report overflow.
  Report controls and card links meet 48px targets. Native outcome selection,
  arrow-key checkpoint selection, 2px visible focus, and selection retention checked.
- Shared DialogSheet checked on mobile and desktop; Escape dismissal restores
  the opener. Missing catalog names fall back to text. Unchanged, unsupported,
  missing-data states and recovery checked. No new async/loading state introduced.
- Signed-in integration journeys, production deployment, screen-reader speech,
  and user comprehension testing were not performed. No push or deployment.

Scope: Swap Impact implementation pilot complete; broader analysis-tool rollout
and player comprehension validation remain separate work.
