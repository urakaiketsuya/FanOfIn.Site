# Frozen archetype and refinement review inputs

These gzip files preserve the exact JSON bytes used for the reviewed archetype
and theme regression expectations. They are test inputs, not published artifacts.
Daily data refreshes must not regenerate them or change the historical counts.

| Fixture | Git source | Original file | SHA-256 of uncompressed bytes |
| --- | --- | --- | --- |
| `reviewed-deck-index.json.gz` | `db4603d5e44255d71b955376cebc009b2176234c` | `data/analysis/deck-card-index.json` | `cc4ce74ec16bc446e54eaf87c4aacbb3aa8a3f59de973ffb761273e0bbf18e37` |
| `reviewed-card-catalog.json.gz` | `db4603d5e44255d71b955376cebc009b2176234c` | `data/card-catalog.json` | `03d4dbabc6c74ca0ce197b9ef653db064d97a851cd07621ccc05a897a614ce9c` |
| `reviewed-taxonomy.json.gz` | `8445a63122fdc78e836fbd3c4e5965fa79d91c02` | `data/analysis/archetype-taxonomy.json` | `9b13757eb763b1286108bfce0fe3d411b7299571f0ce89fdb5580401927033f6` |

The deck index is byte-identical at both source commits. The catalog and index
hashes are still checked against the original refinement review's source hashes;
definition hashes, exact memberships, ordering, counts, and mutation boundary
checks remain in place. The entire input population is preserved so newly
introduced false-positive matches are detectable, including previously unmatched
decks. Compression keeps these complete inputs to about 6 MB instead of 44 MB.

To reproduce a fixture, obtain the original bytes using `git show <commit>:<file>`
and gzip them with Python's `gzip.compress(data, compresslevel=9, mtime=0)`.
`readReviewedSnapshot` decompresses them with Node's built-in zlib; no additional
dependency or network access is needed in tests.

Current published taxonomy evidence is independently recomputed against the
current deck index and compared in full. Its membership is allowed to evolve as
new tournament results arrive; every historical reviewed identity need not remain
above the publication threshold forever. Curated target pools are also checked
against the current published card catalog.
