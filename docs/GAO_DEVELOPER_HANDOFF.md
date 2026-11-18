# GAO developer handoff: match and decklist submissions

The Fan of Insight match submission API is live. It accepts one completed Grand Archive match, both players’ registered decklists, and individual game results.

## Endpoint

```text
POST https://fanofin-match-ingestion-production.fanofin-match-ingestion-worker.workers.dev/v1/grand-archive/matches
```

## Authentication

Your GAO key will be shared separately through a secure channel. Store it in your backend’s secret manager as `MATCH_API_KEY` and send:

```http
Authorization: Bearer <GAO_KEY>
Content-Type: application/json
```

Keep the key out of frontend code, repositories, and logs. The key automatically attributes submissions to GAO. Include `source.id: "gao"` to assert that attribution; a mismatch is rejected. No credential is included in this document.

## Example payload

Save this as `match.json`. Card IDs and shortened decklists are illustrative: replace them with canonical card IDs and complete registered lists.

```json
{
  "schemaVersion": 1,
  "submissionId": "gao-match-123",
  "source": {
    "id": "gao",
    "matchId": "match-123",
    "version": "1.0.0"
  },
  "format": "standard",
  "matchType": "casual",
  "bestOf": 1,
  "result": {
    "outcome": "win",
    "winnerSeat": 1,
    "wins": {
      "1": 1,
      "2": 0
    }
  },
  "players": [
    {
      "seat": 1,
      "participantType": "human",
      "deck": {
        "sections": {
          "main": [
            {
              "cardId": "example-card-a",
              "quantity": 3
            },
            {
              "cardId": "example-card-b",
              "quantity": 2
            }
          ],
          "material": [
            {
              "cardId": "example-champion",
              "quantity": 1
            }
          ],
          "sideboard": [],
          "song": []
        },
        "sourceDeckId": "gao-deck-456"
      }
    },
    {
      "seat": 2,
      "participantType": "human",
      "deck": {
        "sections": {
          "main": [
            {
              "cardId": "example-card-a",
              "quantity": 3
            },
            {
              "cardId": "example-card-b",
              "quantity": 2
            }
          ],
          "material": [
            {
              "cardId": "example-champion",
              "quantity": 1
            }
          ],
          "sideboard": [],
          "song": []
        },
        "sourceDeckId": "gao-deck-789"
      }
    }
  ],
  "games": [
    {
      "gameNumber": 1,
      "outcome": "win",
      "winnerSeat": 1,
      "endReason": "normal",
      "firstPlayerSeat": 2,
      "turns": 8,
      "sourceGameId": "gao-game-123-1"
    }
  ],
  "startedAt": "2026-11-18T15:00:00Z",
  "completedAt": "2026-11-18T15:25:00Z"
}
```

Submit from your backend:

```sh
curl --fail-with-body \
  'https://fanofin-match-ingestion-production.fanofin-match-ingestion-worker.workers.dev/v1/grand-archive/matches' \
  -H "Authorization: Bearer $MATCH_API_KEY" \
  -H 'Content-Type: application/json' \
  --data-binary @match.json
```

## Payload requirements

- Submit completed matches only. `bestOf` supports `1` or `3`; game results must agree with the match score. A series must reach a winning majority or use all game slots. No games may follow a clinched majority.
- Include exactly two players, with seats `1` and `2`. `participantType` supports `human` or `bot`.
- Send both complete, registered **pre-sideboarding decklists**, including cards never drawn. Per-game sideboarding snapshots are not supported.
- All four deck sections are required. `main` and `material` must be nonempty; `sideboard` and `song` may be empty.
- Each section allows up to 250 distinct card IDs, with quantities from 1–100. Combine duplicate cards into one line per section.
- `format`: `standard` or `pantheon`.
- `matchType`: `casual`, `ranked`, `tournament`, or `playtest`.
- Game `endReason`: `normal`, `concede`, `timeout`, `disconnect`, `agreement`, or `unknown`.
- Draws use `outcome: "draw"` and `winnerSeat: null`. Drawn games do not increment either win count.
- Game numbers must be consecutive starting at 1; source game IDs must be unique within the match.
- IDs must be 1–255 characters, start with an ASCII letter or digit, and contain only ASCII letters, digits, `.`, `_`, `:`, or `-`. The source ID uses the operator-assigned lowercase value `gao`.
- Optional fields include `source.version`, `startedAt`, `completedAt`, deck `sourceDeckId`, `url`, and `name`, and game `sourceGameId`, `firstPlayerSeat`, and `turns`.
- Timestamps use ISO 8601 with UTC `Z` or an offset; completion cannot precede start. `firstPlayerSeat` is 1 or 2; `turns` is an integer from 0–10,000.
- Optional deck URLs must be HTTP(S), at most 2,048 characters, without embedded credentials. Optional names are trimmed, 1–120 characters, and checked against the site’s content policy.
- Unknown fields are rejected. Omit unknown optional fields; only `winnerSeat` accepts null. Maximum request size is **1 MiB**.

The endpoint validates structure and result consistency; it does not currently validate card-catalog membership or deck legality.

## Responses and retries

A successful submission returns `201`:

```json
{
  "success": true,
  "requestId": "server-generated-request-id",
  "sourceId": "gao",
  "submissionId": "gao-match-123",
  "outcome": "created"
}
```

| Status | Meaning |
| --- | --- |
| `201` | Saved successfully |
| `200` | Identical submission already saved (`outcome: "duplicate"`); treat as success |
| `400` | Invalid JSON or Content-Type |
| `401` | Missing or invalid key |
| `409` | Submission ID or source match ID conflicts with existing content |
| `413` | Request exceeds 1 MiB |
| `422` | Validation failed; inspect `error.details` |
| `500` | Retry with backoff |

Errors include `success: false`, `requestId`, and an `error` object with `code` and `message`. Validation failures additionally include up to 20 `error.details` entries with `path` and `message`; array indexes in paths are zero-based.

Keep `submissionId`, `source.matchId`, and the payload stable across retries. Retry network failures and server errors with backoff. Persist undelivered submissions and mark them delivered only after `200` or `201`. Do not generate a new ID to bypass a conflict. Save the returned `requestId` when reporting an issue.

Object key order and player/game/card-line ordering do not affect retry identity. Adding or omitting a matching `source.id` also does not affect retry identity. IDs are scoped to your authenticated source. There is no update/delete API.

## Storage and visibility

The match, both deck snapshots, and game results are saved atomically. Deck snapshots remain unchanged if a linked deck is edited later. Analytical deck identity uses main + material; sideboard and song are retained separately from that identity.

This endpoint collects matches and deck snapshots; it does not automatically publish them or provide a public read API.
