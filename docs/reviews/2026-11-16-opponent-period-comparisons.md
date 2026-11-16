# Per-opponent observed comparisons

The period comparison now includes the union of opponents seen in either period,
ranked by combined match count. Cards show champion art, build links, each score
rate and physical-match sample, and a percentage-point change where both exist.
A missing period displays a dash and zero matches with a short period-only label.
Three opponents appear initially; the shared Button and DisclosureChevron expand
all rows. Existing ChampionArt presentation is reused.

Verification:
- Seven focused app tests passed, including union, combined-sample order, absent
  versus zero rate, both sample counts, delta, and rendered names/links.
- App and shared TypeScript, targeted oxlint, and diff whitespace checks passed.
- Browser checked at 360×800 and 1280×900: no horizontal page overflow, long names
  wrap, champion art and build links visible, 48px expansion control, 2px focus
  outline, keyboard expansion/collapse with aria-expanded, and period-only rows.
- October 1–30 2026 versus September showed nine opponents: Guo Jia 0 previous
  matches versus 2 selected matches at 0%; Ciel 1 previous match at 0% versus none.
- Published-data calculation for October 2025 versus September confirmed leading
  pair samples 12/19 and +15.350877 percentage points. Browser timeouts prevented
  visual verification of that later both-period case and live all-empty state.
- Screen-reader speech, text zoom, and forced network-error recovery not checked.

Screenshots: /tmp/opponent-period-comparisons/{mobile,desktop}.jpg.
No deployment. This per-opponent phase is complete. Next recommended work is
report accessibility and recovery verification; the broader analytics initiative
has no fixed remaining scope.
