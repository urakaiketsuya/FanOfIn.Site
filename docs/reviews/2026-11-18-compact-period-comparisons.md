# Compact period comparisons

Period summaries and opponent comparisons use aligned rate tracks on a common 0–100%
scale. Opponent rows retain champion art, names, separate sample counts, per-period
event ranges, and a concise percentage-point delta. Missing periods show an em dash
without a rate dot. Empty opponent sections and completely empty comparisons stay hidden.
The existing filters, ranking, expansion, and calculations are preserved.

Verification: 10 focused observed-matchup tests; app TypeScript and targeted lint;
whitespace check. Local fixture using the production component verified at 360×800
and 1280×900: long names, real catalog art and name fallbacks, one-sided periods,
empty results, keyboard expansion/collapse, visible focus, 48px minimum controls, no
horizontal overflow. Screenshots saved to /tmp/period-comparison-mobile.jpg and
/tmp/period-comparison-desktop.jpg. Temporary fixtures removed.

Not verified: full authenticated journey, network recovery in the parent controller,
screen-reader speech, native mobile keyboard, or text zoom. This component receives
loaded cohorts and has no independent loading/error state.

Next: review both compact report views in the full filtered Deck Report journey.
