# Artist discovery tracker

Review each credited artist or studio individually to establish identity and discover official websites, portfolios, and social accounts. Preserve evidence before a link becomes eligible for publication.

## Baseline and progress

- Catalog snapshot: `data/card-catalog.json`, generated 2026-10-13T14:05:29.628Z.
- 2,535 cards; 5,031 printings; 30 printings without a usable illustrator credit.
- 84 exact credit strings form 76 discovery entries after trimming surrounding whitespace only.
- Discovery reviewed: 0/76. Verified links: 0. Every queue entry is Not started.
- Counts describe this snapshot. Unique-card counts overlap when different artists illustrate different printings of one card.

## Work through one entry at a time

1. Take the next Not started entry and mark it In progress. The initial queue orders by unique-card count, then name; keep assigned IDs stable as work continues.
2. Inspect its credited cards and printings. Search the exact credit, Grand Archive, and any supported native-script or alternate names. Record queries and the date searched.
3. Establish whether the credit identifies an individual, studio, or combined attribution. Search publisher artist credits and artist-owned sites, then follow their links to portfolios and social profiles.
4. Open each candidate account and the source supporting ownership. A username match, search snippet, fan page, or repost alone cannot verify identity. Record the direct evidence URL and a short description of what connects the account to the credited artist.
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
| A001 | Primea Studio | 685 | 934 | Not started |
| A002 | 木叶 | 451 | 683 | Not started |
| A003 | 道漫 | 398 | 1056 | Not started |
| A004 | Dragonart | 323 | 422 | Not started |
| A005 | 十尾 | 120 | 237 | Not started |
| A006 | 砂木烟 | 110 | 177 | Not started |
| A007 | Hanh Chu | 97 | 197 | Not started |
| A008 | Parhelion Studio Co. | 72 | 96 | Not started |
| A009 | Alkaid | 63 | 89 | Not started |
| A010 | Gyool | 46 | 66 | Not started |
| A011 | Pinakes | 38 | 71 | Not started |
| A012 | 代々 | 34 | 73 | Not started |
| A013 | KHΩA | 33 | 39 | Not started |
| A014 | Kaze | 32 | 45 | Not started |
| A015 | Rachel Liu | 30 | 38 | Not started |
| A016 | Sineia | 29 | 41 | Not started |
| A017 | Faicha | 28 | 50 | Not started |
| A018 | 檸檬夾心餅 | 26 | 44 | Not started |
| A019 | Pekoe | 25 | 30 | Not started |
| A020 | 北飞飞 | 23 | 44 | Not started |
| A021 | Marchon | 21 | 25 | Not started |
| A022 | Siriuf Long | 20 | 34 | Not started |
| A023 | Yui | 20 | 28 | Not started |
| A024 | 坊橋夜泊 | 20 | 45 | Not started |
| A025 | DragonArt 白霜茶 | 18 | 22 | Not started |
| A026 | Kumai | 17 | 39 | Not started |
| A027 | T_Blence | 16 | 27 | Not started |
| A028 | 杭州新艺族 | 16 | 21 | Not started |
| A029 | Hori | 15 | 55 | Not started |
| A030 | DragonArt Chu | 13 | 15 | Not started |
| A031 | DragonArt TaroTarou | 13 | 16 | Not started |
| A032 | NR | 12 | 20 | Not started |
| A033 | SalmonTea | 10 | 12 | Not started |
| A034 | TaroTarou | 10 | 12 | Not started |
| A035 | AquaGirl | 9 | 12 | Not started |
| A036 | D Lam | 9 | 19 | Not started |
| A037 | Dragonart Chu | 8 | 9 | Not started |
| A038 | Parhelion Studio | 7 | 7 | Not started |
| A039 | 繪來 | 7 | 7 | Not started |
| A040 | silvie | 6 | 6 | Not started |
| A041 | Gendo | 5 | 13 | Not started |
| A042 | 阿清Roro | 5 | 8 | Not started |
| A043 | Dragonart Tris | 4 | 5 | Not started |
| A044 | DragonArt Tris | 4 | 4 | Not started |
| A045 | fuzichoco | 4 | 5 | Not started |
| A046 | Taki | 4 | 7 | Not started |
| A047 | YOHAKU | 4 | 8 | Not started |
| A048 | ZERONEXT | 4 | 7 | Not started |
| A049 | ジェゼ一 | 4 | 9 | Not started |
| A050 | 白霜茶 | 4 | 7 | Not started |
| A051 | Deeya Chaturvedi | 3 | 6 | Not started |
| A052 | DragonArt 倉倉 | 3 | 4 | Not started |
| A053 | Leviathan | 3 | 3 | Not started |
| A054 | 白帝 | 3 | 11 | Not started |
| A055 | Andrew Yang | 2 | 5 | Not started |
| A056 | Chu | 2 | 3 | Not started |
| A057 | SODA | 2 | 7 | Not started |
| A058 | 南佑希 | 2 | 2 | Not started |
| A059 | Dragon Art | 1 | 1 | Not started |
| A060 | Dragonart Antilous | 1 | 3 | Not started |
| A061 | Dragonart KS | 1 | 2 | Not started |
| A062 | DragonArt Zhang Iris | 1 | 1 | Not started |
| A063 | Dragonart 白霜搽 | 1 | 1 | Not started |
| A064 | DragonArt 艾瞳A-Ton | 1 | 1 | Not started |
| A065 | Ge-B | 1 | 1 | Not started |
| A066 | HYONEE | 1 | 1 | Not started |
| A067 | Polar Engine | 1 | 1 | Not started |
| A068 | Primea studio | 1 | 1 | Not started |
| A069 | Rubi露比喵 | 1 | 1 | Not started |
| A070 | Sunny | 1 | 2 | Not started |
| A071 | TEDDYPOCKY | 1 | 1 | Not started |
| A072 | 十尾t | 1 | 1 | Not started |
| A073 | 桃李タロ | 1 | 2 | Not started |
| A074 | 蝦蝦 | 1 | 1 | Not started |
| A075 | 道漫? | 1 | 1 | Not started |
| A076 | 阿冰 | 1 | 2 | Not started |

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

No entries reviewed yet. Start with A001, Primea Studio.

## Unresolved identity decisions

Review related spellings and attributions during discovery, including Primea Studio/Primea studio, Dragon Art/Dragonart and their member credits, Parhelion Studio/Parhelion Studio Co., 十尾/十尾t, 道漫/道漫?, and 白霜茶/Dragonart 白霜搽. These are research questions, not approved aliases or merges.

The 30 printings with missing credits are a separate catalog-quality follow-up. Do not infer their artists from similar artwork.
