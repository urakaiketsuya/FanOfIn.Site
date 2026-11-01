# Archive key-play timestamps

Reviewed all 753 highlights remaining after the initial backfill; added 743 cues.
A follow-up resolved the last ten cues. Together with the earlier 326 archive cues
and Osaka’s 80, **1,159 of 1,159** published highlights now have links (100%).
Archive evidence covers 204 matches.

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

The remaining queues are empty. `resolved.json` documents the final follow-up:

- NA Nationals Day 1 round 9: identified the standalone replay `lt8xG0pelpw`.
  Its title, player names, event description and live-caption clocks match the
  complete transcript in `transcripts.zip`. `na-round9-upload.json` retains the
  verification evidence. All nine cues use replay-relative seconds; no broadcast
  offset was inferred. The video registry now retains this replay association and
  the previous broadcast ID for historical review provenance.
- Taipei bronze Long–Yamikin: the previous blocker incorrectly ended game two
  at 598 minutes. The removal sequence is at 603:39–606:22, and the winning
  sequence is at 607:54–608:28. The recap's existing game assignment and text were
  correct. Added the missing cue, corrected the winning cue from an earlier attack,
  and refined three game-three starts. Saved boundary excerpts document the correction.

The 753-item review and timestamp backfill are complete. This is transcript
alignment, not a complete playback review of every video.

Validation: archive evidence/current-text/upload checks, source-row/clock checks,
video registry and historical review checks, timestamp-link and Osaka tests.
The final follow-up preserves every recap, result, champion and Osaka timestamp;
it changes only timestamps, one verified video association and freshness metadata.

Local Melbourne Round 9 checked at 390px and 1280px: visible cue links, 48px
link targets, no horizontal overflow, keyboard navigation, and Game 2 switching
with the correct hour-formatted timestamps. Loading was observed. Actual playback
at every cue and forced network-error states were not exercised; presentation code
is unchanged in this data-only backfill.
