# Event distribution bands

Observed Matchups and period comparisons share a range track. Four or more
contributing events show an equal-event-weight 25th–75th percentile band, with
thin min–max lines and the unchanged pooled score-rate dot. Smaller cohorts keep
extrema only; one event has no range. Counts stay visible. Calculation details
and the NIST quartile reference are in CALCULATIONS.md. Bands describe observed
variation, not uncertainty; genuinely broad distributions remain broad.

Verified through the real deck import/report flow using the homepage Silvie deck:
- All-time Tristan: 500 matches / 115 events, middle 25–75%, full 0–100%.
- Mirrors: 866 matches / 137 events, collapsed band at 50%.
- Jan–Jun 2026 versus its equal preceding period: paired distributions, including
  middle bands spanning 0–100%, narrower bands and collapsed bands at 0%.
- Single event 65658: one match, no band or range label.
- Future date: report hidden; Reset restores real results.
- Mobile 390×844 and 360×800; desktop 1280×900. Inspected both views visually,
  no horizontal overflow, filters/buttons at least 48px tall, keyboard comparison
  expansion/collapse. Narrow range labels now wrap as complete phrases.
- Initial loading observed. No forced network errors, screen-reader speech,
  native phone keyboard or text zoom verification in this pass.

Validation: 16 app/pipeline focused tests; app and shared typechecks; targeted
lint. Screenshots: /tmp/event-bands-mobile.jpg,
/tmp/event-bands-desktop.jpg, /tmp/event-bands-mobile-comparison.jpg,
/tmp/event-bands-desktop-comparison.jpg.

Range-visual improvement phase complete. Next: screen-reader and text-zoom
acceptance checks for the observed-results analytics initiative. Broader
initiative scope remains open; no implementation blockers.
