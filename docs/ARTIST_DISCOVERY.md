# Artist discovery tracker

Review each credited artist or studio individually to establish identity and discover official websites, portfolios, and social accounts. Preserve evidence before a link becomes eligible for publication.

## Baseline and progress

- Catalog snapshot: `data/card-catalog.json`, generated 2026-10-13T14:05:29.628Z.
- 2,535 cards; 5,031 printings; 30 printings without a usable illustrator credit.
- 84 exact credit strings form 76 discovery entries after trimming surrounding whitespace only.
- Public-web first pass reviewed: 76/76. Outcomes: 10 Reviewed with verified links; 25 Reviewed with no verified links found; 41 Needs identity review. Verified unique URLs: 21 across 10 credit entries (9 supported identities; A031/A034 share an artist). No entries remain Not started or In progress.
- Counts describe this snapshot. Unique-card counts overlap when different artists illustrate different printings of one card.

The first pass covers the catalog snapshot, not every possible account or unindexed platform. All new records were researched on 2026-10-14. Many extraction requests failed, but browser follow-ups verified several original profiles. Remaining candidates are withheld. Pixiv browser navigation was rejected by the site-safety policy; no workaround was attempted. A no-link outcome records completed searches, not a resolved real-world identity or proof that no account exists. No outreach, runtime alias changes, production directory edits, or UI changes were performed. A031/A034 now have a supported shared identity in these research notes.

Verified coverage includes Hanh Chu, Gyool, Pinakes, Rachel Liu, fuzichoco, Dragonart, TaroTarou (A031/A034), Antilous, and the exact Dragonart 白霜搽 credit. The 21 unique verified URLs include 10 social-network profiles, plus websites, portfolios, and artist link hubs. Repeated TaroTarou URLs across two credit entries are counted once.

## Implementation handoff — 2026-10-14

Identity follow-ups are deferred while artist pages are built, as requested. The initial public directory uses 75 identities for these 76 entries: only A031/A034 share a page. The initial 21 verified URLs were curated separately in `shared/src/artistDirectory.ts`; uncertain spellings and studio/member credits remain separate. Candidate/unavailable links stay withheld. The unresolved decisions and next actions below remain the research backlog; they do not block useful card galleries. See the [implementation roadmap](ARTIST_ROADMAP.md) for verification and release status.


Current follow-up totals (2026-10-14): 16 independently supported credit entries representing 15 identities, plus three user-attributed credit entries/identities; 22 no-link outcomes; 35 needing identity review. There are 40 published URLs: 36 independently supported and four user-attributed. The portrait pass below covers all 75 curated identities, with 16 images (15 independently sourced and one user-supplied derivative) and 59 initials fallbacks. These follow-up totals supersede the initial-pass totals for current coverage.

## Work through one entry at a time

1. Take the next Not started entry and mark it In progress. The initial queue orders by unique-card count, then name; keep assigned IDs stable as work continues.
2. Inspect its credited cards and printings. Search the exact credit, Grand Archive, and any supported native-script or alternate names. Record queries and the date searched.
3. Establish whether the credit identifies an individual, studio, or combined attribution. Search publisher artist credits and artist-owned sites, then follow their links to portfolios and social profiles.
4. Open each candidate account and the source supporting ownership. A username match, search snippet, fan page, or repost alone cannot verify identity. An exact card-art match is sufficient but not mandatory: a user-supplied identification supported by matching professional/native names and artist-owned account cross-links can establish a strong identity match. Record when the catalog connection is inferred from this evidence rather than demonstrated by a commission post. Verify account ownership separately from destination readability; an artist-owned link can establish ownership even if that platform cannot be inspected. Record the direct evidence URL and a short description of what connects the account to the credited artist.
5. Record each link as Verified, Candidate, Rejected, or Unavailable. Keep candidate/rejected evidence in research records; publish only Verified links. A studio account does not automatically establish a member's personal account.
6. Resolve the entry as Reviewed with verified links, Reviewed with no verified links found, or Needs identity review. Record unsuccessful searches and remaining questions. No verified links found means discovery was performed, not that no account exists.
7. Update the totals and select the next entry. If an earlier entry has already established the same identity, reference its evidence and explicitly resolve this credit rather than repeating the search or silently merging names.

Needs identity review entries stay on the unresolved list. Continue other entries while evidence is unavailable; revisit unresolved entries before closing the discovery milestone. Do not contact artists or send messages as part of discovery without explicit authorization.

## Evidence record for each entry

Append one record per reviewed queue ID below the queue. Keep this information together:

- **Queue ID and credited name:** preserve every original credit spelling.
- **Status and date reviewed:** one of the queue statuses above.
- **Identity:** display name, individual/studio/combined/unknown, supported aliases, proposed stable artist ID and slug, and any related queue IDs.
- **Credited examples:** card name, edition UUID, set, and collector number for representative artwork.
- **Searches:** exact queries, sources inspected, and failed or blocked access that limits the outcome.
- **Links:** platform, account label, canonical HTTPS URL, link status, ownership evidence URL, brief evidence explanation, and verification date for each account.
- **Decisions:** supported merges, rejected candidates with reasons, unresolved questions, and the next action if blocked.

An entry can have verified links and unresolved candidates at the same time. Keep link status separate from entry status. Never fabricate a slug, alias, platform, or account merely to fill a field.

## Discovery queue

| ID | Trimmed catalog credit | Unique cards | Printings | Status |
| --- | --- | ---: | ---: | --- |
| A001 | Primea Studio | 685 | 934 | Reviewed with verified links |
| A002 | 木叶 | 451 | 683 | Reviewed with no verified links found |
| A003 | 道漫 | 398 | 1056 | Needs identity review |
| A004 | Dragonart | 323 | 422 | Reviewed with verified links |
| A005 | 十尾 | 120 | 237 | Reviewed with no verified links found |
| A006 | 砂木烟 | 110 | 177 | Reviewed with user attribution |
| A007 | Hanh Chu | 97 | 197 | Reviewed with verified links |
| A008 | Parhelion Studio Co. | 72 | 96 | Needs identity review |
| A009 | Alkaid | 63 | 89 | Needs identity review |
| A010 | Gyool | 46 | 66 | Reviewed with verified links |
| A011 | Pinakes | 38 | 71 | Reviewed with verified links |
| A012 | 代々 | 34 | 73 | Needs identity review |
| A013 | KHΩA | 33 | 39 | Reviewed with verified links |
| A014 | Kaze | 32 | 45 | Reviewed with no verified links found |
| A015 | Rachel Liu | 30 | 38 | Reviewed with verified links |
| A016 | Sineia | 29 | 41 | Reviewed with user attribution |
| A017 | Faicha | 28 | 50 | Reviewed with verified links |
| A018 | 檸檬夾心餅 | 26 | 44 | User-confirmed Instagram, Facebook, and Threads |
| A019 | Pekoe | 25 | 30 | Reviewed with no verified links found |
| A020 | 北飞飞 | 23 | 44 | Reviewed with no verified links found |
| A021 | Marchon | 21 | 25 | Reviewed with no verified links found |
| A022 | Siriuf Long | 20 | 34 | Needs identity review |
| A023 | Yui | 20 | 28 | Reviewed with no verified links found |
| A024 | 坊橋夜泊 | 20 | 45 | Reviewed with verified links |
| A025 | DragonArt 白霜茶 | 18 | 22 | Needs identity review |
| A026 | Kumai | 17 | 39 | Reviewed with no verified links found |
| A027 | T_Blence | 16 | 27 | Needs identity review |
| A028 | 杭州新艺族 | 16 | 21 | Reviewed with no verified links found |
| A029 | Hori | 15 | 55 | Reviewed with no verified links found |
| A030 | DragonArt Chu | 13 | 15 | Needs identity review |
| A031 | DragonArt TaroTarou | 13 | 16 | Reviewed with verified links |
| A032 | NR | 12 | 20 | Reviewed with no verified links found |
| A033 | SalmonTea | 10 | 12 | Reviewed with user attribution |
| A034 | TaroTarou | 10 | 12 | Reviewed with verified links |
| A035 | AquaGirl | 9 | 12 | Reviewed with no verified links found |
| A036 | D Lam | 9 | 19 | Reviewed with no verified links found |
| A037 | Dragonart Chu | 8 | 9 | Needs identity review |
| A038 | Parhelion Studio | 7 | 7 | Needs identity review |
| A039 | 繪來 | 7 | 7 | Reviewed with no verified links found |
| A040 | silvie | 6 | 6 | Needs identity review |
| A041 | Gendo | 5 | 13 | Reviewed with no verified links found |
| A042 | 阿清Roro | 5 | 8 | Reviewed with verified links |
| A043 | Dragonart Tris | 4 | 5 | Needs identity review |
| A044 | DragonArt Tris | 4 | 4 | Needs identity review |
| A045 | fuzichoco | 4 | 5 | Reviewed with verified links |
| A046 | Taki | 4 | 7 | Reviewed with no verified links found |
| A047 | YOHAKU | 4 | 8 | Reviewed with verified links |
| A048 | ZERONEXT | 4 | 7 | Needs identity review |
| A049 | ジェゼ一 | 4 | 9 | Needs identity review |
| A050 | 白霜茶 | 4 | 7 | Needs identity review |
| A051 | Deeya Chaturvedi | 3 | 6 | Needs identity review |
| A052 | DragonArt 倉倉 | 3 | 4 | Needs identity review |
| A053 | Leviathan | 3 | 3 | Reviewed with no verified links found |
| A054 | 白帝 | 3 | 11 | Needs identity review |
| A055 | Andrew Yang | 2 | 5 | Needs identity review |
| A056 | Chu | 2 | 3 | Needs identity review |
| A057 | SODA | 2 | 7 | Reviewed with no verified links found |
| A058 | 南佑希 | 2 | 2 | Needs identity review |
| A059 | Dragon Art | 1 | 1 | Needs identity review |
| A060 | Dragonart Antilous | 1 | 3 | Reviewed with verified links |
| A061 | Dragonart KS | 1 | 2 | Needs identity review |
| A062 | DragonArt Zhang Iris | 1 | 1 | Needs identity review |
| A063 | Dragonart 白霜搽 | 1 | 1 | Reviewed with verified links |
| A064 | DragonArt 艾瞳A-Ton | 1 | 1 | User-confirmed accounts |
| A065 | Ge-B | 1 | 1 | Needs identity review |
| A066 | HYONEE | 1 | 1 | Needs identity review |
| A067 | Polar Engine | 1 | 1 | Needs identity review |
| A068 | Primea studio | 1 | 1 | Needs identity review |
| A069 | Rubi露比喵 | 1 | 1 | Needs identity review |
| A070 | Sunny | 1 | 2 | Reviewed with no verified links found |
| A071 | TEDDYPOCKY | 1 | 1 | Needs identity review |
| A072 | 十尾t | 1 | 1 | Needs identity review |
| A073 | 桃李タロ | 1 | 2 | Needs identity review |
| A074 | 蝦蝦 | 1 | 1 | Reviewed with no verified links found |
| A075 | 道漫? | 1 | 1 | Needs identity review |
| A076 | 阿冰 | 1 | 2 | Reviewed with no verified links found |

## Whitespace variants retained for matching

Only surrounding whitespace has been consolidated. JSON string notation exposes otherwise invisible spaces and line breaks. Case, punctuation, script, and studio/member differences remain separate queue entries until supported by evidence.

| Trimmed credit | Exact catalog strings |
| --- | --- |
| Primea Studio | `"Primea Studio"`, `"Primea Studio\n"`, `"Primea Studio "` |
| 木叶 | `"木叶"`, `" 木叶"` |
| 道漫 | `"道漫"`, `" 道漫"` |
| Dragonart | `"Dragonart"`, `"Dragonart\n"` |
| 十尾 | `"十尾"`, `"十尾 "` |
| 坊橋夜泊 | `"坊橋夜泊"`, `" 坊橋夜泊"` |
| Leviathan | `"Leviathan"`, `"Leviathan "` |

## Evidence records

### A001 — Primea Studio

