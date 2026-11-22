# Osaka Day 2

[Broadcast](https://www.youtube.com/watch?v=VOlVotCfOU0) · [Official event](https://omni.gatcg.com/events/67176)

Reviewed all 15,458 supplied machine-transcript segments. Added nine matches, 23 observed games and 91 highlights. Official usernames, stage/round pairings and scores come from the completed event snapshot fetched November 1. Card names were checked against the catalog; editorial corrections and source excerpts are retained in the three review records. The original capture is preserved byte-for-byte in `source-transcript.json`.

Five Swiss matches cover rounds 10–14. Elimination coverage contains Noel–DuDu, RubyXillia–Yadon, PokerKT–Noel (from game 2), and RubyXillia–PokerKT. Round 12 game 2 remains unfinished at time. Day 2 does not continue Day 1 round 9; no bronze gameplay or other quarterfinal gameplay appears in this capture. Official scores do not supply unobserved game actions.

`featured-pairings.json` joins all nine recaps to official results. `beat-timestamps.json` stores the exact original excerpts and capture clock for each highlight. The quarterfinal and finals received a second independent transcript check. This is not a full video-frame audit.

## Replay processing limitation

79 highlight links are enabled. The final's twelve offsets remain in `pending-playback.json`, with matching entries in the archive's remaining/unresolved queues. The captured audio runs 13:02:18, but YouTube metadata still reports `post_live` and 11:54:59. A browser request at 12:15:00 clamped to 11:59:58 of 12:00:03, showing the final's opening. On November 22 the public player clamped a 12:20:00 request to 11:54:58. All twelve capture cues (12:09:00–12:56:23) are beyond that duration. The final recap is supported by captured commentary, but its beyond-end links and match-start offset are withheld. Recheck the processed archive's duration and clock alignment before enabling them; do not guess an offset or trim the recap to the public player's current duration.

`playback-check.json` records this check. No new UI or disclosures were introduced.

## Three-play recap follow-up

Reviewed the 14 games across both Osaka broadcasts that still had three highlights after the first Yadon–RubyXillia semifinal update. Added one highlight to each of 11 games, with nine replay cues and two final capture offsets. The two review records for Day 2 and the Day 1 timestamp ledger identify the new plays and their supporting commentary.

Round 8 Game 1 already covers the level-up punish and finishing sequence. Round 9 Game 1 has only the opening setup before the capture ends. Round 11 Game 1 already covers ExcitedCat’s early pressure and Zefier’s damage setup and finish. The intervening commentary in those three games did not establish a distinct additional turning point.
