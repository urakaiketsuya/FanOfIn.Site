# Season build and card report audit

Audited 2026-10-26. Reproduce from the repository root:

```sh
node --import tsx pipeline/scripts/audit-season-reports.ts
```

The command reads committed artifacts and prints monthly coverage as JSON; it does not
change source data or publish a report. Source timestamps are included in its output.

## Findings

The October 25 analysis snapshot joins cleanly to the October 26 event browse snapshot:
no duplicate event/list/sighting IDs, malformed sighting IDs, unknown events, or ambiguous
concrete build assignments. All 58,702 recorded sightings have nonempty Main and Material
lists with valid dictionary names and positive integer quantities. This is structural
list validation, not a legality or full-deck-size check.

44,099 sightings have one concrete build assignment; 14,603 (24.9%) have none.
There are another 1,488 indexed lists outside the recorded-sighting population.
The popularity index is projected from deck sightings, which require available decklists,
available standings, and a matching player standing. It is not the full entrant population.
Only 1,891 of 22,201 eligible completed individual events contain recorded sightings.
Do not label this sample as the tournament field or silently include the extra lists.

Latest season (.asphodel/paradise), Standard:

| Month | Events with sightings / completed events | Recorded lists | Assigned builds | Unclassified |
| --- | --- | --- | --- | --- |
| Aug 2026 | 3 / 211 | 48 | 26 | 22 |
| Sep 2026 | 35 / 668 | 797 | 485 | 312 |
| Oct 2026 | 84 / 498 | 1,632 | 1,097 | 535 |

October is a partial month. Draft and free-play have completed events but no recorded
sightings in this season. Preserve unavailable states rather than reporting 0% adoption.

## Implementation contract

- Separate season, format and calendar month. Count one observation per deckId,
  including repeated players at different events. Use the event calendar for dates.
- Build share: unique decks assigned to that build / all recorded decks in the cohort.
  Include Unclassified, and treat ambiguous membership as a separate coverage failure.
  Current taxonomy labels describe historical lists; they are not historical classifications.
- Card adoption: lists containing the card in Main or Material / usable lists in the
  same cohort. Count each card once per list; exclude Sideboard. Missing or invalid
  lists are coverage gaps, never absence of a card.
- Present “Recorded decks,” list counts and observed-event coverage beside percentages.
  Keep these reports distinct from the complete-field champion report.
- Start with the latest two event months, including a partial current month. Never skip
  an unavailable month to manufacture a change. No percentage-point change when either
  denominator is missing. Do not call raw adoption changes improvements or effects on wins.
- Prefer champion-scoped card adoption when interpreting construction changes, because
  changing champion mix can drive season-wide adoption without changes within any build.
- Publish a compact pipeline-derived report rather than downloading the full list index
  and taxonomy solely for this page. Validate the model with cohort, missing-list,
  duplicate, unclassified-build and Sideboard fixtures before adding the UI.

Next: implement that shared monthly model and pipeline artifact, followed by card-led
season panels and mobile/desktop verification. This audit adds no new page UI.