- **Status/date:** Reviewed with verified links; researched 2026-10-14. Studio X account verified through its art director’s profile and the user’s identification.
- **Exact credits:** `"Primea Studio"`, `"Primea Studio\n"`, `"Primea Studio "`. A068 (`"Primea studio"`) remains separate pending evidence.
- **Identity:** Primea Studio; studio identity `a001`, slug `a001-primea-studio`. The user identified Zeklewa as director and supplied the studio account. Browser inspection of [Zeklewa’s profile](https://x.com/Zeklewaaa) confirms an explicit Art Director role linking directly to [@primeastudio](https://x.com/primeastudio). Other membership, legal entity, native name, and A068 alias remain unconfirmed.
- **Credited examples:** Accursed Strength, Mercurial Heart Alter Edition, #192, edition `OAlyCUd1Nc`; Obscuring Threads, Promotional 2025, #061, edition `Ki2T3oBdUr`. Both match the local catalog. The [publisher's Obscuring Threads listing](https://index.gatcg.com/edition/obscuring-threads-p25) is indexed with this credit; direct page extraction returned only its title. The [Accursed Strength listing](https://index.gatcg.com/edition/accursed-strength-mrc-alter) likewise returned only a title.
- **Searches:** `Primea Studio Grand Archive official artist social`; `Primea Studio official art studio`; `"Primea Studio" "Grand Archive"`; `"Primea" "artstation"`; `"Primea Studio" artist twitter`; `"Primea Studio" -site:ebay.* -site:mypcards.com -site:sumaholitcg.com social`; `"Primea Studio" site:artstation.com`; `"Primea Studio" site:gatcg.com`; `"Primea Studio" instagram OR twitter OR pixiv OR weibo`; `Zeklewa "Primea"`; `"PRIMEA STUDIO" art director`; `Zeklewa official website`; `"Zeklewa"`. These initial searches did not establish an ownership chain; the user-supplied account and browser follow-up below resolve that gap.
- **Identity lead:** A search-indexed passage on the [SynthV community wiki](https://synthv.fandom.com/wiki/Official_Illustrators) calls Zeklewa the studio's art director. Direct access failed, so its cited reference could not be inspected. That indirect lead is now superseded by the director’s explicit X biography below. [Coloso's instructor page](https://coloso.global/en/products/illustrator-zeklewa-us) identifies Zeklewa as an illustrator but does not establish the Grand Archive/studio connection in the inspected material.

| Platform | Account label / URL | Status | Evidence and limitation | Checked |
| --- | --- | --- | --- | --- |
| Carrd | [Zeklewa](https://zeklewa.carrd.co/) | Candidate | Opened personal landing page, which links Twitter and Pixiv. No studio or Grand Archive connection appears in its extracted text; not eligible as a studio link. | 2026-10-14 |
| X | [@Zeklewaaa](https://x.com/Zeklewaaa) | Verified affiliation evidence | Browser-read biography says Art Director and links @primeastudio. The user confirms the director relationship. Retained as evidence; personal account is not published as the studio account. | 2026-10-14 |
| X | [@primeastudio](https://x.com/primeastudio) | Verified | User-supplied studio identification plus the director’s explicit profile link. Destination identifies primeastudio, lists a Zeklewa contact address, and has zero posts. | 2026-10-14 |
| Pixiv | [Zeklewa profile lead](https://www.pixiv.net/en/users/74928328) | Unavailable | Directly linked by Carrd; destination could not be opened. Personal account lead only; not a studio account and not published. | 2026-10-14 |

**Decisions and next actions:** Publish only the studio X link for A001, with the director’s profile as evidence. Keep Zeklewa’s personal accounts separate and retain initials: the studio profile does not provide a selected custom avatar. The studio profile lists `zeklewa@primea.studio`; the director lists `zeklewa@primeastudio.com`. These are observed contact strings, not verified website destinations. Do not infer websites from either email domain. The user’s identification connects this studio to the catalog; no separate Grand Archive commission post was found in the inspected profiles. A068 remains separate until its specific printing attribution is supported. No outreach performed.

### A002 — 木叶

- **Status/date:** Reviewed with no verified links found; researched 2026-10-14.
- **Exact credits:** `"木叶"`, `" 木叶"`.
- **Identity:** Unknown; retain 木叶 as the credited display name. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Acerbica; Abyssal Heaven; #201; edition `pa4zg0ppmv`. [Publisher edition reference](https://index.gatcg.com/edition/acerbica-hvn) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"木叶" "Grand Archive" artist`; `"木叶" 画师 推特 Grand Archive`; `"木叶" 插画师 pixiv`; `"木叶" "Grand Archive" twitter`; `"木叶" "Acerbica" artist`.
- **Findings:** Exact-name, game-specific, native-script illustrator, and representative-card searches did not establish an artist-owned account. Naruto-related results and the longer name 阿梗木叶笔记 do not establish this credit’s identity.
- **Next action:** Keep an account-free identity; revisit if a publisher or artist portfolio links the exact credit to Acerbica or another credited printing.

**Links:** none verified; no attributable account URL established in this pass.

### A003 — 道漫

- **Status/date:** Needs identity review; researched 2026-10-14.
- **Exact credits:** `"道漫"`, `" 道漫"`.
- **Identity:** Unknown; retain 道漫; related A075 is not merged. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Accepted Contract; Dawn of Ashes Alter Edition; #069; edition `gvcgdmoyde`. [Publisher edition reference](https://index.gatcg.com/edition/accepted-contract-doa-alter) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"道漫" artist Grand Archive`; `"道漫" 画师 插画`; `"道漫" 插画师`; `"道漫" artstation`; `"道漫" twitter pixiv artist`.
- **Findings:** Game-specific and native-script searches surfaced credits but no attributable account. A075 adds a question mark to the same base spelling; that is a catalog ambiguity, not a supported alias.
- **Next action:** Compare the A075 Astra Sight printing with its other editions and seek publisher credit clarification before merging.

**Links:** none verified; no attributable account URL established in this pass.

### A004 — Dragonart

- **Status/date:** Reviewed with verified links; researched 2026-10-14.
- **Exact credits:** `"Dragonart"`, `"Dragonart\n"`.
- **Identity:** Studio: 龍族數位 / Dragonart. A059’s particular credit mapping is still unresolved. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Absolving Flames; Mortal Ambition; #094; edition `fcng06fi6r`. [Publisher edition reference](https://index.gatcg.com/edition/absolving-flames-amb) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `Dragonart Grand Archive official studio`; `"Dragonart" "Grand Archive" studio artstation`; `"龍族數位" "Grand Archive"`.
- **Findings:** Browser inspection exposed the gallery’s real social destinations. The [studio roster](https://www.dragon-art.tw/7th) links TaroTarou, whose readable [original post](https://x.com/TaroTarou_Art/status/1791654715933258183) describes making Grand Archive cards with the Dragon Art team. Antilous’ linked Instagram reciprocally names DragonArt and its website. This establishes the studio connection beyond the fan-art training exercise.
- **Next action:** Use the verified studio website. Preserve member accounts under their individual/combined identities; resolve A059 separately.

| Platform | Account / canonical URL | Status | Ownership evidence and limitation | Checked |
| --- | --- | --- | --- | --- |
| Website | [龍族數位 Dragonart](https://www.dragon-art.tw/) | Verified | [Evidence](https://x.com/TaroTarou_Art/status/1791654715933258183): Primary member post describes Grand Archive card work with the studio; the studio roster links that member, and the studio gallery links Antilous’ reciprocal profile. | 2026-10-14 |

### A005 — 十尾

- **Status/date:** Reviewed with no verified links found; researched 2026-10-14.
- **Exact credits:** `"十尾"`, `"十尾 "`.
- **Identity:** Individual; publisher-supported alternate name Juubi for 十尾. A072 remains unresolved. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Academy Guide; Promotional 2024; #120; edition `x99w8eraxx`. [Publisher edition reference](https://index.gatcg.com/edition/academy-guide-p24) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"十尾" Grand Archive artist`; `"十尾" "Juubi" artist twitter`; `"十尾" 画师 pixiv`; `"Juubi" "Grand Archive" illustrator social`.
- **Findings:** The publisher-hosted [Ascent Akihabara checklist](https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Akihabara_Checklist_1db5e11780.pdf?updated_at=2025-11-14T13%3A33%3A49.872Z) names 十尾 (Juubi) as a guest illustrator. Searches using the credit and Juubi did not establish an official account. Naruto/ten-tails results are excluded.
- **Next action:** Retain Juubi as supported display-name evidence; investigate A072 separately and add accounts only when directly attributable.

**Links:** none verified; no attributable account URL established in this pass.

### A006 — 砂木烟

- **Status/date:** Reviewed with user attribution; researched 2026-10-14.
- **Exact credits:** `"砂木烟"`.
- **Identity:** Unknown; retain 砂木烟. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Academy Attendant; Alchemical Revolution; #041; edition `fiszdne4n3`. [Publisher edition reference](https://index.gatcg.com/edition/academy-attendant-alc) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"砂木烟" artist`; `"砂木烟" 微博`.
- **Findings:** The user supplied Pixiv profile 62728045 as the account for 砂木烟. Published on that user attribution under the agreed broader identity standard. Independent inspection was not possible: web retrieval failed, indexed searches did not corroborate the relationship, and the browser site-safety policy rejected the exact supplied URL. No alternate access or bypass was attempted. This is not an independently verified profile match.
- **Next action:** Retain the user-attributed Pixiv link and supplied portrait. Add independent corroboration when accessible evidence becomes available.

| Platform | Account / canonical URL | Status | Attribution evidence and limitation | Checked |
| --- | --- | --- | --- | --- |
| Pixiv | [砂木烟](https://www.pixiv.net/en/users/62728045) | User-attributed; published | User explicitly supplied this profile for 砂木烟. Destination contents, display name, and ownership were not independently inspected. The curated evidence URL identifies the supplied destination, not independent corroboration. | 2026-10-14 |

### A007 — Hanh Chu

- **Status/date:** Reviewed with verified links; researched 2026-10-14.
- **Exact credits:** `"Hanh Chu"`.
- **Identity:** Individual: Hanh Chu; do not merge the separate Chu credit (A056). Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Aethercloak Sentinel; Distorted Reflections; #195; edition `dv7zz5n8h7`. [Publisher edition reference](https://index.gatcg.com/edition/aethercloak-sentinel-dtr) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"Hanh Chu" Grand Archive artist`; `"Hanh Chu" official twitter`.
- **Findings:** The [artist website](https://raartist3.wixsite.com/hanhchu) explicitly lists Grand Archive work. The [publisher’s event article](https://www.gatcg.com/article/anime-expo-2023) independently names Hanh Chu. The readable ArtStation portfolio matches the artist identity and lists Grand Archive commissions. Browser inspection exposed the website’s Twitter link; the readable HanhChu profile matches the artist identity and links a Carrd hub with reciprocal portfolio links. An individual ArtStation project returned a sign-in shell; that does not affect verification of the readable portfolio.
- **Next action:** Use the verified website, ArtStation, Carrd hub, and X profile. Pixiv remains withheld because its inspection is blocked; keep A056 separate.

| Platform | Account / canonical URL | Status | Ownership evidence and limitation | Checked |
| --- | --- | --- | --- | --- |
| Website | [Hanh Chu](https://raartist3.wixsite.com/hanhchu) | Verified | [Evidence](https://raartist3.wixsite.com/hanhchu): Readable self-identification, illustrator role, and explicit Grand Archive client credit; publisher event article corroborates the credited name. | 2026-10-14 |
| ArtStation | [Hanh Chu](https://rokudo_aurora.artstation.com/) | Verified | [Evidence](https://rokudo_aurora.artstation.com/): Readable portfolio identifies Hanh Chu, matches the website’s contact identity, and lists named Grand Archive commissions. | 2026-10-14 |
| X | [@Hanh_R_A](https://x.com/Hanh_R_A) | Verified | [Evidence](https://raartist3.wixsite.com/hanhchu): Direct official-site social link; browser redirected to this readable HanhChu profile with matching artist/contact identity. | 2026-10-14 |
| Carrd | [Hanh Chu](https://hanhchu.carrd.co/) | Verified | [Evidence](https://x.com/Hanh_R_A): Readable hub linked by verified X profile, with reciprocal established portfolio and social links. | 2026-10-14 |
| Pixiv | [Profile 4680672](https://www.pixiv.net/en/users/4680672) | Unavailable | [Evidence](https://hanhchu.carrd.co/): Official hub link preserved; not opened after the browser site-safety policy blocked Pixiv inspection. | 2026-10-14 |

### A008 — Parhelion Studio Co.

- **Status/date:** Needs identity review; researched 2026-10-14.
- **Exact credits:** `"Parhelion Studio Co."`.
- **Identity:** Studio candidate: Parhelion Studio Co.; A038 is related but not merged. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Abnegation; Phantom Monarchs; #178; edition `4MLJvZNYeu`. [Publisher edition reference](https://index.gatcg.com/edition/abnegation-ptm) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"Parhelion Studio" official`; `"Parhelion" "Grand Archive" art studio website`.
- **Findings:** Opened [parhelion.gg](https://parhelion.gg/), which uses Parhelion Studio in its body and Parhelion Studio Co. in its copyright, and the [company LinkedIn](https://www.linkedin.com/company/parhelion-studio-co). Both describe anime/game work; neither inspected page establishes the Grand Archive commission. The architectural visualization studio at parhelionstudio.com is excluded.
- **Next action:** Obtain primary Grand Archive portfolio/client evidence before attaching these accounts or merging A038.

| Platform | Account / canonical URL | Status | Ownership evidence and limitation | Checked |
| --- | --- | --- | --- | --- |
| Website | [Parhelion Studio](https://parhelion.gg/) | Candidate | [Evidence](https://parhelion.gg/): Both studio name forms occur on one readable site; catalog affiliation is not independently established. | 2026-10-14 |
| LinkedIn | [Parhelion Studio Co.](https://www.linkedin.com/company/parhelion-studio-co) | Candidate | [Evidence](https://parhelion.gg/): Readable anime/game company profile, but no inspected direct website cross-link or Grand Archive credit. | 2026-10-14 |

### A009 — Alkaid

- **Status/date:** Needs identity review; researched 2026-10-14.
- **Exact credits:** `"Alkaid"`.
- **Identity:** Unknown; Alkaid Studios is a candidate, not an established expansion of Alkaid. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Arcane Renunciation; Radiant Origins First Edition; #299; edition `c3curBLx32`. [Publisher edition reference](https://index.gatcg.com/edition/arcane-renunciation-rdo1e) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"Alkaid" "Grand Archive" artist`; `"Alkaid" illustrator artstation`.
- **Findings:** Opened [Alkaid Studios’ ArtStation portfolio](https://alkaidstudios.artstation.com/projects). It describes an outsourcing studio and other game projects; inspected material does not establish the Grand Archive credit.
- **Next action:** Seek Arcane Renunciation or another catalog-matching commission on an artist-owned portfolio before selecting an individual or studio identity.

| Platform | Account / canonical URL | Status | Ownership evidence and limitation | Checked |
| --- | --- | --- | --- | --- |
| ArtStation | [Alkaid Studios](https://alkaidstudios.artstation.com/projects) | Candidate | [Evidence](https://alkaidstudios.artstation.com/projects): Readable portfolio; name resemblance alone cannot map a bare Alkaid credit to this studio. | 2026-10-14 |

### A010 — Gyool

- **Status/date:** Reviewed with verified links; researched 2026-10-14.
- **Exact credits:** `"Gyool"`.
- **Identity:** Individual: Gyool. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Alice, Trifle's Royalty; Radiant Origins; #011; edition `dmiigIubVp`. [Publisher edition reference](https://index.gatcg.com/edition/alice-trifles-royalty-rdo) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"Gyool" artist Grand Archive`; `"Gyool" "fruitysandwich" official`.
- **Findings:** The [artist website](https://www.gyool.info/) identifies Gyool and explicitly lists Weebs of the Shore / Grand Archive. Browser inspection read the X profile and its original Grand Archive card-work post; the profile-linked Linktree reciprocally links the verified website and account. This primary ownership chain supersedes the earlier extraction failure.
- **Next action:** Use the verified website, X profile, and Linktree. Pixiv inspection remains blocked.

| Platform | Account / canonical URL | Status | Ownership evidence and limitation | Checked |
| --- | --- | --- | --- | --- |
| Website | [Gyool](https://www.gyool.info/) | Verified | [Evidence](https://www.gyool.info/): Readable artist self-identification and explicit publisher/game client credit. | 2026-10-14 |
| X | [@fruitysandwich](https://x.com/fruitysandwich) | Verified | [Evidence](https://x.com/fruitysandwich/status/2004553787005083893): Readable original artist post identifies their Grand Archive card work; profile-linked Linktree reciprocally links the verified website. Earlier 403 was specific to extraction. | 2026-10-14 |
| Linktree | [Gyool](https://linktr.ee/gyool) | Verified | [Evidence](https://x.com/fruitysandwich): Readable artist-linked hub with reciprocal website and X destinations. | 2026-10-14 |
| Pixiv | [Profile 91426279](https://www.pixiv.net/users/91426279) | Unavailable | [Evidence](https://linktr.ee/gyool): Direct artist-hub link; not opened after the Pixiv browser-policy block. | 2026-10-14 |

### A011 — Pinakes

- **Status/date:** Reviewed with verified links; researched 2026-10-14.
- **Exact credits:** `"Pinakes"`.
- **Identity:** Individual: Pinakes / ピナケス; official portfolio and X profile reciprocally linked. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Beseech the Winds; Promotional 2024; #052; edition `a45b4b4Plo`. [Publisher edition reference](https://index.gatcg.com/edition/beseech-the-winds-p24) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"Pinakes" Grand Archive illustrator`; `"Pinakes" artist twitter`; `"PinaxPinakes" "Grand Archive"`.
- **Findings:** Browser inspection read the original X profile and followed its portfolio to [pinakes.me](https://www.pinakes.me/). The portfolio links back to the same X account. Its [Diao Chan artwork](https://www.pinakes.me/s/GA_HVN_DiaoChanLv1.jpg) was visually matched to the [publisher image](https://api.gatcg.com/cards/images/0ueslsle3w.jpg): Diao Chan, Enchantress, HVN #004, edition `0ueslsle3w`, printed with the Pinakes credit. This supplies an artwork identity connection beyond mirrored posts.
- **Next action:** Use the verified portfolio and X account; retain the portfolio-linked Pixiv as unavailable until permitted inspection is possible.

| Platform | Account / canonical URL | Status | Ownership evidence and limitation | Checked |
| --- | --- | --- | --- | --- |
| Website | [Pinakes](https://www.pinakes.me/) | Verified | [Evidence](https://www.pinakes.me/s/GA_HVN_DiaoChanLv1.jpg): Portfolio artwork visually matches publisher-credited Diao Chan, Enchantress edition 0ueslsle3w; exact name and reciprocal X links establish ownership. | 2026-10-14 |
| X | [@PinaxPinakes](https://x.com/PinaxPinakes) | Verified | [Evidence](https://www.pinakes.me/): Readable original profile links this portfolio, which links back to the same account. | 2026-10-14 |
| Pixiv | [Profile 1629467](https://www.pixiv.net/users/1629467) | Unavailable | [Evidence](https://www.pinakes.me/): Direct official portfolio link; not opened after the Pixiv site-safety block. | 2026-10-14 |

### A012 — 代々

- **Status/date:** Needs identity review; researched 2026-10-14.
- **Exact credits:** `"代々"`.
- **Identity:** Individual candidate: 代々 / Daidai; alternate name remains a lead. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Alice, Golden Queen; Distorted Reflections; #004; edition `ggliackmst`. [Publisher edition reference](https://index.gatcg.com/edition/alice-golden-queen-dtr) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"代々" "Grand Archive" artist`; `"Daidai" "Grand Archive" artist twitter`.
- **Findings:** [Event coverage](https://gafreak.com/2025/09/20/ascent-taipei-report/) and other search results pair 代々 with Daidai at Ascent Taipei. No artist-owned account was established; do not select an unrelated Daidai profile.
- **Next action:** Inspect the publisher’s Taipei guest-artist material for a direct account or native-name cross-link.

**Links:** none verified; no attributable account URL established in this pass.

### A013 — KHΩA

- **Status/date:** Needs identity review; researched 2026-10-14.
- **Exact credits:** `"KHΩA"`.
- **Identity:** Individual: KHΩA / KhoaPhan96. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Aenean Cyclic Winds; .asphodel/paradise; #172; edition `PPfoEDev3P`. [Publisher edition reference](https://index.gatcg.com/edition/aenean-cyclic-winds-prd) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"KHΩA" illustrator`; `"KhoaPhan96" "Grand Archive"` (no indexed results).
- **Findings:** Opened the [commission page](https://khoaphan96.carrd.co/); indexed text includes the distinctive KHΩA spelling. It identifies an illustrator, but the inspected page does not establish a Grand Archive commission. A handle-plus-game search returned no results, and X returned 403. **Browser follow-up:** X now readable as KHΩA; no inspected card-specific connection. Earlier extraction failures do not describe current browser availability.
- **Next action:** Find an artist-owned Aenean Cyclic Winds or other credited-card post before adopting the handle.

| Platform | Account / canonical URL | Status | Ownership evidence and limitation | Checked |
| --- | --- | --- | --- | --- |
| Carrd | [KhoaPhan96](https://khoaphan96.carrd.co/) | Verified | [Evidence](https://khoaphan96.carrd.co/): Readable illustrator commission page; game/catalog connection unresolved. | 2026-10-14 |
| X | [@KhoaPhan96](https://x.com/KhoaPhan96) | Verified | [Evidence](https://x.com/KhoaPhan96): Browser follow-up read the original account/page. X now readable as KHΩA; no inspected card-specific connection. Withheld pending catalog identity evidence. | 2026-10-14 |

**2026-10-14 resolution:** Published using the user identification, matching professional profile, and artist-owned links. This supersedes the candidate status and card-match requirement above. Catalog attribution is inferred from those signals; no exact Grand Archive artwork match is claimed. Original profile/hub inspected again today. Account ownership is supported by the artist profile; linked destination contents were not all independently inspected.

### A014 — Kaze

- **Status/date:** Reviewed with no verified links found; researched 2026-10-14.
- **Exact credits:** `"Kaze"`.
- **Identity:** Unknown; retain Kaze. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Aenean Flux Generator; .asphodel/paradise; #174; edition `vRRhxJiKNT`. [Publisher edition reference](https://index.gatcg.com/edition/aenean-flux-generator-prd) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"Kaze" "Grand Archive" artist`; `"Kaze" "Aenean Flux Generator"`.
- **Findings:** Game-specific and Aenean Flux Generator searches did not connect the illustrator credit to an official account. A player named Kaze is not evidence of artist identity.
- **Next action:** Keep an account-free identity; require a matching artwork or publisher link for any later Kaze lead.

**Links:** none verified; no attributable account URL established in this pass.

### A015 — Rachel Liu

- **Status/date:** Reviewed with verified links; researched 2026-10-14.
- **Exact credits:** `"Rachel Liu"`.
- **Identity:** Individual: Rachel Liu; do not conflate with the separate storyboard artist at rliuportfolio.com. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Bandage Wound; Mercurial Heart; #039; edition `aqv0lut479`. [Publisher edition reference](https://index.gatcg.com/edition/bandage-wound-mrc) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"Rachel Liu" illustrator`.
- **Findings:** The readable [TCG portfolio](https://www.liurachel.com/tcg) explicitly identifies work for Grand Archive and shows named project-image labels. It is linked from the same-name homepage.
- **Next action:** Use the verified website; derive no personal social account from names alone.

| Platform | Account / canonical URL | Status | Ownership evidence and limitation | Checked |
| --- | --- | --- | --- | --- |
| Website | [Rachel Liu](https://www.liurachel.com/) | Verified | [Evidence](https://www.liurachel.com/tcg): Readable same-site professional portfolio explicitly attributes illustrations to Grand Archive. | 2026-10-14 |

### A016 — Sineia

- **Status/date:** Reviewed with user attribution; researched 2026-10-14.
- **Exact credits:** `"Sineia"`.
- **Identity:** Unknown; retain Sineia. Stable identity a016, slug a016-sineia; no unlisted aliases are approved.
- **Credited example:** Break Apart; Promotional 2026; #014; edition `pJJckOK8Cr`. [Publisher edition reference](https://index.gatcg.com/edition/break-apart-p26) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"Sineia" Grand Archive artist`; `"Sineia" artstation`.
- **Findings:** Game-specific search and an ArtStation search did not establish an artist-owned account. A [TCGplayer collaboration article](https://seller.tcgplayer.com/blog/get-your-exclusive-grand-archive-tcg-break-apart-promo-card) is a useful card-credit lead, not an artist account. Unrelated Sineia businesses and artists are excluded.
- **Next action:** Retain the supplied Facebook link; seek a public profile portrait or artist-owned cross-link when available.

**Links:** [Facebook — Sineia Yu](https://www.facebook.com/imstupidegg/), user-attributed 2026-10-14. Browser-visible name matches; login overlay prevents full profile inspection. Earlier no-link findings describe the initial search.

### A017 — Faicha

- **Status/date:** Reviewed with verified links; researched 2026-10-14.
- **Exact credits:** `"Faicha"`.
- **Identity:** Individual candidate: Faicha. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Angelic Channeling; Radiant Origins First Edition; #044A; edition `c7NbYXzcGS`. [Publisher edition reference](https://index.gatcg.com/edition/angelic-channeling-rdo1ea) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"Faicha" artist`; `"Faicha" "Grand Archive" twitter`.
- **Findings:** The commissioning client’s [Katsumi listing](https://redzonerogue.com/products/katsumi-astral-sword-saint-official-red-zone-rogue-playmat-preorder) explicitly names Faicha as the Corhazi Courier illustrator and links @faicha2010. Browser inspection reads the illustrator profile as 啡茶 and its original [Resolute Stand commission post](https://x.com/faicha2010/status/2096115366082887863), plus Grand Archive event and Zhang Fei artwork posts. This supplies a primary client-to-account connection. The account’s illustrated profile avatar is saved locally with source metadata. The separate Patreon remains a candidate because no inspected cross-link connects it to the verified X profile.
- **Next action:** Publish the verified X account and avatar. Keep Patreon and Pixiv withheld until their ownership chain is established.

| Platform | Account / canonical URL | Status | Ownership evidence and limitation | Checked |
| --- | --- | --- | --- | --- |
| X | [@faicha2010](https://x.com/faicha2010) | Verified | [Client evidence](https://redzonerogue.com/products/katsumi-astral-sword-saint-official-red-zone-rogue-playmat-preorder): Names the Grand Archive Corhazi Courier illustrator and links this account; readable original profile posts corroborate Grand Archive work. | 2026-10-14 |
| Patreon | [Faicha](https://www.patreon.com/faicha/about) | Candidate | [Evidence](https://www.patreon.com/faicha/about): Readable illustrator profile; catalog connection not yet established. | 2026-10-14 |
| Pixiv | [Profile 14263721](https://www.pixiv.net/users/14263721) | Unavailable | [Evidence](https://www.patreon.com/faicha/about): Directly linked by the candidate Patreon; destination could not be opened. Canonical profile URL retains its linked numeric ID. | 2026-10-14 |

### A018 — 檸檬夾心餅

- **Status/date:** User-confirmed Instagram, Facebook, and Threads; updated 2026-10-14.
- **Exact credits:** `"檸檬夾心餅"`.
- **Identity:** Unknown; retain 檸檬夾心餅. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Accompanying Guard; Alchemical Revolution Alter Edition; #215; edition `fsw85dhmfq`. [Publisher edition reference](https://index.gatcg.com/edition/accompanying-guard-alc-alter) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"檸檬夾心餅" 繪師`; `"檸檬夾心餅" pixiv twitter`.
- **Findings:** Native-script illustrator and Pixiv/Twitter searches were dominated by literal biscuit products and recipes; no attributable account was established.
- **Follow-up:** On 2026-10-14, the user explicitly identified Instagram `@lemon_kokoro`, Facebook `lemonkokoro`, and Threads `@lemon_kokoro` as this artist. Published on those confirmations; the profiles could not be independently fetched during these updates.

**Links:** [Instagram @lemon_kokoro](https://www.instagram.com/lemon_kokoro/), [Facebook lemonkokoro](https://www.facebook.com/lemonkokoro/), [Threads @lemon_kokoro](https://www.threads.com/@lemon_kokoro) — user-confirmed 2026-10-14.

### A019 — Pekoe

- **Status/date:** Reviewed with no verified links found; researched 2026-10-14.
- **Exact credits:** `"Pekoe"`.
- **Identity:** Unknown; retain Pekoe. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Abiding Figures; Distorted Reflections Alter Edition; #223; edition `bkvMpzvU54`. [Publisher edition reference](https://index.gatcg.com/edition/abiding-figures-dtr-alter) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"Pekoe" "Grand Archive" artist`; `"Pekoe" illustrator artstation`.
- **Findings:** Game-specific and illustrator/ArtStation searches did not establish an official account. A same-name Ko-fi and game-asset portfolios lacked a connection to this credit and were excluded from publication.
- **Next action:** Revisit with an Abiding Figures artwork match; do not attach the same-name Ko-fi on name alone.

**Links:** none verified; no attributable account URL established in this pass.

### A020 — 北飞飞

- **Status/date:** Reviewed with no verified links found; researched 2026-10-14.
- **Exact credits:** `"北飞飞"`.
- **Identity:** Unknown; retain 北飞飞. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Avalon, Cursed Isle; Dawn of Ashes Alter Edition; #160; edition `b31xa7n2jn`. [Publisher edition reference](https://index.gatcg.com/edition/avalon-cursed-isle-doa-alter) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"北飞飞" 画师`; `"北飞飞" pixiv 微博`.
- **Findings:** Native-script artist and Pixiv/Weibo searches did not establish an official account. Same-name interactive-fiction author results do not establish the credited illustrator.
- **Next action:** Keep an account-free identity; seek an Avalon, Cursed Isle portfolio or publisher cross-link.

**Links:** none verified; no attributable account URL established in this pass.

### A021 — Marchon

- **Status/date:** Reviewed with no verified links found; researched 2026-10-14.
- **Exact credits:** `"Marchon"`.
- **Identity:** Unknown; retain Marchon. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Cinderbloom Tender; Supporter Pack 4; #005; edition `tW8S8UaUe4`. [Publisher edition reference](https://index.gatcg.com/edition/cinderbloom-tender-sp4) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"Marchon" "Grand Archive" artist`; `"Marchon" illustrator artstation`.
- **Findings:** Game-specific and illustrator/ArtStation searches did not establish an official account. Hannah Marchon and eyewear-business results lack a connection to the catalog credit.
- **Next action:** Keep an account-free identity and use Cinderbloom Tender as a future disambiguation example.

**Links:** none verified; no attributable account URL established in this pass.

### A022 — Siriuf Long

- **Status/date:** Needs identity review; researched 2026-10-14.
- **Exact credits:** `"Siriuf Long"`.
- **Identity:** Individual candidate: Siriuf Long. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Aenean Frozen Shunt; .asphodel/paradise; #142; edition `KnzTPB8w0t`. [Publisher edition reference](https://index.gatcg.com/edition/aenean-frozen-shunt-prd) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"Siriuf Long"`; `"Siriuf Long" "Grand Archive"`.
- **Findings:** [Post-mirror results](https://buhitter.com/author/siriuflong) identify a same-name illustrator and Carrd. The Carrd and Patreon failed to fetch, and X returned 403. No inspected primary source connects these profiles to the credited cards. **Browser follow-up:** X and Carrd now readable with matching name and reciprocal hub links; no inspected card-specific connection. Earlier extraction failures do not describe current browser availability.
- **Next action:** Recheck the landing page and locate a credited-card statement or matching portfolio work.

| Platform | Account / canonical URL | Status | Ownership evidence and limitation | Checked |
| --- | --- | --- | --- | --- |
| Carrd | [Siriuf Long](https://siriuflong.carrd.co/) | Candidate | [Evidence](https://siriuflong.carrd.co/): Browser follow-up read the original account/page. X and Carrd now readable with matching name and reciprocal hub links; no inspected card-specific connection. Withheld pending catalog identity evidence. | 2026-10-14 |
| X | [@siriuflong](https://x.com/siriuflong) | Candidate | [Evidence](https://x.com/siriuflong): Browser follow-up read the original account/page. X and Carrd now readable with matching name and reciprocal hub links; no inspected card-specific connection. Withheld pending catalog identity evidence. | 2026-10-14 |
| Patreon | [Siriuf - the bunny man](https://www.patreon.com/siriufthebunnyman/about) | Unavailable | [Evidence](https://www.patreon.com/siriufthebunnyman/about): Same-name artist in indexed result; direct fetch failed. Grand Archive affiliation unverified. | 2026-10-14 |

### A023 — Yui

- **Status/date:** Reviewed with no verified links found; researched 2026-10-14.
- **Exact credits:** `"Yui"`.
- **Identity:** Unknown; retain Yui. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Aenean Crystallization; .asphodel/paradise; #140; edition `tUgkLl3SPi`. [Publisher edition reference](https://index.gatcg.com/edition/aenean-crystallization-prd) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"Yui" "Grand Archive" artist`; `"Yui" "Aenean Crystallization" artist`.
- **Findings:** Game-specific and Aenean Crystallization searches produced no attributable artist-owned account. The short name is not enough to choose among illustrators.
- **Next action:** Keep an account-free identity; require a matching credited-card portfolio or publisher tag.

**Links:** none verified; no attributable account URL established in this pass.

### A024 — 坊橋夜泊

- **Status/date:** Reviewed with verified links; researched 2026-10-14.
- **Exact credits:** `"坊橋夜泊"`, `" 坊橋夜泊"`.
- **Identity:** Individual: 坊橋夜泊; curated identity a024. No other credits merged.
- **Credited examples:** Auspicious Feast, HVN #033, edition `5ajxcgg238`; Topsy Decree, PTM, edition `X6UGiWHVIo`. Both use this credit in the local catalog.
- **Searches:** `"坊橋夜泊" artist`; `"fang410693029" "Grand Archive"`; `"坊橋夜泊" "Grand Archive"`.
- **Findings:** The artist-owned [Topsy Decree post](https://home.gamer.com.tw/artwork.php?sn=6272205) explicitly states that they drew the card for Grand Archive's Phantom Monarchs set. Browser inspection read the post, followed its author profile, and recovered its direct X and Patreon destinations from the outbound links. X displays the same name and links Patreon; Patreon displays the same name and links back to X. This resolves the earlier missing commission-to-account connection. The X avatar is visibly used beside the artist's name and is stored locally.
- **Next action:** Keep other outbound accounts withheld until their destinations are inspected. No outreach performed.

| Platform | Account / canonical URL | Status | Ownership evidence | Checked |
| --- | --- | --- | --- | --- |
| Portfolio | [坊橋夜泊](https://home.gamer.com.tw/f410693029) | Verified | [Original commission post](https://home.gamer.com.tw/artwork.php?sn=6272205) names Topsy Decree and links this author profile. | 2026-10-14 |
| X | [@fang410693029](https://x.com/fang410693029) | Verified | Direct outbound link from the same commission post; readable profile identifies the artist and links Patreon. | 2026-10-14 |
| Patreon | [坊橋夜泊](https://www.patreon.com/cw/fang410693029) | Verified | Direct outbound link from the commission post and X; readable destination names the artist and links back to X. | 2026-10-14 |

### A025 — DragonArt 白霜茶

- **Status/date:** Needs identity review; researched 2026-10-14.
- **Exact credits:** `"DragonArt 白霜茶"`.
- **Identity:** Combined studio/member credit; related A050 and A063 remain separate. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Airship Cruiser; Alchemical Revolution; #121; edition `yrd9a9c26b`. [Publisher edition reference](https://index.gatcg.com/edition/airship-cruiser-alc) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"DragonArt" "白霜茶"`; `"白霜茶" twitter`.
- **Findings:** The publisher-hosted [guest-artist checklist](https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Akihabara_Checklist_1db5e11780.pdf?updated_at=2025-11-14T13%3A33%3A49.872Z) names DragonArt 白霜茶. Dragonart’s [roster](https://www.dragon-art.tw/7th) instead spells a member 白霜搽 and links social accounts. Neither spelling is silently corrected.
- **Next action:** Find a primary statement connecting 白霜茶 and 白霜搽 before sharing accounts across A025/A050/A063. See A063 for roster account leads.

**Links:** none verified; no attributable account URL established in this pass.

### A026 — Kumai

- **Status/date:** Reviewed with no verified links found; researched 2026-10-14.
- **Exact credits:** `"Kumai"`.
- **Identity:** Unknown; retain Kumai. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Atmos Armor Type-Ares; Mercurial Heart; #170; edition `548otyjsr2`. [Publisher edition reference](https://index.gatcg.com/edition/atmos-armor-type-ares-mrc) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"Kumai" "Grand Archive" illustrator`; `"Kumai" illustrator artstation`.
- **Findings:** Game-specific and illustrator/ArtStation searches did not establish an official account. Tadashi Kumai results are not evidence for this credit.
- **Next action:** Keep an account-free identity; search for an artist-owned Atmos Armor Type-Ares portfolio when new evidence appears.

**Links:** none verified; no attributable account URL established in this pass.

### A027 — T_Blence

- **Status/date:** Needs identity review; researched 2026-10-14.
- **Exact credits:** `"T_Blence"`.
- **Identity:** Individual candidate: T_Blence / @T_blence. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Aella, Zephyr's Hand; Radiant Origins; #252; edition `OX21mHMuGf`. [Publisher edition reference](https://index.gatcg.com/edition/aella-zephyrs-hand-rdo) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"T_Blence"`; `"T_blence" "GrandArchive"` (no indexed results).
- **Findings:** An [indexed X profile](https://x.com/T_blence/with_replies) identifies an artist with this distinctive name. A handle-plus-GrandArchive search returned no results, and direct profile access returned 403. **Browser follow-up:** X now readable as T_blence; no inspected card-specific connection. Earlier extraction failures do not describe current browser availability.
- **Next action:** Locate a primary Aella, Zephyr’s Hand commission statement or publisher tag before attaching this account.

| Platform | Account / canonical URL | Status | Ownership evidence and limitation | Checked |
| --- | --- | --- | --- | --- |
| X | [@T_blence](https://x.com/T_blence) | Candidate | [Evidence](https://x.com/T_blence): Browser follow-up read the original account/page. X now readable as T_blence; no inspected card-specific connection. Withheld pending catalog identity evidence. | 2026-10-14 |

### A028 — 杭州新艺族

- **Status/date:** Reviewed with no verified links found; researched 2026-10-14.
- **Exact credits:** `"杭州新艺族"`.
- **Identity:** Unknown; studio/company classification remains provisional for 杭州新艺族. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Camelot, Impenetrable; Dawn of Ashes Alter Edition; #204; edition `zzioxgugw9`. [Publisher edition reference](https://index.gatcg.com/edition/camelot-impenetrable-doa-alter) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"杭州新艺族" 插画`; `"杭州新艺族" 官网`.
- **Findings:** Exact-name illustration and official-site searches surfaced catalog credits and a company-name listing but no attributable art portfolio or social account. A business-name match does not prove commissioned-art identity.
- **Next action:** Keep the exact credit without a legal entity or account; seek a Camelot, Impenetrable portfolio/client link.

**Links:** none verified; no attributable account URL established in this pass.

### A029 — Hori

- **Status/date:** Reviewed with no verified links found; researched 2026-10-14.
- **Exact credits:** `"Hori"`.
- **Identity:** Unknown; retain Hori. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Empowering Harmony; GenSeCha; #002; edition `Ofeg5iXC2B`. [Publisher edition reference](https://index.gatcg.com/edition/empowering-harmony-gsc) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"Hori" "Grand Archive" illustrator`; `"Hori" "Lorraine" illustrator`.
- **Findings:** Game-specific and Lorraine illustrator searches did not establish an attributable account. Other Hori designers and unrelated Lorraine results are excluded.
- **Next action:** Keep an account-free identity; require publisher or artwork evidence for any future profile.

**Links:** none verified; no attributable account URL established in this pass.

### A030 — DragonArt Chu

- **Status/date:** Needs identity review; researched 2026-10-14.
- **Exact credits:** `"DragonArt Chu"`.
- **Identity:** Combined studio/member credit: DragonArt Chu; related A037 and A056 are unmerged. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Airship Cannoneer; Alchemical Revolution; #093; edition `n32l8lbewe`. [Publisher edition reference](https://index.gatcg.com/edition/airship-cannoneer-alc) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"DragonArt Chu" artist`; `"Dragonart" "Chu" illustrator twitter`.
- **Findings:** Exact-credit and Dragonart/Chu illustrator searches returned credit material without a personal ownership chain. Hanh Chu’s verified portfolio does not establish that the shorter Chu or studio-member credit refers to Hanh.
- **Next action:** Obtain a studio roster or matching member portfolio before merging either case variant or the bare Chu credit.

**Links:** none verified; no attributable account URL established in this pass.

### A031 — DragonArt TaroTarou

- **Status/date:** Reviewed with verified links; researched 2026-10-14.
- **Exact credits:** `"DragonArt TaroTarou"`.
- **Identity:** Combined credit DragonArt TaroTarou; supported shared artist identity with A034 (TaroTarou / 芋太郎). Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Battlefield Spotter; Alchemical Revolution; #154; edition `sphwpisznn`. [Publisher edition reference](https://index.gatcg.com/edition/battlefield-spotter-alc) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"DragonArt TaroTarou"`.
- **Findings:** Publisher guest-artist checklist names the combined credit; the studio roster links the artist hub/account. Browser inspection read the hub’s explicit GrandArchive card-illustration role and the [original artist post](https://x.com/TaroTarou_Art/status/1791654715933258183) describing card work with the Dragon Art team. These primary sources support sharing the personal identity/accounts while retaining the combined raw credit.
- **Next action:** Map A031/A034 to one artist in the future curated dataset, preserving both exact credits and the studio relationship; do not merge that person into the studio identity.

| Platform | Account / canonical URL | Status | Ownership evidence and limitation | Checked |
| --- | --- | --- | --- | --- |
| Lit.Link | [芋太郎 / TaroTarou](https://lit.link/en/TaroTarou) | Verified | [Evidence](https://www.dragon-art.tw/7th): Browser read the studio-linked artist hub: it explicitly lists GrandArchive card illustration, the personal name, and social links. | 2026-10-14 |
| X | [@TaroTarou_Art](https://x.com/TaroTarou_Art) | Verified | [Evidence](https://lit.link/en/TaroTarou): Readable profile names Dragonart/GA, links back to the hub, and original posts describe Grand Archive card work and studio membership. | 2026-10-14 |
| Instagram | [@tarotarou_art](https://www.instagram.com/tarotarou_art/) | Verified | [Evidence](https://lit.link/en/TaroTarou): Direct hub link; readable profile names 芋太郎 TaroTarou and links back to the same hub. | 2026-10-14 |
| Facebook | [芋太郎 TaroTarou](https://www.facebook.com/TaroTarou.art) | Verified | [Evidence](https://lit.link/en/TaroTarou): Direct hub link; readable public artist page has matching name/contact and reciprocal hub link. Login prompt was dismissed without signing in. | 2026-10-14 |
| Pixiv | [Profile 66490629](https://www.pixiv.net/users/66490629) | Unavailable | [Evidence](https://lit.link/en/TaroTarou): Direct artist-hub link. Browser site-safety policy rejected navigation; no workaround attempted. | 2026-10-14 |

### A032 — NR

- **Status/date:** Reviewed with no verified links found; researched 2026-10-14.
- **Exact credits:** `"NR"`.
- **Identity:** Unknown; retain NR. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Banner Knight; Promotional 2022; #007; edition `ZeyLj8pYOB`. [Publisher edition reference](https://index.gatcg.com/edition/banner-knight-p22) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"NR" "Grand Archive" artist twitter`; `"NR" "Nico" "Grand Archive" artist`.
- **Findings:** Game/artist/Twitter and Nico-specific searches produced card credits without an attributable official account.
- **Next action:** Keep an account-free identity; use a Nico or Banner Knight commission post to disambiguate future candidates.

**Links:** none verified; no attributable account URL established in this pass.

### A033 — SalmonTea

- **Status/date:** Reviewed with user attribution; researched 2026-10-14.
- **Exact credits:** `"SalmonTea"`.
- **Identity:** Individual: SalmonTea, @SalmonTea0601. Stable identity a033 and existing slug a033-salmontea; no unlisted aliases are approved.
- **Credited example:** Fling Food; .asphodel/paradise; #117; edition `Kjx4gCoVVO`. [Publisher edition reference](https://index.gatcg.com/edition/fling-food-prd) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"SalmonTea" illustrator`; `"SalmonTea" twitter art`.
- **Findings:** Exact-name illustrator and social searches found repost-board attribution, but the [source-board page](https://www.safebooru.org/index.php?id=4562051&page=post&s=view) could not be opened to inspect its original-source link. No handle is inferred from the repost tag.
- **Next action:** Seek an independent catalog connection when available; published attribution remains inferred from the user lead, matching name, illustration posts, and artist-owned Pixiv link.

**Links:** [X @SalmonTea0601](https://x.com/SalmonTea0601) and [Pixiv 98907368](https://www.pixiv.net/en/users/98907368), linked directly in the original X bio. Original profile inspected 2026-10-14; matching SalmonTea name and original illustration posts support the user’s tentative identification. No Grand Archive commission was established. Pixiv ownership is supported by the bio; destination content was not inspected. Saved the original X profile portrait. Earlier no-link findings describe the initial search.

### A034 — TaroTarou

- **Status/date:** Reviewed with verified links; researched 2026-10-14.
- **Exact credits:** `"TaroTarou"`.
- **Identity:** Individual: TaroTarou / 芋太郎; shared artist identity with A031 is supported. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Aenean Cyclone; .asphodel/paradise; #173; edition `WEqwy7sSB3`. [Publisher edition reference](https://index.gatcg.com/edition/aenean-cyclone-prd) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"TaroTarou" artist`; `"TaroTarou_Art" official`.
- **Findings:** See A031 for the publisher/studio/artist evidence chain. The browser read the artist hub and original X profile, then the linked Instagram and Facebook profiles; each matches the hub’s identity. Pixiv inspection was blocked. The second Facebook numeric-profile link on the hub was not separately inspected and is withheld.
- **Next action:** Use the shared artist account set below; preserve the combined studio credit as an alias/history relationship when implementing the directory.

| Platform | Account / canonical URL | Status | Ownership evidence and limitation | Checked |
| --- | --- | --- | --- | --- |
| Lit.Link | [芋太郎 / TaroTarou](https://lit.link/en/TaroTarou) | Verified | [Evidence](https://www.dragon-art.tw/7th): Browser read the studio-linked artist hub: it explicitly lists GrandArchive card illustration, the personal name, and social links. | 2026-10-14 |
| X | [@TaroTarou_Art](https://x.com/TaroTarou_Art) | Verified | [Evidence](https://lit.link/en/TaroTarou): Readable profile names Dragonart/GA, links back to the hub, and original posts describe Grand Archive card work and studio membership. | 2026-10-14 |
| Instagram | [@tarotarou_art](https://www.instagram.com/tarotarou_art/) | Verified | [Evidence](https://lit.link/en/TaroTarou): Direct hub link; readable profile names 芋太郎 TaroTarou and links back to the same hub. | 2026-10-14 |
| Facebook | [芋太郎 TaroTarou](https://www.facebook.com/TaroTarou.art) | Verified | [Evidence](https://lit.link/en/TaroTarou): Direct hub link; readable public artist page has matching name/contact and reciprocal hub link. Login prompt was dismissed without signing in. | 2026-10-14 |
| Pixiv | [Profile 66490629](https://www.pixiv.net/users/66490629) | Unavailable | [Evidence](https://lit.link/en/TaroTarou): Direct artist-hub link. Browser site-safety policy rejected navigation; no workaround attempted. | 2026-10-14 |

### A035 — AquaGirl

- **Status/date:** Reviewed with no verified links found; researched 2026-10-14.
- **Exact credits:** `"AquaGirl"`.
- **Identity:** Unknown; retain AquaGirl. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Apothecary's Harvest; Radiant Origins; #254; edition `ovuWxG8NMi`. [Publisher edition reference](https://index.gatcg.com/edition/apothecarys-harvest-rdo) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"AquaGirl" "Grand Archive" artist`; `"AquaGirl" illustrator twitter`.
- **Findings:** Game-specific and illustrator/Twitter searches did not establish an attributable account. Same-name gaming-profile results are excluded.
- **Next action:** Keep an account-free identity; require an Apothecary’s Harvest or other credited-art portfolio connection.

**Links:** none verified; no attributable account URL established in this pass.

### A036 — D Lam

- **Status/date:** Reviewed with no verified links found; researched 2026-10-14.
- **Exact credits:** `"D Lam"`.
- **Identity:** Unknown; retain D Lam. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Aesan Protector; Dawn of Ashes Alter Edition; #198; edition `437wrwhqq1`. [Publisher edition reference](https://index.gatcg.com/edition/aesan-protector-doa-alter) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"D Lam" "Grand Archive" artist`; `"D Lam" illustrator artstation`.
- **Findings:** Game-specific and illustrator/ArtStation searches produced no attributable artist-owned account. A same-name employee-directory result is not evidence for this card credit.
- **Next action:** Keep an account-free identity; use Aesan Protector to disambiguate future portfolio leads.

**Links:** none verified; no attributable account URL established in this pass.

### A037 — Dragonart Chu

- **Status/date:** Needs identity review; researched 2026-10-14.
- **Exact credits:** `"Dragonart Chu"`.
- **Identity:** Combined credit Dragonart Chu; case relationship to A030 remains unapproved. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Arcane Blast; Supporter Pack 1; #001; edition `if7mf9ipdd`. [Publisher edition reference](https://index.gatcg.com/edition/arcane-blast-sp1) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"Dragonart Chu" twitter`.
- **Findings:** Exact-credit/Twitter searches and A030’s studio/member searches did not establish a personal account or a primary alias statement. Search engines collapse capitalization, so returned results cannot by themselves settle the case variants.
- **Next action:** Review studio roster/artwork evidence for A030/A037 together; retain A056 and Hanh Chu separately.

**Links:** none verified; no attributable account URL established in this pass.

### A038 — Parhelion Studio

- **Status/date:** Needs identity review; researched 2026-10-14.
- **Exact credits:** `"Parhelion Studio"`.
- **Identity:** Studio candidate Parhelion Studio; related A008. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Armed Squallguard; Distorted Reflections; #170; edition `zwk2nrweto`. [Publisher edition reference](https://index.gatcg.com/edition/armed-squallguard-dtr) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"Parhelion Studio" "Grand Archive"`.
- **Findings:** Exact-credit/game search returned credit material. The opened [parhelion.gg](https://parhelion.gg/) site uses both name forms; see A008 for candidate website/LinkedIn evidence and the missing Grand Archive connection.
- **Next action:** Resolve the catalog affiliation first, then explicitly document whether A008/A038 share an identity. No link is independently verified here.

**Links:** none verified; no attributable account URL established in this pass.

### A039 — 繪來

- **Status/date:** Reviewed with no verified links found; researched 2026-10-14.
- **Exact credits:** `"繪來"`.
- **Identity:** Unknown; retain 繪來. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Bedlam Borough; .asphodel/paradise; #032; edition `ibHfzHS45Q`. [Publisher edition reference](https://index.gatcg.com/edition/bedlam-borough-prd) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"繪來" illustrator`; `"繪來" "Grand Archive"`.
- **Findings:** Exact-name illustrator and game-specific searches did not establish an artist-owned account. Generic uses of these characters are not artist identity evidence.
- **Next action:** Keep an account-free identity; seek a Bedlam Borough or Chamber of Reflections portfolio.

**Links:** none verified; no attributable account URL established in this pass.

### A040 — silvie

- **Status/date:** Needs identity review; researched 2026-10-14.
- **Exact credits:** `"silvie"`.
- **Identity:** Unknown; silvie may be a fictional/pseudonymous credit and is not assumed to be the fan-blog author. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Embertail Squirrel; Supporter Pack 1; #022; edition `q2b21w97nc`. [Publisher edition reference](https://index.gatcg.com/edition/embertail-squirrel-sp1) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"silvie" "Grand Archive" illustrator`; `"silvie" illustrator "Embertail Squirrel"`.
- **Findings:** Representative-card search surfaced a [doodle-art article](https://blog.silvie.org/doodle-art) attributing humorous artwork to Silvie. This is a secondary interpretation and does not identify a real illustrator or account. The fan blog’s title is not an ownership chain.
- **Next action:** Inspect publisher materials for the doodle-art attribution and retain a separate unresolved identity meanwhile.

**Links:** none verified; no attributable account URL established in this pass.

### A041 — Gendo

- **Status/date:** Reviewed with no verified links found; researched 2026-10-14.
- **Exact credits:** `"Gendo"`.
- **Identity:** Unknown; retain Gendo. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Ignite the Soul; Dawn of Ashes Alter Edition; #140; edition `fqsuo6qb0x`. [Publisher edition reference](https://index.gatcg.com/edition/ignite-the-soul-doa-alter) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"Gendo" "Grand Archive" artist`; `"Gendo" "Ignite the Soul" artist`.
- **Findings:** Game-specific and Ignite the Soul searches produced credits but no attributable artist account. Evangelion-related results do not establish identity.
- **Next action:** Keep an account-free identity; seek an original credited-card portfolio or publisher artist tag.

**Links:** none verified; no attributable account URL established in this pass.

### A042 — 阿清Roro

- **Status/date:** Reviewed with verified links; researched 2026-10-14.
- **Exact credits:** `"阿清Roro"`.
- **Identity:** Individual: 阿清 / Roro Wu, @abab40116. Preserve the existing a042 identity, credited display name, and slug.
- **Credited example:** Claude, Fated Visionary; Alchemical Revolution; #182; edition `56djg0bo2f`. [Publisher edition reference](https://index.gatcg.com/edition/claude-fated-visionary-alc) records the catalog credit.
- **Searches:** `"阿清Roro"`; `"abab40116" "Grand Archive"`; `"abab40116" Roro`; user-supplied X and Pixiv accounts.
- **Findings:** The user proposed RoroWU and these two accounts. The original X profile reads 阿清 | Roro Wu and identifies an illustrator. An [original Bahamut artwork post](https://forum.gamer.com.tw/C.php?bsn=7650&snA=1021234), authored by 阿清 / abab40116, self-identifies as 阿清 and explicitly lists Twitter @abab40116 and Pixiv user 3849392 as personal accounts. The combined native and professional names, original account cross-links, and user lead support a strong catalog identity match under the agreed broader standard. This mapping is an inference; no exact Grand Archive artwork match was established. The X avatar is saved locally with source metadata. Pixiv content remains uninspected: web retrieval failed and the prior browser-policy restriction was not bypassed; ownership is supported by the original artist post.
- **Next action:** Publish the two supplied official accounts and X avatar. Preserve the credited name; other personal or collective accounts in the post were not added.

| Platform | Account / canonical URL | Status | Ownership evidence and limitation | Checked |
| --- | --- | --- | --- | --- |
| X | [@abab40116](https://x.com/abab40116) | Verified | [Artist post](https://forum.gamer.com.tw/C.php?bsn=7650&snA=1021234) explicitly links this personal account; readable profile combines 阿清 and Roro Wu. Catalog identity inferred as described above. | 2026-10-14 |
| Pixiv | [Roro Wu](https://www.pixiv.net/en/users/3849392) | Verified ownership | [Artist post](https://forum.gamer.com.tw/C.php?bsn=7650&snA=1021234) explicitly links numeric profile 3849392, matching the user-supplied account. Destination content not inspected. | 2026-10-14 |

### A043 — Dragonart Tris

- **Status/date:** Needs identity review; researched 2026-10-14.
- **Exact credits:** `"Dragonart Tris"`.
- **Identity:** Combined credit Dragonart Tris; related A044, no approved merge. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Fractured Crown; Fractured Crown; #024; edition `j3e15ioh3z`. [Publisher edition reference](https://index.gatcg.com/edition/fractured-crown-ftc) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"Dragonart Tris"`.
- **Findings:** Separate exact-credit searches for both capitalization forms produced card-credit material but no artist-owned account. Search normalization does not establish that both forms share a member identity.
- **Next action:** Find a studio/member roster or portfolio covering Fractured Crown and Atmos Shield before merging A043/A044.

**Links:** none verified; no attributable account URL established in this pass.

### A044 — DragonArt Tris

- **Status/date:** Needs identity review; researched 2026-10-14.
- **Exact credits:** `"DragonArt Tris"`.
- **Identity:** Combined credit DragonArt Tris; related A043. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Atmos Shield; Mercurial Heart; #171; edition `571itod02g`. [Publisher edition reference](https://index.gatcg.com/edition/atmos-shield-mrc) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"DragonArt Tris" artist`.
- **Findings:** Reviewed this exact form separately; no attributable account was established. See A043 for the capitalization ambiguity and the paired research.
- **Next action:** Retain this credit separately until a primary roster or portfolio supports the merge; do not publish a generic studio account as a personal account.

**Links:** none verified; no attributable account URL established in this pass.

### A045 — fuzichoco

- **Status/date:** Reviewed with verified links; researched 2026-10-14.
- **Exact credits:** `"fuzichoco"`.
- **Identity:** Individual: fuzichoco / 藤ちょこ, explicitly paired on the artist’s official site. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Auspicious Feast; Promotional 2026; #063; edition `YFi0XyBeNj`. [Publisher edition reference](https://index.gatcg.com/edition/auspicious-feast-p26) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"fuzichoco" official website`; `"fuzichoco" "Grand Archive" site:gatcg.com` (no indexed results).
- **Findings:** Opened the [official website](https://www.fuzichoco.com/) and its profile, which pair both names. The site directly links Twitter and Facebook. Browser inspection read the Facebook artist page and its reciprocal fuzichoco.com link, verifying that account. Twitter showed an error page in the browser and remains unavailable.
- **Next action:** Use the verified website and Facebook page; recheck Twitter before publication.

| Platform | Account / canonical URL | Status | Ownership evidence and limitation | Checked |
| --- | --- | --- | --- | --- |
| Website | [fuzichoco / 藤ちょこ](https://www.fuzichoco.com/) | Verified | [Evidence](https://www.fuzichoco.com/): Readable official artist site self-identifies both names; exact distinctive illustrator name matches the catalog credit. | 2026-10-14 |
| Twitter | [@fuzichoco](https://twitter.com/fuzichoco) | Unavailable | [Evidence](https://www.fuzichoco.com/): Direct official-site link; destination returned 403. Ownership cross-link retained, availability/content inspection incomplete. | 2026-10-14 |
| Facebook | [藤ちょこ (fuzichoco)](https://www.facebook.com/fuzichoco) | Verified | [Evidence](https://www.fuzichoco.com/): Direct official-site link; browser read a matching public artist page with reciprocal official website link. Login prompt dismissed without signing in. | 2026-10-14 |

### A046 — Taki

- **Status/date:** Reviewed with no verified links found; researched 2026-10-14.
- **Exact credits:** `"Taki"`.
- **Identity:** Unknown; retain Taki. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Banner Knight; Mortal Ambition Starter Decks; #024; edition `7714p4k4ku`. [Publisher edition reference](https://index.gatcg.com/edition/banner-knight-ambsd) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"Taki" "Grand Archive" illustrator`; `"Taki" "Freydis" artist twitter`.
- **Findings:** Game-specific and Freydis artist/Twitter searches produced credits without an attributable official account.
- **Next action:** Keep an account-free identity; require a publisher tag or matching Freydis/Banner Knight portfolio rather than a short-name match.

**Links:** none verified; no attributable account URL established in this pass.

### A047 — YOHAKU

- **Status/date:** Needs identity review; researched 2026-10-14.
- **Exact credits:** `"YOHAKU"`.
- **Identity:** Individual: YOHAKU / 여백, @YH_0w0; Grand Archive credit connection unresolved. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Alice, Distorted Queen; Phantom Monarchs; #002; edition `QOTMVyjCSK`. [Publisher edition reference](https://index.gatcg.com/edition/alice-distorted-queen-ptm) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"YOHAKU" "Grand Archive" illustrator`; `"YOHAKU" "Alice" illustrator`.
- **Findings:** The user supplied @YH_0w0 as a possible match. Browser inspection reads YOHAKU / 여백 and the illustrator role on the original X profile. Its linked POTOFU hub identifies Illustrator YOHAKU, repeats the professional contact identity, and links back to the same X account. Inspected posts show other illustration projects; no Grand Archive commission or exact artwork match was established. The account cluster is attributable to this illustrator, but the connection to the catalog credit remains a candidate.
- **Next action:** Compare Alice, Distorted Queen, Conduit of the Mad Mage, Lu Bu, Indomitable Titan, or Merlin, Memory Thief against this artist’s portfolio, or obtain a publisher cross-link. Keep the public page account-free until that connection is established.

| Platform | Account / canonical URL | Status | Ownership evidence and limitation | Checked |
| --- | --- | --- | --- | --- |
| X | [@YH_0w0](https://x.com/YH_0w0) | Verified | User-supplied lead; readable illustrator profile links POTOFU, which reciprocally links this account. Grand Archive commission connection remains unresolved. | 2026-10-14 |
| POTOFU | [YOHAKU](https://potofu.me/yohaku0w0) | Verified | Direct profile link and matching artist/contact identity; inspected hub lists illustration work without a Grand Archive credit. | 2026-10-14 |

**2026-10-14 resolution:** Published using the user identification, matching professional profile, and artist-owned links. This supersedes the candidate status and card-match requirement above. Catalog attribution is inferred from those signals; no exact Grand Archive artwork match is claimed. Original profile/hub inspected again today. Account ownership is supported by the artist profile; linked destination contents were not all independently inspected.

### A048 — ZERONEXT

- **Status/date:** Needs identity review; researched 2026-10-14.
- **Exact credits:** `"ZERONEXT"`.
- **Identity:** Individual candidate: Zeronext / zeronext.bsky.social; catalog relationship unverified. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Frostsworn Paladin; Dawn of Ashes Alter Edition; #278; edition `e54zcaq5mq`. [Publisher edition reference](https://index.gatcg.com/edition/frostsworn-paladin-doa-alter) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"ZERONEXT" artist`; `"ZERONEXT" pixiv twitter`; `"ZERONEXT" illustrator bluesky`.
- **Findings:** Opened the [Bluesky profile](https://bsky.app/profile/zeronext.bsky.social), which lists a same-name contact and Pixiv ID. The Pixiv destination could not be opened. Same-name software/AI companies are excluded.
- **Next action:** Find a primary Frostsworn Paladin or other credited-card statement before attaching the profiles.

| Platform | Account / canonical URL | Status | Ownership evidence and limitation | Checked |
| --- | --- | --- | --- | --- |
| Bluesky | [@zeronext.bsky.social](https://bsky.app/profile/zeronext.bsky.social) | Candidate | [Evidence](https://bsky.app/profile/zeronext.bsky.social): Readable name/contact and portfolio link, but no inspected Grand Archive connection. | 2026-10-14 |
| Pixiv | [Profile 3449131](https://www.pixiv.net/users/3449131) | Unavailable | [Evidence](https://bsky.app/profile/zeronext.bsky.social): Direct profile link; destination could not be opened. | 2026-10-14 |

### A049 — ジェゼ一

- **Status/date:** Needs identity review; researched 2026-10-14.
- **Exact credits:** `"ジェゼ一"`.
- **Identity:** Individual candidate: ジェゼ一 / @ArtsJeze. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Bushwhack Bandit; Dawn of Ashes Alter Edition; #203; edition `1fz2bix6xo`. [Publisher edition reference](https://index.gatcg.com/edition/bushwhack-bandit-doa-alter) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"ジェゼ一"`; `"ArtsJeze" "Grand Archive"` (no indexed results).
- **Findings:** [Mirror profile](https://twoucan.com/profile/ArtsJeze) uses the exact distinctive credit and lists an illustrator. Handle-plus-game search returned no results. Direct X returned 403. **Browser follow-up:** X now readable as ジェゼ一; no inspected card-specific connection. Earlier extraction failures do not describe current browser availability.
- **Next action:** Seek a readable Bushwhack Bandit or other catalog-card post or publisher link before adopting the handle.

| Platform | Account / canonical URL | Status | Ownership evidence and limitation | Checked |
| --- | --- | --- | --- | --- |
| X | [@ArtsJeze](https://x.com/ArtsJeze) | Candidate | [Evidence](https://x.com/ArtsJeze): Browser follow-up read the original account/page. X now readable as ジェゼ一; no inspected card-specific connection. Withheld pending catalog identity evidence. | 2026-10-14 |

### A050 — 白霜茶

- **Status/date:** Needs identity review; researched 2026-10-14.
- **Exact credits:** `"白霜茶"`.
- **Identity:** Individual credit 白霜茶; related combined credits A025/A063. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Cato, Meadow's Channeler; .asphodel/paradise; #183; edition `Cs1ihx2Kav`. [Publisher edition reference](https://index.gatcg.com/edition/cato-meadows-channeler-prd) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"白霜茶" 繪師`.
- **Findings:** Searches did not establish an independent account. The publisher checklist names DragonArt 白霜茶 while the studio roster uses 白霜搽; see A025/A063.
- **Next action:** Resolve the spelling/person relationship before sharing any roster-linked account with this bare credit.

**Links:** none verified; no attributable account URL established in this pass.

### A051 — Deeya Chaturvedi

- **Status/date:** Needs identity review; researched 2026-10-14.
- **Exact credits:** `"Deeya Chaturvedi"`.
- **Identity:** Individual candidate: Deeya Chaturvedi. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Bombard Flarecannon; Alchemical Revolution; #031; edition `23ijp6tdoa`. [Publisher edition reference](https://index.gatcg.com/edition/bombard-flarecannon-alc) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"Deeya Chaturvedi" artist`; `"Deeya Chaturvedi" "Grand Archive"`.
- **Findings:** An [interview](https://www.asiansinanimation.org/blog/meet-deeya-chaturvedi-former-aia-artistic-supervisor-and-game-artist) search result points to the same-name website. Website access failed, LinkedIn returned 999, and Bluesky failed to fetch. No inspected primary portfolio establishes Grand Archive work. Browser follow-up successfully read the website, which describes a game UI designer and links Behance/social profiles. No inspected Grand Archive commission was present; identity remains a candidate.
- **Next action:** Recheck the portfolio for Bombard Flarecannon or another credited work, then follow its social links.

| Platform | Account / canonical URL | Status | Ownership evidence and limitation | Checked |
| --- | --- | --- | --- | --- |
| Website | [Deeya Chaturvedi](https://www.deeyachaturvedi.com/) | Candidate | [Evidence](https://www.asiansinanimation.org/blog/meet-deeya-chaturvedi-former-aia-artistic-supervisor-and-game-artist): Browser follow-up read the same-name game-design portfolio; catalog commission connection remains unresolved. | 2026-10-14 |
| LinkedIn | [Deeya Chaturvedi](https://www.linkedin.com/in/deeya-chaturvedi) | Unavailable | [Evidence](https://www.linkedin.com/in/deeya-chaturvedi): Indexed same-name game artist; direct account returned 999. | 2026-10-14 |
| Bluesky | [@reindeeya.bsky.social](https://bsky.app/profile/reindeeya.bsky.social) | Unavailable | [Evidence](https://bsky.app/profile/reindeeya.bsky.social): Indexed same-name artist; direct fetch failed and catalog connection is unverified. | 2026-10-14 |

### A052 — DragonArt 倉倉

- **Status/date:** Needs identity review; researched 2026-10-14.
- **Exact credits:** `"DragonArt 倉倉"`.
- **Identity:** Combined credit DragonArt 倉倉; member identity remains unconfirmed. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Andronika, Eternal Herald; Mercurial Heart; #134; edition `91nmnxS9wZ`. [Publisher edition reference](https://index.gatcg.com/edition/andronika-eternal-herald-mrc) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"DragonArt 倉倉"`; `"倉倉" "Dragonart" twitter`.
- **Findings:** Exact combined-name and studio/member/Twitter searches returned credit material without an attributable member account.
- **Next action:** Find a studio roster or Andronika, Eternal Herald portfolio before attaching accounts or translating the member name.

**Links:** none verified; no attributable account URL established in this pass.

### A053 — Leviathan

- **Status/date:** Reviewed with no verified links found; researched 2026-10-14.
- **Exact credits:** `"Leviathan"`, `"Leviathan "`.
- **Identity:** Unknown; retain Leviathan and its whitespace variant. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Academy Guide; Alchemical Revolution; #042; edition `2l8lbewemh`. [Publisher edition reference](https://index.gatcg.com/edition/academy-guide-alc) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"Leviathan" "Grand Archive" illustrator`; `"Leviathan" "Academy Guide" artstation`.
- **Findings:** Game-specific and Academy Guide/ArtStation searches produced card listings but no attributable artist-owned account. The common handle is not enough to choose a profile.
- **Next action:** Keep an account-free identity; require an exact credited-artwork connection.

**Links:** none verified; no attributable account URL established in this pass.

### A054 — 白帝

- **Status/date:** Needs identity review; researched 2026-10-14.
- **Exact credits:** `"白帝"`.
- **Identity:** Individual candidate: 白帝 / WhiteM, @WhiteM2020. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Esteemed Knight; Dawn of Ashes Alter Edition; #085; edition `73f4k8gkhp`. [Publisher edition reference](https://index.gatcg.com/edition/esteemed-knight-doa-alter) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"白帝" "Grand Archive" artist`; `"白帝" illustrator pixiv`.
- **Findings:** [Mirrored profile](https://www6.twstalker.com/WhiteM2020) pairs these names and a Pixiv ID, but direct X returned 403 and Pixiv could not be opened. No inspected source establishes the Esteemed Knight commission. **Browser follow-up:** X now readable as 白帝 / WhiteM; no inspected card-specific connection. Earlier extraction failures do not describe current browser availability.
- **Next action:** Find a primary card-work statement before accepting WhiteM as an alias or attaching accounts.

| Platform | Account / canonical URL | Status | Ownership evidence and limitation | Checked |
| --- | --- | --- | --- | --- |
| X | [@WhiteM2020](https://x.com/WhiteM2020) | Candidate | [Evidence](https://x.com/WhiteM2020): Browser follow-up read the original account/page. X now readable as 白帝 / WhiteM; no inspected card-specific connection. Withheld pending catalog identity evidence. | 2026-10-14 |
| Pixiv | [Profile 3342095](https://www.pixiv.net/users/3342095) | Unavailable | [Evidence](https://www6.twstalker.com/WhiteM2020): ID from mirrored profile; primary page could not be opened. | 2026-10-14 |

### A055 — Andrew Yang

- **Status/date:** Needs identity review; researched 2026-10-14.
- **Exact credits:** `"Andrew Yang"`.
- **Identity:** Individual credited as Andrew Yang; account identity not established. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Imperial Recruit; Alchemical Revolution Starter Decks; #049; edition `460isnc01f`. [Publisher edition reference](https://index.gatcg.com/edition/imperial-recruit-alcsd) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"Andrew Yang" "Grand Archive" artist`; `"Andrew Yang" artist Parhelion`.
- **Findings:** A [Rachel Liu commission page](https://www.artstation.com/artwork/4NdeR8) is indexed with Andrew Yang as art director, and the opened [Parhelion company profile](https://www.linkedin.com/company/parhelion-studio-co) lists an employee of that name. Neither inspected evidence gives a verified personal artist account.
- **Next action:** Seek a primary personal portfolio/client link for the Imperial Recruit or Prismatic Edge credits; avoid unrelated public figures with this name.

**Links:** none verified; no attributable account URL established in this pass.

### A056 — Chu

- **Status/date:** Needs identity review; researched 2026-10-14.
- **Exact credits:** `"Chu"`.
- **Identity:** Unknown; bare Chu is not merged with A007/A030/A037. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Clover Treehouse; Distorted Reflections Alter Edition; #230; edition `FgM4sPWZOF`. [Publisher edition reference](https://index.gatcg.com/edition/clover-treehouse-dtr-alter) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"Chu" "Grand Archive" illustrator`; `"Chu" "Clover Treehouse" artist`.
- **Findings:** Game-specific and Clover Treehouse searches did not establish an account. Results for Hanh Chu and Dragonart Chu are not proof that the bare credit shares either identity.
- **Next action:** Resolve the exact Clover Treehouse/other printing attribution through an artist portfolio or publisher statement before merging.

**Links:** none verified; no attributable account URL established in this pass.

### A057 — SODA

- **Status/date:** Reviewed with no verified links found; researched 2026-10-14.
- **Exact credits:** `"SODA"`.
- **Identity:** Unknown; retain SODA. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Fishing Accident; Dawn of Ashes Alter Edition; #168; edition `wl0px1y6is`. [Publisher edition reference](https://index.gatcg.com/edition/fishing-accident-doa-alter) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"SODA" "Grand Archive" illustrator`; `"SODA" "Fishing Accident" artist`.
- **Findings:** Game-specific and Fishing Accident searches did not establish an official account. Game-character and beverage results are excluded.
- **Next action:** Keep an account-free identity; seek an original credited-card portfolio post.

**Links:** none verified; no attributable account URL established in this pass.

### A058 — 南佑希

- **Status/date:** Needs identity review; researched 2026-10-14.
- **Exact credits:** `"南佑希"`.
- **Identity:** Individual candidate: 南佑希 / minamixdrops. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Enchanted Fete; GenSeCha; #007; edition `EkzNUQpm5f`. [Publisher edition reference](https://index.gatcg.com/edition/enchanted-fete-gsc) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"南佑希"`; `"minamixdrops" official`.
- **Findings:** Opened the [Foriio profile](https://www.foriio.com/minamixdrops), which explicitly pairs these names and includes a Grand Archive category. Indexed related works include Grand Archive chibi pieces, but no exact commissioned Enchanted Fete printing was established. The category timed out and an individual work page was inaccessible.
- **Next action:** Inspect the Grand Archive category for the catalog-matching commission before verifying the portfolio as belonging to the credited artist.

| Platform | Account / canonical URL | Status | Ownership evidence and limitation | Checked |
| --- | --- | --- | --- | --- |
| Foriio | [南佑希 (minamixdrops)](https://www.foriio.com/minamixdrops) | Candidate | [Evidence](https://www.foriio.com/minamixdrops): Readable artist self-identification and game category; commissioned-card connection remains unverified. | 2026-10-14 |

### A059 — Dragon Art

- **Status/date:** Needs identity review; researched 2026-10-14.
- **Exact credits:** `"Dragon Art"`.
- **Identity:** Studio credit Dragon Art; possible relationship to A004 remains unapproved. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Mary Ann, Maladroit Maid; Event Packs; #018; edition `cOxkoukLEJ`. [Publisher edition reference](https://index.gatcg.com/edition/mary-ann-maladroit-maid-evp-csr) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"Dragon Art" "Grand Archive" artist`.
- **Findings:** Exact-credit/game search did not establish an independent account. A004’s Dragonart site is a related lead, but a spaced-name similarity does not resolve this printing.
- **Next action:** Match Mary Ann, Maladroit Maid to a primary studio portfolio or publisher attribution before merging A059/A004.

**Links:** none verified; no attributable account URL established in this pass.

### A060 — Dragonart Antilous

- **Status/date:** Reviewed with verified links; researched 2026-10-14.
- **Exact credits:** `"Dragonart Antilous"`.
- **Identity:** Individual: 駿恆 / Antilous, with Dragonart studio relationship; retain combined credit. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** The Majestic Spirit; Radiant Origins; #034; edition `QLVS5YdfjR`. [Publisher edition reference](https://index.gatcg.com/edition/the-majestic-spirit-rdo) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"Dragonart Antilous"`; `"Antilous" "Grand Archive"`.
- **Findings:** Browser read the studio gallery, which labels Antilous’ portfolio and directly links social accounts. The linked X profile identifies 駿恆Antilous and links the same Facebook page; the linked Instagram identifies the artist and explicitly names DragonArt with its website. TaroTarou’s [original Grand Archive event/card-work post](https://x.com/TaroTarou_Art/status/1791654715933258183) includes the Antilous media tag, corroborating the team context.
- **Next action:** Use the verified gallery, X and Instagram links. The gallery also exposes Facebook, ArtStation, Twitch and YouTube destinations; inspect those individually before adding them. Pixiv remains blocked.

| Platform | Account / canonical URL | Status | Ownership evidence and limitation | Checked |
| --- | --- | --- | --- | --- |
| Portfolio | [Antilous gallery](https://www.dragon-art.tw/gallery) | Verified | [Evidence](https://www.dragon-art.tw/gallery): Readable studio portfolio explicitly labels 駿恆 / Antilous and links the personal accounts. | 2026-10-14 |
| X | [@antilous](https://x.com/antilous) | Verified | [Evidence](https://www.dragon-art.tw/gallery): Direct gallery link; browser read the matching artist profile, which links the same Facebook identity. | 2026-10-14 |
| Instagram | [@antilous_chao](https://www.instagram.com/antilous_chao/) | Verified | [Evidence](https://www.dragon-art.tw/gallery): Direct gallery link; readable profile matches the artist and reciprocally names DragonArt with its website. | 2026-10-14 |

### A061 — Dragonart KS

- **Status/date:** Needs identity review; researched 2026-10-14.
- **Exact credits:** `"Dragonart KS"`.
- **Identity:** Combined credit Dragonart KS; member identity unknown. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Orb of Regret; Promotional 2023; #013; edition `aloqk1c7wj`. [Publisher edition reference](https://index.gatcg.com/edition/orb-of-regret-p23) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"Dragonart KS"`; `"KS" "Orb of Regret" artist`.
- **Findings:** Exact-credit and Orb of Regret searches produced card listings but no attributable account. The initials KS do not identify a member without a studio/publisher source.
- **Next action:** Seek a studio roster or Orb of Regret commission post; retain a separate combined-credit identity.

**Links:** none verified; no attributable account URL established in this pass.

### A062 — DragonArt Zhang Iris

- **Status/date:** Needs identity review; researched 2026-10-14.
- **Exact credits:** `"DragonArt Zhang Iris"`.
- **Identity:** Combined credit DragonArt Zhang Iris; same-name illustrator Linktree is a candidate. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Portside Pirate; Mercurial Heart; #124; edition `0arragp8m7`. [Publisher edition reference](https://index.gatcg.com/edition/portside-pirate-mrc) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"DragonArt Zhang Iris"`; `"Zhang Iris" illustrator`.
- **Findings:** Opened [Zhang Iris’ Linktree](https://linktr.ee/ZhangIris), which self-identifies an illustrator and lists social destinations. Its inspected text does not establish Dragonart membership or the Portside Pirate commission.
- **Next action:** Establish the catalog-to-portfolio connection before accepting this link hub or its social accounts.

| Platform | Account / canonical URL | Status | Ownership evidence and limitation | Checked |
| --- | --- | --- | --- | --- |
| Linktree | [Zhang Iris](https://linktr.ee/ZhangIris) | Candidate | [Evidence](https://linktr.ee/ZhangIris): Readable same-name illustrator landing page; studio and Grand Archive connections remain unverified. | 2026-10-14 |

### A063 — Dragonart 白霜搽

- **Status/date:** Reviewed with verified links; researched 2026-10-14.
- **Exact credits:** `"Dragonart 白霜搽"`.
- **Identity:** Combined credit Dragonart 白霜搽; roster-supported personal account. Relationship to 白霜茶 remains unresolved. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Blazing Bowman; Fractured Crown; #050; edition `5ioh3z0y2s`. [Publisher edition reference](https://index.gatcg.com/edition/blazing-bowman-ftc) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"Dragonart 白霜搽"`; `"白霜搽" "Blazing Bowman"`; `"shuangchabai" "Grand Archive"` (no indexed results).
- **Findings:** The studio roster directly links Instagram for the exact member spelling 白霜搽, also used on the studio homepage and in this catalog credit. Browser follow-up read that Instagram profile with the matching name. This verifies A063’s account without resolving the different 白霜茶 spelling in A025/A050.
- **Next action:** Use the verified Instagram only for A063; do not propagate it to A025/A050 until spelling/identity evidence supports that relationship. The roster’s Facebook share link remains unavailable.

| Platform | Account / canonical URL | Status | Ownership evidence and limitation | Checked |
| --- | --- | --- | --- | --- |
| Instagram | [@shuangchabai](https://www.instagram.com/shuangchabai/) | Verified | [Evidence](https://www.dragon-art.tw/7th): Direct studio-member roster link plus readable browser profile identifying the same exact member name. Tracking query removed. | 2026-10-14 |
| Facebook | [Roster share link](https://www.facebook.com/share/AnTPVUxMrGAj5qMQ/) | Unavailable | [Evidence](https://www.dragon-art.tw/7th): Extraction fetch failed; canonical account identity could not be recovered, so this share link remains withheld. | 2026-10-14 |

### A064 — DragonArt 艾瞳A-Ton

- **Status/date:** User-confirmed accounts; updated 2026-10-14.
- **Exact credits:** `"DragonArt 艾瞳A-Ton"`.
- **Identity:** Individual artist 艾瞳A-Ton, ID a064, credited with Dragonart. The user confirmed the four accounts below on 2026-10-14.
- **Credited example:** Winbless Forecaster; Mercurial Heart; #157; edition `mijilb6bwe`. [Publisher edition reference](https://index.gatcg.com/edition/winbless-forecaster-mrc) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"DragonArt 艾瞳A-Ton"`; `"艾瞳A-Ton"`.
- **Findings:** [Mirrored artwork](https://twiman.net/user/857923182342230017/illust/1662082303315832834) pairs 艾瞳A-Ton with aton2503. Direct X returned 403; no inspected primary source confirms the Winbless Forecaster commission or studio relationship. **Browser follow-up:** X now readable as 艾瞳A-Ton; no inspected card-specific/studio connection. Earlier extraction failures do not describe current browser availability.
- **Follow-up:** Published the four accounts on the user’s explicit confirmation. Current text fetches were unavailable; no independent Winbless Forecaster artwork match is claimed.

| Platform | Account / canonical URL | Status | Ownership evidence and limitation | Checked |
| --- | --- | --- | --- | --- |
| X | [@aton2503](https://x.com/aton2503) | User-confirmed | User supplied this exact artist-account association. | 2026-10-14 |
| Facebook | [aton2503](https://www.facebook.com/aton2503/) | User-confirmed | User supplied this exact artist-account association. | 2026-10-14 |
| YouTube | [@a-ton4795](https://www.youtube.com/@a-ton4795) | User-confirmed | User supplied this exact artist-account association. | 2026-10-14 |
| ArtStation | [A-Ton](https://www.artstation.com/user-824f9435e554869b) | User-confirmed | User supplied this exact artist-account association. | 2026-10-14 |

### A065 — Ge-B

- **Status/date:** Needs identity review; researched 2026-10-14.
- **Exact credits:** `"Ge-B"`.
- **Identity:** Individual candidate: Ge-B / gebdraws. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Mire Reparation; Distorted Reflections; #156; edition `tsyrw26gsm`. [Publisher edition reference](https://index.gatcg.com/edition/mire-reparation-dtr) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"Ge-B" illustrator`; `"Ge-B" "Grand Archive"`.
- **Findings:** Opened the [Bluesky profile](https://bsky.app/profile/gebdraws.bsky.social), which self-identifies Ge-B and links other personal art accounts. No inspected primary material connects it to Mire Reparation.
- **Next action:** Find a card-specific commission post before adopting this personal identity or its cross-linked handles.

| Platform | Account / canonical URL | Status | Ownership evidence and limitation | Checked |
| --- | --- | --- | --- | --- |
| Bluesky | [@gebdraws.bsky.social](https://bsky.app/profile/gebdraws.bsky.social) | Candidate | [Evidence](https://bsky.app/profile/gebdraws.bsky.social): Readable Ge-B illustrator profile; Grand Archive affiliation unresolved. | 2026-10-14 |

### A066 — HYONEE

- **Status/date:** Needs identity review; researched 2026-10-14.
- **Exact credits:** `"HYONEE"`.
- **Identity:** Individual candidate: HYONEE / @JinHyeon929. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Lorraine, Blademaster; Kickstarter Promotional; #001; edition `CP1q0DCtyI`. [Publisher edition reference](https://index.gatcg.com/edition/lorraine-blademaster-ksp) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"HYONEE" illustrator`; `"HYONEE" "Grand Archive"`.
- **Findings:** [Artist-profile coverage](https://acg17.com/73687.html) pairs HYONEE with the X handle and Pixiv ID. Direct X returned no readable profile content, and Pixiv could not be opened. Catalog credit confirms only the name, not these accounts. **Browser follow-up:** X now readable as HyoNee/RAUM with the same Pixiv ID; no inspected card-specific connection. Earlier extraction failures do not describe current browser availability.
- **Next action:** Seek a readable Lorraine, Blademaster commission post or publisher link before verifying accounts.

| Platform | Account / canonical URL | Status | Ownership evidence and limitation | Checked |
| --- | --- | --- | --- | --- |
| X | [@JinHyeon929](https://x.com/JinHyeon929) | Candidate | [Evidence](https://x.com/JinHyeon929): Browser follow-up read the original account/page. X now readable as HyoNee/RAUM with the same Pixiv ID; no inspected card-specific connection. Withheld pending catalog identity evidence. | 2026-10-14 |
| Pixiv | [Profile 15457033](https://www.pixiv.net/users/15457033) | Unavailable | [Evidence](https://acg17.com/73687.html): Third-party profile ID; primary destination could not be opened. | 2026-10-14 |

### A067 — Polar Engine

- **Status/date:** User-identified studio and accounts; updated 2026-10-14.
- **Exact credits:** `"Polar Engine"`.
- **Identity:** Polar Engine Studio, artist ID a067. The user identified the studio and its website, ArtStation and Instagram on 2026-10-14.
- **Credited example:** City Protector; Mercurial Heart; #046; edition `c9a8c16bn5`. [Publisher edition reference](https://index.gatcg.com/edition/city-protector-mrc) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"Polar Engine" art studio`; `"Polar Engine" "Grand Archive"`.
- **Findings:** Opened the [studio website](https://polarengine.com/) and [contact page](https://polarengine.com/contact). They identify the studio, but inspected text does not attribute City Protector or Grand Archive work. Social-media headings did not expose account URLs in extracted content.
- **Next action:** Retain the three user-identified accounts. A City Protector portfolio entry would independently strengthen the catalog match.

| Platform | Account / canonical URL | Status | Ownership evidence and limitation | Checked |
| --- | --- | --- | --- | --- |
| Website | [Polar Engine Studio](https://polarengine.com/) | User-identified | [Evidence](https://polarengine.com/contact): Readable same-name studio site/contact; exact catalog commission remains unverified. | 2026-10-14 |
| ArtStation | [Polar Engine](https://www.artstation.com/polarengine) | User-identified | User supplied this exact studio-account association. | 2026-10-14 |
| Instagram | [@polar_engine](https://www.instagram.com/polar_engine/) | User-identified | User supplied this exact studio-account association; language query removed. | 2026-10-14 |

### A068 — Primea studio

- **Status/date:** Needs identity review; researched 2026-10-14.
- **Exact credits:** `"Primea studio"`.
- **Identity:** Primea studio; case variant of A001 is suspected but unapproved. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Blazing Lunge; Mortal Ambition; #096; edition `rj87jd0g7l`. [Publisher edition reference](https://index.gatcg.com/edition/blazing-lunge-amb) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"Primea studio" "Blazing Lunge"`.
- **Findings:** Blazing Lunge searches show the lowercase credit in some card listings and normalized capitalization elsewhere. A001 still lacks a verified studio identity/account, so capitalization differences are not silently merged.
- **Next action:** Resolve the A001 studio identity and confirm this specific printing attribution; retain its exact raw credit.

**Links:** none verified; no attributable account URL established in this pass.

### A069 — Rubi露比喵

- **Status/date:** User-identified X and Instagram accounts; updated 2026-10-14.
- **Exact credits:** `"Rubi露比喵"`.
- **Identity:** Rubi / 露比喵, artist ID a069. The user identified X and Instagram @rubimeoww_draws on 2026-10-14.
- **Credited example:** Jinzhuo, Bands of Virtue; Proxia's Vault; #013; edition `Erzdq9c6Hp`. [Publisher edition reference](https://index.gatcg.com/edition/jinzhuo-bands-of-virtue-prxy) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"Rubi露比喵"`; `"rubimeoww_draws" "Grand Archive"` (no indexed results).
- **Findings:** Exact-credit search surfaced a [mirrored post](https://www.sotwe.com/sonsona__) naming 露比喵 Rubi and this handle. Handle-plus-game search returned no results and direct X failed to fetch. **Browser follow-up:** X now readable as 露比喵 Rubi; no inspected Jinzhuo commission connection. Earlier extraction failures do not describe current browser availability.
- **Next action:** Retain both user-identified accounts. An original Jinzhuo, Bands of Virtue commission would independently strengthen the catalog match.

| Platform | Account / canonical URL | Status | Ownership evidence and limitation | Checked |
| --- | --- | --- | --- | --- |
| X | [@rubimeoww_draws](https://x.com/rubimeoww_draws) | User-identified | [Evidence](https://x.com/rubimeoww_draws): Browser follow-up read the original account/page. X now readable as 露比喵 Rubi; no inspected Jinzhuo commission connection. Published following the user’s identification on 2026-10-14; no independent Jinzhuo artwork match claimed. | 2026-10-14 |
| Instagram | [@rubimeoww_draws](https://www.instagram.com/rubimeoww_draws/) | User-identified | User supplied the exact artist-account association on 2026-10-14. Direct text retrieval unavailable; no independent Jinzhuo artwork match claimed. | 2026-10-14 |

### A070 — Sunny

- **Status/date:** Reviewed with no verified links found; researched 2026-10-14.
- **Exact credits:** `"Sunny"`.
- **Identity:** Unknown; retain Sunny. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Map of Hidden Passage; Dawn of Ashes Alter Edition; #042; edition `uq20gvcgdm`. [Publisher edition reference](https://index.gatcg.com/edition/map-of-hidden-passage-doa-alter) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"Sunny" "Grand Archive" illustrator`; `"Sunny" "Map of Hidden Passage" artist`.
- **Findings:** Game-specific and Map of Hidden Passage searches produced credits without an attributable artist-owned account. Unrelated Sunny artists are excluded.
- **Next action:** Keep an account-free identity; require an exact credited-work portfolio or publisher link.

**Links:** none verified; no attributable account URL established in this pass.

### A071 — TEDDYPOCKY

- **Status/date:** User-identified X account; updated 2026-10-14.
- **Exact credits:** `"TEDDYPOCKY"`.
- **Identity:** TEDDY / TEDDYPOCKY, artist ID a071. The user identified @TEDDYPOCKY as this artist on 2026-10-14.
- **Credited example:** Trump Set; Promotional 2026; #019; edition `Zz8Gwi9qGw`. [Publisher edition reference](https://index.gatcg.com/edition/trump-set-p26) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"TEDDYPOCKY" artist`; `"TEDDYPOCKY" "Grand Archive"`.
- **Findings:** Opened the [same-name Patreon](https://www.patreon.com/teddypocky/about), which self-identifies a freelance game artist. Direct X returned 403. No inspected primary material connects this artist to Trump Set. **Browser follow-up:** X now readable as TEDDY with artist role and official work links; no inspected Trump Set connection. Earlier extraction failures do not describe current browser availability.
- **Next action:** Retain the user-identified X account; an original Trump Set commission would independently strengthen the catalog match. Patreon remains a candidate.

| Platform | Account / canonical URL | Status | Ownership evidence and limitation | Checked |
| --- | --- | --- | --- | --- |
| Patreon | [TeddyPocky](https://www.patreon.com/teddypocky/about) | Candidate | [Evidence](https://www.patreon.com/teddypocky/about): Readable same-name game-artist page; exact Grand Archive commission not established. | 2026-10-14 |
| X | [@TEDDYPOCKY](https://x.com/TEDDYPOCKY) | User-identified | [Evidence](https://x.com/TEDDYPOCKY): Browser follow-up read the original account/page. X now readable as TEDDY with artist role and official work links; no inspected Trump Set connection. Published following the user’s identification on 2026-10-14; no independent Trump Set artwork match is claimed. | 2026-10-14 |

### A072 — 十尾t

- **Status/date:** Needs identity review; researched 2026-10-14.
- **Exact credits:** `"十尾t"`.
- **Identity:** Unresolved 十尾t; do not automatically strip the final t or merge A005. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Kongming, Ascetic Vice; Radiant Origins Pantheon Decks; #011; edition `DALCOGJu0U`. [Publisher edition reference](https://index.gatcg.com/edition/kongming-ascetic-vice-rdopd) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"十尾t"`.
- **Findings:** Exact-credit search identifies the Kongming, Ascetic Vice Pantheon printing with 十尾t. A005’s publisher-supported Juubi alias does not by itself establish that this extra character is a catalog error.
- **Next action:** Compare the printing/artwork with A005’s Kongming editions and seek corrected publisher attribution before merging.

**Links:** none verified; no attributable account URL established in this pass.

### A073 — 桃李タロ

- **Status/date:** User-supported account match; updated 2026-10-14.
- **Exact credits:** `"桃李タロ"`.
- **Identity:** 桃李タロ / @tori_mcct, artist ID a073. The user identifies this account as the likely artist, consistent with the previously inspected exact-name profile and reciprocal artist hub. Keep separate from TaroTarou.
- **Credited example:** Bubble Mage; Dawn of Ashes Alter Edition; #163; edition `ltv5klszvf`. [Publisher edition reference](https://index.gatcg.com/edition/bubble-mage-doa-alter) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"桃李タロ"`; `"tori_mcct" "Grand Archive"` (no indexed results).
- **Findings:** Exact-name results include [post mirrors](https://twstalker.com/daifukuyasann) and a same-name artist’s book listing. Handle-plus-game search returned no results and direct X returned 403. **Browser follow-up:** X and its linked https://lit.link/en/toritaro hub are readable with reciprocal social links; no inspected Bubble Mage commission connection. Earlier extraction failures do not describe current browser availability.
- **Next action:** Retain the user-supported X link. An original Bubble Mage commission statement would independently strengthen the catalog match; retain A031/A034 separately.

| Platform | Account / canonical URL | Status | Ownership evidence and limitation | Checked |
| --- | --- | --- | --- | --- |
| X | [@tori_mcct](https://x.com/tori_mcct) | User-supported | [Evidence](https://x.com/tori_mcct): Browser follow-up read the original account/page. X and its linked https://lit.link/en/toritaro hub are readable with reciprocal social links; no inspected Bubble Mage commission connection. Published following the user’s likely identification on 2026-10-14; no independent Bubble Mage artwork match is claimed. | 2026-10-14 |

### A074 — 蝦蝦

- **Status/date:** Reviewed with no verified links found; researched 2026-10-14.
- **Exact credits:** `"蝦蝦"`.
- **Identity:** Unknown; retain 蝦蝦. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Library Witch; Kickstarter Promotional; #008; edition `zoRhMrDa0y`. [Publisher edition reference](https://index.gatcg.com/edition/library-witch-ksp) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"蝦蝦" "Grand Archive"`; `"蝦蝦" "Library Witch"`.
- **Findings:** Game-specific and Library Witch searches produced credits but no attributable account. Dragonart’s roster member 蝦餅 is a different name and is not substituted.
- **Next action:** Keep an account-free identity; require a primary Library Witch portfolio or publisher tag.

**Links:** none verified; no attributable account URL established in this pass.

### A075 — 道漫?

- **Status/date:** Needs identity review; researched 2026-10-14.
- **Exact credits:** `"道漫?"`.
- **Identity:** Unresolved 道漫?; related A003. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Astra Sight; Radiant Origins Pantheon Decks; #183; edition `4lhMCPDwMP`. [Publisher edition reference](https://index.gatcg.com/edition/astra-sight-rdopd) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"道漫?" "Grand Archive"`; `"道漫" "Astra Sight" illustrator`.
- **Findings:** Exact-credit/game and Astra Sight searches retain the question mark for the Radiant Origins Pantheon printing while other editions use 道漫. Search results cannot determine whether this was an editorial uncertainty or typo.
- **Next action:** Compare the edition artwork and obtain a publisher correction or explicit attribution; do not remove the question mark in the mapping yet.

**Links:** none verified; no attributable account URL established in this pass.

### A076 — 阿冰

- **Status/date:** Reviewed with no verified links found; researched 2026-10-14.
- **Exact credits:** `"阿冰"`.
- **Identity:** Unknown; retain 阿冰. Stable artist ID/slug deferred to curated-directory implementation; no unlisted aliases are approved.
- **Credited example:** Backstab; Dawn of Ashes Alter Edition; #070; edition `lfpwkkbbu0`. [Publisher edition reference](https://index.gatcg.com/edition/backstab-doa-alter) derived from the local catalog; this link is a credit reference, not evidence of account ownership.
- **Searches:** `"阿冰" "Grand Archive"`; `"阿冰" "Backstab" artist`.
- **Findings:** Game-specific and Backstab searches produced credits without an attributable official account. The common name is insufficient for profile selection.
- **Next action:** Keep an account-free identity; revisit with a primary Backstab commission source.

**Links:** none verified; no attributable account URL established in this pass.

## Unresolved identity decisions

The 39 Needs identity review entries above each state a next action. Prioritize the unresolved 白霜茶/白霜搽 relationship (A025/A050 versus verified A063), the remaining Primea credit variant, Parhelion studio identity, and malformed credits A072/A075. Then revisit readable same-name account candidates for card-specific evidence. Verified entries can still contain separately withheld links; each table records that distinction.

Primea Studio/Primea studio, Dragon Art/Dragonart (A059/A004) and unresolved member credits, Parhelion Studio/Parhelion Studio Co., 十尾/十尾t, 道漫/道漫?, and 白霜茶/Dragonart 白霜搽 remain unmerged in the catalog mapping. A031/A034 share a supported TaroTarou identity; retain the studio-prefixed raw credit when implementing that mapping. Juubi for 十尾 and 藤ちょこ for fuzichoco have explicit naming evidence; this does not resolve the separate malformed catalog strings. No names were romanized or translated merely to create a slug.

The 30 printings with missing credits are a separate catalog-quality follow-up. Do not infer their artists from similar artwork.

## Complete portrait discovery pass 2026-10-14

All 75 curated identities have a recorded portrait outcome. This pass searched the 66 identities that had no verified account at its start, inspected the remaining verified Pinakes and 白霜搽 profiles, and retained the earlier Dragonart website finding. Search results were screened for attributable official profiles; a matching name or third-party card listing alone was insufficient. New primary leads were inspected for 坊橋夜泊 and 南佑希. Existing portrait sources remain recorded in the curated directory and roadmap.

Added Pinakes' profile logo from [X](https://x.com/PinaxPinakes), 坊橋夜泊's illustrated avatar from [X](https://x.com/fang410693029), and Dragonart 白霜搽's illustrated avatar from [Instagram](https://www.instagram.com/shuangchabai/). The Instagram image is assigned only to A063; the 白霜茶 spellings remain unresolved. All images are local assets with source-page, original-image URL, and verification date metadata.

The [南佑希 portfolio work](https://www.foriio.com/minamixdrops/wk_Aaj1jmOjoGdZ9F8iXyAdFGfwqFR6WxR5Ybairb_5JAkKqLZh_A) and profile are now readable and show Grand Archive chibi pieces, but inspected material still does not identify the credited Enchanted Fete printing. That account and avatar remain withheld. Yui search results included a different full-name artist's proxy commission; it does not establish the short catalog credit. Dragonart's earlier inspected site provides artwork and a wide wordmark, with no selected profile avatar.

Portrait coverage is 9/75 (12%). The other 66 identities retain initials: 65 lack an established account-to-credit connection and one verified studio lacks a selected avatar. The first portrait pass is complete; further images depend on new identity evidence or a usable official image, not an unprocessed queue. Existing identity-specific next actions remain in the evidence records above. No account login, outreach, alias changes, or inferred portrait assignments were performed.

| ID | Artist | Portrait outcome | Search or inspected source |
| --- | --- | --- | --- |
| A001 | Primea Studio | Initials; account identity unresolved | `"Primea Studio" official profile avatar artist` |
| A002 | 木叶 | Initials; account identity unresolved | `"木叶" "Grand Archive" artist profile` |
| A003 | 道漫 | Initials; account identity unresolved | `"道漫" "Grand Archive" artist profile` |
| A004 | Dragonart | Initials; no selected studio avatar | [Website reviewed earlier](https://www.dragon-art.tw/) |
| A005 | 十尾 | Initials; account identity unresolved | `"十尾" Juubi illustrator official profile` |
| A006 | 砂木烟 | Initials; account identity unresolved | `"砂木烟" 画师 主页` |
| A007 | Hanh Chu | Verified image already added | [Official profile](https://www.artstation.com/rokudo_aurora) |
| A008 | Parhelion Studio Co. | Initials; account identity unresolved | `"Parhelion Studio" "Grand Archive" portfolio` |
| A009 | Alkaid | Initials; account identity unresolved | `"Alkaid" "Grand Archive" artist portfolio` |
| A010 | Gyool | Verified image already added | [Official profile](https://www.gyool.info/) |
| A011 | Pinakes | Added in this pass | [Official profile](https://x.com/PinaxPinakes) |
| A012 | 代々 | Initials; account identity unresolved | `"代々" "Grand Archive" artist profile` |
| A013 | KHΩA | Initials; account identity unresolved | `"KHΩA" "Grand Archive" illustration` |
| A014 | Kaze | Initials; account identity unresolved | `"Kaze" "Grand Archive" artist portfolio` |
| A015 | Rachel Liu | Verified image already added | [Official profile](https://www.liurachel.com/about-1) |
| A016 | Sineia | Initials; account identity unresolved | `"Sineia" "Grand Archive" artist portfolio` |
| A017 | Faicha | Initials; account identity unresolved | `"Faicha" "Grand Archive" artist profile` |
| A018 | 檸檬夾心餅 | Initials; account identity unresolved | `"檸檬夾心餅" 画师 主页` |
| A019 | Pekoe | Initials; account identity unresolved | `"Pekoe" "Grand Archive" illustrator social` |
| A020 | 北飞飞 | Initials; account identity unresolved | `"北飞飞" 画师 主页` |
| A021 | Marchon | Initials; account identity unresolved | `"Marchon" "Grand Archive" artist` |
| A022 | Siriuf Long | Initials; account identity unresolved | `"Siriuf Long" official portfolio Grand Archive` |
| A023 | Yui | Initials; account identity unresolved | `"Yui" "Grand Archive" illustrator profile` |
| A024 | 坊橋夜泊 | Added in this pass | [Official profile](https://x.com/fang410693029) |
| A025 | DragonArt 白霜茶 | Initials; account identity unresolved | `"DragonArt 白霜茶" profile` |
| A026 | Kumai | Initials; account identity unresolved | `"Kumai" "Grand Archive" illustrator profile` |
| A027 | T_Blence | Initials; account identity unresolved | `"T_Blence" "Grand Archive" artist` |
| A028 | 杭州新艺族 | Initials; account identity unresolved | `"杭州新艺族" 插画 主页` |
| A029 | Hori | Initials; account identity unresolved | `"Hori" "Grand Archive" illustrator profile` |
| A030 | DragonArt Chu | Initials; account identity unresolved | `"DragonArt Chu" illustrator profile` |
| A031 | TaroTarou | Verified image already added | [Official profile](https://lit.link/en/TaroTarou) |
| A032 | NR | Initials; account identity unresolved | `"NR" "Grand Archive" illustrator profile` |
| A033 | SalmonTea | Initials; account identity unresolved | `"SalmonTea" illustrator profile` |
| A035 | AquaGirl | Initials; account identity unresolved | `"AquaGirl" "Grand Archive" artist profile` |
| A036 | D Lam | Initials; account identity unresolved | `"D Lam" "Grand Archive" artist profile` |
| A037 | Dragonart Chu | Initials; account identity unresolved | `"Dragonart Chu" artist official` |
| A038 | Parhelion Studio | Initials; account identity unresolved | `"Parhelion Studio" official artist logo` |
| A039 | 繪來 | Initials; account identity unresolved | `"繪來" "Grand Archive" artist` |
| A040 | silvie | Initials; account identity unresolved | `"silvie" "Grand Archive" illustrator profile` |
| A041 | Gendo | Initials; account identity unresolved | `"Gendo" "Grand Archive" illustrator` |
| A042 | 阿清Roro | Initials; account identity unresolved | `"阿清Roro" "Grand Archive"` |
| A043 | Dragonart Tris | Initials; account identity unresolved | `"Dragonart Tris" profile` |
| A044 | DragonArt Tris | Initials; account identity unresolved | `"DragonArt Tris" illustrator official` |
| A045 | fuzichoco | Verified image already added | [Official profile](https://fuzichoco.fanbox.cc/) |
| A046 | Taki | Initials; account identity unresolved | `"Taki" "Grand Archive" illustrator profile` |
| A047 | YOHAKU | Initials; account identity unresolved | `"YOHAKU" "Grand Archive" illustrator` |
| A048 | ZERONEXT | Initials; account identity unresolved | `"ZERONEXT" "Grand Archive" illustrator` |
| A049 | ジェゼ一 | Initials; account identity unresolved | `"ジェゼ一" "Grand Archive"` |
| A050 | 白霜茶 | Initials; account identity unresolved | `"白霜茶" 画师 主页` |
| A051 | Deeya Chaturvedi | Initials; account identity unresolved | `"Deeya Chaturvedi" "Grand Archive"` |
| A052 | DragonArt 倉倉 | Initials; account identity unresolved | `"DragonArt 倉倉" artist` |
| A053 | Leviathan | Initials; account identity unresolved | `"Leviathan" "Grand Archive" illustrator profile` |
| A054 | 白帝 | Initials; account identity unresolved | `"白帝" "Esteemed Knight"` |
| A055 | Andrew Yang | Initials; account identity unresolved | `"Andrew Yang" "Grand Archive" illustrator portfolio` |
| A056 | Chu | Initials; account identity unresolved | `"Chu" "Clover Treehouse" artist` |
| A057 | SODA | Initials; account identity unresolved | `"SODA" "Fishing Accident" illustrator` |
| A058 | 南佑希 | Initials; account identity unresolved | `"南佑希" "Grand Archive"` |
| A059 | Dragon Art | Initials; account identity unresolved | `"Dragon Art" "Grand Archive" artist profile` |
| A060 | Dragonart Antilous | Verified image already added | [Official profile](https://www.artstation.com/antilous) |
| A061 | Dragonart KS | Initials; account identity unresolved | `"Dragonart KS" illustrator` |
| A062 | DragonArt Zhang Iris | Initials; account identity unresolved | `"DragonArt Zhang Iris" illustrator` |
| A063 | Dragonart 白霜搽 | Added in this pass | [Official profile](https://www.instagram.com/shuangchabai/) |
| A064 | DragonArt 艾瞳A-Ton | X profile portrait added 2026-10-14 | `"DragonArt 艾瞳A-Ton" illustrator` |
| A065 | Ge-B | Initials; account identity unresolved | `"Ge-B" "Mire Reparation"` |
| A066 | HYONEE | Initials; account identity unresolved | `"HYONEE" "Grand Archive" artist` |
| A067 | Polar Engine | Instagram profile portrait added 2026-10-14 | `"Polar Engine" "City Protector"` |
| A068 | Primea studio | Initials; account identity unresolved | `"Primea studio" "Blazing Lunge" profile` |
| A069 | Rubi露比喵 | X profile portrait added 2026-10-14 | `"Rubi露比喵" artist` |
| A070 | Sunny | Initials; account identity unresolved | `"Sunny" "Map of Hidden Passage" artist` |
| A071 | TEDDYPOCKY | X profile portrait added 2026-10-14 | `"TEDDYPOCKY" "Trump Set"` |
| A072 | 十尾t | Initials; account identity unresolved | `"十尾t" artist profile` |
| A073 | 桃李タロ | X profile portrait added 2026-10-14 | `"桃李タロ" "Bubble Mage"` |
| A074 | 蝦蝦 | Initials; account identity unresolved | `"蝦蝦" "Library Witch"` |
| A075 | 道漫? | Initials; account identity unresolved | `"道漫?" "Astra Sight"` |
| A076 | 阿冰 | Initials; account identity unresolved | `"阿冰" "Grand Archive" artist` |


## Primea studio follow up 2026-10-14

The user supplied Primea’s director and studio X accounts. The director’s readable biography explicitly links the studio in the Art Director role, resolving A001’s account blocker. The studio account has zero posts and no selected portrait; its lack of posts does not invalidate the ownership link. Current portrait coverage remains 9/75, with 64 account-to-credit connections still unresolved and two verified studios retaining initials. The earlier complete portrait-pass table records the outcomes at the time of that pass.


## Remaining credit artwork search 2026-10-14

All 64 credit entries without a verified account at the start of this follow-up received an exact-credit plus representative-card search. Results were screened individually; card databases, retailers, unrelated namesakes, and reposts did not establish account ownership. The table records each query and its outcome. This completes this search pass, while 63 credit entries still lack a verified account.

Faicha is the new verified identity, bringing current coverage to 26 unique verified URLs across 12 identities (13 credit entries), including 13 social-network profiles. Portrait coverage is 10/75 (13.3%); 65 identities retain initials, comprising 63 without an account connection and two verified studios without a selected avatar. No aliases were merged.

Additional primary follow-ups:

- **Parhelion / Ge-B:** [Parhelion](https://parhelion.gg/) still describes anime/game work without a Grand Archive client reference. [Ge-B’s X biography](https://x.com/MightyKow) identifies an illustrator at Parhelion Studio and links an Echoes of Astra Kickstarter in its pinned post. This establishes a useful studio/member research lead; it does not connect either catalog credit to specific Grand Archive work. Keep A008, A038, and A065 separate and account-free.
- **Deeya Chaturvedi:** [Artist website](https://www.deeyachaturvedi.com/) links [Behance](https://www.behance.net/deeyachaturvedi1), X @reindeeya, LinkedIn, and Instagram. The inspected portfolio shows Claws & Chaos and Grimlight projects, without a Grand Archive commission. Keep these as candidates for A051; Bombard Flarecannon remains the artwork target.
- **Siriuf Long:** [DeviantArt](https://www.deviantart.com/siriuflong) identifies Siriuf Long and links [X](https://x.com/siriuflong). That readable profile links [Carrd](https://siriuflong.carrd.co/) and Patreon. These pages establish an artist-owned account cluster, but inspected posts and portfolio content do not identify the credited Aenean Frozen Shunt work. Keep the accounts and avatar withheld for A022.
- **KHΩA:** [X](https://x.com/KhoaPhan96) remains readable and links VGen. Inspected portfolio and recent posts show other illustration work without a Grand Archive commission. The distinctive name is a lead; A013 remains unresolved.
- **南佑希 and ambiguous credit variants:** The exact Enchanted Fete search supplied no new account evidence. A025/A050/A063, A005/A072, A003/A075, A001/A068, and the Dragonart spelling variants retain their previous decisions; third-party credit repetitions do not authorize merges.

| Credit | Artwork query | Outcome |
| --- | --- | --- |
| A002 木叶 | `"木叶" "Acerbica" artist` | No new verified account connection; previous status retained. |
| A003 道漫 | `"道漫" "Accepted Contract" artist` | No new verified account connection; previous status retained. |
| A005 十尾 | `"十尾" "Academy Guide" artist` | No new verified account connection; previous status retained. |
| A006 砂木烟 | `"砂木烟" "Academy Attendant" artist` | No new verified account connection; previous status retained. |
| A008 Parhelion Studio Co. | `"Parhelion Studio Co." "Abnegation" artist` | No new verified account connection; previous status retained. |
| A009 Alkaid | `"Alkaid" "Arcane Renunciation" artist` | No new verified account connection; previous status retained. |
| A012 代々 | `"代々" "Alice, Golden Queen" artist` | No new verified account connection; previous status retained. |
| A013 KHΩA | `"KHΩA" "Aenean Cyclic Winds" artist` | No new verified account connection; previous status retained. |
| A014 Kaze | `"Kaze" "Aenean Flux Generator" artist` | No new verified account connection; previous status retained. |
| A016 Sineia | `"Sineia" "Break Apart" artist` | No new verified account connection; previous status retained. |
| A017 Faicha | `"Faicha" "Angelic Channeling" artist` | Verified X through commissioning-client evidence and original posts. |
| A018 檸檬夾心餅 | `"檸檬夾心餅" "Accompanying Guard" artist` | No new verified account connection; previous status retained. |
| A019 Pekoe | `"Pekoe" "Abiding Figures" artist` | No new verified account connection; previous status retained. |
| A020 北飞飞 | `"北飞飞" "Avalon, Cursed Isle" artist` | No new verified account connection; previous status retained. |
| A021 Marchon | `"Marchon" "Cinderbloom Tender" artist` | No new verified account connection; previous status retained. |
| A022 Siriuf Long | `"Siriuf Long" "Aenean Frozen Shunt" artist` | No new verified account connection; previous status retained. |
| A023 Yui | `"Yui" "Aenean Crystallization" artist` | No new verified account connection; previous status retained. |
| A025 DragonArt 白霜茶 | `"DragonArt 白霜茶" "Airship Cruiser" artist` | No new verified account connection; previous status retained. |
| A026 Kumai | `"Kumai" "Atmos Armor Type-Ares" artist` | No new verified account connection; previous status retained. |
| A027 T_Blence | `"T_Blence" "Aella, Zephyr's Hand" artist` | No new verified account connection; previous status retained. |
| A028 杭州新艺族 | `"杭州新艺族" "Camelot, Impenetrable" artist` | No new verified account connection; previous status retained. |
| A029 Hori | `"Hori" "Empowering Harmony" artist` | No new verified account connection; previous status retained. |
| A030 DragonArt Chu | `"DragonArt Chu" "Airship Cannoneer" artist` | No new verified account connection; previous status retained. |
| A032 NR | `"NR" "Banner Knight" artist` | No new verified account connection; previous status retained. |
| A033 SalmonTea | `"SalmonTea" "Fling Food" artist` | No new verified account connection; previous status retained. |
| A035 AquaGirl | `"AquaGirl" "Apothecary's Harvest" artist` | No new verified account connection; previous status retained. |
| A036 D Lam | `"D Lam" "Aesan Protector" artist` | No new verified account connection; previous status retained. |
| A037 Dragonart Chu | `"Dragonart Chu" "Arcane Blast" artist` | No new verified account connection; previous status retained. |
| A038 Parhelion Studio | `"Parhelion Studio" "Armed Squallguard" artist` | No new verified account connection; previous status retained. |
| A039 繪來 | `"繪來" "Bedlam Borough" artist` | No new verified account connection; previous status retained. |
| A040 silvie | `"silvie" "Embertail Squirrel" artist` | No new verified account connection; previous status retained. |
| A041 Gendo | `"Gendo" "Ignite the Soul" artist` | No new verified account connection; previous status retained. |
| A042 阿清Roro | `"阿清Roro" "Claude, Fated Visionary" artist` | No new verified account connection; previous status retained. |
| A043 Dragonart Tris | `"Dragonart Tris" "Fractured Crown" artist` | No new verified account connection; previous status retained. |
| A044 DragonArt Tris | `"DragonArt Tris" "Atmos Shield" artist` | No new verified account connection; previous status retained. |
| A046 Taki | `"Taki" "Banner Knight" artist` | No new verified account connection; previous status retained. |
| A047 YOHAKU | `"YOHAKU" "Alice, Distorted Queen" artist` | No new verified account connection; previous status retained. |
| A048 ZERONEXT | `"ZERONEXT" "Frostsworn Paladin" artist` | No new verified account connection; previous status retained. |
| A049 ジェゼ一 | `"ジェゼ一" "Bushwhack Bandit" artist` | No new verified account connection; previous status retained. |
| A050 白霜茶 | `"白霜茶" "Cato, Meadow's Channeler" artist` | No new verified account connection; previous status retained. |
| A051 Deeya Chaturvedi | `"Deeya Chaturvedi" "Bombard Flarecannon" artist` | No new verified account connection; previous status retained. |
| A052 DragonArt 倉倉 | `"DragonArt 倉倉" "Andronika, Eternal Herald" artist` | No new verified account connection; previous status retained. |
| A053 Leviathan | `"Leviathan" "Academy Guide" artist` | No new verified account connection; previous status retained. |
| A054 白帝 | `"白帝" "Esteemed Knight" artist` | No new verified account connection; previous status retained. |
| A055 Andrew Yang | `"Andrew Yang" "Imperial Recruit" artist` | No new verified account connection; previous status retained. |
| A056 Chu | `"Chu" "Clover Treehouse" artist` | No new verified account connection; previous status retained. |
| A057 SODA | `"SODA" "Fishing Accident" artist` | No new verified account connection; previous status retained. |
| A058 南佑希 | `"南佑希" "Enchanted Fete" artist` | No new verified account connection; previous status retained. |
| A059 Dragon Art | `"Dragon Art" "Mary Ann, Maladroit Maid" artist` | No new verified account connection; previous status retained. |
| A061 Dragonart KS | `"Dragonart KS" "Orb of Regret" artist` | No new verified account connection; previous status retained. |
| A062 DragonArt Zhang Iris | `"DragonArt Zhang Iris" "Portside Pirate" artist` | No new verified account connection; previous status retained. |
| A064 DragonArt 艾瞳A-Ton | `"DragonArt 艾瞳A-Ton" "Winbless Forecaster" artist` | No new verified account connection; previous status retained. |
| A065 Ge-B | `"Ge-B" "Mire Reparation" artist` | No new verified account connection; previous status retained. |
| A066 HYONEE | `"HYONEE" "Lorraine, Blademaster" artist` | No new verified account connection; previous status retained. |
| A067 Polar Engine | `"Polar Engine" "City Protector" artist` | No new verified account connection; previous status retained. |
| A068 Primea studio | `"Primea studio" "Blazing Lunge" artist` | No new verified account connection; previous status retained. |
| A069 Rubi露比喵 | `"Rubi露比喵" "Jinzhuo, Bands of Virtue" artist` | No new verified account connection; previous status retained. |
| A070 Sunny | `"Sunny" "Map of Hidden Passage" artist` | No new verified account connection; previous status retained. |
| A071 TEDDYPOCKY | `"TEDDYPOCKY" "Trump Set" artist` | No new verified account connection; previous status retained. |
| A072 十尾t | `"十尾t" "Kongming, Ascetic Vice" artist` | No new verified account connection; previous status retained. |
| A073 桃李タロ | `"桃李タロ" "Bubble Mage" artist` | No new verified account connection; previous status retained. |
| A074 蝦蝦 | `"蝦蝦" "Library Witch" artist` | No new verified account connection; previous status retained. |
| A075 道漫? | `"道漫?" "Astra Sight" artist` | No new verified account connection; previous status retained. |
| A076 阿冰 | `"阿冰" "Backstab" artist` | No new verified account connection; previous status retained. |


## 砂木烟 supplied portrait 2026-10-14

The user supplied a screenshot of the profile image for 砂木烟: a gray-and-white cat wearing a witch hat and cloak. The second screenshot replaces the earlier text-obscured screenshot. The built-in image editor removed the dark screenshot surround and produced a cleaned, enlarged derivative; this is not a direct download from Pixiv. The derivative is stored at `app/public/images/artists/a006.jpg` and the unedited supplied screenshot at `app/public/images/artists/a006-source.png`. The portrait metadata points to that local source image and records the user-attributed Pixiv profile as its source page. Pixiv was not revisited. Coverage is now 12/75 portraits (16%), comprising 11 independently sourced images and one user-supplied derivative; 63 pages retain initials.

## YOHAKU and KHΩA publication 2026-10-14

Applied the agreed broader identity standard to the user-identified YOHAKU / 여백 and KHΩA / KhoaPhan96 profiles. YOHAKU’s POTOFU hub supports X, Pixiv 16331597, YouTube @Y0HAKU, Weibo 7264532085, and FANBOX. KHΩA’s original X profile supports VGen KhoaPhan96. Published these eight URLs and the two original profile portraits, preserving stable credits and slugs. No Pixiv navigation or card-match claim was made. Coverage: 37 URLs across 16 identities; 14/75 portraits (18.7%).

## Sineia Facebook identification 2026-10-14

The user identified https://www.facebook.com/imstupidegg/ as Sineia. Original browser inspection shows “Sineia Yu | Facebook” and “See more from Sineia Yu,” with a login overlay limiting inspection. Published the Facebook link for stable identity a016 using direct user attribution plus the matching visible profile name. This supersedes A016’s earlier no-link outcome. The artist role, card attribution, profile content, and portrait were not independently inspected; retain unknown kind and initials. Web extraction failed. No login or outreach was performed. Coverage is 38 URLs across 17 identities, including two user-attributed identities; 14/75 portraits.

### Sineia portrait follow-up

Dismissing the non-binding login overlay revealed the public profile, including a digital creator role, illustration commission bio, and the black-and-white illustrated profile portrait. Saved the original public avatar as a016.jpg with its observed CDN URL; no login or image generation was needed. Individual kind is now supported by the public profile. This supersedes the inspection/portrait limitations above, while catalog mapping remains user-attributed. Portrait coverage is 15/75 (20%).


## Artist spelling consolidation 2026-10-14

The user confirmed that DragonArt 白霜茶, 白霜茶, and Dragonart 白霜搽 refer to the same artist and that Dragonart Tris / DragonArt Tris are one person. Consolidated those credits into a063 and a043 respectively. The shared 白霜搽 page retains its verified Instagram account and original portrait. Also consolidated case-only Primea Studio / Primea studio (a001), case-only DragonArt Chu / Dragonart Chu (a030), and spacing-only Dragonart / Dragon Art (a004). These are explicit curated aliases; no automatic fuzzy matching is applied to new credits.

All original catalog credit strings remain intact. Removed directory entries are represented by slug aliases, so former artist URLs resolve to the combined gallery. Generic Chu remains separate from Hanh Chu and Dragonart Chu; Parhelion Studio / Parhelion Studio Co., 十尾 / 十尾t, and 道漫 / 道漫? remain unresolved. This supersedes earlier instructions to keep the five confirmed groups separate. Coverage is 69 identities, 40 account URLs across 18 identities, and 16 portraits.

Verification: all three artist tests pass, including exact printing preservation, merged identities, retained URL aliases, and distinct uncertain credits. Mobile 360px and desktop 1280px checks show the old 白霜茶 URL with Instagram, portrait, and 23 cards / 30 printings; the old Tris URL shows 8 cards / 9 printings. No horizontal overflow; the Instagram target is 48px high and keyboard search focus is visible. Loading was observed. Error/retry coverage remains from prior release checks; it was not repeated for this consolidation. Production remains unverified.

Next: resolve the remaining ambiguous spellings before continuing SiriufLong discovery. Artist Pages remains approximately 95% complete for the first release, with production journey and real transport recovery checks outstanding. Identity discovery remains open-ended.

App typecheck passed. Directory search returns one Tris entry, and an unmatched query shows the empty state.


## Further spelling consolidation 2026-10-14

Parhelion Studio and Parhelion Studio Co. now share a008. The original [studio website](https://parhelion.gg/) uses Parhelion Studio in its introduction and Parhelion Studio Co. in its copyright. Added the website under the broader identity standard: the matching studio names and anime artwork business support the catalog mapping, though the website does not identify a specific Grand Archive commission. No studio-member identities were merged.

Resolved two malformed credits using the publisher's printed card images. The [Kongming RDOPD page](https://index.gatcg.com/edition/kongming-ascetic-vice-rdopd) still says 十尾t, but its [printed card](https://api.gatcg.com/cards/images/DALCOGJu0U.jpg) credits 十尾. The [Astra Sight RDOPD page](https://index.gatcg.com/edition/astra-sight-rdopd) still says 道漫?, but its [printed card](https://api.gatcg.com/cards/images/4lhMCPDwMP.jpg) credits 道漫. These primary printed credits support merging a072 into a005 and a075 into a003. Raw catalog strings remain unchanged; former URLs resolve through slug aliases. This supersedes the earlier unresolved status for all three groups.

Coverage is 66 identities, 41 URLs across 19 linked identities, and 16 portraits. Generic Chu, Hanh Chu, and Dragonart Chu remain distinct; no new evidence resolves their relationship. Next: continue SiriufLong discovery. Artist Pages remains approximately 95% complete for the first release, pending production journey and real transport recovery checks; identity discovery remains open-ended.

Verification: app typecheck, all three artist regression tests, and diff checks pass. Old Parhelion and 十尾t URLs open their combined galleries at 360px (79 cards / 102 printings and 117 / 231 respectively); the old 道漫? URL opens the combined 398-card / 1057-printing gallery at 1280px. No horizontal overflow. The website target is 48px high and keyboard search focus is visible. Loading was observed; empty/error/retry states retain earlier checks and were not repeated for this data-only update. Production remains unverified.


## Dragonart studio artist navigation 2026-10-14

Added explicit studio relationships from the nine Dragonart-prefixed artist credits to a004: Chu, TaroTarou, Tris, 倉倉, Antilous, KS, Zhang Iris, 白霜搽, and 艾瞳A-Ton. The Dragonart page links each artist in a Studio artists section, using existing portraits or initials and catalog card/printing counts. Artist pages link back with “Credited with Dragonart.” The relationship records credited work, not current employment. Individual galleries, printing attribution, and studio counts remain separate. No unrelated Chu identity was assigned to the studio.

Verification: four artist regression tests pass, including studio references, nine expected credited relationships, and preserved separate identities. At 360px all nine links are 82px high with no horizontal overflow; all three available member portraits load and keyboard focus is visible. At 1280px the links use three columns without overflow. Studio → Tris → studio navigation works. Loading was observed and empty card search retains the studio links. New error/retry simulation was not performed; existing release checks apply. Deployment verification of the previously pushed commit was interrupted while publishing and remains outstanding. This change is local pending publication.

Next: publish and verify the studio journey in production, then resume identity discovery. Artist Pages remains approximately 95% complete for the first release; implementation and local journey checks are complete, with production and real transport recovery checks outstanding. Identity discovery remains open-ended.


## Dragonart official logo 2026-10-14

Added the original transparent 140×69 PNG displayed as the brand logo in the header of https://www.dragon-art.tw/ to a004. Saved it as app/public/images/artists/a004.png with the observed Wix image URL in portrait provenance. The shared portrait supports an optional contain fit with padding, preserving the complete logo on the existing dark circular surface. The image surface hides fallback initials beneath transparent areas. No image generation or logo alteration was used. Portrait coverage is now 17/66 identities.

Next: publish the logo and studio navigation, then complete the production journey verification. Artist Pages remains approximately 95% complete for the first release, pending production and real transport recovery checks. Identity discovery remains open-ended.

Verification: app typecheck, all four artist tests, and diff checks pass. The original 140px-wide logo loads with contain fit at 360px on the studio page and 1280px in the directory; visual checks confirm the full logo on the dark surface and no horizontal overflow. Loading and empty card-search states were observed. Keyboard/touch controls retain the preceding studio-navigation checks. Error/retry and production checks were not repeated for this image change.


## Silvie champion avatar 2026-10-14

At the user’s request, the artist identity a040 silvie uses the level 1 champion Silvie, Wilds Whisperer (Dawn of Ashes First Edition, FlBjgrJPx7) as its avatar. The original card image is stored at app/public/images/artists/a040.jpg; CSS framing focuses the circular avatar on the champion’s face. The card is credited to Kumai. This is a user-selected representative image, not an artist-owned profile portrait or new identity evidence. Artist credits, links, and gallery remain unchanged. Image coverage is 18/66 identities, including this representative card avatar and the earlier user-supplied 砂木烟 derivative.

Next: publish and verify the avatar in production, then resume artist discovery. Artist Pages remains approximately 95% complete for the first release, pending production journey and real transport recovery checks. Identity discovery remains open-ended.

Verification: app typecheck, all four artist tests, and diff checks pass. The 500px-wide source loads in the mobile 360px artist avatar and desktop 1280px directory avatar; visual checks confirm face-focused framing without card text or page overflow. Loading and empty search states were observed. Search is 48px high with visible keyboard focus. Error/retry and production were not repeated for this image change.


## Parhelion selected artwork avatar 2026-10-14

At the user’s request, a008 uses the original https://parhelion.gg/img/slider-bg.jpg illustration from the studio website as its avatar. Saved the unmodified 1298×700 image as app/public/images/artists/a008.jpg; a right-aligned CSS focal point keeps the characters visible inside the portrait circle. The shared portrait supports an optional object position. This is studio-site artwork selected by the user, not a newly discovered social avatar. Gallery credits and links remain unchanged. Image coverage is 19/66 identities.

Next: publish the Parhelion and Silvie avatar updates, then finish production verification. Artist Pages remains approximately 95% complete for the first release, pending production journey and real transport recovery checks. Identity discovery remains open-ended.

Verification: app typecheck, all four artist tests, and diff checks pass. The original 1298px-wide image loads at 360px on the artist page and 1280px in the directory, with the right-aligned crop visible and no horizontal overflow. The directory card is keyboard reachable with a solid focus outline. Loading was observed. Touch controls and empty/error/retry behavior retain earlier checks; they were not repeated for this decorative image update. Production remains unverified.


## Chu consolidation and Siriuf Long accounts — 2026-10-14

The user identifies Chu and Dragonart Chu as likely the same artist. Provisionally consolidated the bare Chu credit (a056) into a030 DragonArt Chu, retaining a056-chu as a route alias and every original printed credit. This is a user-suggested identity merge, not an independently verified match; revisit if contrary evidence appears. Hanh Chu remains separate. The studio member entry now includes the bare Chu gallery. This supersedes earlier instructions to keep a056 separate.

The user confirms Siriuf Long’s X (https://x.com/siriuflong), Instagram (https://www.instagram.com/siriuflong/), and Pixiv (https://www.pixiv.net/en/users/6414018). Published these three accounts on a022. Earlier research established the same-name X/Carrd artist cluster; this user attribution resolves the catalog association without requiring an exact card match. Current direct web inspection returned no readable X content and failed to fetch Instagram/Pixiv, so these links are user-confirmed rather than independently reverified. No new portrait was obtained. This supersedes the earlier withheld-account status.

Coverage: 65 curated identities, 44 account URLs across 20 identities, and 19 images. Next: publish pending changes and verify production; discovery remains open-ended. Artist Pages is approximately 95% complete for its first release, with production journeys and real transport recovery checks still outstanding.

Verification: all four artist tests, app typecheck, and diff checks pass. At 360px Siriuf Long’s three links are 48px high and wrap without overflow; the retired Chu URL shows DragonArt Chu with 23 cards / 27 printings including Clover Treehouse. Desktop 1280px galleries fit without overflow; social links show visible keyboard focus. Loading was observed. Empty/error/retry and expanded printing states were not repeated for this metadata change; production remains unverified.


## Siriuf Long profile portrait — 2026-10-14

The public X profile https://x.com/siriuflong was readable in the browser and identifies Siriuf Long, linking the previously researched Carrd hub. Downloaded its original 400×400 avatar from https://pbs.twimg.com/profile_images/1884988578369056769/KIZEzT2l_400x400.jpg to app/public/images/artists/a022.jpg. The existing circular portrait rendering is used without editing the image. This supersedes the preceding no-portrait status and unreadable-X observation; Instagram and Pixiv were not reverified. Image coverage is now 20/65 identities.

Verification: app typecheck, all four artist tests, and diff checks pass. The original 400px avatar loads at 360px on the artist page and 1280px in the directory; visual inspection confirms clear face framing and no overflow. Loading was observed. Keyboard/touch behavior retains the preceding account-link checks; empty/error/retry states were not repeated for this decorative update. Production remains unverified. Next: publish pending artist changes and verify deployment. Artist Pages remains approximately 95% complete for the first release, pending production journeys and real transport recovery checks; identity discovery is open-ended.


## 十尾 Pixiv and supplied portrait — 2026-10-14

The user identifies https://www.pixiv.net/en/users/1048340 as 十尾 and supplies its monochrome profile image. Added that user-confirmed account to a005 (including the existing 十尾t alias). Direct web inspection could not open the profile, so this attribution is not independently reverified. Saved the original supplied screenshot unchanged as app/public/images/artists/a005.png, with a 1.2 CSS portrait scale to exclude its surrounding dark screenshot border. No artwork was regenerated. Coverage: 65 identities, 45 links across 21 identities, 21 portrait images.

Verification: app typecheck, all four artist tests, and diff checks pass. At 360px the supplied avatar loads with its dark screenshot border excluded; at 1280px the directory shows one 十尾 entry and the same portrait. Neither viewport overflows. The Pixiv control is 48px high and keyboard reachable with a visible outline. Loading and empty card-search states were observed. Error/retry and expanded printing states were not repeated; production remains unverified. Next: publish pending artist updates and verify deployment. Artist Pages remains about 95% complete for the first release, with production journeys and real transport recovery checks outstanding; discovery remains open-ended.


## Primea Studio official avatar — 2026-10-14

At the user’s request, added the current profile image from https://x.com/primeastudio to a001. The public profile was readable and shows the studio name and primea.studio contact address. Downloaded its original 400×400 JPEG from https://pbs.twimg.com/profile_images/1698215898509869056/55dARgFW_400x400.jpg to app/public/images/artists/a001.jpg without alteration. Existing Primea spelling aliases continue to share this portrait. Image coverage is now 22/65 identities; account coverage remains 45 links across 21 identities.

Verification: app typecheck, all four artist tests, and diff checks pass. The original 400px logo loads on the studio page at 360px and directory at 1280px; visual inspection confirms the complete studio lettering and no horizontal overflow. Loading was observed. Keyboard/touch and empty/error/retry behavior retain prior checks and were not repeated for this decorative update. Production remains unverified. Next: publish pending changes and verify deployment. Artist Pages remains about 95% complete for the first release, with production journeys and real transport recovery checks outstanding; identity discovery is open-ended.


## 木叶 account candidate — 2026-10-14

The user suggests https://x.com/FridaynightCat is likely a002 木叶. Browser inspection of that public profile shows the display name 木兆子, handle @FridaynightCat, a Genshin/Venti-focused bio, and original illustration posts. The inspected profile and visible posts do not establish 木叶 as another name or identify Grand Archive work. Focused searches for the handle with 木叶 / Grand Archive and for 木兆子 with 木叶 returned no supporting identity connection. A separate text fetch returned 403, but the browser profile was readable.

Status: user-suggested candidate, not a confirmed match. Keep this lead for follow-up; do not publish its account or avatar on 木叶’s page yet. Next evidence needed: a linked portfolio, an explicit alias, a matching credited artwork, or firmer user confirmation. Coverage remains 65 identities, 45 links across 21 identities, and 22 portrait images. No application behavior changed; verification was limited to the source profile and documentation diff checks.

Next: resolve this name discrepancy, then publish pending artist updates and verify deployment. Artist Pages remains about 95% complete for the first release, based on completed local directory/profile work with production journeys and real transport recovery checks outstanding. Identity discovery remains open-ended.


## T_Blence user-confirmed account and portrait — 2026-10-14

The user confirms https://x.com/T_blence as T_Blence (a027). The public profile displays T_blence and original illustration work. Promoted the earlier candidate to a user-confirmed individual identity and published its canonical X link. No card-specific post was independently verified; the catalog-to-account mapping is user supplied. Saved the original 400px profile JPEG, without alteration, as app/public/images/artists/a027.jpg from https://pbs.twimg.com/profile_images/1626885465986179076/77iqHwzL_400x400.jpg. This supersedes the earlier candidate status. Coverage: 65 identities, 46 links across 22 identities, 23 portraits.

Verification: all four artist tests, app typecheck, and diff checks pass. The 400px portrait loads on the artist page at 360px and 1280px without overflow; the social link is 48px high and keyboard reachable with a solid focus outline. Loading was observed. Empty, error/retry, and expanded printing behavior were not repeated for this data-only update. Production remains unverified. Next: publish pending updates and verify deployment. Artist Pages is about 95% complete for its first release, based on completed local features with production journeys and real transport recovery outstanding; identity discovery remains open-ended.


## Discovery follow-up: 杭州新艺族, Hori, and 南佑希 — 2026-10-14

Focused exact-name and card-name searches for 杭州新艺族 and Hori yielded catalog/retailer credits but no attributable official account. A similarly named registered company is insufficient to identify the commissioned artist; both retain initials and no links. Deeya Chaturvedi remains a candidate: the same-name game-design portfolio has no inspected Grand Archive attribution.

Reassessed a058 南佑希 under the user's instruction that an exact card match is not always available. The artist-owned Foriio profile explicitly identifies 南佑希（minamixdrops）, shows a substantial Grand Archive portfolio, and links twitter.com/minamixdrops. Its Tristan SD work explicitly says “MRCセット” and credits the same artist: https://www.foriio.com/minamixdrops/wk_Aaj1jmOjoGdZ9F8iXyAdFGfwqFR6WxR5Ybairb_5JAkKqLZh_A. This combination supports publishing the portfolio and its directly linked X account without claiming an independently verified Enchanted Fete artwork match. Supersedes the earlier exact-card prerequisite and candidate status. No credit aliases were added. Saved the original portfolio avatar from https://img.foriio.com/profiles/106933/avatar/thumb2x/c64cf94f99c8 as app/public/images/artists/a058.png, without alteration. Coverage: 65 identities, 48 links across 23 identities, 24 portraits.

Verification: app typecheck, all four artist tests, and diff checks pass. At 360px and 1280px the original 260px portrait loads, social links wrap without overflow, and both controls are 48px high. The portfolio link is keyboard reachable with a solid focus outline. Loading and empty card-search states were observed. Error/retry was not repeated; there is no expanded printing control for these two single-printing cards. Production remains unverified. Next: continue unresolved identity leads and publish pending changes when requested. Artist Pages remains about 95% complete for the first release, based on completed local features with production journeys and real transport recovery checks remaining; discovery is open-ended.


## Remaining-artist sweep — 2026-10-14

Completed a fresh public-web follow-up for all **42 current identities without published links**. This table is the current no-link checklist and supersedes older queue statuses where later merges or user confirmations changed the directory. All 65 current identities have now received discovery review; review completion does not mean identity resolution. Published coverage remains **23/65 identities (35%), 48 URLs, and 24 images**. No new links, portraits, aliases, or classifications were published in this sweep.

Searches used exact credits, game context, native artist terms, and targeted card/account follow-ups for stronger candidates. Existing per-artist records retain representative card IDs and earlier evidence. “No verified profile found” means the searches did not establish an attributable official account; it does not mean the artist has none. Candidate accounts need evidence of catalog association, which may be a publisher tag, a professional identity cross-link, an artist statement, or user confirmation; an exact artwork match is not mandatory.

| ID | Artist | Searches performed | Outcome / next evidence |
| --- | --- | --- | --- |
| A002 | 木叶 | "FridaynightCat" "木叶" | Candidate retained: FridaynightCat; inspected display name 木兆子 still lacks a supported 木叶 alias. |
| A003 | 道漫 | "道漫" "画师" | No verified profile found. No new attributable official account in returned results; retain existing unresolved notes and account-free page. |
| A009 | Alkaid | "Alkaid" "Grand Archive" artist; "Alkaid" illustrator artstation | Unconfirmed lead: [Alkaid Studios portfolio](https://alkaidstudios.artstation.com/projects). Readable outsourcing portfolio, but neither the bare Alkaid credit nor a GA connection is established; do not infer studio classification. |
| A012 | 代々 | "代々" "Grand Archive"; "代々" 繪師 twitter; "daidai_kasame" "gatcg" | Candidate lead expanded: @daidai_kasame. Search results connect the distinctive native name to this handle; direct X text fetch failed. Ascent Taipei coverage supports the reading Daidai but does not establish account ownership. Needs primary profile/publisher cross-link. |
| A014 | Kaze | "Kaze" "Grand Archive" illustrator | No verified profile found. No new attributable official account in returned results; retain existing unresolved notes and account-free page. |
| A018 | 檸檬夾心餅 | "檸檬夾心餅" 繪師 | No verified profile found. No new attributable official account in returned results; retain existing unresolved notes and account-free page. |
| A019 | Pekoe | "Pekoe" "Grand Archive" artist twitter | No verified profile found. No new attributable official account in returned results; retain existing unresolved notes and account-free page. |
| A020 | 北飞飞 | "北飞飞" 画师 | No verified profile found. No new attributable official account in returned results; retain existing unresolved notes and account-free page. |
| A021 | Marchon | "Marchon" illustrator portfolio | No verified profile found. No new attributable official account in returned results; retain existing unresolved notes and account-free page. |
| A023 | Yui | "Yui" "Grand Archive" illustrator social | No verified profile found. YuikaYuiKawaii proxy-art result does not establish ownership of the catalog Yui credit. |
| A026 | Kumai | "Kumai" "Grand Archive" artist | No verified profile found. No new attributable official account in returned results; retain existing unresolved notes and account-free page. |
| A028 | 杭州新艺族 | "杭州新艺族" 插画 官方 | No verified profile found. No new attributable official account in returned results; retain existing unresolved notes and account-free page. |
| A029 | Hori | "Hori" "Empowering Harmony" artist | No verified profile found. No new attributable official account in returned results; retain existing unresolved notes and account-free page. |
| A030 | DragonArt Chu | "DragonArt Chu" portfolio | No verified profile found. No new attributable official account in returned results; retain existing unresolved notes and account-free page. |
| A032 | NR | "NR" "Grand Archive" illustrator twitter | No verified profile found. No new attributable official account in returned results; retain existing unresolved notes and account-free page. |
| A035 | AquaGirl | "AquaGirl" illustrator Grand Archive | No verified profile found. No new attributable official account in returned results; retain existing unresolved notes and account-free page. |
| A036 | D Lam | "D Lam" "Grand Archive" artist | No verified profile found. No new attributable official account in returned results; retain existing unresolved notes and account-free page. |
| A039 | 繪來 | "繪來" 繪師 | No verified profile found. No new attributable official account in returned results; retain existing unresolved notes and account-free page. |
| A040 | silvie | "silvie" "Grand Archive" illustrator artist | No verified profile found. No new attributable official account in returned results; retain existing unresolved notes and account-free page. |
| A041 | Gendo | "Gendo" "Grand Archive" artist | No verified profile found. No new attributable official account in returned results; retain existing unresolved notes and account-free page. |
| A043 | Dragonart Tris | "Dragonart" "Tris" artist | No verified profile found. No new attributable official account in returned results; retain existing unresolved notes and account-free page. |
| A046 | Taki | "Taki" "Grand Archive" illustrator | No verified profile found. No new attributable official account in returned results; retain existing unresolved notes and account-free page. |
| A048 | ZERONEXT | "ZERONEXT" illustrator | No verified profile found. No new attributable official account in returned results; retain existing unresolved notes and account-free page. |
| A049 | ジェゼ一 | "ジェゼ一" イラスト; "ArtsJeze" "Grand Archive" | Candidate retained: [@ArtsJeze](https://x.com/ArtsJeze). Exact distinctive name in illustration results; direct text fetch failed. Prior readable browser profile remains recorded, with catalog association unresolved. |
| A051 | Deeya Chaturvedi | "Deeya Chaturvedi" "Grand Archive"; "Deeya Chaturvedi" "Bombard Flarecannon" | Candidate retained: Deeya Chaturvedi portfolio. Current game/card searches only return catalog or retail attribution, not an artist-owned GA statement. |
| A052 | DragonArt 倉倉 | "DragonArt" "倉倉" | No verified profile found. No new attributable official account in returned results; retain existing unresolved notes and account-free page. |
| A053 | Leviathan | "Leviathan" "Grand Archive" illustrator artist | No verified profile found. No new attributable official account in returned results; retain existing unresolved notes and account-free page. |
| A054 | 白帝 | "白帝" "Grand Archive" artist | No verified profile found. No new attributable official account in returned results; retain existing unresolved notes and account-free page. |
| A055 | Andrew Yang | "Andrew Yang" "Grand Archive" illustrator | Role lead: [Rachel Liu’s original Suzaku post](https://www.artstation.com/artwork/4NdeR8) names Andrew Yang as art director. Does not identify an official personal account or establish which same-name profile owns the catalog illustration. |
| A057 | SODA | "SODA" "Grand Archive" illustrator | No verified profile found. No new attributable official account in returned results; retain existing unresolved notes and account-free page. |
| A061 | Dragonart KS | "Dragonart KS" artist | No verified profile found. No new attributable official account in returned results; retain existing unresolved notes and account-free page. |
| A062 | DragonArt Zhang Iris | "DragonArt Zhang Iris" artist | No verified profile found. No new attributable official account in returned results; retain existing unresolved notes and account-free page. |
| A064 | DragonArt 艾瞳A-Ton | "艾瞳" "A-Ton" artist | No verified profile found. No new attributable official account in returned results; retain existing unresolved notes and account-free page. |
| A065 | Ge-B | "Ge-B" illustrator; "MightyKow" "Mire Reparation" | Candidate retained: [Ge-B Bluesky](https://bsky.app/profile/gebdraws.bsky.social), @MightyKow and gebdraws hub. Artist-owned profile identifies an illustrator and account links; catalog association remains unresolved. |
| A066 | HYONEE | "HYONEE" "Grand Archive"; "HYONEE" illustrator twitter; "JinHyeon929" "Grand Archive" | Candidate retained: @JinHyeon929. Artist-platform search surfaces a Hyonee bio with this handle; opened channel index gives no readable profile evidence. No GA connection found. |
| A067 | Polar Engine | "Polar Engine" artist portfolio; "Polar Engine" "City Protector" | Candidate retained: [Polar Engine ArtStation resume](https://polarengine.artstation.com/resume). Readable studio-owned description establishes an illustration team; no inspected GA commission or catalog-to-studio cross-link. Website remains a candidate. |
| A069 | Rubi露比喵 | "Rubi露比喵" artist; "Rubi" "露比喵" | Candidate retained: @rubimeoww_draws. Matching bilingual name in mirrored illustration posts, but no new primary catalog connection. |
| A070 | Sunny | "Sunny" "Grand Archive" illustrator artist | No verified profile found. No new attributable official account in returned results; retain existing unresolved notes and account-free page. |
| A071 | TEDDYPOCKY | "TEDDYPOCKY" artist; "TEDDYPOCKY" "Trump Set" | Candidate retained: [TeddyPocky Patreon](https://www.patreon.com/teddypocky/about). Readable freelance game-artist description; X text fetch failed; Trump Set ownership remains unresolved. |
| A073 | 桃李タロ | "桃李タロ" イラスト; "tori_mcct" "Bubble Mage" | Candidate retained: @tori_mcct and previously inspected lit.link/en/toritaro. No Bubble Mage connection found; direct X text fetch failed. Keep separate from TaroTarou. |
| A074 | 蝦蝦 | "蝦蝦" "Grand Archive" | No verified profile found. No new attributable official account in returned results; retain existing unresolved notes and account-free page. |
| A076 | 阿冰 | "阿冰" "Grand Archive" | No verified profile found. No new attributable official account in returned results; retain existing unresolved notes and account-free page. |

Source limitations: search results frequently consisted of card databases, retailers, mirrors, or unrelated names. Those were used as discovery leads, not ownership proof. The opened Polar Engine ArtStation resume and TeddyPocky Patreon establish professional art identities only. Alkaid’s inspected portfolio does not resolve the bare catalog name. Direct X extraction failed for ArtsJeze, TEDDYPOCKY, tori_mcct, and daidai_kasame; this does not supersede previous successful browser observations. No outreach was performed.

Verification: documentation-only update; all 42 no-link directory IDs have one row and an actual search query. Directory/account/image totals checked against the curated data. No application or UI behavior changed, so app tests and viewport checks were not repeated. Next: prioritize native-name/publisher links for 代々 and the recorded candidate cluster, or review user-supplied confirmations; avoid repeating exhausted searches without new evidence. Artist Pages remains approximately 95% complete for its first release, based on completed local features with production journeys and real transport recovery checks outstanding. This bounded remaining-artist search pass is 100% reviewed (42/42); identity resolution is 35% linked and remains open-ended.


## Pronunciation annotations — 2026-10-14

Added explicit pronunciation metadata and semantic ruby display on directory names, profile headings, and studio-member names. Following the user's preference, artist-confirmed readings take priority over standard Mandarin pinyin fallback. This initial pass adds 17 Mandarin fallback entries; these are character readings, not verified personal pronunciations or identity aliases. No artist-confirmed Japanese kanji readings were established in this task, so uncertain entries (including 南佑希, 桃李タロ, and 代々) remain unannotated. Romanized handles and third-party Daidai event references were considered but not treated as artist-confirmed kana readings. Existing kana-only names remain readable as credited.

Search also accepts Latin pronunciation text without tone marks: mu ye finds 木叶, and ning finds 檸檬夾心餅. The shared PageHeader accepts a ReactNode title to preserve its existing heading structure while rendering ruby. Raw credits, names, routes, accounts and artwork attribution remain unchanged.

Verification: app typecheck, all four artist tests, and diff checks pass. Desktop 1280px checks cover directory pronunciation search, artist heading, a long pinyin annotation, empty card results, 48px search target, visible keyboard focus, and no horizontal overflow. Loading was observed. Mobile verification was attempted but viewport overrides continued to report 1280px; narrow layout remains unverified. Error/retry and expanded printing behavior were not repeated for this presentation change. Next: complete mobile pronunciation checks and collect artist-confirmed readings. Artist Pages remains approximately 95% complete for its first release, with production journeys and real transport recovery checks also outstanding; pronunciation coverage will grow with confirmed evidence.


## Scope pronunciations to native script — 2026-10-14

Each of the 17 pronunciation records now names its exact nativeText span. ArtistName wraps only that span in ruby and preserves the surrounding Latin name outside it, including Dragonart 白霜搽, DragonArt 倉倉, DragonArt 艾瞳A-Ton, 阿清Roro, and Rubi露比喵. Removed redundant Roro, A-Ton, and Rubi from reading text. Studio member names use the same span after their display prefix is removed. Missing or mismatched spans render the plain name.

Verification: app typecheck, all four artist tests, and diff checks pass; every pronunciation span matches its curated name. At 360px and 1280px, Dragonart remains outside the 白霜搽 ruby in the profile heading, with no horizontal overflow. Mobile directory DOM confirms independent 白霜搽, 倉倉, and 艾瞳 spans. Empty search, visible keyboard focus, and 48px search target checked. This resolves the earlier mobile pronunciation verification gap; viewport changes work when applied to the current testing tab. Error/retry and expanded printing selection were not repeated for this name-only change. Next: gather artist-confirmed Japanese readings and verify production. Artist Pages remains approximately 95% complete for its first release, based on completed local implementation and mobile/desktop checks, with production journeys and real transport recovery checks still outstanding.


## Remaining reading follow-up — 2026-10-14

Reviewed the remaining Japanese or mixed-script credits for explicit artist-confirmed pronunciation. No new reading was published. Standard Mandarin fallbacks remain limited to clearly Chinese credits; Japanese kanji readings are not inferred from a name dictionary or handle.

| Artist | Sources / search | Outcome |
| --- | --- | --- |
| 南佑希 | Original https://www.foriio.com/minamixdrops and browser-readable https://x.com/minamixdrops; search `"南佑希" 読み OR ふりがな OR ゆうき` | Own profiles identify the artist and minamixdrops handle but give no explicit kana reading. General name-dictionary results do not establish this artist's pronunciation. Leave blank. The contact-domain homepage minamixdrops.jp could not be opened by text fetch. |
| 桃李タロ | Previously inspected artist-owned https://lit.link/en/toritaro; search `"桃李タロ" "とり"` | No explicit reading found. The romanized hub and tori_mcct handle remain suggestive, not artist-confirmed kana. Current text fetch of the hub failed; earlier successful browser inspection remains valid. Leave blank. |
| 代々 | Browser-readable https://x.com/daidai_kasame; search `"代々" "daidai_kasame" プロフィール` | Own profile displays 代々, identifies an illustrator in Taiwan, and uses daidai in its account/contact and linked FANBOX. This strengthens the account-name lead, but the catalog-to-account association remains unconfirmed. Do not classify the artist as Japanese because the stage name uses 々, or publish inferred kana. Leave blank pending publisher/account cross-link or user confirmation. |
| ジェゼ一 | Search `"ジェゼ一" 読み方`; earlier @ArtsJeze profile evidence | No explicit pronunciation found. Preserve the exact catalog string: its final character is ideographic 一, not automatically normalized to the prolonged sound mark ー. No inferred reading or alias. |

Current reading coverage remains 17/65 identities (26%), all explicitly marked standard Mandarin fallback rather than artist-confirmed pronunciation. No application data or UI changed in this follow-up. Verification: documentation diff checks only; prior typecheck and mobile/desktop pronunciation checks continue to apply. Next: collect an explicit self-written reading or user confirmation for these four entries; no outreach is authorized. Artist Pages remains approximately 95% complete for the first release, based on completed local implementation with production journeys and real transport recovery checks outstanding. Reading research remains open-ended.


## User-authorized tentative readings — 2026-10-14

The user requests an attempt at the four unresolved readings. Added them with basis=estimated, displayed with a visible question mark and an accessible “estimated pronunciation” label. They are deliberately not artist-confirmed, and do not authorize account publication, aliases, merges, or nationality claims. This supersedes the preceding decision to leave these annotations blank.

| Name | Tentative annotation | Basis and uncertainty |
| --- | --- | --- |
| 南佑希 | みなみ ゆうき? | Common Japanese readings of 南 and 佑希, consistent with the minamixdrops handle; full reading remains unconfirmed. |
| 桃李タロ | とり? above 桃李 only | Inferred from the previously inspected artist-owned toritaro hub and tori_mcct handle. タロ stays outside the ruby; catalog account mapping and preferred reading remain unconfirmed. |
| 代々 | Daidai? | Event material pairs the credited artist with Daidai; the same-name candidate account also uses daidai. Keep Latin spelling without invented tone marks or a Japanese-nationality inference. Search: `"代々" "Daidai" artist`; event booklet reproduction https://fliphtml5.com/nzyxf/gatd/2025Ascent_Taipei/17/. |
| ジェゼ一 | じぇぜー? | Tentative spoken reading treating final ideographic 一 as a stylized long-vowel mark. @ArtsJeze supports the Jeze lead, but neither this long vowel nor catalog account association is verified. Preserve original 一 in the base name. |

Focused searches also used `"南佑希" "みなみ"`, `"桃李タロ" "toritaro"`, and `"ジェゼ一" "Jeze"`; none supplied explicit artist confirmation. Reading coverage is 21/65 identities: 17 Mandarin fallbacks and four estimates. Confirmed readings should replace estimates when evidence arrives.

Verification: app typecheck, all four artist tests, and diff checks pass. At 360px, 南佑希's kana search returns its card with a visible estimated marker, a 48px search field, and no overflow; 桃李 alone is the ruby base for とり. At 1280px, Daidai search finds 代々 with its visible marker and no overflow. Loading observed. Existing keyboard focus, empty search, and profile checks from the scoping fix remain applicable; error/retry and expanded printing were not repeated for this metadata/marker change. Next: confirm these estimates, then publish and verify production when requested. Artist Pages remains approximately 95% complete for its first release, with production journeys and real transport recovery checks outstanding; pronunciation accuracy remains provisional for these four names.


## English-reader pronunciation display — 2026-10-14

At the user's request, replaced the tentative kana annotations with romaji: 南佑希 → Minami Yūki?, 桃李 → Tori? (タロ remains outside the annotation), and ジェゼ一 → Jezē?. 代々 remains Daidai? and Chinese readings remain pinyin. Japanese annotations use ja-Latn. All four estimates retain their uncertainty markers; romanization does not add new identity evidence. Tone/diacritic-insensitive search also finds Yūki from yuki and Jezē from jeze. This supersedes the earlier kana display decision.

Next: confirm the four estimated readings and verify production when published. Artist Pages remains approximately 95% complete for its first release, based on completed local features with production journeys and real transport recovery checks outstanding.

Romaji verification: app typecheck, all four artist tests, and diff checks pass. Browser checks at 360px and 1280px confirm visible romaji estimates, no horizontal overflow, and successful macron-free yuki/jeze searches. Loading observed. Touch/keyboard, empty, error/retry and expanded states retain prior checks and were not repeated for this label-only update.


## Reading marker preference — 2026-10-14

At the user’s request, removed visible question marks from pronunciation annotations. Estimated provenance remains in metadata and research notes; the displayed readings are otherwise unchanged. This supersedes earlier instructions to show uncertainty markers. Next: publish and verify production. Artist Pages remains approximately 95% complete for its first release, with production journeys and real transport recovery checks outstanding.

Marker-removal verification: four artist tests and diff checks pass. At 360px and 1280px, Minami Yūki displays without a question mark and without overflow. Loading observed; other interaction states retain the preceding checks and were not repeated for this text removal. Typecheck was not repeated for deletion of the marker-only JSX.


### 桃李タロ account update 2026-10-14

Added [@tori_mcct](https://x.com/tori_mcct) to a073 following the user’s likely identification, supported by the earlier exact-name profile and reciprocal [artist hub](https://lit.link/en/toritaro) inspection. Current direct X text retrieval returns 403. This is a user-supported association rather than an independently matched Bubble Mage commission. The Tori reading remains estimated; the account identification does not confirm a spoken reading. No portrait or additional accounts added. Current totals: 65 identities, 49 account URLs across 24 linked identities, 24 portraits.

Verification: all four artist regression tests and diff checks pass. The account link appears at 360px and 1280px with no horizontal overflow and a 48px target; keyboard navigation reaches the card search with visible focus. Loading was observed. Error/retry, empty results and printing selection were not repeated for this account-data change. Next: publish this account update when requested and verify production. Artist Pages remains approximately 95% complete for the first release, with release verification and real transport recovery outstanding; identity research remains open-ended.


### TEDDYPOCKY account update 2026-10-14

Added [@TEDDYPOCKY](https://x.com/TEDDYPOCKY) to a071 following the user’s identification. Earlier original-profile inspection supports the artist role and work links; an independent Trump Set commission match remains unestablished. Removed the language query from the canonical URL. Patreon remains unpublished and no portrait was added. Current totals: 65 identities, 50 account URLs across 25 linked identities, 24 portraits.

Verification: all four artist tests and diff checks pass. At 360px and 1280px, the X link is visible with no horizontal overflow; its touch target is 48px and keyboard navigation reaches search with visible focus. Loading observed; error/retry and empty states were not repeated for this account-only data change. Next: publish the account updates when requested and verify production. Artist Pages remains approximately 95% complete for its first release, based on completed local features with release checks and real transport recovery outstanding. Identity research remains open-ended.


### Rubi露比喵 Instagram update 2026-10-14

Added [Instagram @rubimeoww_draws](https://www.instagram.com/rubimeoww_draws/) to a069 following the user’s identification. The earlier same-name X research remains supporting context, not confirmation of additional accounts. X remains unpublished; no portrait added. Current totals: 65 identities, 51 account URLs across 26 linked identities, 24 portraits.

Verification: all four artist tests and diff checks pass. The Instagram link displays at 360px and 1280px without horizontal overflow, with a 48px touch target and keyboard access to search with visible focus. Loading observed; empty and error/retry states were not repeated for this account-only data update. Next: publish the account updates when requested and verify production. Artist Pages remains approximately 95% complete for the first release, with release verification and real transport recovery outstanding; identity research remains open-ended.


### Rubi露比喵 X update 2026-10-14

Added [X @rubimeoww_draws](https://x.com/rubimeoww_draws) alongside Instagram following the user’s identification. This supersedes the previous candidate-only X status. Current totals: 65 identities, 52 account URLs across 26 linked identities, 24 portraits.

Verification: all four artist tests and diff checks pass. Both links display at 360px and 1280px without overflow, with 48px touch targets. Keyboard navigation moves from X to Instagram with visible focus. Empty/error recovery checks were not repeated for this additional account-data entry. Next: publish account updates when requested and verify production. Artist Pages remains approximately 95% complete for the first release, with release verification and real transport recovery outstanding; identity research remains open-ended.


### Polar Engine studio update 2026-10-14

Classified a067 as a studio and added the user-identified [website](https://polarengine.com/), [ArtStation](https://www.artstation.com/polarengine) and [Instagram](https://www.instagram.com/polar_engine/). The website identifies Polar Engine Studio. Direct ArtStation extraction shows only site chrome and Instagram retrieval failed; these accounts rely on the user’s identification and earlier studio research. No independent City Protector artwork match, studio-member relationships or portrait added. Current totals: 65 identities, 55 account URLs across 27 linked identities, 24 portraits.

Verification: all four artist tests and diff checks pass. All three links display at 360px and 1280px without overflow, with 48px touch targets. Keyboard navigation moves from website to ArtStation; loading observed. Empty/error recovery was not repeated for this studio/account data update. Next: publish account updates when requested and verify production. Artist Pages remains approximately 95% complete for the first release, based on completed local features with release verification and real transport recovery outstanding; identity research remains open-ended.


### TEDDYPOCKY portrait update 2026-10-14

Inspected the original [X profile](https://x.com/TEDDYPOCKY) and its profile-photo image. Added the unchanged 400×400 JPEG locally at `app/public/images/artists/a071.jpg`, with the source account, original image URL, and verification date in the directory. This replaces the initials fallback for a071.


### 桃李タロ portrait update 2026-10-14

Inspected the original [X profile](https://x.com/tori_mcct) and its profile-photo image. Added the unchanged 400×400 JPEG locally at `app/public/images/artists/a073.jpg`, with the source account, original image URL, and verification date in the directory. This replaces the initials fallback for a073.


### Polar Engine portrait update 2026-10-14

Inspected the original [Instagram profile](https://www.instagram.com/polar_engine/) and its profile-photo image. Added the unchanged JPEG locally at `app/public/images/artists/a067.jpg`, with the source account, original image URL, and verification date in the directory. This replaces the initials fallback for a067.


### Rubi露比喵 portrait update 2026-10-14

Inspected the original [X profile](https://x.com/rubimeoww_draws) and its profile-photo image. Added the unchanged 400×400 JPEG locally at `app/public/images/artists/a069.jpg`, with the source account, original image URL, and verification date in the directory. This replaces the initials fallback for a069.


### A-Ton portrait update 2026-10-14

Inspected the original [X profile](https://x.com/aton2503) and its profile-photo image. Added the unchanged 400×400 JPEG locally at `app/public/images/artists/a064.jpg`, with the source account, original image URL, and verification date in the directory. This replaces the initials fallback for a064.
