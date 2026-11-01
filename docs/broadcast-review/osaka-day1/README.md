# Osaka Day 1 — reviewed transcript and match coverage

[Source video](https://www.youtube.com/watch?v=g3NNFcNpw3k) · [Official event](https://omni.gatcg.com/events/67176)

Completed sequential review of all 9,182 supplied segments, with 1,474 segments corrected using contextual card evidence and official player identities. Nine match recaps cover 20 games, including the partial Round 9 opening recovered after the original transcript ended. This is a transcript/audio review, not a frame-by-frame video audit.

## Review artifacts

- `cleaned-transcript.txt` combines reviewed original text and explicitly marked audio recovery. Unclear machine-recognized speech is not guessed.
- `cleaned-transcript.json` preserves original segment ordering and timestamps. Unusable repeated prompt text is marked as excluded from evidence.
- `corrections.json` records exact original/cleaned text and evidence. The user's original cached transcript remains untouched and hash-pinned.
- `omnidex-snapshot.json` preserves API responses for event 67176: 618 players, standings, 123 public decklists, and Swiss rounds 1–9. Public decklists are a partial subset; standings reflect retrieval time.
- `featured-pairings.json` joins every recap to an official pairing. Official match scores do not establish unobserved game winners or actions.
- `review-*.json`, `candidate-audit.json`, and `recovered-candidate-audit.json` document sequential review and independent recap checks.
- `recovery-*.json` retain reviewed audio windows, normalized text, and evidence. `audio-recovery.json` archives exact recognition outputs and hashes with model/audio provenance.
- `review-summary.json` records coverage, hashes, limitations, and verification.

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
| 9 | 21 | Bayabayashi / Royan | 1–2 |

## Source limits

Round 5: recovered commentary supports Neek0 preserving a 1–0 lead through time. An isolated original “2–0” transcription is not reproduced in the independent pass; the final game has no confirmed winner. The discrepancy remains in the audit record.

Round 7: DragonJG conceded the match after two games. The corrected match result is Quarax 2–1; no third game is invented.

Round 9: the recording ends during game 1 setup at approximately 11:54:58. Royan's 2–1 match win comes from Omnidex; the recap explicitly contains only the opening and no game winner.

Further gameplay coverage requires a continuation of Round 9 or direct video review; the available transcript review is complete. See `review-summary.json` for verification results.

Round 9 continuation recheck (2026-10-31): the live archive metadata still reports 11:54:58. No continuation appeared in the latest 20 official streams, the official uploads listing (24 entries), or matching filenames in the supplied Downloads folder/ZIP. See `round9-continuation-check.json`. Extending the recap is blocked on another source; the existing opening and official result remain unchanged.

### Key-play timestamps

`beat-timestamps.json` maps all 80 published Osaka highlights to the start of their
supporting commentary. Original transcript segment references use that transcript's
absolute clock. Recovered audio references use the recorded absolute `startSeconds`,
or chunk 23's 41,400-second base plus the raw capture offset for Round 9. The
published `timestamp` binds each offset to its video ID; offsets must not be reused
when substituting a standalone match upload. These are commentary cue points, not
frame-exact action boundaries. Multi-action highlights link to their first cited
segment. Superseded candidate wording was excluded; the corrected Round 4 Storm
of Thorns highlight retains its original 4242–4250 evidence.

Verification: all 80 associations checked against published highlight text; link
validation covers zero, hour boundaries, invalid offsets and mismatched uploads.
Mobile (390px) and desktop (1280px) layouts, 48px targets, keyboard navigation and
game switching checked. Video playback at every cue and forced network failures
were not exercised. Earlier events still need per-highlight source alignment.
