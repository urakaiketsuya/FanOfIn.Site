# Archive key-play timestamps

Reviewed all 753 highlights remaining after the initial backfill; added 743 cues.
Together with the earlier 326 archive cues and Osaka’s 80, **1,149 of 1,159**
published highlights now have links (99.1%). Archive evidence covers 203 matches.

`beat-timestamps.json` preserves each current highlight's exact text, its upload-bound
absolute timestamp, the original review name/record index, source-file SHA-256,
zero-based inclusive source rows, and supporting caption excerpts. Sources were the
local `remaining-review-a` through `remaining-review-e` records plus the individual
Akihabara, Auckland and Melbourne reviews. These reviews originated in the earlier
archive review work; their relevant evidence is now durable rather than dependent
on temporary review files or the ignored `pipeline/.cache/broadcast-transcripts` cache.

Associations were selected against the current recap text, not inferred from matching
record/game counts. Sideboard discussion, interview-only observations, unrelated
corrections, and broad match review ranges were excluded. A timestamp points to the
start of the cited commentary sequence; it is not a frame-exact action boundary or
a claim that every action in a multi-action highlight starts there. Reported results
and penalties link to the supporting announcement where that is the recap's subject.
Never reuse full-stream seconds for a different match upload.

This pass aligned each remaining highlight against timestamped cached captions or
original Downloads transcripts. Repeated plays, wrong-game lexical matches, recap
montages and commentary about preceding games were checked before accepting cues.
Sources retain their original transcription errors; published highlight text is unchanged.

All ten untimed highlights are documented in `unresolved.json` and indexed in
`remaining.json`:

- Nine NA Nationals Day 1 round 9 highlights: the assigned broadcast captions stop
  at 11:54:52 during introductions. A complete separate-match transcript exists in
  `transcripts.zip` (00:00–59:32), but contains no upload ID or broadcast offset.
  Identify that upload or verify its stream offset before using its clocks.
- Taipei bronze Long–Yamikin, game 2, beat 1: the described Concealed Marksman /
  Reduce to Ash exchange appears in game 1 around 571–573 minutes. Correct the
  recap’s game assignment before attaching a cue; the supporting excerpt is saved.

The 753-item review is complete; timestamp coverage remains short of complete
until those two blockers are resolved. This is transcript alignment, not a new
complete playback review of every video.

Validation: archive evidence/current-text/upload checks, source-row/clock checks,
existing timestamp-link and Osaka tests, and a before/after comparison confirming
that only timestamps and freshness metadata changed in published data. No recap,
result, champion, video assignment or Osaka timestamp was changed.

Local Melbourne Round 9 checked at 390px and 1280px: visible cue links, 48px
link targets, no horizontal overflow, keyboard navigation, and Game 2 switching
with the correct hour-formatted timestamps. Loading was observed. Actual playback
at every cue and forced network-error states were not exercised; presentation code
is unchanged in this data-only backfill.
