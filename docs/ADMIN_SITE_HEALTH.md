# Admin site health

The administrator-only `GET /v1/admin/site-health` reports a compact overview.
It loads separately from package and collection totals, with independent retry.
Refreshing dashboard totals also reloads site health.

## Account activity

Rolling 7/30-day intervals include both endpoints and exclude future timestamps.
Active accounts are distinct accounts with retained saved activity in deck versions
or deck metadata, collection changes/undos, combos, match logs, saved analysis
profiles, or deck/tournament bookmarks. One account counts once across all features.
Seed decks do not count. This measures saved activity, not visits, logins, anonymous
users, simulator executions, or unsaved report usage. Feature rows count distinct
accounts over 30 days and overlap.

New accounts use account creation timestamps. Deck creators are distinct owners
who created a retained non-seed deck during the last 30 days, including imports.
Deleted records are absent. For features retaining only the latest update timestamp,
these counts describe current retained records rather than an immutable event log.

## Operational counters

Migration `0040_admin_operation_metrics.sql` establishes a coverage start timestamp.
Deploy it before the account worker. The worker records one atomic daily increment
after each authenticated, allowlisted account operation: deck changes, deck import
and previews, collection updates/undos, combos, match logs, analysis profile saves,
and trades. Store only a UTC date, fixed operation label, attempts, 4xx rejections,
and 5xx errors. No identity, URL, content, or error details are stored here.

HTTP retries are separate attempts. Successful replay/no-op requests count as attempts,
not additional saved activity. Authentication/gateway failures, browser/network
failures, other workers, and non-allowlisted requests are outside coverage.
The last 30 UTC calendar dates include today's partial date. Tracking starts at
migration, so an empty period is not a claim of zero historical failures.

Counters are best effort and never replace a successful or failed business response.
A metrics-write failure emits `operation_metrics_unavailable` in server logs.
Unavailable metric tables produce an explicit unavailable state. Database-wide
outages can also prevent error counting. Review counters alongside service logs.

## Published data

Fetch the published manifest through the shared bounded asset loader. Show the
timestamps for tournament index, prices, card analysis, simulator summary, and
community deck index. Missing, invalid, future-dated, or unreachable timestamps
are unavailable. These are publication dates, not proof that an upstream crawl
succeeded or that the underlying observations are recent.

Browser analytics remains unchanged. GA pageviews and coarse events are not imported
into this dashboard. Do Not Track behavior and identifiers sent to GA are unchanged.
