/**
 * Match "timelines" hand-extracted from broadcast VOD transcripts/casters' commentary of feature
 * matches (Ascent/Nationals/Worlds livestreams). This is a THIRD population, distinct from both
 * real tournament results (deck-sightings-derived datasets) and Clarent simulator telemetry
 * (simulator-types.ts): it is commentary-sourced, ASR-derived, and covers only the handful of
 * matches that got broadcast coverage — never blend it into tournament win rates, Elo, or Card
 * Impact numbers. Card names as called by casters may contain minor ASR errors; `approxLife` is a
 * caster-mentioned figure, not a hard-tracked value, so treat it as directional, not exact.
 * Published as `data/broadcast-timelines.json` — no pipeline crawler produces this, it is curated
 * by hand from source VOD transcripts.
 */
export interface BroadcastTimelines {
  schemaVersion: 1;
  generatedAt: string;
  matches: BroadcastTimelineMatch[];
}

export type BroadcastTimelineTag = "combo" | "swing" | "sideboard" | "ruling" | "lethal" | "stabilize";

export interface BroadcastTimelineBeat {
  /** Sequence order within the game — a narrative index, not a real turn number or timestamp. */
  order: number;
  /** Which player this beat is primarily about; "both" for beats describing an exchange. */
  actor: "p1" | "p2" | "both";
  text: string;
  /** Card names as called by casters — may contain minor ASR errors, not guaranteed to match the card DB exactly. */
  cards?: string[];
  tags?: BroadcastTimelineTag[];
  /** Caster-mentioned life total at this beat, when the transcript states one explicitly. */
  approxLife?: { player: "p1" | "p2"; life: number };
}

export interface BroadcastTimelineGame {
  gameNumber: number;
  winner: "p1" | "p2" | "draw";
  /** One-line result, e.g. "Zeus wins" or "draw (timed out)". */
  summary: string;
  beats: BroadcastTimelineBeat[];
}

export interface BroadcastTimelinePlayer {
  id: "p1" | "p2";
  name: string;
  deck: string;
}

export interface BroadcastTimelineMatch {
  id: string;
  event: string;
  round: string;
  players: [BroadcastTimelinePlayer, BroadcastTimelinePlayer];
  /** Match-level result line, e.g. "Zeus wins 2-0". */
  result: string;
  /** Sideboard-plan beats that happened between named games, not inside one — keyed by the game number they were made ahead of. */
  sideboardNotes?: { beforeGame: number; actor: "p1" | "p2"; text: string }[];
  games: BroadcastTimelineGame[];
  sourceNote: string;
}
