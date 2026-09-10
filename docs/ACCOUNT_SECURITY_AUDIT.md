# Account security audit

This checklist maps the account service to OWASP Top 10:2025. It is evidence for review, not a claim that automated tests replace penetration testing.

## A01 — Broken Access Control

- Private APIs authenticate before route dispatch and pass the session-derived user ID into data functions.
- Private deck reads begin with `user_decks.id = ? AND owner_user_id = ?`; rejected reads stop before loading sources or versions.
- Deck mutations use both resource ID and owner ID and return the same not-found response for missing and foreign resources.
- Public access uses opaque public slugs and immutable published snapshot fields; discovery includes public decks only.
- Security tests use separate owner and attacker identities for private reads, rename, and deletion. Extend this matrix whenever a new private resource route is added.

## A02 — Security Misconfiguration

- Production account requests require the BFF, an exact allowed origin, a fresh HMAC signature, and configured secrets.
- Session cookies are `Secure`, `HttpOnly`, `SameSite=Lax`, and responses are `no-store`.
- Password endpoints fail closed when Resend or Turnstile production secrets are absent.
- Development sign-in and Turnstile bypass require the exact localhost configuration.

## A03 — Software Supply Chain Failures

- GitHub Actions are pinned to commit hashes and builds use `npm ci`.
- Review `npm audit` results on dependency changes and keep automated dependency updates enabled.
- Password hashing uses the Workers native Web Crypto implementation rather than a third-party cryptography package.

## A04 — Cryptographic Failures

- Passwords use PBKDF2-HMAC-SHA-256, unique 128-bit salts, 600,000 iterations, and constant-time comparison.
- Session, verification, reset, OAuth state, and nonce values use cryptographic randomness; only their hashes are stored.
- Resend webhooks use timestamp-bounded HMAC verification over the raw request body.

## A05 — Injection

- D1 queries bind all user-controlled values.
- JSON bodies and string/array lengths are bounded before storage or outbound use.
- Email links use a trusted configured application base URL; users cannot supply redirect destinations.

## A06 — Insecure Design

- Display names are not login identifiers.
- Accounts are never merged based only on matching provider email addresses.
- A password added to an OAuth account can only be verified while the requesting owner is still authenticated; the email link alone cannot grant access or activate recovery for that account.
- Credential removal requires another usable method and recent authentication.
- Password reset invalidates sessions and requires a separate login afterward.

## A07 — Authentication Failures

- Login performs equivalent PBKDF2 work for unknown identifiers and returns one generic failure.
- Registration and reset requests avoid disclosing whether an account exists.
- Login limits apply independently to client IP and a hash of the normalized identifier; Turnstile is validated server-side.
- Sessions rotate after every successful authentication and have idle and absolute expiry.
- Passwords accept Unicode and spaces, are 15–128 characters, and are screened against known compromised passwords.

## A08 — Software or Data Integrity Failures

- OAuth issuer, audience, expiry, signature, nonce/state, and verified-email claims are validated.
- BFF signatures bind method, path, query, body hash, timestamp, and request ID.
- Resend webhook signatures and timestamps are verified before processing; webhook IDs are idempotent.

## A09 — Security Logging and Alerting Failures

- Authentication successes, failures, registration, verification, reset, and credential changes create structured D1 security events using hashed identifiers.
- Logs exclude passwords, hashes, raw sessions, and reset/verification tokens.
- Production operations should alert on spikes in failed logins, reset requests, webhook failures, and authorization failures.

## A10 — Mishandling of Exceptional Conditions

- Unknown errors return a generic message and request ID while detailed errors remain server-side.
- Failed registration-email delivery removes the newly created unusable credential/account.
- Reset completion remains successful if its notification email fails, avoiding an ambiguous retry after the password already changed.
- D1 constraints enforce uniqueness and ownership relationships in addition to application checks.

## Release gate

- Apply all migrations to a fresh local D1 database.
- Run account-worker tests and typecheck, BFF typecheck, shared typecheck, app typecheck, and app lint.
- Verify Resend DNS, webhook signature, and suppression events in staging.
- Exercise registration, verification, login, linking, changing, reset, logout-all, and credential removal with two real test accounts.
- Repeat cross-user private-resource probes against staging and confirm rejected operations do not modify data.
