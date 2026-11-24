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

## Ascent Akihabara three-play review

Reviewed both games of Z3US vs. Schwarzer in Round 9 using the transcript for
the [standalone match replay](https://www.youtube.com/watch?v=bfhumlDXjrE).
The player displayed 1:04:17–1:04:18 and the final transcript caption starts
at 1:03:59. Each cue opened at the requested clock on the Round 9 table.
Times are relative to this match upload. The evidence JSON retains the
transcript filename, SHA-256, zero-based inclusive rows, and caption excerpts.

| Game | Replay cue | Turning point |
| --- | --- | --- |
| 1 | [31:06](https://www.youtube.com/watch?v=bfhumlDXjrE&t=1866s) | Firebloom Flourish has already charged Everflame Staff when Z3US materializes it. |
| 2 | [42:37](https://www.youtube.com/watch?v=bfhumlDXjrE&t=2557s) | Windwalker Boots and Sadi give Schwarzer a path to the preparation counters needed for Slice and Dice. |
| 2 | [45:06](https://www.youtube.com/watch?v=bfhumlDXjrE&t=2706s) | Z3US deploys Censer of Restful Peace to cut off floating memory. |
| 2 | [49:13](https://www.youtube.com/watch?v=bfhumlDXjrE&t=2953s) | Cinder Geyser forces Schwarzer to spend Safeguard Amulet before the next attacks. |

## Ascent Taipei three-play recap review

Reviewed game three of both the bronze match and the grand final against the
local Day 2 transcript. The public Day 2 replay runs 11:54:55, through the
transcript's last caption at 11:54:36. The player accepted the original
broadcast-relative clock for all three additions. Exact caption rows, source
filename and SHA-256 are in `beat-timestamps.json`.

- Bronze, Long vs Yamikin. At [10:15:50](https://www.youtube.com/watch?v=oHCCZOZBvKM&t=36950s),
  Reduce to Ash removes Censer of Restful Peace and reopens Liminal Guide.
  At [10:16:55](https://www.youtube.com/watch?v=oHCCZOZBvKM&t=37015s),
  Long levels Ciel and develops another Liminal Guide, putting Lubé under pressure.
- Grand final, ProAnnn vs Apaul. At [11:39:45](https://www.youtube.com/watch?v=oHCCZOZBvKM&t=41985s),
  Apaul's Portentous Tanggu draw finds Dungeon Guide at 18 damage. The cue
  starts with the draw sequence, before the existing level-three highlight.

## Ascent Niagara Falls three-play recap review

Reviewed 17 games across seven Day 2 matches. The [public Day 2 replay](https://www.youtube.com/watch?v=YEdMx87UqeE)
runs 10:58:08 and reaches beyond the last caption at 10:57:58. The five
additions were checked in playback at the original broadcast clock. The
source filename, SHA-256 and caption excerpts are in `beat-timestamps.json`.

| Match and game | Verified cue | Transcript evidence |
| --- | --- | --- |
| TeamTrueIsaac vs Tress, game 1 | [40:47](https://www.youtube.com/watch?v=YEdMx87UqeE&t=2447s) | Isaac follows his natural level-up with Ghosts of Pendragon after Tress uses Tariff Ring. |
| TeamTrueIsaac vs Tress, game 2 | [57:43](https://www.youtube.com/watch?v=YEdMx87UqeE&t=3463s) | Tress levels Tristan, takes out Stalwart Shieldmate with Sadi and plays another Lookout. |
| TeamTrueIsaac vs Tress, game 3 | [1:13:50](https://www.youtube.com/watch?v=YEdMx87UqeE&t=4430s) | Aesan Protector clears Fluffy Shopkeep. The casters explain how the Shopkeep's earlier card advantage lets Isaac afford Flame Sweep through Tariff Ring. |
| Asuna vs AuraBomb, game 2 | [5:20:18](https://www.youtube.com/watch?v=YEdMx87UqeE&t=19218s) | AuraBomb hits with a Cosmic Bolt found by glimpse and materializes Cosmic Astroscope before time. |
| Fruitcake vs Bratus, game 2 | [8:41:29](https://www.youtube.com/watch?v=YEdMx87UqeE&t=31289s) | Dungeon Guide advances Fruitcake to Arisanna level two with Suspicious Concoction and Polaris supporting the herb draw setup. |

The broadcast labels TeamTrueIsaac vs Tress Round 9. Its existing match ID
retains the older Round 7 label. The other 12 games stayed at three plays.
Round 10 already covers the disrupted Arcane setup, Ciel's comeback and the
timed draw. Round 11 already covers the mirror's floating-memory denial,
level-ups and Fireball finishes. Round 12 game one already covers the major
Polaris, ally-clear and Shadowstrike sequences. The quarterfinal already
covers the Cloudstriker and Razorgale pivots. The semifinal opener's proposed
Polaris line remains uncertain. The final already covers Magistrate, the
survival and Seiryuu sequences, and the decisive wind chains.

## Ascent Auckland three-play recap review

Reviewed 16 games across ten matches. The [Day 1 replay](https://www.youtube.com/watch?v=6XU9azcBukk)
runs 10:58:16 through the final cached caption at 10:57:45. The
[Day 2 replay](https://www.youtube.com/watch?v=idcMDSZRmIE) runs 11:54:59
through the final cached caption at 11:53:47. All four additions use the
original clock and were checked in playback. The source filenames, SHA-256
hashes and zero-based caption ranges are in `beat-timestamps.json`.

| Match and game | Verified cue | Transcript evidence |
| --- | --- | --- |
| Nathan vs OneEyedOwl, game 2 | [10:35:29](https://www.youtube.com/watch?v=6XU9azcBukk&t=38129s) | Stifling Trap and Incapacitate contest Sadi's trigger. The casters count four fewer preparation counters afterward. |
| Dragowil vs LegitJesusKun, game 1 | [4:19:11](https://www.youtube.com/watch?v=idcMDSZRmIE&t=15551s) | The level-up costs LegitJesusKun a Dungeon Guide and Sadi's two draws both find Reclaim. |
| TeamTrueCaban vs Dragowil, semifinal game 3 | [9:57:53](https://www.youtube.com/watch?v=idcMDSZRmIE&t=35873s) | Clarent comes down with two swords to banish. The casters later count four swords in banishment. |
| Emp vs TeamTrueCaban, final game 3 | [11:13:48](https://www.youtube.com/watch?v=idcMDSZRmIE&t=40428s) | The second Bagua glimpse finds Three Visits and Veiling Breeze and leaves those draws on top while Emp is at six life. |

Twelve games stayed at three plays. Round 1 game one and round 2 game two
already cover the board pressure and finishing damage. Both Sherlock–endYR
games cover the Genbu board or the Razorgale recovery. Pulse–Johnbed game
three and Lifdrasyl–ShingTsang game two cover the key defensive and
disruption sequences. Round 12 game two and both quarterfinal games cover
the relevant resource exchanges and finishes. Semifinal game two already
captures the loss of both Ghosts and the counter denial. Finals games one
and two retain the weapon disruption and the decisive Devastating Blows.

### European Nationals Day 1 three-play review

Reviewed all nine three-play games across rounds 1, 2, 3 and 5. Day 2 has
no three-play games. The Day 1 replay runs 10:43:12 on the player, in line
with the last transcript row at 643:11. Both new links were checked against
the replay. The source file hash and zero-based row ranges are recorded in
`beat-timestamps.json`.

| Match and game | Verified cue | Transcript evidence |
| --- | --- | --- |
| Xelomage vs Qbone, game 2 | [1:12:52](https://www.youtube.com/watch?v=JKKl7AYwv3c&t=4372s) | Rows 1679–1686 describe Seiryuu flipping to remove Fluffy Shopkeep and losing taunt for the next turn. |
| Asuna vs sungorio, game 2 | [3:17:37](https://www.youtube.com/watch?v=JKKl7AYwv3c&t=11857s) | Rows 4595–4606 describe Three Visits and Calming Breeze saving Asuna from the Storm Slime attack. |

Seven games stayed at three plays. Round 1 game one already covers the
countermeasure and decision to hold the combo. Both round 2 recaps cover
the decisive disruption and damage. Round 3 games one and three cover
the response chains and their outcomes. The round 5 recaps already cover
the decisive attack and counterspell sequences. A possible Conniving
Plans cue in round 5 game one at 5:56:11 was left out because the replay
showed Purifying Thurible and did not confirm the captioned play.

### Oceania Nationals 2026 three-play review

Reviewed all seven three-play recaps, all from Day 1. The complete replay
runs 10:52:05, and the cached captions end during the sign-off at 10:49:28.
Playback confirmed both cues on the broadcast clock. The evidence ledger
records the source SHA-256 and zero-based caption rows.

| Match and game | Verified cue | Transcript evidence |
| --- | --- | --- |
| HolySamurai vs ThomasLi2, game 3 | [6:43:20](https://www.youtube.com/watch?v=YajGY_RVfD4&t=24200s) | The casters explain that Cerulean Decree denies the Undeniable Truth draw and the ally is already gone as the sacrifice cost. |
| Limelight vs GlenyBoi, game 2 | [9:04:30](https://www.youtube.com/watch?v=YajGY_RVfD4&t=32670s) | Ascension brings in Prismatic Edge. The casters call three damage and a card removed from Limelight’s memory. |

Five recaps stayed at three plays. Round 1 already covers the Blackjack
attack and Polaris setup. Round 2 covers Blink’s stalled board and
Jayare’s finishing sequence. Round 3 covers Sano’s repeated survival
plays and the overtime finish. Round 4 covers the hand disruption,
Nimue’s survival and the overtime draw. Round 8 covers the healing
disruption and the decisive double Enrage.

### Southeast Asia Nationals Day 1 three-play review

Reviewed all four eligible games. In Round 4 game one, Centratus destroys
Awi’s Lost Providence with Varuckan Acolyte, denying another draw. The
[4:55:23 cue](https://www.youtube.com/watch?v=yiXTkbA1am4&t=17723s) was
verified on the full 11:54:57 broadcast. The transcript ends at 714:56.
Rows 7679–7681 confirm the removal and added damage. The evidence ledger
records the source hash and zero-based rows.

Three games stayed at three plays. Round 3 game three already covers
RubyXillia’s hand disruption and DragonJG’s deck-out. Round 4 game two
covers both Feu Awakening exchanges and Awi’s recovery. Round 7 game two
covers the missed level-up and the defensive sequence that keeps
NeptuneI alive until the final attack.

### North American Nationals Day 1 three-play review

Reviewed all nine eligible games. The Day 1 broadcast ran 11:54:55 in
playback, with its last cached caption at 11:54:52. The separate complete
Round 9 replay displayed 59:36. Each new cue was checked on the replay
that supplied its captions. Source hashes and zero-based rows are in the
evidence ledger.

| Match and game | Verified cue | Transcript evidence |
| --- | --- | --- |
| Anjuhro vs Hyouka, game 1 | [9:25:29](https://www.youtube.com/watch?v=ljQZR8Yu1XM&t=33929s) | Shadowreaver takes four cards, including Arcane Elemental, and Anjuhro uses the stolen Scry the Skies to draw into memory. |
| likeBAILEY vs Vernosius, game 1 | [6:02](https://www.youtube.com/watch?v=lt8xG0pelpw&t=362s) | The level-up costs Vernosius Resolute Stand and Lightweaver’s Assault. |
| likeBAILEY vs Vernosius, game 2 | [25:09](https://www.youtube.com/watch?v=lt8xG0pelpw&t=1509s) | Vernosius deploys Blanche to resist Razorgale damage and gives Blanche stealth with Shroud in Mist. |

Six games stayed at three plays. Round 2 game two already covers the
Hearts protection and halted Verita. Round 5 game one covers the
graveyard fight and the Razorgale finish. Both Round 6 games cover the
combat denial and contrasting Diana outcomes. Round 7 game two covers
Tariff Ring and the Rai damage chain. Round 9 game three already covers
the graveyard denial, Blanche exchange and combo finish.

### North American Nationals Day 2 three-play review

Reviewed all 18 eligible games. Both added cues were verified on the full
11:47:35 broadcast. Cached captions end at 11:47:02, and the evidence
ledger records the source SHA-256 and zero-based caption ranges.

| Match and game | Verified cue | Transcript evidence |
| --- | --- | --- |
| TLux vs Superior, game 2 | [3:44:53](https://www.youtube.com/watch?v=tFC-3k0uxcM&t=13493s) | Expel the Departed forces Superior to sacrifice Fractal of Polar Depths early for a smaller mill. |
| Quarax vs Jett, final game 3 | [11:26:56](https://www.youtube.com/watch?v=tFC-3k0uxcM&t=41216s) | Jett returns Bandit with Reclaim during Cheshire Cat’s attack and keeps Protector Raccoon ready, giving Quarax the choice of what to banish if it activates. |

Sixteen games stayed at three plays. The other Swiss recaps already cover
the decisive Genbu and Suzaku setups, the two ChemCollapse–mDuo13
resource fights, and the Diana–Zander damage and recovery exchanges.
The quarterfinals retain the level-up denial, combat retreat and
Razorgale finish. Both semifinal recaps cover the graveyard control,
Priestess interaction or finishing triggers. Final game two already
covers Quarax stopping Jett’s defenses and closing with the Archer.

### Worlds 2026 Swiss Stage three-play review

Reviewed all 23 eligible games. In Asuna vs Lifdrasyl game three, the
broadcast shows Lifdrasyl leveling to Spirit Ruler and the casters call
out Cleansing Reunion going to banishment. Asuna can then recycle Veiling
Breeze with Cyclical Breeze. The [4:51:57 cue](https://www.youtube.com/watch?v=MAgS0ISYLtI&t=17517s)
was checked on the complete 11:20:42 broadcast. The local transcript ends
at 680:32. The source hash and caption-row range are in the evidence ledger.

The other 22 recaps stayed at three plays. The existing beats cover the
decisive graveyard fights, level-up disruption, fractal and Oblation
finishes, and the two Lorraine players’ Prismatic Edge exchanges.
