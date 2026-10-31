# Broadcast video sources and transcript coverage

Audit date: 2026-10-31. Source: [official livestream archive](https://www.youtube.com/@gatcg/streams) and the channel’s Videos tab. The archive listing contained 100 stream entries; two individual match uploads were matched separately.

## Video links

All 203 current recaps have an explicit association in `BROADCAST_VIDEO_SOURCES.json`. Run `npm run pipeline:broadcast-videos` after editing that registry. The command validates associations before modifying recap data and is idempotent. Existing recap text is preserved.

Two recaps have direct match uploads (Akihabara Round 9 and Taipei Round 9). Another 110 links have transcript-verified broadcast introduction offsets and are labeled **Watch match**. The remaining 91 links open the event/day broadcast and are labeled **Watch broadcast**. Match-start offsets require `startEvidence`; do not reuse clip-relative timestamps, recap beat order, or targeted review ranges as full-stream match starts. The North American Nationals sources supplied in the ZIP are individual clips; their published links point to the corresponding official day broadcast. Eighteen now have separately verified full-stream offsets; Round 9 remains without an offset because the captured captions end during deck discussion.

## Transcript backfill

Current collection period means Taipei September 2025 through the latest archived Osaka Day 1 stream. Earlier streams are recorded below as a separate backlog. Upcoming streams, developer streams, ceremonies and premieres are not missing match transcripts.

29 archived competition broadcasts fall in the current period. 13 already had full-stream source files; 14 additional streams now have locally captured captions.

New captures are in `pipeline/.cache/broadcast-transcripts/`, with JSON and plain-text companions named by video ID. This cache is intentionally not committed; the registry records paths, hashes, segment counts and first/last timestamps. Capture means all transcript rows exposed by YouTube, not a claim that every moment of the video has captions. Blank caption rows are retained. All 14 captures have received a **targeted match-boundary/result review**, with selected introduction, transition and closing-sequence windows. This is not full sequential gameplay or video review. The pass added 86 concise recaps and 18 offsets to existing recaps; the original 110 recap texts are unchanged. Exact evidence and remaining cases are recorded in [the backfill review](BROADCAST_BACKFILL_REVIEW_2026-10-31.json). Original Downloads files and ZIP are untouched.

| Stream | Transcript status |
| --- | --- |
| [Ascent Osaka Day 1 \| Grand Archive TCG](https://www.youtube.com/watch?v=g3NNFcNpw3k) | Unavailable in YouTube transcript UI |
| [Ascent Melbourne Day 2 \| Grand Archive TCG](https://www.youtube.com/watch?v=qQrV2I2Uiac) | Captured locally · 4,597 segments · targeted review |
| [Ascent Melbourne Day 1 \| Grand Archive TCG](https://www.youtube.com/watch?v=W_5i0aO5Es0) | Captured locally · 4,685 segments · targeted review |
| [Championship Sunday Worlds 2026 \| Grand Archive TCG](https://www.youtube.com/watch?v=j-fYPSG3KEA) | Existing source transcript |
| [Worlds 2026 Top 8 \| Grand Archive TCG](https://www.youtube.com/watch?v=rxlxRXstZS0) | Existing source transcript |
| [Worlds Swiss Stage 2026 \| Grand Archive TCG](https://www.youtube.com/watch?v=MAgS0ISYLtI) | Existing source transcript |
| [The Gauntlet 2026 \| Grand Archive TCG](https://www.youtube.com/watch?v=U4RbiOBCC-Q) | Existing source transcript |
| [South East Asia Nationals Day 2 \| Grand Archive TCG](https://www.youtube.com/watch?v=694jDw5rGqg) | Captured locally · 4,929 segments · targeted review |
| [South East Asia Nationals Day 1 \| Grand Archive TCG](https://www.youtube.com/watch?v=yiXTkbA1am4) | Existing source transcript |
| [Oceania Nationals Day 1 \| Grand Archive TCG](https://www.youtube.com/watch?v=YajGY_RVfD4) | Captured locally · 5,342 segments · targeted review |
| [European Nationals Day 2 \| Grand Archive TCG](https://www.youtube.com/watch?v=DPuScrWjjag) | Existing source transcript |
| [European Nationals Day 1 \| Grand Archive TCG](https://www.youtube.com/watch?v=JKKl7AYwv3c) | Existing source transcript |
| [Ascent Las Vegas 2026 Day 2 \| Grand Archive TCG](https://www.youtube.com/watch?v=QX4lJQ5qgNA) | Existing source transcript |
| [North American Nationals Day 2 \| Grand Archive TCG](https://www.youtube.com/watch?v=tFC-3k0uxcM) | Captured locally · 5,441 segments · targeted review |
| [North American Nationals Day 1 \| Grand Archive TCG](https://www.youtube.com/watch?v=ljQZR8Yu1XM) | Captured locally · 5,506 segments · targeted review |
| [Ascent Los Angeles Day 2 \| Grand Archive TCG](https://www.youtube.com/watch?v=Y7WZMR-8ao0) | Unavailable in YouTube transcript UI |
| [Ascent Los Angeles Day 1 \| Grand Archive TCG](https://www.youtube.com/watch?v=iwjvP7O9ytM) | Captured locally · 4,547 segments · targeted review |
| [Ascent London Day 2 \| Grand Archive TCG](https://www.youtube.com/watch?v=41aKdQJ7U1c) | Existing source transcript |
| [Ascent London Day 1 \| Grand Archive TCG](https://www.youtube.com/watch?v=E8MyaSKtI_U) | Existing source transcript |
| [Ascent Manila Day 2 \| Grand Archive TCG](https://www.youtube.com/watch?v=8fnn-hbArSk) | Existing source transcript |
| [Ascent Manila Day 1 \| Grand Archive TCG](https://www.youtube.com/watch?v=PITLBQ2u6gc) | Captured locally · 4,915 segments · targeted review |
| [Ascent Akihabara Day 2 \| Grand Archive TCG](https://www.youtube.com/watch?v=L72HwYWAQAY) | Captured locally · 4,153 segments · targeted review |
| [Ascent Akihabara Day 1 \| Grand Archive TCG](https://www.youtube.com/watch?v=pYN7DXxQOQc) | Captured locally · 4,721 segments · targeted review |
| [Ascent Auckland Day 2 \| Grand Archive TCG](https://www.youtube.com/watch?v=idcMDSZRmIE) | Captured locally · 5,428 segments · targeted review |
| [Ascent Auckland Day 1 \| Grand Archive TCG](https://www.youtube.com/watch?v=6XU9azcBukk) | Captured locally · 5,006 segments · targeted review |
| [Grand Finals Razorgale Kongming vs Wind Seiryuu Guo Jia \| Ascent Niagara Falls Day 2](https://www.youtube.com/watch?v=YEdMx87UqeE) | Existing source transcript |
| [Ascent Niagara Falls Day 1 \| Grand Archive TCG](https://www.youtube.com/watch?v=O9EzTt7ffVc) | Captured locally · 4,939 segments · targeted review |
| [Ascent Taipei Day 2 \| Grand Archive TCG](https://www.youtube.com/watch?v=oHCCZOZBvKM) | Existing source transcript |
| [Ascent Taipei Day 1 \| Grand Archive TCG](https://www.youtube.com/watch?v=gL-S2tAI6bk) | Captured locally · 5,493 segments · targeted review |

## Parallel review follow-up

The first pass covered 14/14 recovered sources. All 196 recaps link uniquely to official pairings across 15 events. Ten selected matches received an independent second-agent review; the parent additionally checked the Quarax and YojiAh penalty windows and the Superior–Elian bonus excerpt.

All 12 held findings received a parallel follow-up in [the resolution record](BROADCAST_HELD_RESOLUTIONS_2026-10-31.json), adding seven recaps (203 total). Taipei Round 4 identity and the NA Superior–Elian game number were verified from played video overlays. Taipei Round 2 publishes its verified Game 1 with the official 1–0 result; the closing “2–0” guess is not adopted. LA Round 7 publishes only the shown Game 1. Niagara Round 5 is resolved: Fruitcake receives a deciding game loss for generated Cosmic Bolts left in the presented deck.

Two published Niagara recaps retain explicit broadcast/official score differences: Hyouka 1–0 versus official 2–0, and Centai 2–1 versus official 2–0. Official bracket data is unchanged. These conflicts are documented, not reconciled.

Five findings produce no new recap: LA Round 1 still conflicts on the match winner (broadcast draw, official SpaghettiSr 2–1); SEA’s Justinljw/NoobTinnn alias needs an authoritative bridge; LA Round 2 has no identifiable match during the technical break; LA Round 9 lies beyond the captured source; NA Round 9’s upload ends during deck discussion, so its existing recap keeps the whole-broadcast link. These are evidence blockers, not pending transcript-reading tasks.

Full gameplay annotation remains for all 14 sources. Several new recaps contain only a reviewed closing game; earlier games are not reconstructed from the match score. Earlier result-only game stubs were omitted from the Asia additions; original game numbers remain intact. The SEA final retains its broadcast link without an offset because captions skip its introduction. Osaka Day 1 and Los Angeles Day 2 still lack available captions; the older 50-stream backlog is separate.

## Older archive backlog

These streams predate the current recap collection and were inventoried, not downloaded or reviewed. Repeated titles refer to different upload IDs; do not join them by title alone.

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
