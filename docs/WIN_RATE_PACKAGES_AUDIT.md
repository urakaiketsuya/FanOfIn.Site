# Win-rate package experiment

Generated 2026-09-26T18:57:12.523Z. Source snapshot: 2026-09-26T11:15:15.754Z.

Tested 528,763 group/cohort combinations across 93 Champion/format/season cohorts. Nominated 920 groups from discovery data: 112 remained positive in every supported later-event comparison, 52 did not repeat, and 756 lacked enough later data.

## Method and limits

The JSON also includes later-event member/core interaction contrasts across complete, core-only, member-only and neither buckets. Each cell must meet the same support gates. Approximate 95% intervals account for repeat players, not event clustering or multiple testing. These exploratory associations do not establish causality. See CALCULATIONS.md for the synergy status rules and formulas.

Main + Material presence only; quantities and sideboards excluded. Cohorts require 100 deck-events and 10 dates. Within each cohort the first 70% of distinct dates discover candidates; the remaining dates evaluate them. Events cannot cross the split. Every complete, incomplete, and exact missing-one bucket needs 10 decks, 5 players, and 3 events. Each player's average gets equal weight within a bucket; adjusted differences shrink toward the period's cohort average with a 10-player prior. Raw win rates are reported separately.

Search covers up to 60 frequent cards, all pairs, then a 40-subset beam through triples and quadruples. Discovery requires at least +2 percentage points versus incomplete decks AND every exact missing-one group. Up to 10 candidates per cohort are retained by their weakest member difference. This bounded search can miss rare groups and groups with weak subsets. Later results never choose discovery candidates, and negative/unsupported later results remain in the JSON.

Positive later differences are exploratory replication, not statistical significance or proof of synergy beyond individual card effects. No multiple-testing-adjusted confidence claim is made. Players may recur between periods; opponent strength, other deck choices, and within-season balance changes remain confounders. Comparisons are historical and may span different card legalities between seasons. Missing-one comparisons do not isolate a causal effect. Overlap compares the published mined co-occurrence candidates only, not registered rules or optional-member families.

## Groups positive in later events

Ordered by discovery strength; later outcomes are not used for ranking. Deck counts below are complete / incomplete. Open the JSON for all missing-one bucket counts, player/event counts, and rejected or unsupported candidates.

