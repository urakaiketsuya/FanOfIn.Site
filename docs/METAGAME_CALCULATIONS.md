# Metagame card usage

Implementation: `app/src/features/metagame/report.ts`. This is a descriptive registration report, not a performance ranking.

Join the published deck-card index to the popularity index by deckId, then to event metadata by eventId. Include only completed events of the selected format. Count each deckId once; identical lists registered by different players or at different events remain separate registrations. Unknown champions remain in the all-champion denominator and have an explicit Unknown option.

The reporting cutoff is the earliest generatedAt of the three sources. Last 30/90 days means event date in (cutoff minus N days, cutoff]; all time removes the lower bound. This anchors the report to published coverage rather than pretending stale data is current. Future and unfinished events are excluded.

Inclusion = registrations containing the card in the selected section / all matching registrations with available card lists. Empty sideboards remain in the denominator. Nonempty sideboard counts are shown separately. Missing card lists are excluded and reported. Duplicate card lines within a section sum quantities but count presence once. Nonpositive, nonfinite quantities and unresolved dictionary names do not count.

Average copies = total copies / registrations containing the card in that section. Sections never combine. Ordering is inclusion count descending, then name ascending. Champion option counts use the same format and period before champion filtering. No win-rate inference, sideboarding behavior, or unique-player claim is made.

Current scope: usage by champion and section, with optional format and period. Period-over-period trends and signature-card comparisons are separate future work.
