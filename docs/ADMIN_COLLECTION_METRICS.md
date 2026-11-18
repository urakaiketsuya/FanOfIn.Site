# Admin collection metrics

The admin overview reports card inventory only (owned and proxy copies), excluding
merchandise. Access remains restricted to administrators.

- **Active collectors, 7/30 days:** distinct accounts with a committed collection
  transaction or undo timestamp in the inclusive rolling interval ending at the
  response's `asOf` UTC timestamp. Viewing inventory, unchanged saves, failed saves,
  goals, loans, and location-only edits do not count. Imported and completed-trade
  inventory changes do count. Current inventory need not be nonempty.
- **Collection adoption:** accounts with positive owned or proxy inventory divided
  by all current accounts, multiplied by 100. No accounts yields an unavailable
  rate, not 0%. Printing and finish pools do not multiply account counts.
- **New collectors by week:** accounts grouped by their earliest recorded collection
  transaction, across eight Monday-based UTC weeks including the current partial
  week. Returning users are not new collectors. Undo does not erase first use.
  Weeks without first saves are zero-filled. Future timestamps are excluded.
- Activity and first-save history come from retained transaction records. Account
  deletion cascades through this history, so this describes currently retained
  accounts, not an immutable historical census. Inventory inserted outside the
  transaction path cannot supply a historical first-save date.
- Current adoption is a snapshot; the weekly chart measures first recorded use,
  not historical nonempty-inventory percentages. Those percentages would require
  dedicated historical snapshots.

These are read-only aggregates; no migration, scheduled job, or new telemetry is
required. Historical aggregation scans retained collection transactions; revisit
materialized aggregates if production volume makes this endpoint expensive.
