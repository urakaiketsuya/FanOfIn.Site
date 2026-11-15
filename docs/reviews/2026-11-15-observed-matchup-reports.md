# Observed matchup reports

Overview now leads with the existing historical report, before package and suggestion panels.
The same presentation serves the Matchups tab. Opponents sort by recorded games descending;
Overview initially shows three, Matchups six, with an explicit expansion for the rest.

Each opponent pairs its observed rate with recorded games, champion artwork/name fallback,
and a fixed 0–100% bar with a midpoint marker. Aggregate matches, decks, and events remain
separate from opponent samples. Similar-build identity, loose-match status, and existing
limited-data labels remain visible. Published calculations and thresholds are unchanged.
No confidence interval is inferred for opponent rows; the available artifact supplies only
its baseline rate and game count. Methodology remains in CALCULATIONS.md.

## Validation

- Rendering tests cover descending sample order, preview bounds, aggregate count preservation,
  loose-match/limited-data labels, and empty opponent data.
- Mobile 360×800 and desktop 1280×900 component preview using published Silvie matchup data.
- Keyboard expansion/collapse, visible 2px focus outline, 48px controls, no horizontal overflow.
- Loading, empty, initial error/retry, and saved-result refresh error/retry exercised.
- Card-catalog absence exercised through readable champion fallbacks.
- Integrated Overview and Matchups verified with a local centroid-derived fixture and live
  published datasets; actual champion artwork loaded. Overview verified at 360px, 390px, and
  1280px without page overflow. Changed controls measured at least 48px tall.
- The lower decision summary now says “Matched-build opponents” and shows a dash when the
  deck has only a loose match, avoiding a contradictory zero beside historical comparison rows.
- TypeScript and targeted lint pass. Two rendering tests pass.
- Not exercised: authenticated saved-deck flows, screen-reader speech, text zoom, deployment.

This observed-results-first phase is complete. Recommended next work: date/event filters for
observed matchup cohorts. That requires defining supported cohort scope and publishing filtered
counts/rates together; the broader analytics initiative remains open-ended.
