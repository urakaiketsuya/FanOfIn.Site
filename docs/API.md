# Match submission API

External tools can submit completed Grand Archive matches and both players' full
registered decklists using `POST /v1/grand-archive/matches`.

- [Integration guide](../worker/MATCH_SUBMISSIONS.md): authentication, payload
  fields, validation rules, responses, retries, and operator setup.
- [Complete example request](../worker/test/fixtures/match-submission-v1.json):
  copyable JSON with illustrative card IDs and shortened lists.
- [Validation schema](../worker/src/match-schema.ts): executable version 1 contract.
- [Worker operations](../worker/README.md): local development and deployment.

Ask the operator for the deployed API base URL and a dedicated source credential.
The website hostname is not an assumed API base URL. This route requires its own
bearer key configured through `MATCH_INGESTION_KEYS`; the legacy game telemetry
key does not grant access. Send credentials only from a trusted backend.

The API collects match results and immutable deck snapshots. It does not provide
a public match/decklist read API or automatically publish submissions in analytics.

Sources are attributed by credential: configure `gao` for GAO and `clarent` for
Clarent. Senders can assert `source.id`; responses include `sourceId`, and stored
matches retain the source for filtering. See the guide for validation and setup.
