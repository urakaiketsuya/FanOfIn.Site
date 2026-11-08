# Admin workspace

The dashboard at `/admin` uses the existing account session. Administrators are explicitly granted in `admin_users`; community staff/moderator roles do not grant dashboard access. No browser endpoint can grant this permission.

Apply account migrations before deploying the account worker, then release the app. Migration 0039 attaches the requested existing owner account through its original profile address. Confirm access after deployment. To grant another existing account or manage access manually:

```bash
node scripts/admin-access.mjs grant PROFILE_ADDRESS --remote
```

Use the last segment of the user's profile URL. Historical profile addresses work. Use `revoke` to remove access and `--local` for development. The account page shows the dashboard link after access is granted.

Editors can save a draft, publish an exact card list, edit it, or return it to draft. Published lists appear on `/cards/packages` alongside the reviewed catalog. They use the shared package import flow; they do not change the analysis catalog or Builder protection rules. Changes use revision checks, and identical retries are safe. Names pass the shared content policy; card names remain catalog references.

Overview reports current user deck counts grouped by visibility, excluding seed decks and counting each deck once rather than each version. It returns aggregate counts, not deck contents or owner records. All dashboard responses are uncached and require an explicit account grant.

Username addresses derive from the account display name. Names with the same normalized address receive a suffix. Historical addresses remain reserved for their original account, and the public profile page replaces old URLs with the current address. Rename writes reserve the new address atomically; privacy settings continue to apply to every alias.

Verification: worker tests cover access, input validation, publication visibility, migration behavior, alias reservations, save rollback, retries, and concurrent revision conflicts. The local D1 integration suite also covers the new tables. Browser checks exercise draft/save/publish/retry and access states at mobile and desktop sizes.
