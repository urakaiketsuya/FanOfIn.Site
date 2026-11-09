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

## Research review

`/admin#research` joins the current suggested, win-rate, experimental, and construction
reports with saved administrator decisions. Package Research links to this queue for
signed-in administrators. Source links open research in another tab to preserve drafts.
Filter by source, review status, or card/name; unchanged approvals and dismissals leave
the default Needs review view. Evidence changes return a finding to that view without
changing its saved exact list or publication status. Saved reviews remain editable when
a source finding disappears or its report is unavailable.

Review opens the existing package editor. Required cards (or the pool when there are no
required cards) start at one copy, with known Material sections retained. These are starting
selections, not tested ratios. Editors can change the name, cards, sections, and quantities,
save a draft, approve and publish after confirming the evidence and exact list, or dismiss.
Dismissal unpublishes the same resource; choosing Draft reopens it. Approval publishes an
editorial exact list only: browser-local research approvals, statistical evidence, and
Builder protection rules are unchanged.

Migration **0040** adds the research reference to the existing editorial package row.
Apply it before deploying the account service, then release the frontend. The reference
contains a source kind, SHA-256 identity, evidence fingerprint, and dismissal state. One
conditional SQL write saves the decision and publication together; deterministic IDs
prevent duplicate review records. Revision conflicts require reloading the saved version.
Research metadata is omitted from the public package response. This is current review
state, not a historical audit log of every report or editorial revision.

Verification: all 161 account-service tests, research adapters against all four real report
formats, and local D1 migrations/rollback/retry/conflict checks pass. Mocked browser checks
at 390px and 1280px cover loading, filters, drafts, failed saves, approval confirmation,
dismissal, refresh persistence, conflict reload, dirty dismissal, errors/retry, keyboard tabs,
48px controls, and overflow. Production deployment and an authenticated production review
remain release checks; native phone keyboards have not been exercised.
