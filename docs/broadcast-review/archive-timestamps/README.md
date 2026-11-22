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

## Ascent London three-play review

Reviewed the only London game with exactly three highlights, Round 10 Game 1
between CasuaL and V41N. The official [Day 2 replay](https://www.youtube.com/watch?v=41aKdQJ7U1c)
runs 11:54:57. The supplied transcript's last caption starts at 11:54:56.
The player opened on the Round 10 table at each cue below. The transcript
establishes the action within each sequence, and the evidence JSON retains the
source filename, hash, caption rows and excerpts.

| Replay cue | Turning point |
| --- | --- |
| [2:11:04](https://www.youtube.com/watch?v=41aKdQJ7U1c&t=7864s) | V41N's Mad Hatter removes Cheshire Cat in retaliation. |
| [2:12:54](https://www.youtube.com/watch?v=41aKdQJ7U1c&t=7974s) | CasuaL finds Liu Bei and can keep Perse available for suppression. |
| [2:16:15](https://www.youtube.com/watch?v=41aKdQJ7U1c&t=8175s) | CasuaL gets Ranger Strides into play before the finishing attacks. |

## Ascent Melbourne 2026 three-play review

Reviewed all seven games with exactly three highlights and added eight turning
points. The [Day 1 replay](https://www.youtube.com/watch?v=W_5i0aO5Es0) runs
11:27:30 and its caption track ends at 11:27:28. The
[Day 2 replay](https://www.youtube.com/watch?v=qQrV2I2Uiac) runs 10:36:50 and its
caption track ends at 10:36:41. Each deep link was tested against the official
player clock and the corresponding featured table. Cues mark the start of the
supporting commentary sequence. The evidence JSON records the source filename,
SHA-256, zero-based inclusive caption rows and excerpts for each new play.

| Round and game | Replay cue | Turning point |
| --- | --- | --- |
| Round 2, Game 2 | [2:11:04](https://www.youtube.com/watch?v=W_5i0aO5Es0&t=7864s) | hachico reaches level three with Dungeon Guide before Etsuko can flip Suzaku. |
| Round 2, Game 2 | [2:12:44](https://www.youtube.com/watch?v=W_5i0aO5Es0&t=7964s) | Etsuko flips Suzaku and pushes hachico to 18 damage. |
| Round 9, Game 1 | [46:50](https://www.youtube.com/watch?v=qQrV2I2Uiac&t=2810s) | Fracturize limits bobolas’s draw from Chalice of Blood. |
| Round 9, Game 2 | [1:09:36](https://www.youtube.com/watch?v=qQrV2I2Uiac&t=4176s) | ZutomayoEnjoyer removes Carter and keeps bobolas below the Chalice threshold. |
| Round 11, Game 2 | [3:16:49](https://www.youtube.com/watch?v=qQrV2I2Uiac&t=11809s) | Launtial cuts Professor’s herb gather with Topsy Decree. |
| Round 12, Game 2 | [4:40:48](https://www.youtube.com/watch?v=qQrV2I2Uiac&t=16848s) | Bhop uses Creative Shock and Resolute Stand as Pulse recollects with an empty hand. |
| Round 12, Game 3 | [5:00:32](https://www.youtube.com/watch?v=qQrV2I2Uiac&t=18032s) | Pulse attacks for three, then Bhop reloads with Lost Providence and answers with Heavy Swing. |
| Semifinal, Game 2 | [7:47:47](https://www.youtube.com/watch?v=qQrV2I2Uiac&t=28067s) | Bhop loses Carter to the level-up banish. |

## Ascent Manila three-play review

Reviewed both three-play games from the [official Day 2 replay](https://www.youtube.com/watch?v=8fnn-hbArSk).
The player displayed a duration of 8:45:43–8:45:44 across the checks, and the
transcript’s final caption starts at 8:45:42. Each deep link opened at the
requested clock on the featured match table. The evidence JSON records the
original transcript filename, SHA-256, zero-based inclusive rows, and excerpts.

| Round and game | Replay cue | Turning point |
| --- | --- | --- |
| Round 10, Game 2 | [49:27](https://www.youtube.com/watch?v=8fnn-hbArSk&t=2967s) | Dungeon Guide takes Muck1234 to Rai’s level-three champion, and Lost Providence comes down. |
| Round 10, Game 2 | [54:33](https://www.youtube.com/watch?v=8fnn-hbArSk&t=3273s) | Peer into Mana builds Enlightenment counters that Muck1234 spends to draw cards before passing. |
| Round 13, Game 2 | [3:09:38](https://www.youtube.com/watch?v=8fnn-hbArSk&t=11378s) | Lance’s Beastsoul Visage attack draws Egg’s first Resolute Stand, preserving Fluffy Shopkeep. |

The replay card callout identifies Beastsoul Visage in Round 13. The transcript
captures the attack into Fluffy Shopkeep and the Resolute Stand response.
