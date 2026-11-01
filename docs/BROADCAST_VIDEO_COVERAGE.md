# Broadcast video sources and transcript coverage

Audit date: 2026-10-31. Source: [official livestream archive](https://www.youtube.com/@gatcg/streams) and the channel’s Videos tab. The archive listing contained 100 stream entries; two individual match uploads were matched separately.

## Video links

All 205 current recaps have an explicit association in `BROADCAST_VIDEO_SOURCES.json`. Run `npm run pipeline:broadcast-videos` after editing that registry. The command validates associations before modifying recap data and is idempotent. Existing recap text is preserved.

Two recaps have direct match uploads (Akihabara Round 9 and Taipei Round 9). Another 112 links have transcript-verified broadcast introduction offsets and are labeled **Watch match**. The remaining 91 links open the event/day broadcast and are labeled **Watch broadcast**. Match-start offsets require `startEvidence`; do not reuse clip-relative timestamps, recap beat order, or targeted review ranges as full-stream match starts. The North American Nationals sources supplied in the ZIP are individual clips; their published links point to the corresponding official day broadcast. Eighteen now have separately verified full-stream offsets; Round 9 remains without an offset because the captured captions end during deck discussion.

## Transcript backfill

Current collection period means Taipei September 2025 through the latest archived Osaka Day 1 stream. Earlier streams are recorded below as a separate backlog. Upcoming streams, developer streams, ceremonies and premieres are not missing match transcripts.

29 archived competition broadcasts fall in the current period. 13 already had full-stream source files; 14 additional streams now have locally captured captions. Ascent Osaka Day 1 has no YouTube captions, so it has a separate machine transcription (OpenAI whisper-1 on the downloaded audio). That transcript is not YouTube captions. It has not been reviewed, and card and player names are often misheard.

New captures are in `pipeline/.cache/broadcast-transcripts/`, with JSON and plain-text companions named by video ID. This cache is intentionally not committed; the registry records paths, hashes, segment counts and first/last timestamps. Capture means all transcript rows exposed by YouTube, not a claim that every moment of the video has captions. Blank caption rows are retained. The initial **targeted match-boundary/result review** covered selected introduction, transition and closing-sequence windows. That pass added 86 concise recaps and 18 offsets to existing recaps, preserving the original 110 recap texts at that stage. Exact evidence and remaining cases are recorded in [the backfill review](BROADCAST_BACKFILL_REVIEW_2026-10-31.json). Original Downloads files and ZIP are untouched.

| Stream | Transcript status |
| --- | --- |
| [Ascent Osaka Day 1 \| Grand Archive TCG](https://www.youtube.com/watch?v=g3NNFcNpw3k) | Machine transcription (Whisper) · 9,182 segments · unreviewed · no YouTube captions |
| [Ascent Melbourne Day 2 \| Grand Archive TCG](https://www.youtube.com/watch?v=qQrV2I2Uiac) | Captured locally · 4,597 segments · sequential caption review |
| [Ascent Melbourne Day 1 \| Grand Archive TCG](https://www.youtube.com/watch?v=W_5i0aO5Es0) | Captured locally · 4,685 segments · sequential caption review |
| [Championship Sunday Worlds 2026 \| Grand Archive TCG](https://www.youtube.com/watch?v=j-fYPSG3KEA) | Existing source transcript |
| [Worlds 2026 Top 8 \| Grand Archive TCG](https://www.youtube.com/watch?v=rxlxRXstZS0) | Existing source transcript |
| [Worlds Swiss Stage 2026 \| Grand Archive TCG](https://www.youtube.com/watch?v=MAgS0ISYLtI) | Existing source transcript |
| [The Gauntlet 2026 \| Grand Archive TCG](https://www.youtube.com/watch?v=U4RbiOBCC-Q) | Existing source transcript |
| [South East Asia Nationals Day 2 \| Grand Archive TCG](https://www.youtube.com/watch?v=694jDw5rGqg) | Captured locally · 4,929 segments · sequential caption review |
| [South East Asia Nationals Day 1 \| Grand Archive TCG](https://www.youtube.com/watch?v=yiXTkbA1am4) | Existing source transcript |
| [Oceania Nationals Day 1 \| Grand Archive TCG](https://www.youtube.com/watch?v=YajGY_RVfD4) | Captured locally · 5,342 segments · sequential caption review |
| [European Nationals Day 2 \| Grand Archive TCG](https://www.youtube.com/watch?v=DPuScrWjjag) | Existing source transcript |
| [European Nationals Day 1 \| Grand Archive TCG](https://www.youtube.com/watch?v=JKKl7AYwv3c) | Existing source transcript |
| [Ascent Las Vegas 2026 Day 2 \| Grand Archive TCG](https://www.youtube.com/watch?v=QX4lJQ5qgNA) | Existing source transcript |
| [North American Nationals Day 2 \| Grand Archive TCG](https://www.youtube.com/watch?v=tFC-3k0uxcM) | Captured locally · 5,441 segments · sequential caption review |
| [North American Nationals Day 1 \| Grand Archive TCG](https://www.youtube.com/watch?v=ljQZR8Yu1XM) | Captured locally · 5,506 segments · sequential caption review |
| [Ascent Los Angeles Day 2 \| Grand Archive TCG](https://www.youtube.com/watch?v=Y7WZMR-8ao0) | Unavailable in YouTube transcript UI |
| [Ascent Los Angeles Day 1 \| Grand Archive TCG](https://www.youtube.com/watch?v=iwjvP7O9ytM) | Captured locally · 4,547 segments · sequential caption review |
| [Ascent London Day 2 \| Grand Archive TCG](https://www.youtube.com/watch?v=41aKdQJ7U1c) | Existing source transcript |
| [Ascent London Day 1 \| Grand Archive TCG](https://www.youtube.com/watch?v=E8MyaSKtI_U) | Existing source transcript |
| [Ascent Manila Day 2 \| Grand Archive TCG](https://www.youtube.com/watch?v=8fnn-hbArSk) | Existing source transcript |
| [Ascent Manila Day 1 \| Grand Archive TCG](https://www.youtube.com/watch?v=PITLBQ2u6gc) | Captured locally · 4,915 segments · sequential caption review |
| [Ascent Akihabara Day 2 \| Grand Archive TCG](https://www.youtube.com/watch?v=L72HwYWAQAY) | Captured locally · 4,153 segments · sequential caption review |
| [Ascent Akihabara Day 1 \| Grand Archive TCG](https://www.youtube.com/watch?v=pYN7DXxQOQc) | Captured locally · 4,721 segments · sequential caption review |
| [Ascent Auckland Day 2 \| Grand Archive TCG](https://www.youtube.com/watch?v=idcMDSZRmIE) | Captured locally · 5,428 segments · sequential caption review |
| [Ascent Auckland Day 1 \| Grand Archive TCG](https://www.youtube.com/watch?v=6XU9azcBukk) | Captured locally · 5,006 segments · sequential caption review |
| [Grand Finals Razorgale Kongming vs Wind Seiryuu Guo Jia \| Ascent Niagara Falls Day 2](https://www.youtube.com/watch?v=YEdMx87UqeE) | Existing source transcript |
| [Ascent Niagara Falls Day 1 \| Grand Archive TCG](https://www.youtube.com/watch?v=O9EzTt7ffVc) | Captured locally · 4,939 segments · sequential caption review |
| [Ascent Taipei Day 2 \| Grand Archive TCG](https://www.youtube.com/watch?v=oHCCZOZBvKM) | Existing source transcript |
| [Ascent Taipei Day 1 \| Grand Archive TCG](https://www.youtube.com/watch?v=gL-S2tAI6bk) | Captured locally · 5,493 segments · sequential caption review |

## Parallel review follow-up

The first pass covered 14/14 recovered sources. At that point, all 196 recaps linked uniquely to official pairings across 15 events. Ten selected matches received an independent second-agent review; the parent additionally checked the Quarax and YojiAh penalty windows and the Superior–Elian bonus excerpt.

All 12 held findings received a parallel follow-up in [the resolution record](BROADCAST_HELD_RESOLUTIONS_2026-10-31.json), adding seven recaps (203 total). Taipei Round 4 identity and the NA Superior–Elian game number were verified from played video overlays. Taipei Round 2 publishes its verified Game 1 with the official 1–0 result; the closing “2–0” guess is not adopted. LA Round 7 publishes only the shown Game 1. Niagara Round 5 is resolved: Fruitcake receives a deciding game loss for generated Cosmic Bolts left in the presented deck.

Two published Niagara recaps retain explicit broadcast/official score differences: Hyouka 1–0 versus official 2–0, and Centai 2–1 versus official 2–0. Official bracket data is unchanged. These conflicts are documented, not reconciled.

Four findings produce no new recap: LA Round 1 still conflicts on the match winner (broadcast draw, official SpaghettiSr 2–1); LA Round 2 has no identifiable match during the technical break; LA Round 9 lies beyond the captured source; NA Round 9’s upload ends during deck discussion, so its existing recap keeps the whole-broadcast link. The three source gaps require alternate footage; the score conflict requires stronger result evidence.

The initial pass left several recaps with only a reviewed closing game. Subsequent sequential caption review is recorded below; full video review remains separate. Games without captioned actions are not reconstructed from the match score. Earlier result-only game stubs were omitted from the Asia additions; original game numbers remain intact. The SEA final retains its broadcast link without an offset because captions skip its introduction. Osaka Day 1 and Los Angeles Day 2 still lack available captions; the older 50-stream backlog is separate.

### Additional evidence follow-up

The SEA quarterfinal identity bridge is now established: [NoobTinnn’s profile](https://fractalofin.site/player/10891.html) explicitly lists Justinljw as a past username for Omnidex #10891, corroborated by [Recollect’s stable-ID listing](https://recollect.gg/hosts/67). These are third-party historical records, not an official rename log. A subsequent caption sequence review establishes the game boundary: Justin concedes at 6:42:27, sideboard discussion starts at 6:43:12, and commentary places Justin first in the next game at 6:46:20. The post-match discussion at 7:25:09 explicitly refers back to the first game. The recap now publishes both selected finishes, bringing the total to 204; Game 2 is established from this sequence, not inferred from the official 2–0.

A parallel search found no alternate official footage for LA R2/R9 or NA R9, and no authoritative correction for LA R1 or Niagara R2/R3. This does not establish that no recording or correction exists. The raw cached official scores confirm these are source discrepancies, not application score conversion. Fresh official API reads returned HTTP 403, so current corrections could not be verified. Search evidence and remaining requirements are recorded in `BROADCAST_HELD_RESOLUTIONS_2026-10-31.json`. No recaps, scores, or video offsets changed in this follow-up.

Next: seek alternate recordings or authoritative score confirmation for the six remaining cases (four unpublished findings and two published score disagreements). Eight of the twelve held findings now have published recaps; six of twelve are fully resolved, with two published score disagreements retained explicitly. Full gameplay review of the 14 recovered sources remains separate.

## Older archive backlog

These streams predate the current recap collection. Boston Days 1 and 2 now have cached captions awaiting review; the other 48 competition streams remain inventoried only. Repeated titles refer to different upload IDs; do not join them by title alone.

- [Ascent Boston Day 2 \| Grand Archive TCG](https://www.youtube.com/watch?v=hAx4jQ4VjCs)
- [Ascent Boston Day 1 \| Grand Archive TCG](https://www.youtube.com/watch?v=tWjsNOfIW4c)
- [Worlds 2025 Championship Sunday  \| Grand Archive TCG](https://www.youtube.com/watch?v=I3HVrMEHlrE)
- [Worlds 2025 Quarterfinals  \| Grand Archive TCG](https://www.youtube.com/watch?v=1oXFzNCvWxI)
- [Worlds Swiss Stage Day 1 \| Grand Archive TCG](https://www.youtube.com/watch?v=fTyI1MJTbFk)
- [The Gauntlet \| Grand Archive TCG](https://www.youtube.com/watch?v=LAIcEltef54)
- [2025 North American Nationals Day 2 \| Grand Archive TCG](https://www.youtube.com/watch?v=BepZE-U6fSo)
- [2025 North American Nationals Day 1 \| Grand Archive TCG](https://www.youtube.com/watch?v=dE_qRSUX0uU)
- [Oceania Nationals Day 2 \| Grand Archive TCG](https://www.youtube.com/watch?v=50WkwpsbP_4)
- [Oceania Nationals Day 1 \| Grand Archive TCG](https://www.youtube.com/watch?v=Dg6IxmGtlug)
- [European Nationals 2025 Day 2 \| Grand Archive TCG](https://www.youtube.com/watch?v=1F9iyMjj61E)
- [Ascent Kuala Lumpur Day 2 \| Grand Archive TCG](https://www.youtube.com/watch?v=JbVk-zzc9SY)
- [European Nationals 2025 Day 1 \| Grand Archive TCG](https://www.youtube.com/watch?v=8HmzphqlJKw)
- [Ascent Kuala Lumpur Day 1 \| Grand Archive TCG](https://www.youtube.com/watch?v=ZpUg98K8kVY)
- [Southeast Asia Nationals Day 2 \| Grand Archive TCG](https://www.youtube.com/watch?v=k0HpThOWnSQ)
- [Southeast Asia Nationals 2025 Day 1 \| Grand Archive TCG](https://www.youtube.com/watch?v=IL9AXf6i7nQ)
- [Ascent Seattle Day 2 Swiss - Grand Archive TCG](https://www.youtube.com/watch?v=3f7HH-9Ll1I)
- [Ascent Seattle Day 1 Swiss - Grand Archive TCG](https://www.youtube.com/watch?v=jd-wmZsIeAU)
- [Ascent Melbourne Day 2 Swiss - Grand Archive TCG](https://www.youtube.com/watch?v=DnFQxej76EE)
- [Ascent Melbourne Day 1 Swiss - Grand Archive TCG](https://www.youtube.com/watch?v=JqthQTQiPFY)
- [Ascent Utrecht Day 2](https://www.youtube.com/watch?v=s-UKsKVQ3Kc)
- [Grand Archive TCG Ascent Utrecht Day 1](https://www.youtube.com/watch?v=DV6n1MgNEb0)
- [Ascent Santa Clara Day 2](https://www.youtube.com/watch?v=C6Xh12TupCc)
- [Ascent Santa Clara Day 1](https://www.youtube.com/watch?v=panCSchyYfo)
- [Ascent Christchurch Day 2 \| Grand Archive TCG](https://www.youtube.com/watch?v=0epTDvwp0jY)
- [Ascent Christchurch Day 1 \| Grand Archive TCG](https://www.youtube.com/watch?v=ZUA4MfKD0Rw)
- [Ascent Toronto Day 2 Top 8 + Grand Finals \| Grand Archive TCG](https://www.youtube.com/watch?v=-nfzZa3aUGM)
- [Ascent Toronto Day 2 \| Grand Archive TCG](https://www.youtube.com/watch?v=q4bhTUBpDpI)
- [Ascent Toronto Day 1 \| Grand Archive TCG](https://www.youtube.com/watch?v=Te9LaC43keo)
- [Ascent Singapore Day 2 \| Grand Archive TCG](https://www.youtube.com/watch?v=15SDumUm4jE)
- [Ascent Singapore Day 1 Part 2](https://www.youtube.com/watch?v=FJDml9-Zrpg)
- [Ascent Singapore Day 1 \| Grand Archive TCG](https://www.youtube.com/watch?v=8oK25My-6co)
- [Ascent Chicago Day 2 Grand Finals \| Grand Archive TCG](https://www.youtube.com/watch?v=NsUrI8pdGVM)
- [Ascent Chicago Day 2 \| Grand Archive TCG](https://www.youtube.com/watch?v=S_ypntBzTlE)
- [Ascent Chicago Day 2 \| Grand Archive TCG](https://www.youtube.com/watch?v=hWqpnUigK-c)
- [Ascent Chicago Day 1 \| Grand Archive TCG](https://www.youtube.com/watch?v=b1nkzJqBMtw)
- [Grand Archive TCG - Ascent Taipei Day 2 \| Swiss into Top 8](https://www.youtube.com/watch?v=ZszRz4UdtiE)
- [Grand Archive TCG - Ascent Taipei Day 1 \| Round 8](https://www.youtube.com/watch?v=9h9ppflglEc)
- [Grand Archive TCG - Ascent Taipei Day 1 \| Swiss Rounds](https://www.youtube.com/watch?v=J0Zk0Duu3uE)
- [Grand Archive TCG World Championships Day 3 \| Top 4 Semi-Finals and Grand Finals](https://www.youtube.com/watch?v=3aWEDJQeKNo)
- [Grand Archive TCG World Championships Day 2 \| Top 8 Single Elimination](https://www.youtube.com/watch?v=hKt4nyRwY4c)
- [Grand Archive TCG World Championships Day 1 \| Swiss Rounds](https://www.youtube.com/watch?v=UCDbE561I-8)
- [Grand Archive TCG World Championships Day 1 \| Swiss Rounds](https://www.youtube.com/watch?v=J-tcueFSg8E)
- [Grand Archive TCG World Championships Day 1 \| Swiss Rounds](https://www.youtube.com/watch?v=FqdSYup_49k)
- [Grand Archive TCG —Oceania Nationals 2024 Day 2](https://www.youtube.com/watch?v=78oDYZS7fZs)
- [Grand Archive TCG —Oceania Nationals 2024 Day 1](https://www.youtube.com/watch?v=eGCd1r5lLyc)
- [Grand Archive TCG — South East Asia Nationals 2024 Day 2](https://www.youtube.com/watch?v=8H5CWyMfGgI)
- [Grand Archive TCG — South East Asia Nationals 2024 Day 1](https://www.youtube.com/watch?v=dMqSfF3CPkM)
- [Grand Archive TCG — North America Nationals 2024 Day 2](https://www.youtube.com/watch?v=_Ia27iMaAYQ)
- [Grand Archive TCG — North America Nationals 2024 Day 1](https://www.youtube.com/watch?v=bTb0RMWpZV4)

## Verification

App/shared typechecks, focused lint and 49 relevant tests pass. Every published addition and offset joins an exact official event/stage/round/pairing and the same two players. Source hashes and timestamp quotes were checked against local captures. Original 110 recap contents are unchanged apart from verified video offsets.

Checked 390px mobile and 1280px desktop: grouped results, Game 2 selected by default for partial coverage, named card artwork, 48px watch links, Akihabara Top Cut recap attachment, keyboard Results/Timeline switching, empty search and recovery, and no horizontal overflow. Initial loading was observed. Network failure, text zoom and on-screen keyboards were not re-tested.

Follow-up verification: all 12 dispositions recorded; quoted captions and new card references checked against local sources/catalog. Existing 196 recaps preserved. 51 focused tests, app typecheck, focused lint and diff checks pass. The new Niagara penalty recap was checked at 390px and 1280px, with no overflow, a 48px video link, and keyboard game switching. Initial loading was observed. Network failure, empty search, text zoom, and on-screen keyboard states were not re-tested for this data-only change.

Additional follow-up verification: 35 recap/backfill tests and diff checks pass. This pass changes evidence documentation only; published data and UI remain unchanged.

SEA sequence follow-up verification: 37 recap, backfill, and video-link tests pass; all 203 prior recap objects remain unchanged. The new result and timestamped video link were verified in local search. No UI code changed; mobile/desktop layout and error states were not re-tested in this pass.

### Sequential caption review follow-up

Three selected matches received sequential caption review of both games: Melbourne Day 2 Round 9, Akihabara Day 2 Round 10, and Auckland Day 1 Round 1. Each recap now includes its previously omitted first game and a more specific second-game finish. Akihabara’s Kafit5566 deck is corrected to Fire Sword Saint Lorraine, supported by the commentary correction and official decklist. Match results, pairing associations and video offsets are unchanged. Exact ranges and findings are in [the sequential review record](BROADCAST_SEQUENTIAL_REVIEW_2026-10-31.json). That three-match pass did not cover entire streams. The six unresolved held cases remain unchanged.

Verification: 37 recap, backfill and video-link tests pass. Exactly three of 204 recap objects changed; all results and video links are preserved. No UI code changed; responsive layouts and error states were not re-tested.

### Complete recovered-source caption pass

Sequential cached-caption review now covers all 69,702 rows across the 14 recovered streams, combining the three prior matches with this 110-match batch. All 113 associated published recaps have review records. This batch changes 88 recaps and restores 105 omitted game summaries. The total remains 204 matches: IDs, player identities, match results, official pairings and video links are unchanged. The Akihabara Round 2 deck label now explicitly includes Lorraine; Jett’s NA quarterfinal label corrects the card name to Orb of Sealing.

Corrections distinguish actual plays from proposed lines, effect damage from attacks, concessions from executed lethal, and judge rewinds from penalties. Melbourne’s final now includes Yamikin’s opening game loss for a main-deck card in the material deck. Taipei Round 2’s second-game draw is explicitly inferred from the official 1–0 result; the conflicting closing commentary remains recorded. Caption gaps and off-camera games remain unfilled.

The [sequential review record](BROADCAST_SEQUENTIAL_REVIEW_2026-10-31.json) records source hashes, complete row coverage, match evidence and changes. Independent sampled checks covered penalties, timed finishes, the SEA elimination rounds, Auckland’s final, and Taipei’s final two rounds. This is completion of the available-caption review, not full video verification. Original Downloads transcripts and ZIP are untouched.

Next: obtain alternate footage or authoritative result evidence for the six unresolved held cases. The recovered-source caption initiative is 100% complete (14/14 streams and 113/113 associated recaps); held-case resolution remains 50% (6/12 fully resolved). Two unavailable-caption streams and the 50-stream older archive remain separate scope.

Verification: 39 recap, backfill and video-link tests pass, along with focused lint and diff checks. All 14 cached source hashes and complete row ranges were checked. All 204 IDs, player names, match results and video links match the pre-batch data; exactly 88 recaps changed and 105 games were added. No UI code changed; mobile/desktop layouts and error states were not re-tested.

### LA Round 1 partial publication

LA Round 1 now publishes the supported opening two games: RoxanneKaiser receives a deck-list game loss, then wins Game 2 with repeated Cosmic Focus. The recap attributes SpaghettiSr’s 2–1 match result to official records and retains the conflicting draw commentary. No deciding-game finish is reconstructed. The introduction at 31:25 supplies a verified video offset; the exact official pairing is linked. Total coverage is 205 recaps, including 114 associated with the recovered sources.

Parallel follow-up found no authoritative score correction or alternate footage. The original NA Round 9 ZIP entry contains no source URL or extra metadata; a secondary VOD index’s likeBAILEY Round 9 is Gauntlet 2026, not this match. Nine of the twelve held cases now have recaps, but only six are fully resolved (50%). The recovered-source caption review remains complete; resolving the six open cases requires missing recordings or authoritative result evidence.

Verification: 40 recap, backfill and video-link tests pass; focused lint and diff checks pass. All 204 prior recaps and all official pairing data remain unchanged, with one exact recap association added. Source hash verified and penalty/finish independently checked. Data-only change; mobile/desktop and error states were not re-tested.

### Older archive: Boston captions captured

Both Boston broadcasts now have complete captures of the timestamped rows exposed by YouTube: Day 1 has 5,636 rows (0:00–11:54:54), and Day 2 has 5,015 rows (0:12–11:08:41). Both expanded video descriptions link official event 32243. Source paths, hashes, counts and bounds are recorded in the registry; match review is pending. Captions may have gaps even when all exposed rows are captured.

The built-in export stopped at 5,000 rows, so those incomplete files were replaced with bounded captures of all exposed transcript rows. Hashes, counts, timestamp ordering and bounds were independently verified. No published recaps or UI changed. LA Day 2 and Osaka Day 1 still had no Show transcript control in their expanded descriptions on this check.

Next: review Boston captions against official pairings before publishing recaps. Older-archive caption capture is 4% complete (2/50 competition streams); match review is 0/50. Availability of the remaining 48 is not yet established. The recovered-source review remains complete, and held-case resolution remains 6/12 (50%), blocked on missing footage or authoritative score evidence.
