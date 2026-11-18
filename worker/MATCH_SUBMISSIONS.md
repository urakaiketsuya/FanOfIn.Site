# Submit Grand Archive matches and decklists

`POST /v1/grand-archive/matches` accepts **one completed two-player match** and both
registered, pre-sideboarding deck snapshots. This is independent of the existing
`/v1/grand-archive/games` telemetry contract. It does not require card activity,
turn statistics, combat events, player names, or accounts.

## Authentication and request

Obtain a dedicated bearer key and the deployed Worker base URL from the operator.
Send from your backend, never from a browser or a public repository. Requests are
HTTPS JSON, at most 1 MiB. Source identity is assigned by the credential; do not
send an application/source ID in the payload.

```sh
curl --fail-with-body "$MATCH_API_BASE/v1/grand-archive/matches" \
  -H "Authorization: Bearer $MATCH_API_KEY" \
  -H 'Content-Type: application/json' \
  --data-binary @match.json
```

[Complete example JSON](test/fixtures/match-submission-v1.json) can be copied to
`match.json`. Its card IDs and shortened lists are illustrative: replace them with
canonical card IDs and the complete actual lists. The endpoint validates structure,
not card-catalog membership, deck legality, or whether a reported result is truthful.

## Version 1 contract

Unknown properties are rejected at every level. Numbers are JSON integers, not
strings. Optional fields should be omitted when unknown, not supplied as null.
The sole nullable fields are `winnerSeat` on results and games.

| Field | Required | Values / meaning |
| --- | --- | --- |
| `schemaVersion` | Yes | `1` |
| `submissionId` | Yes | Stable retry ID, unique within your source |
| `source.matchId` | Yes | Stable external match ID; also unique within your source |
| `source.version` | No | Producer version |
| `startedAt`, `completedAt` | No | ISO 8601 timestamps with UTC `Z` or offset; completion cannot precede start |
| `format` | Yes | `standard`, `pantheon` |
| `matchType` | Yes | `casual`, `ranked`, `tournament`, `playtest` |
| `bestOf` | Yes | `1` or `3` |
| `result.outcome` | Yes | `win` or `draw` |
| `result.winnerSeat` | Yes | `1`, `2`, or null for a draw |
| `result.wins` | Yes | Object with `"1"` and `"2"` game-win counts; draws do not increment either |
| `players` | Yes | Exactly two entries, one each for seats 1 and 2 |
| `games` | Yes | All games in the completed match, 1–3 entries |

Identifiers (`submissionId`, external match/deck/game IDs, version, card IDs) are
1–255 ASCII characters, beginning with a letter or digit; subsequent characters
may also include `.`, `_`, `:`, or `-`. Card IDs are canonical IDs, not card names
or printing labels.

### Players and deck snapshots

Each player has `seat`, `participantType` (`human` or `bot`), and `deck`.
The deck contains optional `sourceDeckId`, `url`, and `name`, plus required
`sections` with all four arrays: `main`, `material`, `sideboard`, and `song`.

Each card line is `{ "cardId": "canonical-card-id", "quantity": 3 }`.
Main and material must be nonempty; sideboard and song may be empty. Each section
permits up to 250 distinct card IDs, quantities 1–100, and no duplicate card ID
within that section. A card may occur in different sections.

Deck URLs must be HTTP(S), at most 2,048 characters, without embedded credentials.
They are stored, never fetched by this endpoint. Names are trimmed, 1–120 characters,
and checked by the site's shared content policy.

Submit the full list even if a card was never drawn. Decks are immutable snapshots;
a later change to a linked deck does not change the submitted list. Per-game
sideboarding snapshots are not supported in version 1. The server computes an
order-independent main+material fingerprint; sideboard/song are retained but do
not change that analytical identity.

### Games and series completion

Each game requires `gameNumber`, `outcome`, `winnerSeat`, and `endReason`.
Optional fields: `sourceGameId`, `firstPlayerSeat` (1 or 2), and `turns` (0–10,000).
`endReason` is `normal`, `concede`, `timeout`, `disconnect`, `agreement`, or `unknown`.

Game numbers must be consecutive starting at 1; supplied source game IDs must be
unique within the match. A game draw requires a null winner; a win requires a seat.
The match score must equal the game results, and its winner is the seat with more
wins (or null if tied). A completed series has either used all `bestOf` slots or
reached a winning majority. No games may follow a clinched majority. Thus Bo3 can
finish 2–0, 2–1, 1–0 with two draws, or 1–1 with one draw. Do not submit incomplete,
abandoned series or match-level forfeits without corresponding game outcomes.

## Responses and retries

Success body: `{ "success": true, "requestId": "…", "submissionId": "…", "outcome": "created" }`.

| HTTP | Meaning | Sender action |
| --- | --- | --- |
| 201 | Created atomically | Mark delivered |
| 200 | Identical retry (`outcome: "duplicate"`) | Mark delivered |
| 400 | Invalid JSON or Content-Type | Fix request |
| 401 | Missing/invalid credential or source configuration | Contact operator |
| 413 | Body exceeds 1 MiB | Reduce payload |
| 422 | Validation failure | Fix fields identified in `error.details` |
| 409 | Submission or source match ID already used for different content | Investigate; do not generate another ID to bypass it |
| 500 | Persistence failed | Retry the same payload and IDs with backoff |

Errors have `{ "success": false, "requestId": "…", "error": { "code": "…", "message": "…", "details": […] } }`;
details are present for validation failures. Network failures can also be retried.
JSON object key order and player/game/card-line ordering do not change retry
identity. Changes to other values do. Different sources have independent IDs.
There is no update/delete API in this contract.

## Operator setup: secret protection

The new endpoint **fails closed until configured**. It does not accept the legacy
`INGESTION_API_KEY`. Set a separate Cloudflare secret `MATCH_INGESTION_KEYS`, whose
value is a JSON object mapping stable source IDs to independently generated bearer
keys. Example shape (do not use this placeholder as a credential):

```json
{"partner-tool":"REPLACE_WITH_A_RANDOM_KEY_OF_AT_LEAST_32_CHARACTERS"}
```

Source IDs match `[a-z0-9][a-z0-9_-]{0,63}`. Keys must be unique and at least 32
characters; use 32 cryptographically random bytes encoded as hex. All entries must
be valid, otherwise authentication fails closed. Use distinct dev/production keys.

From `worker/`, provision through Wrangler's interactive secret prompt:

```sh
npx wrangler secret put MATCH_INGESTION_KEYS
npx wrangler secret put MATCH_INGESTION_KEYS --env production
npx wrangler d1 migrations apply MATCH_DB --remote --env production
npx wrangler deploy --env production
```

Enter the JSON at the secret prompt, not as a command-line argument. Keep source IDs
stable when rotating keys, so retries still resolve to the same records. Replacing
a source's key revokes its old credential immediately; removing the source revokes
its access. Coordinate rotation with the submitting tool. The existing telemetry
endpoint still requires its own `INGESTION_API_KEY`.

For local development, place the JSON in the gitignored `.dev.vars` file using
Wrangler dotenv syntax, for example `MATCH_INGESTION_KEYS='{"local-tool":"…"}'`.

## Storage and visibility

Matches, both deck snapshots, and game results commit in one D1 batch. Failure
rolls back the whole submission; concurrent retries are resolved using database
uniqueness constraints. The normalized snapshots and checksums are retained; this
endpoint does not create a separate raw-payload copy. Existing 30-day raw telemetry
cleanup does not delete these snapshots. This endpoint adds collection only: it
does not publish decklists, raw matches, or mix them into legacy public simulator
aggregates. No account ownership is inferred from a submitted deck URL.
