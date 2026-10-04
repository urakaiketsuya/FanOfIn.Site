# Historical theme regression fixture

`theme-review-index.json` contains 1,027 complete deck records from commit
`66643e79d`, preserving its card-name dictionary and index metadata. Selection is
the union of every matched deck ID in the committed draft and reviewed theme
evidence, plus the explicitly rejected Dante list `64701:14399`.

This is a fixed review cohort, not the full tournament population. Tests compare
its identities, paths, memberships, ordering and summaries with the historical
review decisions. Daily data refreshes must not regenerate this fixture or update
historical expectations. Hand-authored boundary tests cover rejected sections,
missing anchors and insufficient distinct cards. Catalog semantics are checked
against the published card catalog, without requiring a local crawler cache.

Historical source hashes and full-population totals in the evidence describe the
original review; they are not hashes or totals of this reduced fixture.
