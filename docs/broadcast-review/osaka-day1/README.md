# Osaka Day 1 — transcript cleanup

Source video: https://www.youtube.com/watch?v=g3NNFcNpw3k
Official event: https://omni.gatcg.com/events/67176

First name-normalization pass completed October 31, 2026. This is a working transcript, not published match coverage or a completed gameplay review.

- `cleaned-transcript.txt` is the readable working copy; JSON preserves all 9,182 original segment timestamps and ordering.
- `corrections.json` records 527 replacements across 493 segments, the exact before/after text, evidence and source hash. Only explicitly reviewed aliases were replaced. Player aliases are restricted to match windows except unambiguous hachico/wenwen capitalization.
- `omnidex-snapshot.json` contains fresh public API responses: event, 618 players, standings, 123 public decklists, and Swiss rounds 1–9. These are live-event observations, not final standings. Decklists are a partial public subset.
- `featured-pairings.json` joins the eight identified broadcast matches to official round/pairing IDs and scores. Scores are reference data; they do not establish game-by-game winners or action sequences.
- The user's original cached transcript remains untouched. The source hash pins this pass to that version; later user edits must be reconciled rather than overwritten.

## Identified matches

| Round | Pairing | Players | Official score |
| --- | --- | --- | --- |
| 1 | 131 | wenwen / hachico | 0–2 |
| 2 | 127 | Danriick / Professor | 0–2 |
| 3 | 8 | Mono / Xenadrael | 1–2 |
| 4 | 10 | Cashkidz / ClourX | 2–1 |
| 5 | 1 | Rty / Neek0 | 0–1 |
| 6 | 3 | Inaki / Miffy | 2–1 |
| 7 | 42 | DragonJG / Quarax | 1–2 |
| 8 | 42 | SoSollys / NoobTinnn | 0–2 |

## Remaining review

Read each match sequentially against the relevant public decks and catalog, resolving less obvious card aliases contextually. Remaining speech errors, fragmented sentences and music are intentionally retained; fuzzy similarity alone is insufficient evidence for correction. Short canonical champion names do not imply a specific level or card printing.

Inspect missing audio/transcription around the large timestamp jumps (including 1:26→2:30, 4:57→5:29, and 6:14→6:29) before claiming full match coverage. Determine whether Round 9 is absent from this transcript. Its last segment is 11:25:39; the last identified match is Round 8. No game actions were invented to fill gaps and no recaps were published by this pass.

Validation: original source SHA-256 unchanged; output segment count, timestamp sequence and ordering preserved; all eight pairing identities/scores resolve in the saved API responses; canonical card replacement targets exist in the local catalog. No application code changed.