| Cards | Champion / season | Later decks | Later raw WR: complete / incomplete | Later adjusted difference | Weakest later member difference | Co-occurrence overlap |
|---|---|---|---|---|---|---|
| Cheshire Cat, Impish Grin + Enfeebling Orb + Undercurrent Vantage | Diana / Phantom Monarchs | 278 / 399 | 57.7% / 42.7% | +14.3 pp | +8.3 pp | none |
| Enfeebling Orb + Inert Sword + Undercurrent Vantage | Diana / Phantom Monarchs | 275 / 402 | 57.7% / 42.8% | +14.1 pp | +8.9 pp | none |
| Aquamirage Whisper + Cheshire Cat, Impish Grin + Enfeebling Orb | Diana / Phantom Monarchs | 305 / 372 | 58.0% / 41.6% | +15.7 pp | +7.6 pp | none |
| Aquamirage Whisper + Enfeebling Orb + Inert Sword | Diana / Phantom Monarchs | 302 / 375 | 58.0% / 41.8% | +15.5 pp | +7.3 pp | none |
| Carpsong Coda + Enfeebling Orb + Inert Sword | Diana / Phantom Monarchs | 302 / 375 | 58.0% / 41.8% | +15.5 pp | +7.3 pp | none |
| Enfeebling Orb + Inert Sword + Languid Toadtroll | Diana / Phantom Monarchs | 302 / 375 | 58.0% / 41.8% | +15.5 pp | +7.3 pp | none |
| Cheshire Cat, Impish Grin + Enfeebling Orb + Tactical Retreat | Diana / Phantom Monarchs | 305 / 372 | 58.0% / 41.6% | +15.7 pp | +7.8 pp | none |
| Cheshire Cat, Impish Grin + Enfeebling Orb + Krustallan Archer | Diana / Phantom Monarchs | 305 / 372 | 58.0% / 41.6% | +15.7 pp | +7.6 pp | none |
| Flame Sweep + Spirit Blade: Ascension | Lorraine / Mercurial Heart | 103 / 260 | 46.1% / 45.5% | +0.5 pp | +1.0 pp | none |
| Hasty Messenger + Spirit Blade: Ascension | Lorraine / Mercurial Heart | 104 / 259 | 46.3% / 45.4% | +0.8 pp | +0.7 pp | none |
| Creative Shock + Spirit Blade: Ascension | Lorraine / Mercurial Heart | 104 / 259 | 46.3% / 45.4% | +0.8 pp | +0.4 pp | none |
| Flame Sweep + Prismatic Edge | Lorraine / Mercurial Heart | 105 / 258 | 46.4% / 45.3% | +1.0 pp | +2.0 pp | none |
| Frostbind + Vigil Rempart | Ciel / Distorted Reflections | 14 / 287 | 50.5% / 43.1% | +4.0 pp | +7.5 pp | none |
| Carter, Synthetic Reaper + Liminal Guide | Ciel / Distorted Reflections | 171 / 130 | 47.6% / 37.9% | +8.8 pp | +6.3 pp | none |
| Fractal of Intrusion + Frostbind | Diao Chan / Phantom Monarchs | 180 / 188 | 54.5% / 42.3% | +11.4 pp | +7.0 pp | none |
| Liminal Guide + Portentous Tanggu | Silvie / Distorted Reflections | 25 / 88 | 51.5% / 31.5% | +13.2 pp | +8.8 pp | none |
| The Looking Glass + Turbo Charge | Merlin / Phantom Monarchs | 180 / 160 | 46.6% / 37.7% | +8.3 pp | +3.5 pp | none |
| Smoke Bombs + Vigil Rempart | Ciel / Distorted Reflections | 22 / 279 | 47.0% / 43.2% | +2.3 pp | +4.0 pp | none |
| Hasty Messenger + Prismatic Edge | Lorraine / Mercurial Heart | 106 / 257 | 46.6% / 45.2% | +1.3 pp | +1.5 pp | none |
| Spirit Blade: Ascension + Stalwart Shieldmate | Lorraine / Mercurial Heart | 103 / 260 | 46.7% / 45.3% | +1.3 pp | +1.6 pp | none |
| Creative Shock + Prismatic Edge | Lorraine / Mercurial Heart | 106 / 257 | 46.6% / 45.2% | +1.3 pp | +1.1 pp | none |
| Prismatic Edge + Stalwart Shieldmate | Lorraine / Mercurial Heart | 104 / 259 | 46.7% / 45.2% | +1.3 pp | +1.8 pp | none |
| Backup Charger + Enfeebling Orb | Alice / Phantom Monarchs | 22 / 65 | 32.6% / 27.9% | +3.2 pp | +2.9 pp | none |
| Creative Shock + Merlin, Memory Thief | Merlin / Phantom Monarchs | 208 / 132 | 45.5% / 36.9% | +8.0 pp | +5.1 pp | none |
| Creative Shock + Ghosts of Pendragon | Merlin / Phantom Monarchs | 204 / 136 | 46.7% / 35.8% | +10.1 pp | +8.5 pp | none |
| Creative Shock + Merlin, Kingslayer | Merlin / Phantom Monarchs | 207 / 133 | 45.9% / 36.6% | +8.6 pp | +4.9 pp | none |
| Enfeebling Orb + Frostbind | Diao Chan / Phantom Monarchs | 194 / 174 | 53.0% / 43.5% | +8.9 pp | +2.3 pp | none |
| Fluffy Shopkeep + Liminal Guide | Silvie / Distorted Reflections | 23 / 90 | 54.6% / 30.6% | +16.0 pp | +10.3 pp | none |
| Prismatic Edge + Windrider Vanguard | Lorraine / Alchemical Revolution | 13 / 123 | 56.5% / 48.3% | +4.3 pp | +3.1 pp | none |
| Fabled Azurite Fatestone + Stifling Trap | Guo Jia / Phantom Monarchs | 292 / 269 | 51.4% / 48.3% | +3.0 pp | +3.4 pp | none |
| Spirit Blade: Ascension + Windrider Vanguard | Lorraine / Alchemical Revolution | 12 / 124 | 62.8% / 47.8% | +7.5 pp | +6.5 pp | none |
| Stifling Trap + Wind Resonance Bauble | Tristan / Distorted Reflections | 38 / 312 | 50.4% / 43.0% | +5.4 pp | +4.4 pp | none |
| Harness Lightning + Innervate Agility | Guo Jia / Phantom Monarchs | 279 / 282 | 52.2% / 47.6% | +4.5 pp | +7.3 pp | none |
| Merlin, Kingslayer + Turbo Charge | Merlin / Phantom Monarchs | 183 / 157 | 47.8% / 36.1% | +10.8 pp | +9.4 pp | none |
| Frostsworn Paladin + Tariff Ring | Ciel / Distorted Reflections | 100 / 201 | 43.9% / 43.1% | +0.7 pp | +0.6 pp | none |
| Library Witch + Unmake Duality | Merlin / Phantom Monarchs | 70 / 270 | 50.2% / 40.3% | +8.5 pp | +3.8 pp | none |
| Aquifer Seneschal + Vigil Rempart | Ciel / Distorted Reflections | 14 / 287 | 50.5% / 43.1% | +4.0 pp | +7.6 pp | none |
| Backup Charger + Merlin, Kingslayer | Merlin / Phantom Monarchs | 216 / 124 | 46.6% / 35.0% | +10.7 pp | +8.8 pp | none |
| Esteemed Knight + Gildas, Chronicler of Aesa | Lorraine / Alchemical Revolution | 39 / 97 | 49.9% / 48.4% | +1.2 pp | +0.9 pp | none |
| Fracturize + Tariff Ring | Ciel / Distorted Reflections | 98 / 203 | 44.7% / 42.9% | +1.6 pp | +1.3 pp | none |
| Diana, Keen Huntress + Grand Crusader's Ring | Diana / Distorted Reflections | 21 / 232 | 43.7% / 39.0% | +2.9 pp | +5.9 pp | none |
| Censer of Restful Peace + Fabled Azurite Fatestone | Guo Jia / Phantom Monarchs | 279 / 282 | 51.9% / 47.8% | +3.9 pp | +7.0 pp | none |
| Lost Providence + Spirit of Wind | Alice / Phantom Monarchs | 11 / 76 | 43.6% / 27.1% | +8.6 pp | +7.0 pp | none |
| Storm Tyrant's Eye + Tome of Sorcery | Rai / Phantom Monarchs | 41 / 38 | 43.6% / 30.1% | +9.8 pp | +7.7 pp | none |
| Fluffy Shopkeep + Lustrous Slime | Silvie / Phantom Monarchs | 50 / 95 | 38.7% / 30.1% | +7.1 pp | +6.7 pp | none |
| Lunar Seer + Scout the Land | Arisanna / Distorted Reflections | 51 / 85 | 46.7% / 38.1% | +7.0 pp | +1.2 pp | none |
| Enfeebling Orb + Glimmering Refusal | Diao Chan / Phantom Monarchs | 230 / 138 | 52.0% / 42.8% | +8.6 pp | +5.0 pp | none |
| Reclaim + Shadow's Claw | Tristan / Mercurial Heart | 193 / 46 | 46.3% / 36.2% | +8.2 pp | +6.3 pp | none |
| Baby Blue Slime + Gaia's Songbird | Silvie / Mercurial Heart | 148 / 364 | 49.5% / 45.9% | +3.4 pp | +0.7 pp | none |
| Enfeebling Orb + Fractal of Rain | Diao Chan / Phantom Monarchs | 231 / 137 | 51.9% / 43.2% | +8.0 pp | +5.5 pp | none |
| Fabled Azurite Fatestone + Fairy Whispers | Guo Jia / Phantom Monarchs | 290 / 271 | 51.6% / 47.6% | +3.8 pp | +9.1 pp | none |
| Enfeebling Orb + Throne-Keeper Bullfrog | Diao Chan / Phantom Monarchs | 208 / 160 | 52.2% / 43.8% | +7.8 pp | +4.1 pp | none |
| Enfeebling Orb + Fracturize | Diao Chan / Phantom Monarchs | 229 / 139 | 52.1% / 43.1% | +8.3 pp | +2.6 pp | none |
| Prismspire Scepter + Wind Resonance Bauble | Diao Chan / Phantom Monarchs | 89 / 279 | 52.9% / 46.7% | +5.4 pp | +2.3 pp | none |
| Fracturize + Safeguard Amulet | Arisanna / Mortal Ambition | 46 / 125 | 52.4% / 45.5% | +5.7 pp | +5.7 pp | none |
| Innervate Agility + The Looking Glass | Tristan / Phantom Monarchs | 36 / 292 | 52.2% / 44.5% | +6.0 pp | +3.0 pp | none |
| Crux Sight + Windrider Vanguard | Lorraine / Alchemical Revolution | 13 / 123 | 62.5% / 47.7% | +7.9 pp | +3.6 pp | none |
| Fabled Azurite Fatestone + Spirit of Wind | Guo Jia / Phantom Monarchs | 287 / 274 | 51.6% / 47.6% | +3.8 pp | +8.3 pp | none |
| Backup Charger + Slime Eruption | Silvie / Mercurial Heart | 387 / 125 | 49.7% / 38.6% | +10.3 pp | +5.2 pp | none |
| Grand Crusader's Ring + Nullifying Lantern | Kongming / Distorted Reflections | 100 / 47 | 47.2% / 36.2% | +8.9 pp | +3.9 pp | none |
| Fluffy Shopkeep + Stonescale Band | Silvie / Phantom Monarchs | 44 / 101 | 37.8% / 30.6% | +5.8 pp | +3.2 pp | none |
| Blinding Orb + Topsy Decree | Tristan / Phantom Monarchs | 99 / 229 | 52.3% / 42.5% | +8.8 pp | +6.4 pp | none |
| Backup Charger + Blinding Orb + Calming Breeze | Tristan / Phantom Monarchs | 98 / 230 | 52.1% / 43.0% | +8.2 pp | +5.9 pp | none |
| Grand Crusader's Ring + Sword of Seeking | Zander / Alchemical Revolution | 18 / 96 | 63.0% / 47.6% | +10.0 pp | +10.0 pp | none |
| Scout the Land + Turbo Charge | Tristan / Distorted Reflections | 15 / 335 | 54.1% / 43.4% | +5.8 pp | +3.9 pp | none |
| Blinding Orb + Crystallized Destiny | Tristan / Phantom Monarchs | 89 / 239 | 50.1% / 44.7% | +4.7 pp | +1.6 pp | none |
| Gaia's Songbird + Horn of Beastcalling | Silvie / Phantom Monarchs | 83 / 62 | 36.3% / 29.2% | +6.0 pp | +2.1 pp | none |
| Deploy Gunshield + Flash Grenade | Diana / Mortal Ambition | 13 / 39 | 46.9% / 39.0% | +3.8 pp | +4.4 pp | none |
| Blinding Orb + Turbo Charge | Tristan / Phantom Monarchs | 120 / 208 | 50.5% / 43.2% | +6.6 pp | +6.1 pp | none |
| Reduce to Ash + Wind Resonance Bauble | Lorraine / Phantom Monarchs | 26 / 310 | 51.2% / 47.0% | +2.8 pp | +2.9 pp | none |
| Evasive Maneuvers + Fracturize | Diana / Mortal Ambition | 12 / 40 | 42.9% / 39.3% | +1.7 pp | +2.8 pp | none |
| Sadi, Blood Harvester + Thieving Cut | Zander / Phantom Monarchs | 61 / 201 | 52.6% / 44.2% | +6.9 pp | +3.5 pp | none |
| Sword of Shadows + Turbo Charge + Undying Dreams | Merlin / Distorted Reflections | 187 / 225 | 49.9% / 45.4% | +4.1 pp | +0.9 pp | none |
| Aesan Protector + Crystallized Destiny | Lorraine / Phantom Monarchs | 17 / 319 | 53.5% / 47.0% | +3.6 pp | +0.7 pp | none |
| Crystallized Destiny + Fairy Whispers | Lorraine / Phantom Monarchs | 15 / 321 | 52.2% / 47.1% | +2.7 pp | +1.1 pp | none |
| Crystallized Destiny + Reclaim | Lorraine / Phantom Monarchs | 17 / 319 | 53.5% / 47.0% | +3.6 pp | +2.3 pp | none |
| Crystallized Destiny + Stifling Trap | Lorraine / Phantom Monarchs | 15 / 321 | 52.2% / 47.1% | +2.7 pp | +0.4 pp | none |
| Crystallized Destiny + Windmill Engineer | Lorraine / Phantom Monarchs | 17 / 319 | 53.5% / 47.0% | +3.6 pp | +0.4 pp | none |
| Crystallized Destiny + Dream Fairy | Lorraine / Phantom Monarchs | 17 / 319 | 53.5% / 47.0% | +3.6 pp | +0.0 pp | none |
| Backup Charger + Bulwark Sword | Tonoris / Abyssal Heaven | 23 / 41 | 48.0% / 39.5% | +6.2 pp | +5.4 pp | none |
| Enfeebling Orb + Tariff Ring | Alice / Phantom Monarchs | 19 / 68 | 29.1% / 28.4% | +0.7 pp | +2.1 pp | none |
| Mercenary's Blade + Wind Resonance Bauble | Zander / Mercurial Heart | 22 / 128 | 55.1% / 46.2% | +5.8 pp | +0.9 pp | none |
| Safeguard Amulet + Scout the Land | Arisanna / Distorted Reflections | 85 / 51 | 46.2% / 34.4% | +9.7 pp | +3.0 pp | none |
| Cremation Ritual + Three of Hearts | Lorraine / Distorted Reflections | 398 / 302 | 50.0% / 43.2% | +6.5 pp | +6.9 pp | none |
| Lost Providence + Purifying Thurible | Alice / Phantom Monarchs | 11 / 76 | 43.6% / 27.1% | +8.6 pp | +8.4 pp | none |
| Tariff Ring + Viridian Protective Trinket | Merlin / Mortal Ambition | 41 / 84 | 47.0% / 40.7% | +5.0 pp | +2.1 pp | none |
| Fairy Whispers + Four of Spades | Lorraine / Distorted Reflections | 53 / 647 | 49.9% / 46.9% | +2.3 pp | +4.7 pp | none |
| Sword of Shadows + Turbo Charge | Merlin / Distorted Reflections | 209 / 203 | 49.5% / 45.0% | +4.2 pp | +0.8 pp | none |
| Nullifying Lantern + Quicksilver Grail | Silvie / Phantom Monarchs | 10 / 135 | 43.1% / 31.9% | +5.4 pp | +1.8 pp | none |
| Devastating Blow + Spirit of Serene Fire | Ciel / Phantom Monarchs | 42 / 338 | 51.4% / 43.8% | +5.6 pp | +2.2 pp | none |
| Cascading Round + Evasive Maneuvers | Diana / Mortal Ambition | 12 / 40 | 42.9% / 39.3% | +1.7 pp | +2.8 pp | none |
| Portentous Tanggu + Topsy Decree | Zander / Phantom Monarchs | 74 / 188 | 50.1% / 44.4% | +4.8 pp | +2.2 pp | none |
| Chalice of Blood + Grande Sonnerie | Ciel / Phantom Monarchs | 307 / 73 | 47.6% / 34.7% | +11.3 pp | +5.5 pp | none |
| Dream Fairy + Nullifying Lantern | Tristan / Abyssal Heaven | 65 / 75 | 57.2% / 50.3% | +5.8 pp | +2.8 pp | none |
| Backup Charger + Smoke Bombs | Jin / Distorted Reflections | 33 / 29 | 42.0% / 29.0% | +9.2 pp | +5.3 pp | none |
| Creative Shock + Sadi, Blood Harvester | Zander / Phantom Monarchs | 36 / 226 | 53.8% / 44.9% | +6.4 pp | +3.0 pp | none |
| Fiery Interference + Smoke Bombs | Diao Chan / Distorted Reflections | 39 / 152 | 45.0% / 40.3% | +3.7 pp | +3.9 pp | none |
| Carter, Synthetic Reaper + Cremation Ritual | Ciel / Phantom Monarchs | 226 / 154 | 47.7% / 42.0% | +5.3 pp | +0.9 pp | none |
| Mercenary's Blade + Sadi, Blood Harvester | Zander / Mortal Ambition | 42 / 69 | 54.1% / 47.3% | +5.5 pp | +0.7 pp | none |
| Backup Charger + Hemorrhaging Rend | Jin / Phantom Monarchs | 46 / 32 | 36.0% / 34.8% | +0.9 pp | +0.3 pp | none |
| Sadi, Blood Harvester + Spirit of Serene Fire | Zander / Phantom Monarchs | 35 / 227 | 54.0% / 44.9% | +6.4 pp | +3.0 pp | none |
| Resolute Stand + Return to the Archive | Zander / Phantom Monarchs | 124 / 138 | 47.4% / 45.1% | +2.0 pp | +0.3 pp | none |
| Poisoned Dagger + Viridian Protective Trinket | Tristan / Mortal Ambition | 17 / 98 | 52.6% / 44.9% | +5.0 pp | +0.6 pp | none |
| Creative Shock + Ducal Seal | Zander / Phantom Monarchs | 63 / 199 | 51.5% / 44.4% | +5.9 pp | +7.1 pp | none |
| Blinding Orb + Sadi, Blood Harvester | Zander / Mortal Ambition | 15 / 96 | 59.9% / 48.5% | +6.8 pp | +4.6 pp | none |
| Spirit Blade: Ascension + Viridian Protective Trinket | Merlin / Mortal Ambition | 42 / 83 | 48.5% / 40.0% | +6.8 pp | +2.8 pp | none |
| Turbo Charge + Ventus, Staff of Zephyrs | Kongming / Phantom Monarchs | 17 / 77 | 40.3% / 33.3% | +4.2 pp | +1.3 pp | none |
| Sadi, Blood Harvester + Safeguard Amulet | Zander / Mortal Ambition | 39 / 72 | 53.8% / 47.1% | +5.4 pp | +2.9 pp | none |
| Dungeon Guide + Sadi, Blood Harvester | Zander / Mortal Ambition | 35 / 76 | 55.3% / 47.0% | +6.6 pp | +4.4 pp | none |
| Censer of Restful Peace + Fan of Seven Debts | Kongming / Phantom Monarchs | 31 / 63 | 44.5% / 31.6% | +8.7 pp | +7.3 pp | none |
| Nascent Barrier + Scout the Land + Topsy Decree | Arisanna / Phantom Monarchs | 33 / 110 | 49.3% / 36.2% | +9.9 pp | +0.6 pp | none |
| Nullifying Mirror + Xiao Qiao, Cinderkeeper | Zander / Abyssal Heaven | 12 / 111 | 63.4% / 48.4% | +8.1 pp | +6.6 pp | none |

## Discovery summary

- 2-card groups: 709 nominated; 101 positive with sufficient later evidence.
- 3-card groups: 181 nominated; 11 positive with sufficient later evidence.
- 4-card groups: 30 nominated; 0 positive with sufficient later evidence.

Among the 112 later-positive groups: 0 exactly match an existing mined candidate, 0 are a subset/superset, and 112 have neither relationship.

Re-run: `npm run audit:win-rate-packages --workspace=pipeline`. Full results: `data/analysis/win-rate-packages.json`.
