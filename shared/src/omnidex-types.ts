/**
 * Grand Archive Omnidex (tournament) API shapes, verified against live event data.
 * `judges`/`teams`/`decklists`/`statistics` vary enough by event (team vs individual,
 * decklists on/off) that they're left loosely typed — render defensively.
 */

export interface OmnidexHost {
  id: number;
  name: string;
  address: string;
  addressCountryCode: string;
}

export interface OmnidexSeason {
  id: number;
  name: string;
  dateStart: string;
  dateEnd: string;
}

export interface OmnidexStage {
  id: number;
  status: string;
  type: string;
}

export interface OmnidexEvent {
  id: number;
  name: string;
  description: string;
  category: string;
  format: string;
  type: string;
  structure: string;
  status: string;
  setting: string;
  ranked: boolean;
  decklists: boolean;
  date: string;
  startAt: string;
  startedAt: string | null;
  dateStarted: string | null;
  dateCompleted: string | null;
  host: OmnidexHost;
  season: OmnidexSeason | null;
  players: number[];
  judges: number[];
  stages: OmnidexStage[];
  swissRounds: number | null;
  swissMatchConfig: string | null;
  singleEliminationCutSize: number | null;
  url: string;
}

export interface OmnidexPlayer {
  id: number;
  username: string;
  country: string;
  cp: number;
  rank: number;
  emblem: string;
  finalPlacement: number | null;
}

export interface OmnidexJudge extends OmnidexPlayer {
  judgeLevel: number;
  judgeExperience: number;
}

export interface OmnidexStanding {
  id: number;
  finalPlacement: number | null;
  status: string;
  statsWins: number;
  statsLosses: number;
  statsTies: number;
  statsByes: number;
  statsScore: number;
  statsGamesPlayed: number;
  statsGamesWon: number;
  statsPercentGW: number;
  statsPercentMW: number;
  statsPercentOGW: number;
  statsPercentOMW: number;
  tiebreaker: number;
  hasSubmittedDecklist: boolean;
  isDecklistPublic: boolean;
}

export interface OmnidexStandingsResponse {
  id: number;
  rounds: { latest: number; total: number };
  standings: OmnidexStanding[];
}

export interface OmnidexPairingSide {
  id: number;
  dropped: boolean;
  score: number;
  status: string;
  eloChange: number;
}

export interface OmnidexPairing {
  id: number;
  status: string;
  completedAt: number | null;
  pairing: OmnidexPairingSide[];
}

export interface OmnidexPairingsResponse {
  round: number;
  stage: number;
  pairings: OmnidexPairing[];
}

export interface OmnidexApiError {
  error: string;
}

export interface OmnidexDecklistCardLine {
  card: string;
  quantity: number;
}

/**
 * Verified against live event data. `material` is the Material Deck — alongside utility
 * items, this is where a player's Champion cards actually live (as alternate-form printings
 * of one named character, e.g. "Alice, Distorted Queen" / "Alice, Phantom Monarch"), not
 * called out as a separate field. Cross-reference against the card catalog's `types` to find
 * the CHAMPION-typed entries.
 */
export interface OmnidexDecklist {
  main: OmnidexDecklistCardLine[];
  material: OmnidexDecklistCardLine[];
  sideboard: OmnidexDecklistCardLine[];
}

export interface OmnidexDecklistEntry {
  player: number;
  decklist: OmnidexDecklist;
  visible?: boolean;
  [key: string]: unknown;
}
