# Grand Archive Simulator Game Submission API v1

This contract defines the payload sent by TCGEngine after a decided Grand Archive game. Fan of
Insight stores normalized queryable fields in D1 and retains the validated canonical payload in D1
for 30 days for recovery and debugging. A daily cleanup removes only expired raw payload JSON;
normalized game and player records remain available for analytics.

## Endpoint

`POST /v1/grand-archive/games`

Required headers:

- `Authorization: Bearer <ingestion secret>`
- `Content-Type: application/json`

The maximum accepted request body is 1 MiB. Unknown top-level fields are rejected so accidental
producer changes cannot silently enter the analytics corpus.

## Identity and delivery

`submissionId` is `${matchId}:${gameNumber}`. A submission ID identifies one game and is the
idempotency key for retries. Repeating the same ID and payload is successful. Reusing an ID with a
different payload is a conflict.

TCGEngine uses at-least-once delivery. The receiver owns deduplication.

## Payload

```ts
type GameSubmissionV1 = {
  schemaVersion: 1;
  submissionId: string;
  submittedAt: string; // UTC ISO-8601
  source: {
    application: "TCGEngine";
    game: "GrandArchiveSim";
    version: string; // deployed revision or build identifier
  };
  matchId: string;
  format: string;
  bestOf: 1 | 3;
  gameName: string;
  gameNumber: number;
  winner: 1 | 2;
  firstPlayer: 1 | 2;
  turns: number;
  matchWinner: 1 | 2;
  matchWins: { "1": number; "2": number };
  players: { "1": PlayerGameStatsV1; "2": PlayerGameStatsV1 };
  combatEvents: CombatEventV1[];
};

type PlayerGameStatsV1 = {
  deckLink: string;
  championId: string;
  element: string;
  classes: string[];
  endLevel: number;
  endHp: number;
  cardStats: Record<string, CardStatsV1>;
  turnStats: TurnStatsV1[];
};

type CardStatsV1 = {
  drawn: number;
  drawnToMemory: number;
  materialized: number;
  reserved: number;
  discarded: number;
  activated: number;
};

type TurnStatsV1 = {
  turn: number;
  cardsPlayed: number;
  memorySpent: number;
  reserveSpent: number;
  damageDealt: number;
  damageTaken: number;
  healed: number;
  level: number;
  hp: number;
};

type CombatEventV1 =
  | {
      type: "attack_initiated";
      turn: number;
      attackerSeat: 1 | 2;
      attackerCardId: string;
      targetSeat: 1 | 2;
      targetCardId: string;
      weaponCardId: string | null;
      cleave: boolean;
    }
  | {
      type: "damage_resolved";
      turn: number;
      sourceSeat: 1 | 2;
      sourceCardId: string;
      targetSeat: 1 | 2;
      targetCardId: string;
      amount: number;
      isCombat: boolean;
      lethal: boolean;
      domain?: true;
    };
```

## Validation rules

- Identifiers and free-form strings are non-empty and at most 255 characters unless noted.
- `deckLink` is either empty or an HTTP(S) URL of at most 2,048 characters.
- Array and record sizes are bounded: 16 classes, 500 card-stat entries, 500 turn records per
  player, and 5,000 combat events.
- Counts, turns, damage, healing, level, and HP are non-negative integers.
- Seats and winners are exactly `1` or `2`.
- `gameNumber` is between `1` and `bestOf`.
- `submissionId` must equal `${matchId}:${gameNumber}`.
- The API secret is transport metadata and must never appear in the JSON payload or persisted D1 data.

## Responses

- `201 Created`: first successful ingestion.
- `200 OK`: identical submission already exists.
- `400 Bad Request`: malformed JSON or headers.
- `401 Unauthorized`: missing or invalid credential.
- `413 Payload Too Large`: request exceeds the limit.
- `422 Unprocessable Content`: JSON does not satisfy this contract.
- `409 Conflict`: submission ID exists with a different checksum.
- `500 Internal Server Error`: archival or indexing failed; the sender may retry.

Every JSON response contains `success`, `requestId`, and either `submissionId` or an `error` object.
