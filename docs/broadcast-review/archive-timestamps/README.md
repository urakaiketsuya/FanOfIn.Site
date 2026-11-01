# Archive key-play timestamps

Backfilled 326 highlights across 111 older matches using existing caption review
records. Together with Osaka's 80, 406 of 1,159 published highlights now have links
(35%). The remaining 753 highlights across 144 matches are listed in `remaining.json`.
Some matches have a mixture of timed and untimed highlights.

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

The remaining queue needs further per-highlight transcript alignment. Existing raw
transcripts may supply that evidence; a missing timestamp does not imply missing
footage. This pass does not claim a new complete playback review of every video.

Validation: archive evidence/current-text/upload checks, source-row/clock checks,
existing timestamp-link and Osaka tests, and a before/after comparison confirming
that only timestamps and freshness metadata changed in published data. No recap,
result, champion, video assignment or Osaka timestamp was changed.

Local Melbourne Round 9 checked at 390px and 1280px: visible cue links, 48px
link targets, no horizontal overflow, keyboard navigation, and Game 2 switching
with the correct hour-formatted timestamps. Loading was observed. Actual playback
at every cue and forced network-error states were not exercised; presentation code
is unchanged in this data-only backfill.
