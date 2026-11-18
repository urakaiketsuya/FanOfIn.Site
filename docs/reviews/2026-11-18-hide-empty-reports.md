# Hide empty analytics sections

Report components return no section when there are no usable findings or the required catalog/model data is unavailable. Valid zero outcomes, partial reports with usable findings, and comparison sides with recorded results remain visible. Observed-result filters and actionable load/retry states remain available.

Covered shared deck reports, paid champion forecasts and comparisons, swap impact, observed matchup results, empty period comparisons, comparable builds and card-level matchup coverage. Unknown catalog entries are not presented as damage sources.

Verified production DeckReport components in an isolated local fixture at 390×844 and 1280×900: missing catalog data, empty deck, populated damage results, no blank panels or horizontal overflow, and keyboard fixture switching. Retained zero-valued conservative damage alongside populated conditional damage. Full authenticated journeys, network failure recovery, screen-reader speech and native mobile keyboards were not exercised.

Validation: 126 focused regression tests passed across the report suites, with the seven observed-matchup tests rerun after the final label change. Targeted lint and diff checks passed. The app typecheck excludes the unrelated temporary Casella preview harness.

Next: finish the broader observed-results accessibility and recovery verification. This empty-report cleanup is complete; broader initiative scope remains open.
