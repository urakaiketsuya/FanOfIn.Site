# Starter Library

The reviewed SQL contains 60 unique main/material builds across 24 champions,
selected round-robin by champion and format from local source archives. Within
each group the generator prefers source update/create dates. Size screening is
not a full current-legality check. Sideboards are preserved but excluded from
deduplication. This is site-managed content, not additional community members.

From `account-worker`, apply the schema before deploying the Worker, then load
the seed file into the intended database:

```sh
npx wrangler d1 migrations apply ACCOUNT_DB --local
npx wrangler d1 execute ACCOUNT_DB --local --file seeds/starter-library.sql
```

For production use `--env production --remote` in place of `--local`. Deploy
the Worker and app changes together after migration 0021. The seed operation is
idempotent; rerunning it does not reset retired entries or engagement. No live
database is modified by generating the SQL.

Regenerate for review from the repository root:

```sh
node --import tsx account-worker/scripts/build-starter-library.ts
```

The system account has no authentication identity or password and is excluded
from profile discovery. Any future user-count metric must filter `is_system = 0`.
Source URLs, original titles, and authors live in `starter_library_sources`;
public endpoints do not return them. The methodology page is unchanged.

User decks sort ahead of seeds. To retire all seeds from discovery while keeping
links, bookmarks, and user copies working, execute:

```sql
UPDATE user_decks SET seed_discoverable = 0 WHERE is_seed = 1;
```

Add `AND id = ...` to retire individual entries. Set the flag back to 1 to restore
them. Do not delete the library account or published versions to retire entries.
Copies belong to the requesting user and receive the default `is_seed = 0`.
